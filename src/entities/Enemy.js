import {
  ENEMY_TYPES, LANES, ENEMY_BOUNDARY_X, STEP_SIZE,
  STEP_ADVANCE_MS, C,
  ENEMY_SIZE_MIN, ENEMY_SIZE_MAX,
  CTX_HALLUCINATE, HALLUCINATION_LABELS
} from '../constants.js';

export class Enemy extends Phaser.GameObjects.Container {
  constructor(scene, type, lane, steps) {
    let cfg = ENEMY_TYPES[type];
    if (!cfg) {
      console.warn(`[Enemy] Unknown type "${type}", falling back to first available`);
      cfg = ENEMY_TYPES[Object.keys(ENEMY_TYPES)[0]];
    }
    const x   = ENEMY_BOUNDARY_X + steps * STEP_SIZE;
    const y   = LANES[lane];
    super(scene, x, y);

    this.cfg     = cfg;
    this.lane    = lane;
    this.steps   = steps;
    this.alive   = true;
    this._flashTimer = 0;
    this._wingPhase  = Math.random() * Math.PI * 2;
    this._everHit    = false;
    this._isHallucinating = false;
    this._originalHue = 0xffffff;

    // Variable size: bigger enemies have more HP, smaller ones less
    this._sizeScale  = cfg.isBoss ? 1.0 : Phaser.Math.FloatBetween(ENEMY_SIZE_MIN, ENEMY_SIZE_MAX);
    this._baseScale  = this._sizeScale;
    this.hp          = Math.max(1, Math.round(cfg.hp * this._sizeScale));
    this.maxHp       = this.hp;

    // Shield state
    this._shielded = !!cfg.shieldBreak;

    let spriteRadius = 24;
    if (cfg.isBoss) spriteRadius = 64; // Massive bounding width for multi-lane 
    else if (cfg.key === 'PRIORITY' || cfg.key === 'DEADLINE') spriteRadius = 32;
    else if (cfg.key === 'TECH_DEBT') spriteRadius = 28;
    else if (cfg.key === 'CHORE') spriteRadius = 20;
    else if (cfg.key === 'SHOOTER_ADD') spriteRadius = 18;
    
    // Hover shadow — rendered first so it's behind everything
    this.hoverShadow = scene.add.ellipse(0, spriteRadius + 4, 30 + (spriteRadius*0.75), 6, 0x000000, 0.25);
    this.add(this.hoverShadow);

    // Sprite
    this.sprite = scene.add.image(0, 0, cfg.textureKey);
    this.sprite.setOrigin(0.5, 0.5);
    this.add(this.sprite);

    // Shield glow — added after sprite so it draws on top
    if (this._shielded) {
      this.shieldGfx = scene.add.graphics();
      this.shieldGfx.lineStyle(2, 0x44aaff, 1);
      this.shieldGfx.strokeCircle(0, 0, spriteRadius + 8);
      this.shieldGfx.lineStyle(1, 0x88ddff, 0.4);
      this.shieldGfx.strokeCircle(0, 0, spriteRadius + 3);
      this.add(this.shieldGfx);
    } else {
      this.shieldGfx = null;
    }

    // Enemy type label above sprite
    this.vibeLabel = scene.add.text(0, -spriteRadius - 6, cfg.label, {
      fontFamily: 'monospace', fontSize: '12px',
      color: '#ff88ff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 1);
    this.vibeLabel.setScale(1 / this._baseScale);
    this.add(this.vibeLabel);

    // HP bar — hidden until first hit
    this.hpBarWidth = spriteRadius * 1.5;
    this.hpBarBg = scene.add.rectangle(0, spriteRadius + 6, this.hpBarWidth, 4, 0x220022);
    this.hpBarBg.setOrigin(0.5, 0.5);
    this.hpBarBg.setVisible(false);
    this.add(this.hpBarBg);

    this.hpBar = scene.add.rectangle(-this.hpBarWidth/2, spriteRadius + 6, this.hpBarWidth, 4, C.NEON_GREEN);
    this.hpBar.setOrigin(0, 0.5);
    this.hpBar.setVisible(false);
    this.add(this.hpBar);

    scene.add.existing(this);

    // Spring entry — pop in from zero
    this.setScale(0);
    scene.tweens.add({
      targets:  this,
      scaleX:   this._baseScale,
      scaleY:   this._baseScale,
      duration: 480,
      ease:     'Back.Out',
      delay:    Phaser.Math.Between(0, 120),
    });

    // Wing-rock tween — gentle banking oscillation
    const rockAngle = Phaser.Math.FloatBetween(2.5, 4.5);
    this.sprite.angle = rockAngle;
    scene.tweens.add({
      targets:  this.sprite,
      angle:    -rockAngle,
      yoyo:     true,
      repeat:   -1,
      duration: Phaser.Math.Between(700, 1100),
      ease:     'Sine.InOut',
    });
  }

  update(time, delta) {
    if (!this.alive) return;

    // Gentle hover bob
    const bobT = Math.sin(time * 0.003 + this._wingPhase);
    this.y = LANES[this.lane] + bobT * 4;

    // Shadow responds to bob height (closer to ground = bigger/darker)
    const shadowFactor = 0.75 + 0.25 * (1 - (bobT + 1) / 2);
    this.hoverShadow.setScale(shadowFactor, 1);
    this.hoverShadow.setAlpha(0.1 + 0.2 * shadowFactor);

    // Flash recovery
    if (this._flashTimer > 0) {
      this._flashTimer -= delta;
      if (this._flashTimer <= 0) this.sprite.clearTint();
    }

    // Shield pulse
    if (this._shielded && this.shieldGfx) {
      this.shieldGfx.setAlpha(0.55 + 0.45 * Math.sin(time * 0.004));
    }

    // HP bar (only when visible)
    if (this._everHit) {
      const pct = this.hp / this.maxHp;
      this.hpBar.width = this.hpBarWidth * pct;
      this.hpBar.fillColor = pct > 0.5 ? C.NEON_GREEN : pct > 0.25 ? C.HEAT_YELLOW : C.DANGER_RED;
    }

    // Check Hallucination State
    const currentCtx = this.scene.registry.get('ctx') || 0;
    const shouldHallucinate = currentCtx >= CTX_HALLUCINATE;

    if (shouldHallucinate && !this._isHallucinating) {
      this._startHallucinating();
    } else if (!shouldHallucinate && this._isHallucinating) {
      this._stopHallucinating();
    }

    if (this._isHallucinating) {
      // Chaotic rendering effects
      if (Math.random() < 0.05) {
        this.sprite.x = Phaser.Math.Between(-4, 4);
        this.sprite.y = Phaser.Math.Between(-4, 4);
      }
    }
  }

  _startHallucinating() {
    this._isHallucinating = true;
    
    // Pick a completely random texture from other enemies
    const keys = Object.keys(ENEMY_TYPES);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    this.sprite.setTexture(ENEMY_TYPES[randomKey].textureKey);

    // Chaotic tint
    this._originalHue = Phaser.Math.Between(0, 0xffffff);
    this.sprite.setTint(this._originalHue);

    // Glitch label
    const randLabel = HALLUCINATION_LABELS[Math.floor(Math.random() * HALLUCINATION_LABELS.length)];
    this.vibeLabel.setText(randLabel);
    this.vibeLabel.setColor('#ffff00');
  }

  _stopHallucinating() {
    this._isHallucinating = false;
    
    // Restore sanity
    this.sprite.setTexture(this.cfg.textureKey);
    this.sprite.clearTint();
    this.sprite.setPosition(0, 0);
    this.vibeLabel.setText(this.cfg.label);
    this.vibeLabel.setColor('#ff88ff');
  }

  /**
   * Deal damage.
   * Returns { killed: bool, bounced: bool }
   * bounced=true means shot didn't meet shield threshold.
   */
  hit(dmg) {
    if (!this.alive) return { killed: false, bounced: false };

    // Shield check
    if (this._shielded) {
      if (dmg < this.cfg.shieldBreak) return { killed: false, bounced: true };
      // Enough force — break the shield, apply damage
      this._shielded = false;
      if (this.shieldGfx) { this.shieldGfx.destroy(); this.shieldGfx = null; }
    }

    // Reveal HP bar on first hit
    if (!this._everHit) {
      this._everHit = true;
      this.hpBarBg.setVisible(true);
      this.hpBar.setVisible(true);
    }

    this.hp -= dmg;
    this.sprite.setTint(0xffffff);
    this._flashTimer = 80;
    if (this.hp <= 0) { this.alive = false; return { killed: true, bounced: false }; }
    
    // If hallucinating we need to restore the chaotic tint after hit flash
    if (this._isHallucinating) {
      this.scene.time.delayedCall(80, () => {
        if (this.alive && this._isHallucinating) this.sprite.setTint(this._originalHue);
      });
    }

    return { killed: false, bounced: false };
  }

  advanceStep(scene, onDone) {
    if (!this.alive) { onDone(); return; }
    this.steps--;
    const targetX = ENEMY_BOUNDARY_X + this.steps * STEP_SIZE;
    scene.tweens.add({
      targets:  this,
      x:        targetX,
      duration: STEP_ADVANCE_MS,
      ease:     'Power2',
      onComplete: () => onDone(),
    });
  }

  forceAdvance(stepsCount) {
    this.steps = Math.max(0, this.steps - stepsCount);
    this.x     = ENEMY_BOUNDARY_X + this.steps * STEP_SIZE;
  }

  get reachedCodebase() {
    return this.steps <= 0;
  }

  destroy() { super.destroy(); }
}
