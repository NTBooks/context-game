import {
  GAME_WIDTH, GAME_HEIGHT,
  CTX_SYSTEM_PROMPT, CTX_OPTIMAL_MIN, CTX_OPTIMAL_MAX, CTX_OVERFLOW, CTX_HALLUCINATE,
  PERFECT_ZONE_MIN, PERFECT_ZONE_MAX,
  FUNNY_PROMPTS, STATE,
  C, ctxToColor,
} from '../constants.js';

// Layout constants for the UI
const BAR_X    = 18;   // heat/context bar left edge
const BAR_Y    = 128;
const BAR_W    = 44;
const BAR_H    = 210;
const CHG_X    = 180;  // charge bar left edge
const CHG_Y    = GAME_HEIGHT - 40;
const CHG_W    = 340;
const CHG_H    = 22;

// Rainbow hue cycle speed
const RAINBOW_SPEED = 0.0025;

const LOADOUT_DEFS = [
  { id: 'damage',  icon: 'skill_damage'  },
  { id: 'cost',    icon: 'skill_cost'    },
  { id: 'rewind',  icon: 'skill_rewind'  },
  { id: 'charge',  icon: 'skill_charge'  },
  { id: 'splits',  icon: 'skill_splits'  },
  { id: 'heal',    icon: 'skill_heal'    },
];

export default class UIScene extends Phaser.Scene {
  constructor() { super({ key: 'UIScene', active: false }); }

