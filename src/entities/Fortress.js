import { FORTRESS_X, FORTRESS_Y, FORTRESS_W, FORTRESS_H, C } from '../constants.js';

const SPRITE_SCALE = 0.82;

export class Fortress extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, FORTRESS_X + FORTRESS_W / 2, FORTRESS_Y);

    this.shield = 100;
    this._flashTimer = 0;

    // Building sprite — slightly smaller than native texture
    this.sprite = scene.add.image(0, 0, 'fortress');
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setScale(SPRITE_SCALE);
    this.add(this.sprite);

    // Shield glow scaled to match sprite
    const gw = FORTRESS_W * SPRITE_SCALE + 10;
    const gh = FORTRESS_H * SPRITE_SCALE + 10;
    this.shieldGlow = scene.add.rectangle(0, 0, gw, gh);
    this.shieldGlow.setStrokeStyle(3, C.NEON_CYAN, 0.7);
    this.shieldGlow.setFillStyle(C.NEON_CYAN, 0.04);
    this.shieldGlow.setOrigin(0.5, 0.5);
    this.add(this.shieldGlow);

    scene.add.existing(this);
  }

  /** Take shield damage. Returns true if fortress destroyed. */
  takeDamage(amount) {
    this.shield = Math.max(0, this.shield - amount);
    this._flashTimer = 300;
    this.sprite.setTint(0xff4444);
    return this.shield <= 0;
  }

  /** Add a persistent scorch + smoke puff at a random spot on the sprite. */
  addSmokeHole(scene) {
    const hw = (FORTRESS_W * SPRITE_SCALE) / 2 - 8;
    const hh = (FORTRESS_H * SPRITE_SCALE) / 2 - 8;
    const localX = Phaser.Math.FloatBetween(-hw, hw);
    const localY = Phaser.Math.FloatBetween(-hh, hh);

    // Persistent scorch mark
    const scorch = scene.add.ellipse(localX, localY, 18, 9, 0x110000, 0.9);
    this.add(scorch);

    // A few smoke puffs rising from the scorch
    for (let i = 0; i < 5; i++) {
      scene.time.delayedCall(i * 280, () => {
        if (!this.active) return;
        const sx = localX + Phaser.Math.Between(-5, 5);
        const s = scene.add.rectangle(sx, localY, 5, 5, 0x666677, 0.7);
        this.add(s);
        scene.tweens.add({
          targets: s,
          y: localY - Phaser.Math.Between(22, 48),
          x: sx + Phaser.Math.Between(-8, 8),
          alpha: 0,
          scaleX: 3,
          scaleY: 3,
          duration: Phaser.Math.Between(700, 1300),
          onComplete: () => s.destroy(),
        });
      });
    }
  }

  update(time, delta) {
    if (this._flashTimer > 0) {
      this._flashTimer -= delta;
      if (this._flashTimer <= 0) this.sprite.clearTint();
    }

    const alpha = (this.shield / 100) * (0.5 + 0.3 * Math.sin(time * 0.004));
    this.shieldGlow.setAlpha(alpha);
    const shieldColor = this.shield > 50 ? C.NEON_CYAN :
                        this.shield > 25 ? C.HEAT_YELLOW : C.DANGER_RED;
    this.shieldGlow.setStrokeStyle(3, shieldColor, 0.7);
  }
}
