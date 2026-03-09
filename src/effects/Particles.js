import { C } from '../constants.js';

/**
 * Spawn a burst of pixel debris at world position (x, y).
 * Uses simple tweened rectangles (no Phaser particle manager needed).
 */
export function spawnExplosion(scene, x, y, color = C.WARNING_ORANGE, count = 10) {
  for (let i = 0; i < count; i++) {
    const size = Phaser.Math.Between(2, 5);
    const particle = scene.add.rectangle(x, y, size, size, color);
    particle.setDepth(20);

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const dist = Phaser.Math.FloatBetween(20, 80);
    const tx = x + Math.cos(angle) * dist;
    const ty = y + Math.sin(angle) * dist;
    const duration = Phaser.Math.Between(280, 500);

    scene.tweens.add({
      targets: particle,
      x: tx,
      y: ty,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration,
      ease: 'Power2',
      onComplete: () => particle.destroy(),
    });
  }

  // Bright flash ring
  const ring = scene.add.circle(x, y, 4, color, 0.9);
  ring.setDepth(19);
  scene.tweens.add({
    targets: ring,
    scaleX: 5,
    scaleY: 5,
    alpha: 0,
    duration: 200,
    ease: 'Power2',
    onComplete: () => ring.destroy(),
  });
}

/** Sparks flying rightward from tank barrel tip */
export function spawnMuzzleFlash(scene, x, y, color = C.NEON_CYAN) {
  for (let i = 0; i < 6; i++) {
    const p = scene.add.rectangle(x, y, 3, 3, color);
    p.setDepth(15);
    const angle = Phaser.Math.FloatBetween(-0.4, 0.4);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * Phaser.Math.Between(15, 40),
      y: y + Math.sin(angle) * Phaser.Math.Between(5, 20),
      alpha: 0,
      duration: Phaser.Math.Between(100, 220),
      onComplete: () => p.destroy(),
    });
  }
}

/** Perfect prompt golden sparkle burst */
export function spawnPerfectBurst(scene, x, y) {
  for (let i = 0; i < 16; i++) {
    const size = Phaser.Math.Between(3, 7);
    const p = scene.add.rectangle(x, y, size, size, C.GOLD);
    p.setDepth(25);
    const angle = (i / 16) * Math.PI * 2;
    const dist = Phaser.Math.FloatBetween(30, 90);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: Phaser.Math.Between(350, 600),
      ease: 'Power1',
      onComplete: () => p.destroy(),
    });
  }
}

/** Shot bounced off shield — ricochet beams + sparks fly leftward */
export function spawnBounce(scene, x, y) {
  // Shield impact ring
  const ring = scene.add.circle(x, y, 26, 0x44aaff, 0);
  ring.setDepth(22);
  ring.setStrokeStyle(3, 0x88ddff, 1);
  scene.tweens.add({
    targets: ring, scaleX: 2.2, scaleY: 2.2, alpha: 0,
    duration: 280, ease: 'Power2',
    onComplete: () => ring.destroy(),
  });

  // Bright center flash
  const flash = scene.add.circle(x, y, 8, 0xaaddff, 0.95);
  flash.setDepth(23);
  scene.tweens.add({
    targets: flash, scaleX: 3, scaleY: 3, alpha: 0,
    duration: 180, ease: 'Power3',
    onComplete: () => flash.destroy(),
  });

  // 3 ricochet beam fragments flying back-left at spread angles
  const ricoDirs = [150, 180, 210];
  ricoDirs.forEach((angleDeg, i) => {
    const beam = scene.add.rectangle(x, y, Phaser.Math.Between(20, 30), 4, 0x88ddff, 0.9);
    beam.setOrigin(0.5, 0.5);
    beam.setDepth(22);
    beam.setAngle(angleDeg);
    const rad  = Phaser.Math.DegToRad(angleDeg);
    const dist = Phaser.Math.Between(50, 90);
    scene.tweens.add({
      targets: beam,
      x: x + Math.cos(rad) * dist,
      y: y + Math.sin(rad) * dist,
      alpha: 0,
      scaleX: 0.1,
      duration: Phaser.Math.Between(220, 340),
      delay: i * 20,
      ease: 'Power1',
      onComplete: () => beam.destroy(),
    });
  });

  // Blue sparks spread in a broad leftward arc
  for (let i = 0; i < 10; i++) {
    const size = Phaser.Math.Between(2, 5);
    const p = scene.add.rectangle(x, y, size, size, i % 2 === 0 ? 0x44aaff : 0xaaddff);
    p.setDepth(20);
    const angle = Phaser.Math.FloatBetween(Math.PI * 0.45, Math.PI * 1.55);
    const dist  = Phaser.Math.FloatBetween(25, 70);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0, scaleX: 0.2, scaleY: 0.2,
      duration: Phaser.Math.Between(200, 420),
      onComplete: () => p.destroy(),
    });
  }
}

