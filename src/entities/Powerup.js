import {
  LANES, ENEMY_BOUNDARY_X, STEP_SIZE,
  STEP_ADVANCE_MS, C
} from '../constants.js';

export const POWERUP_TYPES = {
  RAG: {
    key: 'RAG',
    label: 'R.A.G.',
    color: C.NEON_GREEN,
    desc: 'ZERO CONTEXT SHOT'
  },
  AGENT: {
    key: 'AGENT',
    label: 'AGENT',
    color: C.WARNING_ORANGE,
    desc: 'AUTO FIRE X5 (OVERLOADS CONTEXT)'
  },
  REWIND: {
    key: 'REWIND',
    label: 'CTRL+Z',
    color: 0xaa44ff,
    desc: '+1 REWIND'
  },
  SPLIT: {
    key: 'SPLIT',
    label: 'FORK',
    color: C.NEON_CYAN,
    desc: 'MAX SPLIT CHARGE'
  }
};

export class Powerup extends Phaser.GameObjects.Container {
  constructor(scene, pTypeKey, lane, steps) {
    const x = ENEMY_BOUNDARY_X + steps * STEP_SIZE;
    const y = LANES[lane];
    super(scene, x, y);

    this.pType = POWERUP_TYPES[pTypeKey];
    if (!this.pType) {
      console.warn(`[Powerup] Unknown type "${pTypeKey}", falling back to RAG`);
      this.pType = POWERUP_TYPES.RAG;
    }
    this.lane = lane;
    this.steps = steps;
    this.alive = true;
    this._hoverPhase = Math.random() * Math.PI * 2;

    // Glowing aura
    this.aura = scene.add.circle(0, 0, 16, this.pType.color, 0.4);
    this.add(this.aura);
    scene.tweens.add({
      targets: this.aura,
      scale: 1.4,
      alpha: 0.1,
      yoyo: true,
      repeat: -1,
      duration: 800
    });

    // Central core
    this.core = scene.add.rectangle(0, 0, 14, 14, C.SPACE);
    this.core.setStrokeStyle(2, this.pType.color, 1);
    this.add(this.core);

    // Label
    this.label = scene.add.text(0, 0, this.pType.label, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5);
    this.add(this.label);

    scene.add.existing(this);

    // Spawn pop
    this.setScale(0);
    scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.Out'
    });
  }

  update(time, delta) {
    if (!this.alive) return;
    const bobT = Math.sin(time * 0.004 + this._hoverPhase);
    this.y = LANES[this.lane] + bobT * 5;
    this.core.angle += 0.05 * delta;
  }

  advanceStep(scene, onDone) {
    if (!this.alive) { onDone(); return; }
    this.steps--;
    const targetX = ENEMY_BOUNDARY_X + this.steps * STEP_SIZE;
    scene.tweens.add({
      targets: this,
      x: targetX,
      duration: STEP_ADVANCE_MS,
      ease: 'Power2',
      onComplete: () => onDone(),
    });
  }

  forceAdvance(stepsCount) {
    this.steps = Math.max(0, this.steps - stepsCount);
    this.x = ENEMY_BOUNDARY_X + this.steps * STEP_SIZE;
  }

  collect() {
    this.alive = false;
    this.scene.tweens.add({
      targets: this,
      y: this.y - 40,
      alpha: 0,
      scale: 1.5,
      duration: 400,
      onComplete: () => this.destroy()
    });
  }

  dissolve() {
    this.alive = false;
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      alpha: 0,
      duration: 300,
      onComplete: () => this.destroy()
    });
  }
}