  create() {
    this.gfx = this.add.graphics();

    // ── Score / wave / hi-score ──────────────────────────────
    this.scoreTxt  = this._txt(8, 6,  'SCORE: 0',   '16px', '#f0f0ff');
    this.hiTxt     = this._txt(8, 26, 'HI: 0',      '12px', '#6b2fa0');
    this.waveTxt   = this._txt(GAME_WIDTH / 2, 8, 'SESSION 1', '20px', '#00e5ff').setOrigin(0.5, 0);
    this.turnTxt   = this._txt(GAME_WIDTH / 2, 30, 'TURN 0', '13px', '#6b2fa0').setOrigin(0.5, 0);
    this.shieldTxt = this._txt(GAME_WIDTH - 8, 6, 'INTEGRITY: 100%', '14px', '#39ff14').setOrigin(1, 0);
    this.stateTxt  = this._txt(GAME_WIDTH - 8, 24, '', '12px', '#445566').setOrigin(1, 0);

    // ── Context window labels ────────────────────────────────
    this._txt(BAR_X + BAR_W / 2, BAR_Y - 22, 'CONTEXT',  '10px', '#8899aa').setOrigin(0.5, 1);
    this._txt(BAR_X + BAR_W / 2, BAR_Y - 10, 'WINDOW',   '10px', '#8899aa').setOrigin(0.5, 1);
    // Place % and SYS label inside the sys-prompt zone at the bottom of the bar
    const sysZoneMidY = BAR_Y + BAR_H - Math.round(BAR_H * CTX_SYSTEM_PROMPT / 200);
    this.ctxPctTxt = this._txt(BAR_X + BAR_W / 2, sysZoneMidY - 6, '20%', '11px', '#aabbcc').setOrigin(0.5, 0.5);
    this._txt(BAR_X + BAR_W / 2, sysZoneMidY + 7, 'SYS', '9px', '#7744aa').setOrigin(0.5, 0.5);

    // ── Charge bar labels ────────────────────────────────────
    this._txt(CHG_X, CHG_Y - 15, 'CRAFT PROMPT', '11px', '#8899aa');
    this.chgPctTxt = this._txt(CHG_X + CHG_W + 6, CHG_Y + 1, '0%', '12px', '#aaccff');
    this.perfectTxt = this._txt(CHG_X + CHG_W / 2, CHG_Y - 15, '', '12px', '#ffd700').setOrigin(0.5, 1);
    this._txt(CHG_X, CHG_Y + CHG_H + 5, 'HOLD [SPACE] TO CRAFT · RELEASE TO SEND · [ENTER] SKIP TURN', '10px', '#445566');

    // ── Ability indicators ───────────────────────────────────
    this.rewindTxt = this._txt(CHG_X + CHG_W + 48, CHG_Y - 4,  '[R] REWIND', '12px', '#00e5ff');
    this.splitTxt  = this._txt(CHG_X + CHG_W + 48, CHG_Y + 14, '[Q] SPLIT   0%', '12px', '#8899aa');

    // ── Hallucination overlay ────────────────────────────────
    this._halluciW = GAME_WIDTH;
    this._halluciH = GAME_HEIGHT;
    this._halluciOverlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xff0000, 0)
      .setDepth(90).setBlendMode(Phaser.BlendModes.ADD);
    this._halluciText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 'HALLUCINATING', {
      fontFamily: 'monospace',
      fontSize: '38px',
      color: '#ff00ff',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 0, color: '#ff00ff', blur: 30, fill: true },
    }).setOrigin(0.5).setDepth(91).setAlpha(0);

    // ── Loadout icons (right of score) ──────────────────────
    this._loadoutIcons = [];
    this._loadoutSnapshot = '';
    const loadoutX = 200;
    const loadoutY = 12;
    for (let i = 0; i < LOADOUT_DEFS.length; i++) {
      const img = this.add.image(loadoutX + i * 28, loadoutY, LOADOUT_DEFS[i].icon)
        .setDisplaySize(22, 22).setOrigin(0.5).setDepth(80).setAlpha(0);
      const badge = this._txt(loadoutX + i * 28 + 9, loadoutY + 8, '', '9px', '#ffd700')
        .setOrigin(0.5).setAlpha(0);
      this._loadoutIcons.push({ img, badge });
    }

    // ── Prompt animation state ────────────────────────────────
    this._promptCooldown  = 0;   // ms until next funny prompt
    this._promptInterval  = 380;
    this._lastCharging    = false;
    this._rainbowHue      = 0;
    this._rainbowActive   = false;
  }

  update(time, delta) {
    const r = this.registry;
    const score      = r.get('score')       || 0;
    const hiScore    = r.get('hiScore')     || 0;
    const wave       = r.get('wave')        || 1;
    const turn       = r.get('turn')        || 0;
    const ctx        = r.get('ctx')         ?? 20;
    const ctxColor   = r.get('ctxColor')    || C.HEAT_BLUE;
    const ctxSludge  = r.get('ctxSludge')   || 0;
    const ctxFloor   = r.get('ctxFloor')    || 20;
    const shield     = r.get('shield')      ?? 100;
    const state      = r.get('state')       || STATE.PLAYER_TURN;
    const charging   = r.get('charging')    || false;
    const chargeLvl  = r.get('chargeLevel') || 0;
    const rewindCount     = r.get('rewindCount') ?? 3;
    const rewindAvail     = rewindCount > 0;
    const splitPct        = r.get('splitPct')    || 0;
    const splitReady      = r.get('splitReady')  || false;
    const perfectMin      = r.get('perfectMin')  ?? PERFECT_ZONE_MIN;
    const perfectMax      = r.get('perfectMax')  ?? PERFECT_ZONE_MAX;
    const targetKillCharge= r.get('targetKillCharge') ?? null;

    // ── Text ─────────────────────────────────────────────────
    this.scoreTxt.setText(`SCORE: ${score.toLocaleString()}`);
    this.hiTxt.setText(`HI: ${hiScore.toLocaleString()}`);
    this.waveTxt.setText(`SESSION ${wave}`);
    this.turnTxt.setText(`TURN ${turn}`);

    const sc = shield > 50 ? '#39ff14' : shield > 25 ? '#ffee00' : '#ff1744';
    this.shieldTxt.setStyle({ color: sc });
    this.shieldTxt.setText(`INTEGRITY: ${Math.round(shield)}%`);

    const stateLabels = {
      [STATE.PLAYER_TURN]:   '▶ YOUR TURN',
      [STATE.ANIMATING]:     '  FIRING...',
      [STATE.ENEMY_ADVANCE]: '  ADVANCING...',
      [STATE.WAVE_CLEAR]:    '  SESSION CLEAR!',
      [STATE.GAME_OVER]:     '  GAME OVER',
    };
    this.stateTxt.setText(stateLabels[state] || '');
    this.stateTxt.setStyle({ color: state === STATE.PLAYER_TURN ? '#39ff14' : '#6b2fa0' });

    this.ctxPctTxt.setText(`${Math.round(ctx)}%`);
    this.chgPctTxt.setText(`${Math.round(chargeLvl)}%`);

    const inPerfect = chargeLvl >= perfectMin && chargeLvl <= perfectMax;
    this.perfectTxt.setText(inPerfect && charging ? '★ PERFECT PROMPT ★' : '');

    this.rewindTxt.setText(`[R] REWIND ×${rewindCount}`);
    this.rewindTxt.setAlpha(rewindAvail ? 1.0 : 0.3);
    this.rewindTxt.setStyle({ color: rewindAvail ? '#00e5ff' : '#445566' });
    if (splitReady) {
      this.splitTxt.setText('[Q] SPLIT   READY!');
      this.splitTxt.setStyle({ color: '#39ff14' });
    } else {
      this.splitTxt.setText(`[Q] SPLIT   ${Math.round(splitPct)}%`);
      this.splitTxt.setStyle({ color: '#8899aa' });
    }

    // ── Loadout icons ─────────────────────────────────────────
    const ups = r.get('upgrades') || {};
    const snap = JSON.stringify(ups);
    if (snap !== this._loadoutSnapshot) {
      this._loadoutSnapshot = snap;
      let slot = 0;
      for (let i = 0; i < LOADOUT_DEFS.length; i++) {
        const def = LOADOUT_DEFS[i];
        const count = ups[def.id] || 0;
        const { img, badge } = this._loadoutIcons[i];
        if (count > 0) {
          img.setPosition(200 + slot * 28, 12).setAlpha(1);
          badge.setPosition(200 + slot * 28 + 9, 20);
          badge.setText(count > 1 ? `×${count}` : '').setAlpha(count > 1 ? 1 : 0);
          slot++;
        } else {
          img.setAlpha(0);
          badge.setAlpha(0);
        }
      }
    }

    // ── Draw bars ────────────────────────────────────────────
    this.gfx.clear();
    this._drawContextBar(ctx, ctxColor, ctxSludge, ctxFloor);
    this._drawChargeBar(chargeLvl, charging, perfectMin, perfectMax, targetKillCharge);

    // ── Funny prompt animation while charging ─────────────────
    if (charging) {
      this._promptCooldown -= delta;
      if (this._promptCooldown <= 0) {
        this._spawnFunnyPrompt(chargeLvl, perfectMin, perfectMax);
        this._promptCooldown = this._promptInterval;
      }
    } else {
      this._promptCooldown = 0;
    }
    this._lastCharging = charging;

    // ── Hallucination FX when context is high ─────────────────
    this._updateHallucinationFX(ctx, time, delta);
  }

  // ─────────────────────────────────────────────────────────
  //  Context window bar (vertical, left side)
  // ─────────────────────────────────────────────────────────
  _drawContextBar(ctx, ctxColor, ctxSludge = 0, ctxFloor = CTX_SYSTEM_PROMPT) {
    const g = this.gfx;
    const x = BAR_X, y = BAR_Y, w = BAR_W, h = BAR_H;

    g.lineStyle(2, C.DARK_STEEL);
    g.strokeRect(x - 1, y - 1, w + 2, h + 2);

    g.fillStyle(C.VOID);
    g.fillRect(x, y, w, h);

    // System prompt zone (always occupied, bottom)
    const sysPx    = Math.round(h * (CTX_SYSTEM_PROMPT / 100));
    g.fillStyle(C.DEEP_PURPLE, 0.5);
    g.fillRect(x, y + h - sysPx, w, sysPx);

    // Sludge layer — rust-colored, sits just above system prompt
    if (ctxSludge > 0) {
      const sludgePx = Math.round(h * (ctxSludge / 100));
      g.fillStyle(0x7a3010, 0.85);
      g.fillRect(x, y + h - sysPx - sludgePx, w, sludgePx);
      // Gritty highlight on top edge
      g.fillStyle(0xbb5522, 0.5);
      g.fillRect(x, y + h - sysPx - sludgePx, w, 2);
    }

    // Active context fill (above sludge + system prompt)
    const floorPx  = Math.round(h * (ctxFloor / 100));
    const activePct = Math.max(0, (ctx - ctxFloor) / (100 - ctxFloor));
    const fillPx   = Math.round((h - floorPx) * activePct);
    if (fillPx > 0) {
      g.fillStyle(ctxColor, 0.85);
      g.fillRect(x, y + h - floorPx - fillPx, w, fillPx);
      g.fillStyle(0xffffff, 0.35);
      g.fillRect(x, y + h - floorPx - fillPx, w, 2);
    }

    // Optimal zone bracket
    const optMinY = y + h - Math.round(h * CTX_OPTIMAL_MAX / 100);
    const optMaxY = y + h - Math.round(h * CTX_OPTIMAL_MIN / 100);
    g.lineStyle(1, C.NEON_GREEN, 0.6);
    g.lineBetween(x + w, optMinY, x + w + 6, optMinY);
    g.lineBetween(x + w, optMaxY, x + w + 6, optMaxY);
    g.fillStyle(C.NEON_GREEN, 0.05);
    g.fillRect(x + w + 1, optMinY, 5, optMaxY - optMinY);

    // Overflow danger line
    const dangerY = y + h - Math.round(h * CTX_OVERFLOW / 100);
    g.lineStyle(1, C.DANGER_RED, 0.8);
    g.lineBetween(x - 2, dangerY, x + w + 2, dangerY);

    // Floor divider (top of sludge + system prompt)
    g.lineStyle(1, C.MID_PURPLE, 0.5);
    g.lineBetween(x, y + h - sysPx, x + w, y + h - sysPx);

    // Glass sheen
    g.fillStyle(0xffffff, 0.04);
    g.fillRect(x, y, 4, h);
  }

  // ─────────────────────────────────────────────────────────
  //  Charge bar (horizontal, bottom)
  // ─────────────────────────────────────────────────────────
  _drawChargeBar(chargeLvl, charging, perfectMin = PERFECT_ZONE_MIN, perfectMax = PERFECT_ZONE_MAX, targetKillCharge = null) {
    const g = this.gfx;
    const x = CHG_X, y = CHG_Y, w = CHG_W, h = CHG_H;

    g.lineStyle(2, C.DARK_STEEL);
    g.strokeRect(x - 1, y - 1, w + 2, h + 2);

    g.fillStyle(C.VOID);
    g.fillRect(x, y, w, h);

    // Perfect zone (dynamic position & width)
    const pzX = x + Math.round(w * perfectMin / 100);
    const pzW = Math.round(w * (perfectMax - perfectMin) / 100);
    g.fillStyle(C.GOLD, 0.15);
    g.fillRect(pzX, y, pzW, h);
    g.lineStyle(1, C.GOLD, 0.55);
    g.lineBetween(pzX, y, pzX, y + h);
    g.lineBetween(pzX + pzW, y, pzX + pzW, y + h);

    // Kill-charge tick — shows the exact charge needed to one-shot the target
    if (targetKillCharge !== null && targetKillCharge <= 100) {
      const tkX = x + Math.round(w * targetKillCharge / 100);
      g.lineStyle(2, 0xffffff, 0.75);
      g.lineBetween(tkX, y - 4, tkX, y + h + 4);
      // Small diamond marker above the bar
      g.fillStyle(0xffffff, 0.85);
      g.fillTriangle(tkX - 4, y - 5, tkX + 4, y - 5, tkX, y - 1);
    }

    // Fill
    if (chargeLvl > 0) {
      const fillW    = Math.round(w * chargeLvl / 100);
      const inPerfect= chargeLvl >= perfectMin && chargeLvl <= perfectMax;
      const barColor = inPerfect             ? C.GOLD :
                       chargeLvl > perfectMax ? C.WARNING_ORANGE : C.NEON_CYAN;
      g.fillStyle(barColor, 0.85);
      g.fillRect(x, y, fillW, h);
      g.fillStyle(0xffffff, 0.5);
      g.fillRect(x + fillW - 2, y, 2, h);
    }
  }

  // ─────────────────────────────────────────────────────────
  //  Funny prompt animation
  // ─────────────────────────────────────────────────────────
  _spawnFunnyPrompt(chargeLvl, perfectMin = PERFECT_ZONE_MIN, perfectMax = PERFECT_ZONE_MAX) {
    const phrase = FUNNY_PROMPTS[Math.floor(Math.random() * FUNNY_PROMPTS.length)];
    const fillW  = Math.round(CHG_W * chargeLvl / 100);

    // Appear at the fill edge on the charge bar
    const spawnX = CHG_X + Math.min(fillW, CHG_W) + Phaser.Math.Between(-10, 10);
    const spawnY = CHG_Y + Phaser.Math.Between(-4, CHG_H + 4);

    const inPerfect = chargeLvl >= perfectMin && chargeLvl <= perfectMax;
    const color     = inPerfect ? '#ffd700' : '#00e5ff';
    const size      = Phaser.Math.Between(10, 13);

    const t = this.add.text(spawnX, spawnY, phrase, {
      fontFamily: 'monospace',
      fontSize:   `${size}px`,
      color,
      stroke: '#000000',
      strokeThickness: 2,
      alpha: 0.9,
    }).setOrigin(0, 0.5).setDepth(85);

    // Float upward and fade
    const driftX = Phaser.Math.Between(-30, 30);
    this.tweens.add({
      targets:  t,
      y:        spawnY - Phaser.Math.Between(60, 110),
      x:        spawnX + driftX,
      alpha:    0,
      angle:    Phaser.Math.FloatBetween(-8, 8),
      duration: Phaser.Math.Between(700, 1100),
      ease:     'Power1',
      onComplete: () => t.destroy(),
    });
  }

  // ─────────────────────────────────────────────────────────
  //  Hallucination FX (context > CTX_HALLUCINATE)
  // ─────────────────────────────────────────────────────────
  _updateHallucinationFX(ctx, time, delta) {
    const active  = ctx >= CTX_HALLUCINATE;
    const strength = active ? (ctx - CTX_HALLUCINATE) / (100 - CTX_HALLUCINATE) : 0; // 0→1

    if (active) {
      // Cycle rainbow hue
      this._rainbowHue = (this._rainbowHue + RAINBOW_SPEED * delta * (1 + strength)) % 1;
      const rgb   = Phaser.Display.Color.HSVColorWheel()[Math.floor(this._rainbowHue * 360)];
      const color = Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b);

      // Overlay tint
      this._halluciOverlay.setFillStyle(color, strength * 0.18);

      // "HALLUCINATING" text — undulating with sin wave on y + color cycling
      const wave  = Math.sin(time * 0.005) * 12 * strength;
      const wobble= Math.sin(time * 0.003) * 4  * strength;
      this._halluciText.setPosition(GAME_WIDTH / 2 + wobble, GAME_HEIGHT / 2 - 60 + wave);
      this._halluciText.setAlpha(strength * 0.85);
      this._halluciText.setAngle(Math.sin(time * 0.002) * 3 * strength);

      // Cycle text color through hues
      const hue2 = (this._rainbowHue + 0.5) % 1;
      const rgb2 = Phaser.Display.Color.HSVColorWheel()[Math.floor(hue2 * 360)];
      const hex2 = '#' + Phaser.Display.Color.GetColor(rgb2.r, rgb2.g, rgb2.b).toString(16).padStart(6, '0');
      this._halluciText.setStyle({ color: hex2 });

      // Shake the camera slightly when nearly full
      if (strength > 0.6 && Math.random() < 0.02) {
        this.cameras.main.shake(80, 0.003 * strength);
      }
    } else {
      this._halluciOverlay.setFillStyle(0, 0);
      this._halluciText.setAlpha(0);
    }
  }

  // ─────────────────────────────────────────────────────────
  //  Utility
  // ─────────────────────────────────────────────────────────
  _txt(x, y, msg, size, color) {
    return this.add.text(x, y, msg, {
      fontFamily: 'monospace', fontSize: size, color,
      stroke: '#0a0014', strokeThickness: 2,
    }).setDepth(80);
  }
}
