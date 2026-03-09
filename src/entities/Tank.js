import { LANES, TANK_X, C } from '../constants.js';

export class Tank extends Phaser.GameObjects.Container {
  constructor(scene, laneIndex = 1) {
    super(scene, TANK_X, LANES[laneIndex]);

    this.currentLane = laneIndex;
    this._targetY = LANES[laneIndex];
    this._isSplit = false;
    this._isIntro = false;

    // Main body sprite
    this.bodySprite = scene.add.image(0, 0, 'tank-body');
    this.bodySprite.setOrigin(0.5, 0.5);
    this.add(this.bodySprite);

    // Running lights
    const lightDefs = [
      { x: -21, y: 6, c: 0xff3333 },
      { x: -11, y: 5, c: C.NEON_CYAN },
      { x: -1, y: 4, c: 0xffee33 },
      { x: 9, y: 5, c: C.NEON_CYAN },
      { x: 19, y: 6, c: 0xff3333 }
    ];
    this.runningLights = lightDefs.map(def => {
      const l = scene.add.circle(def.x, def.y, 2, def.c);
      this.add(l);
      return l;
    });

    // Barrel (single)
    this.barrelSingle = scene.add.image(28, -4, 'tank-barrel');
    this.barrelSingle.setOrigin(0, 0.5);
    this.add(this.barrelSingle);

    // Dual barrels (split mode, hidden by default)
    this.barrelSplit = scene.add.image(28, -4, 'tank-barrel-split');
    this.barrelSplit.setOrigin(0, 0.5);
    this.barrelSplit.setVisible(false);
    this.add(this.barrelSplit);

    // Aim glow at barrel tip
    this.aimGlow = scene.add.rectangle(62, -4, 6, 6, C.NEON_CYAN);
    this.aimGlow.setOrigin(0.5, 0.5);
    this.add(this.aimGlow);

    // "L.L.M." label inside dome
    this.label = scene.add.text(0, -3, 'L.L.M.', {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: '#00ffff',
      stroke: '#000d1a',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);
    this.add(this.label);

    scene.add.existing(this);
  }

  /** Move to adjacent lane. dir = -1 (up) or +1 (down) */
  moveLane(dir) {
    const next = Phaser.Math.Clamp(this.currentLane + dir, 0, LANES.length - 1);
    if (next === this.currentLane) return;
    this.currentLane = next;
    this._targetY = LANES[next];
  }

  /** Snap directly to lane index */
  setLane(idx) {
    this.currentLane = Phaser.Math.Clamp(idx, 0, LANES.length - 1);
    this._targetY = LANES[this.currentLane];
    this.y = this._targetY;
  }

  update(time, delta) {
    if (!this._isIntro) {
      // Smooth movement toward target lane, with gentle saucer hover baked in
      const hoverY = Math.sin(time * 0.0018) * 2.5;
      const dy = (this._targetY + hoverY) - this.y;
      if (Math.abs(dy) > 0.5) {
        this.y += dy * Math.min(1, delta * 0.015);
      } else {
        this.y = this._targetY + hoverY;
      }

      // Aim glow pulse
      const pulse = 0.6 + 0.4 * Math.sin(time * 0.008);
      this.aimGlow.setAlpha(pulse);
    }

    // Running lights animation
    this.runningLights.forEach((l, i) => {
      const offsetTime = time * 0.005 + i * 0.8;
      l.setAlpha(0.4 + 0.6 * Math.max(0, Math.sin(offsetTime)));
    });
  }

  introAnimation(onComplete) {
    this._isIntro = true;
    this.aimGlow.setAlpha(0);

    const targetX = this.x;
    const targetY = this.y;

    // Start way bigger and centered
    this.setScale(12);
    this.x = 480; 
    this.y = 270;

    // Use a steppy tween for SuperFX look
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      x: targetX,
      y: targetY,
      duration: 1200,
      ease: 'Stepped',
      easeParams: [15], // 15 discrete steps
      onComplete: () => {
        this._isIntro = false;
        if (onComplete) onComplete();
      }
    });
  }

  /** Show dual barrels for split shot */
  setSplit(active) {
    this._isSplit = active;
    this.barrelSingle.setVisible(!active);
    this.barrelSplit.setVisible(active);
  }

  /** Temporarily change L.L.M. text color to show RAG is active */
  applyRagVisuals(isActive) {
    if (isActive) {
      this.label.setText('R.A.G.');
      this.label.setColor('#39ff14'); // NEON_GREEN
      if (!this._ragTween) {
        this._ragTween = this.scene.tweens.add({
          targets: this.label,
          scale: 1.5,
          yoyo: true,
          repeat: -1,
          duration: 300
        });
      }
    } else {
      this.label.setText('L.L.M.');
      this.label.setColor('#00ffff');
      this.label.setScale(1);
      if (this._ragTween) {
        this._ragTween.stop();
        this._ragTween = null;
      }
    }
  }

  /** X position of barrel tip */
  get barrelTipX() { return this.x + 64; }
  get barrelTipY() { return this.y - 4; }
}
