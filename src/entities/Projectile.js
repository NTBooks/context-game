import { GAME_WIDTH, C } from '../constants.js';

const SPEED = 520; // px/s

export class Projectile extends Phaser.GameObjects.Container {
  constructor(scene, x, y, heatColor, targetLane) {
    super(scene, x, y);

    this.lane = targetLane;
    this.alive = true;
    this._trailPoints = [];

    // Main beam
    this.beam = scene.add.image(0, 0, 'projectile');
    this.beam.setOrigin(0, 0.5);
    this.beam.setTint(heatColor);
    this.add(this.beam);

    // Bright core dot
    this.core = scene.add.rectangle(2, 0, 6, 6, 0xffffff);
    this.core.setOrigin(0, 0.5);
    this.add(this.core);

    // Trail graphics
    this.trailGfx = scene.add.graphics();
    this.add(this.trailGfx);

    this._heatColor = heatColor;

    scene.add.existing(this);
  }

  update(time, delta) {
    if (!this.alive) return;
    const dt = delta / 1000;

    // Record trail
    this._trailPoints.unshift({ x: this.x, y: this.y });
    if (this._trailPoints.length > 12) this._trailPoints.pop();

    this.x += SPEED * dt;

    // Off-screen → destroy
    if (this.x > GAME_WIDTH + 50) {
      this.alive = false;
    }

    this._drawTrail();
  }

  _drawTrail() {
    this.trailGfx.clear();
    const len = this._trailPoints.length;
    for (let i = 0; i < len; i++) {
      const pt = this._trailPoints[i];
      const alpha = (1 - i / len) * 0.6;
      const size = Math.max(1, 4 - i * 0.4);
      // Draw trail in world space (offset from container)
      this.trailGfx.fillStyle(this._heatColor, alpha);
      this.trailGfx.fillRect(
        pt.x - this.x - size / 2,
        pt.y - this.y - size / 2,
        size, size
      );
    }
  }

  destroy() {
    super.destroy();
  }
}
