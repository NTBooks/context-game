import { C } from '../constants.js';

/**
 * BootScene — creates all game textures programmatically.
 * No external assets needed; all sprites are pixel-art drawn via Graphics.
 */
export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    this.load.on('loaderror', (file) => {
      console.warn(`[BootScene] Failed to load asset: ${file.key} (${file.url})`);
    });

    this.load.image('skill_damage', 'assets/skill_damage.png');
    this.load.image('skill_cost', 'assets/skill_cost.png');
    this.load.image('skill_rewind', 'assets/skill_rewind.png');
    this.load.image('skill_charge', 'assets/skill_charge.png');
    this.load.image('skill_heal', 'assets/skill_heal.png');
    this.load.image('skill_splits', 'assets/skill_splits.png');
    this.load.image('dsoul_logo', 'logos/DSLOGO.png');
  }

  create() {
    const vaporFogFrag = `
#ifdef GL_ES
precision mediump float;
#endif

uniform float time;
uniform vec2 resolution;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}
float fbm(vec2 p) {
    float f = 0.0;
    f += 0.5000 * noise(p); p *= 2.02;
    f += 0.2500 * noise(p); p *= 2.03;
    f += 0.1250 * noise(p); p *= 2.01;
    f += 0.0625 * noise(p);
    return f / 0.9375;
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    // SNES pixelation chunking for that retro vibe (matching 4x4 chunks)
    vec2 pixelated = floor(uv * vec2(240.0, 135.0)) / vec2(240.0, 135.0);
    
    // Slow drifting smoke layer 1
    vec2 p1 = pixelated * 3.0 + vec2(time * 0.03, time * 0.02);
    float n1 = fbm(p1);
    
    // Slow drifting smoke layer 2
    vec2 p2 = pixelated * 5.0 - vec2(time * 0.04, time * 0.01);
    float n2 = fbm(p2);
    
    // Smooth smoke values, keeping them somewhat sparse
    n1 = smoothstep(0.4, 0.8, n1) * 0.6;
    n2 = smoothstep(0.4, 0.9, n2) * 0.4;
    
    // Spotlights (large moving blobs)
    // Cyan spotlight moving across
    vec2 spot1Center = vec2(0.5 + 0.4 * sin(time * 0.3), 0.5 + 0.3 * cos(time * 0.2));
    float spot1 = smoothstep(0.5, 0.0, distance(pixelated, spot1Center));
    
    // Magenta spotlight
    vec2 spot2Center = vec2(0.5 + 0.4 * cos(time * 0.25), 0.5 + 0.3 * sin(time * 0.35 + 2.0));
    float spot2 = smoothstep(0.6, 0.0, distance(pixelated, spot2Center));
    
    vec3 colPink = vec3(1.0, 0.1, 0.6); // Magenta/Pink
    vec3 colCyan = vec3(0.0, 0.8, 1.0); // Cyan
    vec3 colDeep = vec3(0.04, 0.0, 0.10); // Very dark purple background
    
    vec3 finalCol = colDeep;
    
    // Add smoke (tinted faintly by spotlights or just white/grey)
    finalCol += vec3(0.1, 0.1, 0.1) * n1;
    finalCol += vec3(0.05, 0.05, 0.1) * n2;
    
    // Add spotlights, multiplied by smoke and a bit of a base to cast "light"
    vec3 lightContrib = colCyan * spot1 * 0.6 + colPink * spot2 * 0.6;
    
    // Spotlights illuminate the smoke strongly, and the background faintly
    finalCol += lightContrib * (n1 + n2 + 0.2);
    
    // SNES scanline overlay
    if (mod(gl_FragCoord.y, 4.0) < 2.0) {
        finalCol *= 0.8;
    }
            
    // Output mostly transparent (if Phaser supports it) or just dark
    // With alpha tracking the luminous parts so the HTML body shows through if possible
    float alpha = clamp(max(n1 + n2, max(spot1, spot2)) + 0.2, 0.0, 1.0);
    gl_FragColor = vec4(finalCol, alpha);
}
    `;
    
    if (Phaser.Display && Phaser.Display.BaseShader) {
       this.cache.shader.add('vapor_fog', new Phaser.Display.BaseShader('vapor_fog', vaporFogFrag));
    } else {
       // fallback for some phaser versions
       this.cache.shader.add('vapor_fog', { frag: vaporFogFrag });
    }

    this._makeBgBase();
    this._makeBgClouds();
    this._makeTankBody();
    this._makeTankBarrel();
    this._makeTankBarrelSplit();
    this._makeFortress();
    this._makeEnemyFile();
    this._makeEnemyDossier();
    this._makeEnemyTask();
    this._makeEnemyPriority();
    this._makeEnemyDeadline();
    this._makeEnemyHotfix();
    this._makeEnemyIntrusiveThought();
    this._makeEnemyChore();
    this._makeEnemyTechDebt();
    this._makeEnemyAngelBoss();
    this._makeEnemyShooterAdd();
    this._makeProjectile();
    this.scene.start('MenuScene');
  }

  _gfx(w, h) {
    return this.make.graphics({ x: 0, y: 0, add: false });
  }

  _makeBgBase() {
    const g = this._gfx(960, 540);
    // Deep space gradient (top → bottom)
    for (let y = 0; y < 540; y += 4) {
      const t = y / 540;
      const r = Math.round(10 + t * 8);
      const gg = Math.round(0 + t * 2);
      const b = Math.round(20 + t * 15);
      g.fillStyle(Phaser.Display.Color.GetColor(r, gg, b));
      g.fillRect(0, y, 960, 4);
    }
    // Stars
    for (let i = 0; i < 200; i++) {
      const x = Phaser.Math.Between(0, 959);
      const y = Phaser.Math.Between(0, 539);
      const sz = Phaser.Math.Between(1, 2);
      const alpha = Phaser.Math.FloatBetween(0.3, 1.0);
      g.fillStyle(0xf0f0ff, alpha);
      g.fillRect(x, y, sz, sz);
    }
    g.generateTexture('bg-base', 960, 540);
    g.destroy();
  }

  _makeBgClouds() {
    const g = this._gfx(960, 540);
    // Pixelated blocky clouds
    const nebColors = [0x3d1a6b, 0x6b2fa0, 0x1a0035];
    for (let i = 0; i < 15; i++) {
      let baseW = Phaser.Math.Between(60, 160);
      let baseH = Phaser.Math.Between(40, 90);
      baseW -= (baseW % 4);
      baseH -= (baseH % 4);
      let nx = Phaser.Math.Between(0, 960 - baseW);
      let ny = Phaser.Math.Between(0, 540 - baseH);
      nx = nx - (nx % 4);
      ny = ny - (ny % 4);
      g.fillStyle(nebColors[i % nebColors.length], 0.25);
      
      // Draw blocky pixelated shape
      for (let y = 0; y < baseH; y += 4) {
        for (let x = 0; x < baseW; x += 4) {
          const dx = (x - baseW/2) / (baseW/2);
          const dy = (y - baseH/2) / (baseH/2);
          // random pixelated edge falloff
          if (dx*dx + dy*dy <= 1.0 + Phaser.Math.FloatBetween(-0.3, 0.2)) {
            g.fillRect(nx + x, ny + y, 4, 4);
          }
        }
      }
    }
    g.generateTexture('bg-clouds', 960, 540);
    g.destroy();
  }

  _makeTankBody() {
    const g = this._gfx(64, 32);

    // Underside hover glow
    g.fillStyle(C.NEON_CYAN, 0.12);
    g.fillEllipse(32, 28, 50, 7);

    // Main saucer disc — dark base
    g.fillStyle(0x2a3d52);
    g.fillEllipse(32, 22, 58, 14);

    // Saucer rim highlight band
    g.fillStyle(0x4a6278);
    g.fillEllipse(32, 20, 56, 9);
    g.fillStyle(0x2a3d52);
    g.fillEllipse(32, 20, 50, 6);

    // Neon cyan ring around saucer edge
    g.lineStyle(1, C.NEON_CYAN, 0.75);
    g.strokeEllipse(32, 22, 58, 14);

    // Dome body
    g.fillStyle(0x3a5268);
    g.fillEllipse(32, 13, 28, 18);

    // Dome inner glass (dark tinted)
    g.fillStyle(0x000d22);
    g.fillEllipse(32, 13, 21, 13);

    // Dome glass cyan shimmer
    g.fillStyle(C.NEON_CYAN, 0.22);
    g.fillEllipse(32, 12, 19, 11);

    // Dome glass highlight (top-left reflection)
    g.fillStyle(0xffffff, 0.18);
    g.fillEllipse(26, 10, 8, 5);

    // Right-side cannon mount (barrel attaches here at image x≈58, y≈16)
    g.fillStyle(0x3a5268);
    g.fillRect(53, 16, 11, 8);
    g.fillStyle(C.NEON_CYAN, 0.45);
    g.fillRect(57, 18, 7, 4);

    // Running lights moved to Tank.js

    g.generateTexture('tank-body', 64, 32);
    g.destroy();
  }

  _makeTankBarrel() {
    const g = this._gfx(36, 12);
    // Emitter tube
    g.fillStyle(0x334455);
    g.fillRect(0, 3, 30, 6);
    g.fillStyle(0x445566);
    g.fillRect(0, 4, 28, 4);
    // Energy ring coils
    g.fillStyle(C.NEON_CYAN, 0.55);
    [5, 11, 17, 23].forEach(x => g.fillRect(x, 3, 2, 6));
    // Glowing muzzle tip
    g.fillStyle(C.NEON_CYAN);
    g.fillRect(28, 2, 8, 8);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(30, 3, 5, 6);
    g.generateTexture('tank-barrel', 36, 12);
    g.destroy();
  }

  _makeTankBarrelSplit() {
    const g = this._gfx(36, 20);
    // Top emitter
    g.fillStyle(0x334455);
    g.fillRect(0, 1, 30, 6);
    g.fillStyle(C.NEON_CYAN, 0.55);
    [5, 11, 17, 23].forEach(x => g.fillRect(x, 1, 2, 6));
    g.fillStyle(C.NEON_CYAN);
    g.fillRect(28, 0, 8, 8);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(30, 1, 5, 6);
    // Bottom emitter
    g.fillStyle(0x334455);
    g.fillRect(0, 13, 30, 6);
    g.fillStyle(C.NEON_CYAN, 0.55);
    [5, 11, 17, 23].forEach(x => g.fillRect(x, 13, 2, 6));
    g.fillStyle(C.NEON_CYAN);
    g.fillRect(28, 12, 8, 8);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(30, 13, 5, 6);
    g.generateTexture('tank-barrel-split', 36, 20);
    g.destroy();
  }

  _makeFortress() {
    const g = this._gfx(80, 160);

    // Rack chassis background
    g.fillStyle(0x0d1120);
    g.fillRect(0, 0, 80, 160);

    // Side rack rails
    g.fillStyle(0x2a3d52);
    g.fillRect(0, 0, 7, 160);
    g.fillRect(73, 0, 7, 160);

    // Rail mounting holes
    for (let y = 10; y < 160; y += 16) {
      g.fillStyle(0x111827);
      g.fillRect(2, y, 3, 4);
      g.fillRect(75, y, 3, 4);
    }

    // Front panel
    g.fillStyle(0x131b2e);
    g.fillRect(7, 2, 66, 156);

    // ── Status screen (top) ──────────────────────────────
    g.fillStyle(0x001a04);
    g.fillRect(9, 4, 62, 30);
    g.lineStyle(1, C.NEON_GREEN, 0.9);
    g.strokeRect(9, 4, 62, 30);

    // Simulated terminal code lines
    g.fillStyle(C.NEON_GREEN, 0.75);
    [[11,8,44],[11,13,30],[11,18,52],[11,23,20],[11,28,38]].forEach(([x,y,w]) => {
      g.fillRect(x, y, w, 2);
    });
    // Blinking cursor
    g.fillStyle(C.NEON_GREEN);
    g.fillRect(11, 28, 5, 3);

    // Screen label "CODEBASE" — pixel rows (tiny 3×5 font, abbreviated as dots)
    g.fillStyle(C.NEON_GREEN, 0.5);
    g.fillRect(53, 6, 16, 2); // label bar placeholder

    // ── Server rack units (9 units × 13px each = 117px, starting y=36) ──
    const unitColors   = [0x172640, 0x172640, 0x172640, 0x172640, 0x172640, 0x172640, 0x172640, 0x1f2a1f, 0x1a1a10];
    const statusColors = [C.NEON_GREEN, C.NEON_GREEN, C.NEON_GREEN, C.NEON_GREEN, C.NEON_GREEN, C.NEON_GREEN, C.NEON_GREEN, C.HEAT_YELLOW, C.DANGER_RED];

    for (let i = 0; i < 9; i++) {
      const y = 36 + i * 13;

      // Unit body
      g.fillStyle(unitColors[i]);
      g.fillRect(9, y, 62, 11);

      // Separator groove
      g.fillStyle(0x080d18);
      g.fillRect(9, y, 62, 1);

      // Status LED
      g.fillStyle(statusColors[i]);
      g.fillRect(11, y + 4, 3, 3);

      // Activity LED (flicker pattern baked in)
      g.fillStyle(i % 3 < 2 ? C.NEON_CYAN : 0x1a2233);
      g.fillRect(16, y + 4, 3, 3);

      // Drive bays (4 per unit)
      for (let d = 0; d < 4; d++) {
        g.fillStyle(0x070c16);
        g.fillRect(24 + d * 10, y + 1, 8, 9);
        // Drive activity light
        g.fillStyle(d < i % 4 + 1 ? 0x003300 : 0x0a0a0a);
        g.fillRect(25 + d * 10, y + 2, 6, 7);
      }

      // Ejector handle
      g.fillStyle(0x2a3d52);
      g.fillRect(65, y + 2, 4, 7);
      g.fillStyle(0x3a5268);
      g.fillRect(65, y + 3, 4, 1);
    }

    // ── Power / ventilation panel (bottom) ──────────────
    const pY = 36 + 9 * 13 + 2; // = 155
    g.fillStyle(0x0d1120);
    g.fillRect(9, pY, 62, 3);

    // Power LED
    g.fillStyle(C.NEON_GREEN, 0.9);
    g.fillRect(11, pY, 4, 3);

    // Chassis outline
    g.lineStyle(1, 0x2a3d52);
    g.strokeRect(0, 0, 80, 160);

    // Bright edge highlight (top)
    g.lineStyle(1, 0x3a5268, 0.6);
    g.lineBetween(0, 0, 80, 0);

    g.generateTexture('fortress', 80, 160);
    g.destroy();
  }

  _makeEnemyFile() {
    const g = this._gfx(48, 48);

    // Wings (6 wings)
    g.fillStyle(0xe0e0ff, 0.9);
    // Left wings
    g.fillTriangle(20, 20, 2, 4, 10, 20); // top-left
    g.fillTriangle(20, 24, 0, 24, 10, 28); // mid-left
    g.fillTriangle(20, 28, 2, 44, 12, 34); // bot-left
    // Right wings
    g.fillTriangle(28, 20, 46, 4, 38, 20);
    g.fillTriangle(28, 24, 48, 24, 38, 28);
    g.fillTriangle(28, 28, 46, 44, 36, 34);

    // Wing feathers highlights
    g.fillStyle(0xffffff, 1);
    g.fillRect(4, 8, 2, 4); g.fillRect(44, 8, 2, 4);
    g.fillRect(2, 23, 4, 2); g.fillRect(42, 23, 4, 2);
    g.fillRect(4, 38, 2, 4); g.fillRect(44, 38, 2, 4);

    // Golden rings (interlocking)
    g.lineStyle(2, C.GOLD, 0.8);
    g.strokeEllipse(24, 24, 36, 12);
    g.strokeEllipse(24, 24, 16, 36);

    // Eyes on rings
    g.fillStyle(0xffffff);
    const ringEyes = [[12,24], [36,24], [24,10], [24,38]];
    ringEyes.forEach(([x,y]) => g.fillEllipse(x, y, 6, 4));
    g.fillStyle(C.DANGER_RED);
    ringEyes.forEach(([x,y]) => g.fillRect(x-1, y-1, 2, 2));

    // 90s File Icon in center (approx 16x20)
    g.fillStyle(0xffffff); // base white page
    g.fillRect(16, 14, 16, 20);
    // top-right fold
    g.fillStyle(0xcccccc);
    g.fillTriangle(26, 14, 32, 14, 26, 20);
    // draw lines of text
    g.fillStyle(0x555555);
    g.fillRect(18, 20, 10, 2);
    g.fillRect(18, 24, 8, 2);
    g.fillRect(18, 28, 12, 2);
    
    // Central eye on the file
    g.fillStyle(0xffffff);
    g.fillEllipse(24, 24, 10, 6);
    g.fillStyle(0x0a0014); // black pupil
    g.fillEllipse(24, 24, 4, 4);
    g.fillStyle(C.NEON_CYAN); // catchlight
    g.fillRect(24, 24, 2, 2);

    g.generateTexture('enemy-file', 48, 48);
    g.destroy();
  }

  _makeEnemyDossier() {
    const g = this._gfx(48, 48);
    
    // 6 Wings
    g.fillStyle(C.WARM_WHITE, 0.9);
    g.fillTriangle(20, 24, 2, 6, 14, 16);
    g.fillTriangle(20, 24, 0, 24, 12, 28);
    g.fillTriangle(20, 24, 4, 44, 16, 36);

    g.fillTriangle(28, 24, 46, 6, 34, 16);
    g.fillTriangle(28, 24, 48, 24, 36, 28);
    g.fillTriangle(28, 24, 44, 44, 32, 36);

    // Sacred geometry
    g.lineStyle(1, C.NEON_CYAN, 0.9);
    g.strokeCircle(24, 24, 18);
    g.lineStyle(1, C.GOLD, 0.9);
    g.strokeRect(10, 10, 28, 28);

    // Eyes on corners
    g.fillStyle(0xffffff);
    const sacEyes = [[10,10], [38,10], [10,38], [38,38]];
    sacEyes.forEach(([ex,ey]) => g.fillEllipse(ex, ey, 6, 4));
    g.fillStyle(C.MID_PURPLE);
    sacEyes.forEach(([ex,ey]) => g.fillRect(ex-1, ey-1, 2, 2));

    // Manila Folder Back
    g.fillStyle(0xcc9933);
    g.fillRect(12, 16, 24, 18);
    // Tab
    g.fillRect(12, 12, 8, 4);

    // Glowing Pages
    g.fillStyle(0xffffff);
    g.fillRect(14, 12, 20, 20);
    g.fillStyle(C.NEON_CYAN, 0.3);
    g.fillRect(14, 12, 20, 20);

    // Giant staring eye inside folder
    g.fillStyle(0xffffff);
    g.fillEllipse(24, 22, 16, 10);
    g.fillStyle(C.WARNING_ORANGE);
    g.fillEllipse(24, 22, 8, 8);
    g.fillStyle(0x000000);
    g.fillRect(23, 20, 2, 4);
    
    // Manila Folder Front
    g.fillStyle(0xffcc66);
    g.beginPath();
    g.moveTo(10, 26);
    g.lineTo(40, 26);
    g.lineTo(36, 36);
    g.lineTo(12, 36);
    g.closePath();
    g.fillPath();

    g.generateTexture('enemy-dossier', 48, 48);
    g.destroy();
  }

  _makeEnemyTask() {
    const g = this._gfx(48, 48);

    // glitchy wings - deep purple and neon green
    g.fillStyle(C.DEEP_PURPLE, 0.8);
    // L wings
    g.fillRect(4, 10, 10, 4); g.fillRect(2, 14, 12, 4); g.fillRect(6, 18, 8, 2);
    g.fillRect(0, 24, 14, 4); g.fillRect(4, 28, 10, 2);
    g.fillRect(4, 34, 10, 4); g.fillRect(2, 38, 12, 4); g.fillRect(6, 42, 8, 2);
    // R wings
    g.fillRect(34, 10, 10, 4); g.fillRect(34, 14, 12, 4); g.fillRect(34, 18, 8, 2);
    g.fillRect(34, 24, 14, 4); g.fillRect(34, 28, 10, 2);
    g.fillRect(34, 34, 10, 4); g.fillRect(34, 38, 12, 4); g.fillRect(34, 42, 8, 2);

    // rings of eyes
    g.lineStyle(2, C.NEON_GREEN, 0.6);
    g.strokeEllipse(24, 24, 32, 10);
    g.strokeEllipse(24, 24, 10, 32);

    // 90s check dialog frame
    g.fillStyle(0xc0c0c0);
    g.fillRect(14, 14, 20, 20);
    // window top bar
    g.fillStyle(0x000080); // 90s OS blue
    g.fillRect(14, 14, 20, 5);
    // window highlights
    g.fillStyle(0xffffff);
    g.fillRect(14, 14, 20, 1);
    g.fillRect(14, 14, 1, 20);
    g.fillStyle(0x808080);
    g.fillRect(33, 14, 1, 20);
    g.fillRect(14, 33, 20, 1);

    // check box inside
    g.fillStyle(0xffffff);
    g.fillRect(18, 22, 12, 10);
    // inset shadow
    g.fillStyle(0x808080);
    g.fillRect(18, 22, 12, 1);
    g.fillRect(18, 22, 1, 10);

    // Unholy glowing checkmark
    g.fillStyle(C.NEON_GREEN);
    g.fillRect(19, 26, 3, 3);
    g.fillRect(21, 28, 3, 3);
    g.fillRect(23, 24, 3, 7);
    g.fillRect(25, 20, 3, 7);
    g.fillRect(27, 16, 3, 7);

    // Floating eyes over the dialog
    const floatEyes = [[14, 10], [34, 10], [24, 40]];
    g.fillStyle(0xffffff);
    floatEyes.forEach(([ex,ey]) => g.fillEllipse(ex, ey, 6, 4));
    g.fillStyle(C.DANGER_RED);
    floatEyes.forEach(([ex,ey]) => g.fillRect(ex-1, ey-1, 2, 2));

    g.generateTexture('enemy-task', 48, 48);
    g.destroy();
  }

  _makeEnemyPriority() {
    const g = this._gfx(64, 64);

    // 6 Massive Majestic Wings
    g.fillStyle(C.GOLD, 0.9);
    // Top wings
    g.fillTriangle(32, 32, 4, 4, 20, 24);
    g.fillTriangle(32, 32, 60, 4, 44, 24);
    // Mid wings
    g.fillTriangle(32, 32, 2, 32, 16, 36);
    g.fillTriangle(32, 32, 62, 32, 48, 36);
    // Bottom wings
    g.fillTriangle(32, 32, 8, 60, 24, 42);
    g.fillTriangle(32, 32, 56, 60, 40, 42);

    // Wing feathers (overlapping smaller white wings)
    g.fillStyle(0xffffff, 0.8);
    g.fillTriangle(32, 32, 10, 10, 22, 24);
    g.fillTriangle(32, 32, 54, 10, 42, 24);
    g.fillTriangle(32, 32, 8, 32, 20, 34);
    g.fillTriangle(32, 32, 56, 32, 44, 34);
    g.fillTriangle(32, 32, 14, 54, 26, 42);
    g.fillTriangle(32, 32, 50, 54, 38, 42);

    // Giant interlocking wheels on fire (Warning colors)
    g.lineStyle(3, C.WARNING_ORANGE, 0.8);
    g.strokeEllipse(32, 32, 48, 16);
    g.lineStyle(3, C.DANGER_RED, 0.8);
    g.strokeEllipse(32, 32, 16, 48);
    g.lineStyle(2, C.HEAT_YELLOW, 0.9);
    g.strokeCircle(32, 32, 24);

    // Dozens of unblinking eyes on the rings
    g.fillStyle(0xffffff);
    const swarmEyes = [
      [32,8], [32,56], [8,32], [56,32], 
      [14,14], [50,14], [14,50], [50,50],
      [22,22], [42,22], [22,42], [42,42],
      [32,16], [32,48], [16,32], [48,32]
    ];
    swarmEyes.forEach(([ex,ey]) => g.fillEllipse(ex, ey, 4, 4));
    g.fillStyle(0x000000);
    swarmEyes.forEach(([ex,ey]) => g.fillRect(ex-1, ey-1, 2, 2));

    // Priority briefcase / Warning diamond in center
    g.fillStyle(C.HEAT_YELLOW);
    g.beginPath();
    g.moveTo(32, 16);
    g.lineTo(48, 32);
    g.lineTo(32, 48);
    g.lineTo(16, 32);
    g.closePath();
    g.fillPath();
    // Black border
    g.lineStyle(2, 0x000000);
    g.strokePath();

    // Center Warning Exclamation or P badge
    g.fillStyle(0x000000);
    g.fillRect(28, 22, 8, 8);
    g.fillRect(28, 22, 2, 16);
    g.fillStyle(C.HEAT_YELLOW);
    g.fillRect(31, 25, 2, 2);

    g.generateTexture('enemy-priority', 64, 64);
    g.destroy();
  }

  _makeEnemyDeadline() {
    const g = this._gfx(64, 64);
    // 8 Massive Wings (deep purple/blue)
    g.fillStyle(C.DEEP_PURPLE, 0.9);
    g.fillTriangle(32,32, 0,0, 16,32); g.fillTriangle(32,32, 64,0, 48,32);
    g.fillTriangle(32,32, 0,32, 16,48); g.fillTriangle(32,32, 64,32, 48,48);
    g.fillTriangle(32,32, 0,16, 16,16); g.fillTriangle(32,32, 64,16, 48,16);
    g.fillTriangle(32,32, 16,0, 32,16); g.fillTriangle(32,32, 48,0, 32,16);
    // Floppy disk center
    g.fillStyle(0x0000aa); g.fillRect(16, 16, 32, 32); // disk body
    g.fillStyle(0xffffff); g.fillRect(20, 16, 24, 12); // label
    g.fillStyle(0xcccccc); g.fillRect(24, 34, 16, 14); // slider
    // huge eye
    g.fillStyle(0xffffff); g.fillEllipse(32,32, 24,16);
    g.fillStyle(C.NEON_CYAN); g.fillEllipse(32,32, 12,12);
    g.fillStyle(0x0a0014); g.fillEllipse(32,32, 6,6);
    // Rings
    g.lineStyle(2, C.NEON_CYAN, 0.8);
    g.strokeCircle(32, 32, 28);
    
    // Eyes on rings
    const ringEyes = [[32,4], [32,60], [4,32], [60,32], [12,12], [52,12], [12,52], [52,52]];
    g.fillStyle(0xffffff);
    ringEyes.forEach(([ex,ey]) => g.fillEllipse(ex, ey, 6, 4));
    g.fillStyle(C.DANGER_RED);
    ringEyes.forEach(([ex,ey]) => g.fillRect(ex-1, ey-1, 2, 2));

    g.generateTexture('enemy-deadline', 64, 64);
    g.destroy();
  }

  _makeEnemyHotfix() {
    const g = this._gfx(48, 48);
    // 4 fiery wings
    g.fillStyle(C.WARNING_ORANGE, 0.9);
    g.fillTriangle(24, 24, 0, 0, 12, 24); g.fillTriangle(24, 24, 48, 0, 36, 24);
    g.fillTriangle(24, 24, 0, 48, 12, 36); g.fillTriangle(24, 24, 48, 48, 36, 36);
    // Wing highlights
    g.fillStyle(C.HEAT_YELLOW, 0.9);
    g.fillTriangle(24, 24, 6, 6, 12, 24); g.fillTriangle(24, 24, 42, 6, 36, 24);

    // Band-aid icon
    g.fillStyle(0xffccaa);
    g.fillRect(12, 20, 24, 8); // band-aid body
    g.fillStyle(0xddaa88); g.fillRect(20, 20, 8, 8); // pad
    
    // Multiple tiny eyes
    g.fillStyle(0xffffff); 
    g.fillEllipse(16, 24, 4, 4); g.fillEllipse(32, 24, 4, 4); g.fillEllipse(24, 24, 6, 6);
    g.fillStyle(C.DANGER_RED); 
    g.fillRect(15, 23, 2, 2); g.fillRect(31, 23, 2, 2); g.fillRect(23, 23, 2, 2);

    g.generateTexture('enemy-hotfix', 48, 48);
    g.destroy();
  }

  _makeEnemyIntrusiveThought() {
    const g = this._gfx(48, 48);
    // Gold rings
    g.lineStyle(2, C.GOLD, 0.8);
    g.strokeEllipse(24, 24, 24, 40); g.strokeEllipse(24, 24, 40, 24);
    // abstract wings
    g.fillStyle(0xcccccc, 0.8);
    g.fillTriangle(24, 24, 4, 4, 16, 24); g.fillTriangle(24, 24, 44, 44, 32, 24);
    
    // Abstract Question Mark icon
    g.fillStyle(C.MID_PURPLE);
    g.fillRect(18, 14, 12, 8); // top bar
    g.fillRect(26, 14, 8, 16); // right vertical
    g.fillRect(22, 26, 8, 6);  // middle inward drop
    g.fillRect(22, 36, 8, 8);  // dot
    
    // Eyes covering it
    g.fillStyle(0xffffff);
    g.fillEllipse(20, 18, 6, 4); g.fillEllipse(30, 24, 6, 4); g.fillEllipse(26, 40, 6, 4);
    g.fillStyle(0x000000); 
    g.fillRect(19, 17, 2, 2); g.fillRect(29, 23, 2, 2); g.fillRect(25, 39, 2, 2);

    g.generateTexture('enemy-intrusive-thought', 48, 48);
    g.destroy();
  }

  _makeEnemyChore() {
    const g = this._gfx(40, 40);
    // Sad wings
    g.fillStyle(0x8899aa, 0.7);
    g.fillTriangle(20, 20, 0, 10, 10, 20); g.fillTriangle(20, 20, 40, 10, 30, 20);
    g.fillTriangle(20, 20, 0, 30, 10, 20); g.fillTriangle(20, 20, 40, 30, 30, 20);
    // Recycle bin
    g.fillStyle(0x008080); g.fillRect(12, 16, 16, 16);
    g.fillStyle(0xc0c0c0); g.fillRect(10, 12, 20, 4); // lid
    
    // Recycle arrows
    g.lineStyle(1, 0x00ff00, 0.5);
    g.strokeTriangle(20,18, 16,24, 24,24);

    // eyes inside bin peering out
    g.fillStyle(0xffffff); 
    g.fillEllipse(16, 24, 4, 4); g.fillEllipse(24, 24, 4, 4);
    g.fillStyle(C.DANGER_RED); 
    g.fillRect(15, 23, 2, 2); g.fillRect(23, 23, 2, 2);

    g.generateTexture('enemy-chore', 40, 40);
    g.destroy();
  }

  _makeEnemyTechDebt() {
    const g = this._gfx(56, 56);
    // wings
    g.fillStyle(0x555555, 0.9);
    g.fillTriangle(28, 28, 0, 0, 16, 28); g.fillTriangle(28, 28, 56, 0, 40, 28);
    g.fillTriangle(28, 28, 0, 56, 16, 40); g.fillTriangle(28, 28, 56, 56, 40, 40);
    // chains/rings
    g.lineStyle(2, 0x888888, 0.9);
    g.strokeCircle(28, 28, 24); g.strokeCircle(28, 28, 18);
    
    // hourglass / error frame
    g.fillStyle(0x000080); // base hourglass top and bottom
    g.fillRect(20, 16, 16, 4); g.fillRect(20, 36, 16, 4);

    // White hourglass
    g.fillStyle(0xffffff);
    g.fillTriangle(20, 20, 36, 20, 28, 28); // top glass
    g.fillTriangle(20, 36, 36, 36, 28, 28); // bottom glass
    
    // Sludge bleeding
    g.fillStyle(0x221133);
    g.fillEllipse(28, 22, 6, 6); g.fillEllipse(28, 34, 6, 6);
    g.fillRect(26, 22, 4, 16); // Sludge drip

    // Cursed eyes in the sludge
    g.fillStyle(C.NEON_GREEN);
    g.fillEllipse(28, 22, 4, 2); g.fillEllipse(28, 34, 4, 2);
    
    g.generateTexture('enemy-tech-debt', 56, 56);
    g.destroy();
  }

  _makeEnemyAngelBoss() {
    const g = this._gfx(128, 128); // GIANT 3-lane boss size!
    
    // 12 Majestic glowing white/gold wings spanning all edges
    g.fillStyle(C.GOLD, 0.9);
    // top
    g.fillTriangle(64,64, 4,12, 32,32); g.fillTriangle(64,64, 124,12, 96,32);
    // sides
    g.fillTriangle(64,64, 4,64, 24,48); g.fillTriangle(64,64, 124,64, 104,48);
    g.fillTriangle(64,64, 4,96, 32,80); g.fillTriangle(64,64, 124,96, 96,80);
    // bottom
    g.fillTriangle(64,64, 24,124, 48,96); g.fillTriangle(64,64, 104,124, 80,96);
    
    // Giant 90s Bomb Icon (Mac System Error) in center
    g.fillStyle(0x000000); 
    g.fillCircle(64, 70, 24); // Bomb body
    g.fillRect(58, 40, 12, 10); // Bomb fuse cap
    // Fuse
    g.lineStyle(3, 0xffffff);
    g.beginPath();
    g.moveTo(64, 40);
    g.lineTo(72, 30);
    g.lineTo(84, 25);
    g.lineTo(80, 10);
    g.strokePath();
    // Fuse spark
    g.fillStyle(C.WARNING_ORANGE);
    g.fillTriangle(80, 2, 84, 10, 76, 10); // top
    g.fillTriangle(80, 18, 76, 10, 84, 10); // bottom
    g.fillTriangle(72, 10, 80, 6, 80, 14); // left
    g.fillTriangle(88, 10, 80, 14, 80, 6); // right
    g.fillStyle(C.HEAT_YELLOW);
    g.fillCircle(80, 10, 4);

    // Biblically accurate rings around bomb
    g.lineStyle(3, C.NEON_CYAN, 0.8);
    g.strokeEllipse(64, 70, 80, 30);
    g.strokeEllipse(64, 70, 30, 80);

    const ringEyes = [
       [24,70], [104,70], [64,30], [64,110], 
       [40,48], [88,48], [40,92], [88,92]
    ];
    g.fillStyle(0xffffff);
    ringEyes.forEach(([ex,ey]) => g.fillEllipse(ex, ey, 8, 5));
    g.fillStyle(C.DANGER_RED);
    ringEyes.forEach(([ex,ey]) => g.fillRect(ex-1, ey-1, 3, 3));

    g.generateTexture('enemy-angel-boss', 128, 128);
    g.destroy();
  }

  _makeEnemyShooterAdd() {
    const g = this._gfx(36, 36);
    // A little pitchfork / daemon cursor icon
    g.fillStyle(C.DANGER_RED);
    g.fillRect(16, 8, 4, 20); // pole
    // prongs
    g.fillRect(10, 8, 16, 4);
    g.fillRect(10, 4, 4, 8);
    g.fillRect(22, 4, 4, 8);
    g.fillRect(16, 4, 4, 8);

    // Glitchy red wings
    g.fillStyle(0xcc0000, 0.6);
    g.fillTriangle(18, 18, 0, 4, 8, 24); g.fillTriangle(18, 18, 36, 4, 28, 24);
    g.fillTriangle(18, 18, 0, 32, 8, 28); g.fillTriangle(18, 18, 36, 32, 28, 28);

    // Glowing eye in center of pitchfork
    g.fillStyle(0xffffff); g.fillRect(16, 14, 4, 4);
    g.fillStyle(C.NEON_GREEN); g.fillRect(17, 15, 2, 2);

    g.generateTexture('enemy-shooter-add', 36, 36);
    g.destroy();
  }
  _makeProjectile() {
    const g = this._gfx(24, 8);
    // Beam body
    g.fillStyle(C.NEON_CYAN, 0.7);
    g.fillRect(0, 2, 24, 4);
    // Bright core
    g.fillStyle(0xffffff, 0.95);
    g.fillRect(0, 3, 16, 2);
    // Tip
    g.fillStyle(C.NEON_CYAN);
    g.fillRect(20, 1, 4, 6);
    g.generateTexture('projectile', 24, 8);
    g.destroy();
  }
}
