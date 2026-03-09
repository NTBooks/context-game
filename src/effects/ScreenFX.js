import { C } from '../constants.js';

/** Brief camera shake */
export function shake(scene, intensity = 6, duration = 250) {
  scene.cameras.main.shake(duration, intensity / 1000);
}

/** Full-screen color flash */
export function flash(scene, color = 0xff1744, alpha = 0.45, duration = 300) {
  const w = scene.game.config.width;
  const h = scene.game.config.height;
  const overlay = scene.add.rectangle(w / 2, h / 2, w, h, color, alpha);
  overlay.setDepth(50);
  scene.tweens.add({
    targets: overlay,
    alpha: 0,
    duration,
    ease: 'Power2',
    onComplete: () => overlay.destroy(),
  });
}

/** "COMPACTION!" banner that slides in and fades */
export function showCompactionBanner(scene) {
  const w = scene.game.config.width;
  const h = scene.game.config.height;

  const bg = scene.add.rectangle(w / 2, h / 2, 480, 70, C.DANGER_RED, 0.85);
  bg.setDepth(60);

  const text = scene.add.text(w / 2, h / 2, '!! CONTEXT OVERFLOW — COMPACTION !!', {
    fontFamily: 'monospace',
    fontSize: '22px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5, 0.5).setDepth(61);

  const sub = scene.add.text(w / 2, h / 2 + 26, 'Too many tokens! Context compacted — invaders advance!', {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#ffaaaa',
  }).setOrigin(0.5, 0.5).setDepth(61);

  scene.time.delayedCall(1600, () => {
    scene.tweens.add({
      targets: [bg, text, sub],
      alpha: 0,
      duration: 400,
      onComplete: () => { bg.destroy(); text.destroy(); sub.destroy(); },
    });
  });
}

/** "PERFECT PROMPT!" banner */
export function showPerfectBanner(scene, x, y) {
  const text = scene.add.text(x, y - 30, 'PERFECT PROMPT!', {
    fontFamily: 'monospace',
    fontSize: '16px',
    color: '#ffd700',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5, 1).setDepth(55);

  scene.tweens.add({
    targets: text,
    y: y - 80,
    alpha: 0,
    duration: 900,
    ease: 'Power2',
    onComplete: () => text.destroy(),
  });
}

/** Floating damage number */
export function showDamageNumber(scene, x, y, dmg, isPerfect = false) {
  const color = isPerfect ? '#ffd700' : '#ffffff';
  const size  = isPerfect ? '18px' : '14px';
  const text = scene.add.text(x, y, `-${dmg}`, {
    fontFamily: 'monospace',
    fontSize: size,
    color,
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5, 1).setDepth(55);

  scene.tweens.add({
    targets: text,
    y: y - 50,
    alpha: 0,
    duration: 700,
    ease: 'Power1',
    onComplete: () => text.destroy(),
  });
}

/** Glancing blow — shot was too weak to dent armored enemy */
export function showGlancingBlow(scene, x, y, dmg) {
  const text = scene.add.text(x, y - 10, `GLANCING! -${dmg}`, {
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#778899',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5, 1).setDepth(55);

  scene.tweens.add({
    targets: text,
    y: y - 45,
    alpha: 0,
    duration: 600,
    ease: 'Power1',
    onComplete: () => text.destroy(),
  });
}

/** Overkill — way too much damage for a weak enemy */
export function showOverkillText(scene, x, y) {
  const text = scene.add.text(x, y - 28, 'OVERKILL! +CTX', {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#ff6b00',
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5, 1).setDepth(55);

  scene.tweens.add({
    targets: text,
    y: y - 72,
    alpha: 0,
    duration: 800,
    ease: 'Power2',
    onComplete: () => text.destroy(),
  });
}

/** Wave clear banner */
export function showWaveClear(scene, waveNum, onDone) {
  const w = scene.game.config.width;
  const h = scene.game.config.height;

  const bg = scene.add.rectangle(w / 2, h / 2, 420, 80, C.DEEP_PURPLE, 0.9);
  bg.setDepth(60);

  const text = scene.add.text(w / 2, h / 2 - 14, `SESSION ${waveNum} CLEARED`, {
    fontFamily: 'monospace',
    fontSize: '26px',
    color: '#39ff14',
    stroke: '#000000',
    strokeThickness: 3,
  }).setOrigin(0.5, 0.5).setDepth(61);

  const sub = scene.add.text(w / 2, h / 2 + 18, 'More vibes incoming...', {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#aaccff',
  }).setOrigin(0.5, 0.5).setDepth(61);

  scene.time.delayedCall(1800, () => {
    scene.tweens.add({
      targets: [bg, text, sub],
      alpha: 0,
      duration: 400,
      onComplete: () => {
        bg.destroy(); text.destroy(); sub.destroy();
        if (onDone) onDone();
      },
    });
  });
}