/**
 * SuperFX-style enemy death — detaches sprite and flings it off-screen
 * with chunky debris and a big flash ring.
 */
export function spawnSuperFXDeath(scene, enemy) {
  const ex = enemy.x;
  const ey = enemy.y;

  // Detach and fling the sprite
  const sprite = enemy.sprite;
  if (sprite) {
    scene.tweens.killTweensOf(sprite);
    enemy.remove(sprite, false);
    sprite.setPosition(ex, ey);
    sprite.setScale(enemy._baseScale || 1);
    sprite.setDepth(25);
    scene.add.existing(sprite);

    const vx = Phaser.Math.Between(120, 260) * (Math.random() > 0.5 ? 1 : -1);
    const vy = Phaser.Math.Between(-280, -120);
    scene.tweens.add({
      targets:  sprite,
      x:        ex + vx,
      y:        ey + vy,
      angle:    Phaser.Math.Between(400, 820),
      scaleX:   0,
      scaleY:   0,
      alpha:    0,
      duration: Phaser.Math.Between(520, 700),
      ease:     'Power2',
      onComplete: () => sprite.destroy(),
    });
  }

  // Hide the rest of the container immediately
  enemy.setVisible(false);

  // Chunky debris squares — SuperFX palette
  const palette = [0xff6b00, 0xff1744, 0xffd700, 0xffffff, 0x00e5ff];
  for (let i = 0; i < 16; i++) {
    const size = Phaser.Math.Between(4, 10);
    const p    = scene.add.rectangle(ex, ey, size, size, palette[i % palette.length]);
    p.setDepth(24);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const dist  = Phaser.Math.FloatBetween(50, 170);
    scene.tweens.add({
      targets:  p,
      x:        ex + Math.cos(angle) * dist,
      y:        ey + Math.sin(angle) * dist,
      angle:    Phaser.Math.Between(180, 540),
      alpha:    0,
      scaleX:   0.1,
      scaleY:   0.1,
      duration: Phaser.Math.Between(380, 680),
      ease:     'Power2',
      onComplete: () => p.destroy(),
    });
  }

  // Big white flash ring
  const ring1 = scene.add.circle(ex, ey, 8, 0xffffff, 1);
  ring1.setDepth(26);
  scene.tweens.add({
    targets: ring1, scaleX: 11, scaleY: 11, alpha: 0,
    duration: 280, ease: 'Power3',
    onComplete: () => ring1.destroy(),
  });

  // Secondary orange ring
  const ring2 = scene.add.circle(ex, ey, 6, C.WARNING_ORANGE, 0.85);
  ring2.setDepth(25);
  scene.tweens.add({
    targets: ring2, scaleX: 7, scaleY: 7, alpha: 0,
    duration: 480, ease: 'Power2',
    onComplete: () => ring2.destroy(),
  });
}

/** Explosion + smoke when an enemy hits the codebase fortress. */
export function spawnFortressImpact(scene, x, y) {
  // Main explosion at impact
  spawnExplosion(scene, x, y, C.DANGER_RED, 16);

  // Smoke plume rising
  for (let i = 0; i < 10; i++) {
    const sx = x + Phaser.Math.Between(-20, 20);
    const s  = scene.add.rectangle(sx, y, Phaser.Math.Between(4, 8), Phaser.Math.Between(4, 8), 0x555566, 0.8);
    s.setDepth(15);
    scene.tweens.add({
      targets:  s,
      y:        y - Phaser.Math.Between(35, 80),
      x:        sx + Phaser.Math.Between(-12, 12),
      alpha:    0,
      scaleX:   3,
      scaleY:   3,
      duration: Phaser.Math.Between(600, 1200),
      delay:    i * 60,
      onComplete: () => s.destroy(),
    });
  }

  // Bright impact flash
  const fl = scene.add.rectangle(x, y, 32, 32, 0xffffff, 0.95);
  fl.setDepth(22);
  scene.tweens.add({
    targets: fl, scaleX: 4, scaleY: 4, alpha: 0,
    duration: 160,
    onComplete: () => fl.destroy(),
  });
}

/** Compaction warning — red pixel rain across screen */
export function spawnCompactionFX(scene) {
  for (let i = 0; i < 24; i++) {
    const x = Phaser.Math.Between(0, scene.game.config.width);
    const y = Phaser.Math.Between(0, scene.game.config.height);
    const p = scene.add.rectangle(x, y, 4, 4, C.DANGER_RED, 0.85);
    p.setDepth(30);
    scene.tweens.add({
      targets: p,
      y: y + Phaser.Math.Between(40, 100),
      alpha: 0,
      duration: Phaser.Math.Between(400, 700),
      onComplete: () => p.destroy(),
    });
  }
}
