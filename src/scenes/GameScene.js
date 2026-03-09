import {
  GAME_WIDTH, GAME_HEIGHT, LANES, TANK_X,
  ENEMY_TYPES, ENEMY_BOUNDARY_X, STEP_SIZE, STEPS_TO_FORTRESS,
  COMPACTION_STEPS, STEP_ADVANCE_MS, PROJECTILE_MS,
  CHARGE_DURATION, PERFECT_ZONE_MIN, PERFECT_ZONE_MAX,
  PERFECT_WIDTH_MIN, PERFECT_WIDTH_MAX,
  PERFECT_CENTER_MIN, PERFECT_CENTER_MAX,
  PERFECT_DRIFT_SPEED, PERFECT_DRIFT_RANGE,
  OVERKILL_RATIO, OVERKILL_CTX_PENALTY,
  BASE_DAMAGE,
  SPLIT_SHOTS,
  C, STATE, calcDamage, ctxToColor,
} from '../constants.js';
import { HeatSystem }    from '../systems/HeatSystem.js';
import { AbilitySystem } from '../systems/AbilitySystem.js';
import { WaveSystem }    from '../systems/WaveSystem.js';
import { Tank }          from '../entities/Tank.js';
import { Enemy }         from '../entities/Enemy.js';
import { Fortress }      from '../entities/Fortress.js';
import {
  spawnExplosion, spawnMuzzleFlash,
  spawnPerfectBurst, spawnCompactionFX, spawnBounce,
  spawnSuperFXDeath, spawnFortressImpact,
} from '../effects/Particles.js';
import {
  shake, flash, showCompactionBanner,
  showPerfectBanner, showDamageNumber, showWaveClear,
  showGlancingBlow, showOverkillText,
} from '../effects/ScreenFX.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    // ── Background ──────────────────────────────────────────
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-base').setDepth(-1);
    this.add.shader('vapor_fog', GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT).setDepth(0);
    this.bgClouds = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'bg-clouds').setDepth(0);
    this._drawGrid();

    // ── Systems ─────────────────────────────────────────────
    this.ctx      = new HeatSystem(this);   // "context window" system
    this.ability  = new AbilitySystem(this);
    this.waves    = new WaveSystem(this);
    this.ctx.onOverheat(() => this._onOverflow());

    // ── Entities ────────────────────────────────────────────
    this.fortress    = new Fortress(this);
    this.tank        = new Tank(this, 1);
    this.enemies     = [];

    // ── Turn state ──────────────────────────────────────────
    this.state       = STATE.ANIMATING;
    this.turnNum     = 0;   // within current wave
    this.waveNum     = 0;
    this.score       = 0;
    this.isCharging  = false;
    this.chargeStart = 0;
    this.chargeLevel = 0;

    // ── Perfect zone (dynamic — changes position & width each shot) ─
    this.perfectMin        = PERFECT_ZONE_MIN;
    this.perfectMax        = PERFECT_ZONE_MAX;
    this._perfectDriftPhase = 0;
    this._generatePerfectZone();

    // ── Split mode ───────────────────────────────────────────
    this.splitMode      = false;
    this.splitShotsLeft = 0;
    this.ghostTanks     = [];

    // ── Input ────────────────────────────────────────────────
    this.keys = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.UP,
      down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      w:     Phaser.Input.Keyboard.KeyCodes.W,
      s:     Phaser.Input.Keyboard.KeyCodes.S,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      r:     Phaser.Input.Keyboard.KeyCodes.R,
      q:     Phaser.Input.Keyboard.KeyCodes.Q,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    });

    this.idleTimer = 0;
    this.isIdleAnimating = false;
    this.input.on('pointerdown', () => this._resetIdleTimer());
    this.input.keyboard.on('keydown', () => this._resetIdleTimer());

    // ── Depth ────────────────────────────────────────────────
    this.fortress.setDepth(5);
    this.tank.setDepth(10);
    this.aimGfx = this.add.graphics().setDepth(8);

    // "CODEBASE" label above fortress
    this.add.text(FORTRESS_X_CENTER(), FORTRESS_Y_TOP() - 10, 'CODEBASE', {
      fontFamily: 'monospace', fontSize: '10px', color: '#8899aa',
    }).setOrigin(0.5, 1).setDepth(6);

    this._syncRegistry();
    this.registry.set('upgrades', { damage: 0, cost: 0, rewind: 0, charge: 0, splits: 0 });

    // ── Intro + Start Wave ───────────────────────────────────
    this.tank.introAnimation(() => {
      this.time.delayedCall(300, () => this._startNextWave());
    });

    function FORTRESS_X_CENTER() { return 48 + 80 / 2; }
    function FORTRESS_Y_TOP()     { return GAME_HEIGHT / 2 - 80; }
  }

  // ─────────────────────────────────────────────────────────
  //  Update loop — handles input + animations when state allows
  // ─────────────────────────────────────────────────────────
  update(time, delta) {
    if (this.state === STATE.GAME_OVER) return;

    // Parallax clouds
    this._bgCloudOffset = (this._bgCloudOffset || 0) + delta * 0.05;
    this.bgClouds.tilePositionX = Math.floor(this._bgCloudOffset / 4) * 4;

    this.tank.update(time, delta);
    if (this.ghostTanks) {
      for (const gt of this.ghostTanks) gt.update(time, delta);
    }
    this.fortress.update(time, delta);
    for (const e of this.enemies) e.update(time, delta);

    if (this.state === STATE.PLAYER_TURN) {
      this._handleInput(time);
      this._drawAimLine();
      this._updatePerfectZoneDrift(delta);
      this._pushTargetKillCharge();

      if (this.isCharging) {
        this._resetIdleTimer();
      } else if (!this.isIdleAnimating) {
        this.idleTimer += delta;
        if (this.idleTimer >= 10000) {
          this._startIdleAnimation();
        }
      }
    } else {
      this.aimGfx.clear();
      this.idleTimer = 0;
    }

    this._syncRegistry();
  }

  // ─────────────────────────────────────────────────────────
  //  Idle Animation
  // ─────────────────────────────────────────────────────────
  _resetIdleTimer() {
    this.idleTimer = 0;
    if (this.isIdleAnimating) {
      if (this.tank.idleTween) {
        this.tank.idleTween.stop();
        this.tank.idleTween = null;
      }
      this.isIdleAnimating = false;
      this.tank.angle = 0;
    }
  }

  _startIdleAnimation() {
    this.isIdleAnimating = true;
    this.tank.angle = 0;
    this.tank.idleTween = this.tweens.add({
      targets: this.tank,
      angle: 360,
      duration: 1000,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.tank.angle = 0;
        this.isIdleAnimating = false;
        this.idleTimer = 0;
        this.tank.idleTween = null;
      }
    });
  }

  // ─────────────────────────────────────────────────────────
  //  Input (only during PLAYER_TURN)
  // ─────────────────────────────────────────────────────────
  _handleInput(time) {
    const { JustDown, JustUp } = Phaser.Input.Keyboard;
    const k = this.keys;

    // Lane selection
    if (JustDown(k.up)   || JustDown(k.w))   this.tank.moveLane(-1);
    if (JustDown(k.down) || JustDown(k.s))   this.tank.moveLane(1);

    // Rewind — undoes context, does NOT advance enemies
    if (JustDown(k.r)) {
      const used = this.ability.useRewind(this.ctx);
      if (used) {
        flash(this, 0x0055ff, 0.2, 300);
        this._generatePerfectZone();
        this.isCharging  = false;
        this.chargeLevel = 0;
      }
    }

    // Split shot — activate ghost tank
    if (JustDown(k.q) && this.ability.splitReady && !this.splitMode) {
      this._activateSplit();
      return;
    }

    // Skip / end turn (ENTER)
    if (JustDown(k.enter)) {
      this.ctx.canRewind = false;
      this._endTurn();
      return;
    }

    // Charge / fire (SPACE)
    if (JustDown(k.space) && !this.isCharging) {
      this.isCharging = true;
      this.chargeStart = time;
    }
    if (this.isCharging) {
      this.chargeLevel = Math.min(100, ((time - this.chargeStart) / CHARGE_DURATION) * 100);
      if (JustUp(k.space)) {
        this._fireSingleShot();
        this.isCharging  = false;
        this.chargeLevel = 0;
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  //  Firing — single shot
  // ─────────────────────────────────────────────────────────
  _fireSingleShot() {
    const charge    = this.chargeLevel;
    // Use the drifted zone values the player was seeing at release
    const pMin      = this.registry.get('perfectMin') ?? this.perfectMin;
    const pMax      = this.registry.get('perfectMax') ?? this.perfectMax;
    const isPerfect = charge >= pMin && charge <= pMax;
    
    const ups       = this.registry.get('upgrades') || {};
    const dmgMult   = 1 + (ups.damage || 0) * 0.25;
    const dmg       = Math.round(calcDamage(this.ctx.pct, charge, isPerfect) * dmgMult);
    const color     = this.ctx.color;
    const lane      = this.tank.currentLane;

    spawnMuzzleFlash(this, this.tank.barrelTipX, this.tank.barrelTipY, color);
    if (isPerfect) {
      spawnPerfectBurst(this, this.tank.barrelTipX + 20, LANES[lane]);
      showPerfectBanner(this, this.tank.barrelTipX + 40, LANES[lane]);
      this.cameras.main.flash(150, 220, 200, 0, false);
    }

    const { overheated } = this.ctx.addFromShot(charge);

    this._generatePerfectZone(); // new zone ready for next shot

    if (this.splitMode && this.ghostTanks && this.ghostTanks.length > 0) {
      let pending = 1 + this.ghostTanks.length;
      const bothDone = () => {
        if (--pending > 0) return;
        this.splitShotsLeft--;
        if (this.splitShotsLeft <= 0) this._endSplitMode();
        if (!overheated) this._endTurn();
      };

      this._animateShot(lane, dmg, isPerfect, color, bothDone, null, charge);

      for (const gt of this.ghostTanks) {
        const ghostLane = gt.currentLane;
        const ghostDmg  = Math.round(calcDamage(this.ctx.pct, charge, isPerfect) * dmgMult);
        spawnMuzzleFlash(this, gt.barrelTipX, gt.barrelTipY, C.NEON_CYAN);
        this._animateShot(ghostLane, ghostDmg, isPerfect, C.NEON_CYAN, bothDone, gt, charge);
      }
    } else {
      this._animateShot(lane, dmg, isPerfect, color, () => {
        if (!overheated) this._endTurn();
      }, null, charge);
    }
  }

  // ─────────────────────────────────────────────────────────
  //  Split mode — spawn ghost tank on another lane
  // ─────────────────────────────────────────────────────────
  _activateSplit() {
    if (!this.ability.useSplit()) return;
    
    const mainLane = this.tank.currentLane;
    const others = [0, 1, 2].filter(l => l !== mainLane);
    
    const withEnemies = others.filter(l => this.enemies.some(e => e.alive && e.lane === l));
    const emptyOthers = others.filter(l => !withEnemies.includes(l));
    const preferLanes = [...withEnemies, ...emptyOthers];

    const ups = this.registry.get('upgrades') || {};
    const numGhosts = 1 + (ups.splits || 0);

    this.ghostTanks = [];
    for (let i = 0; i < numGhosts && i < preferLanes.length; i++) {
      const lane = preferLanes[i];
      const ghost = new Tank(this, lane);
      ghost.setDepth(10);
      ghost.setAlpha(0.65);
      ghost.list.forEach(child => {
        if (child.setTint) child.setTint(0xaa44ff);
      });
      this.ghostTanks.push(ghost);
    }

    this.splitMode      = true;
    this.splitShotsLeft = SPLIT_SHOTS;
    flash(this, C.NEON_CYAN, 0.15, 200);
    this._floatText(TANK_X + 80, GAME_HEIGHT - 60, `SPLIT ACTIVE — ${this.splitShotsLeft} SHOTS`, '#00e5ff');
  }

  _endSplitMode() {
    this.splitMode = false;
    if (this.ghostTanks) {
      for (const gt of this.ghostTanks) {
        this.tweens.add({
          targets: gt, alpha: 0, duration: 350,
          onComplete: () => gt.destroy(),
        });
      }
      this.ghostTanks = [];
    }
  }

  // ─────────────────────────────────────────────────────────
  //  Shot animation helpers
  // ─────────────────────────────────────────────────────────
  _animateShot(lane, dmg, isPerfect, color, onDone, srcTank = null, charge = 100) {
    this.state = STATE.ANIMATING;

    const target = this.enemies
      .filter(e => e.alive && (e.lane === lane || e.cfg.isBoss))
      .sort((a, b) => {
        // Boss takes precedence if it's closer
        return a.x - b.x;
      })[0];

    const startX = (srcTank || this.tank).barrelTipX;
    const startY = LANES[lane];
    const endX   = target ? target.x : GAME_WIDTH + 20;

    const beam = this.add.rectangle(startX, startY, 24, 6, color).setDepth(12);
    beam.setOrigin(0, 0.5);

    this.tweens.add({
      targets: beam,
      x: endX - 12,
      duration: PROJECTILE_MS,
      ease: 'Power1',
      onComplete: () => {
        beam.destroy();
        if (target && target.alive) {
          // Armor: under-charged shots glance off heavy enemies
          const cfg = target.cfg;
          const isGlancing = cfg.armorThreshold && charge < cfg.armorThreshold;
          const actualDmg  = isGlancing ? Math.max(1, Math.floor(dmg * cfg.armorMult)) : dmg;

          const preHitHp = target.hp;
          const { killed, bounced } = target.hit(actualDmg);
          if (bounced) {
            spawnBounce(this, target.x, target.y);
            this._floatText(target.x, target.y - 22, 'SHIELD BLOCKED!', '#88ddff');
          } else if (isGlancing) {
            showGlancingBlow(this, target.x, target.y - 18, actualDmg);
            spawnExplosion(this, target.x, target.y, C.STEEL_GREY, 3);
          } else {
            showDamageNumber(this, target.x, target.y - 18, actualDmg, isPerfect);
            if (killed) {
              spawnSuperFXDeath(this, target);
              this.score += cfg.score;
              const ready = this.ability.addSplitCharge(cfg.splitScore);
              if (ready) this._floatText(TANK_X + 60, GAME_HEIGHT - 80, 'VIBE SPLIT READY! [Q]', '#00e5ff');
              if (actualDmg > preHitHp * OVERKILL_RATIO) {
                this.ctx.addFlat(OVERKILL_CTX_PENALTY);
                showOverkillText(this, target.x, target.y);
              }
            } else {
              spawnExplosion(this, target.x, target.y, C.NEON_CYAN, 4);
            }
          }
        }
        this.time.delayedCall(120, onDone);
      },
    });
  }

  _animateShotToTarget(target, dmg, isPerfect, color, onDone) {
    const startX = this.tank.barrelTipX;
    const beam   = this.add.rectangle(startX, target.y, 24, 6, color).setDepth(12);
    beam.setOrigin(0, 0.5);

    this.tweens.add({
      targets: beam,
      x: target.x - 12,
      duration: PROJECTILE_MS,
      ease: 'Power1',
      onComplete: () => {
        beam.destroy();
        if (target.alive) {
          const { killed, bounced } = target.hit(dmg);
          if (bounced) {
            spawnBounce(this, target.x, target.y);
            this._floatText(target.x, target.y - 22, 'SHIELD BLOCKED!', '#88ddff');
          } else {
            showDamageNumber(this, target.x, target.y - 18, dmg, isPerfect);
            if (killed) {
              spawnSuperFXDeath(this, target);
              this.score += target.cfg.score;
              this.ability.addSplitCharge(target.cfg.splitScore);
            } else {
              spawnExplosion(this, target.x, target.y, C.NEON_CYAN, 4);
            }
          }
        }
        this.time.delayedCall(100, onDone);
      },
    });
  }

  // ─────────────────────────────────────────────────────────
  //  End turn → enemy advance phase
  // ─────────────────────────────────────────────────────────
  _endTurn() {
    this.isCharging  = false;
    this.chargeLevel = 0;
    this.state       = STATE.ENEMY_ADVANCE;
    this._doEnemyAdvance();
  }

  _doEnemyAdvance() {
    // Remove dead enemies first
    this._cleanupDead();

    const alive = this.enemies.filter(e => e.alive);
    let pending = alive.length;

    const afterAdvance = () => {
      // Spawn new enemies for next turn
      this.turnNum++;
      this.waves.getSpawnsForTurn(this.turnNum).forEach(evt => {
        this.spawnEnemy(evt.type, evt.lane);
      });

      // Check fortress hits
      let breached = false;
      for (const e of this.enemies) {
        if (e.alive && e.reachedCodebase) {
          const laneY = LANES[e.lane];
          const destroyed = this.fortress.takeDamage(e.cfg.shieldDmg);
          this.fortress.addSmokeHole(this);
          spawnFortressImpact(this, this.fortress.x, laneY);
          showDamageNumber(this, this.fortress.x, laneY - 20, e.cfg.shieldDmg, false);
          shake(this, 8, 300);
          e.alive = false;
          if (destroyed) { breached = true; }
        }
      }
      this._cleanupDead();

      if (breached) { this._triggerGameOver(); return; }

      // Check wave complete
      const allSpawned = this.waves.allSpawnsDone(this.waveNum);
      const anyAlive   = this.enemies.some(e => e.alive);
      if (allSpawned && !anyAlive) {
        this._onWaveCleared();
        return;
      }

      this.state = STATE.PLAYER_TURN;
    };

    if (pending === 0) {
      this._doEnemyShooting(afterAdvance);
      return;
    }

    let done = 0;
    for (const e of alive) {
      e.advanceStep(this, () => {
        done++;
        if (done >= pending) this._doEnemyShooting(afterAdvance);
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  //  Enemy shooting back (Adds)
  // ─────────────────────────────────────────────────────────
  _doEnemyShooting(onComplete) {
    const shooters = this.enemies.filter(e => e.alive && e.cfg.shootsBack);
    if (shooters.length === 0) {
      onComplete();
      return;
    }

    let pending = shooters.length;
    for (const e of shooters) {
      this._shootFromEnemy(e, () => {
        pending--;
        if (pending <= 0) this.time.delayedCall(150, onComplete);
      });
    }
  }

  _shootFromEnemy(enemy, callback) {
    // Enemy projectile flies to code base
    const startX = enemy.x - 24;
    const startY = enemy.y;
    const bullet = this.add.rectangle(startX, startY, 20, 6, C.DANGER_RED).setDepth(12);
    
    // Tiny puff from enemy
    spawnMuzzleFlash(this, startX, startY, C.DANGER_RED);

    this.tweens.add({
      targets: bullet,
      x: this.fortress.x + 20,
      duration: PROJECTILE_MS,
      ease: 'Power1',
      onComplete: () => {
        bullet.destroy();
        if (this.state !== STATE.GAME_OVER) {
          const broken = this.fortress.takeDamage(enemy.cfg.burstSize || 1);
          spawnFortressImpact(this, this.fortress.x, startY);
          showDamageNumber(this, this.fortress.x, startY - 20, enemy.cfg.burstSize || 1, false);
          shake(this, 5, 200);
          if (broken) {
            this._triggerGameOver();
          }
        }
        callback();
      }
    });
  }

  // ─────────────────────────────────────────────────────────
  //  Context overflow → compaction
  // ─────────────────────────────────────────────────────────
  _onOverflow() {
    flash(this, C.DANGER_RED, 0.7, 600);
    shake(this, 22, 700);
    this.time.delayedCall(150, () => shake(this, 14, 500)); // second tremor
    showCompactionBanner(this);
    spawnCompactionFX(this);

    // All enemies jump forward by COMPACTION_STEPS
    for (const e of this.enemies) {
      if (e.alive) e.forceAdvance(COMPACTION_STEPS);
    }

    this.time.delayedCall(600, () => this._endTurn());
  }

  // ─────────────────────────────────────────────────────────
  //  Wave management
  // ─────────────────────────────────────────────────────────
  _startNextWave() {
    this.waveNum++;
    this.turnNum = 0;
    this.ability.resetWave();
    this.ctx.resetForSession();
    this.waves.startWave(this.waveNum);

    // Spawn turn-0 enemies immediately
    this.waves.getSpawnsForTurn(0).forEach(evt => {
      this.spawnEnemy(evt.type, evt.lane);
    });

    if (this.waveNum > 1) {
      this.state = STATE.ANIMATING;
      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1,
        duration: 800,
        ease: 'Stepped',
        easeParams: [12],
        onComplete: () => {
          this.state = STATE.PLAYER_TURN;
        }
      });
    } else {
      this.state = STATE.PLAYER_TURN;
    }
  }

  /** Called by WaveSystem — but we manage spawning manually via getSpawnsForTurn */
  spawnEnemy(typeKey, laneIndex) {
    const enemy = new Enemy(this, typeKey, laneIndex, STEPS_TO_FORTRESS);
    enemy.setDepth(9 + laneIndex * 0.1);
    this.enemies.push(enemy);
  }

  _onWaveCleared() {
    this.state = STATE.WAVE_CLEAR;
    this.fortress.shield = Math.min(100, this.fortress.shield + 10);
    showWaveClear(this, this.waveNum, () => {
      this.scene.pause();
      this.scene.launch('ShopScene');
    });
  }

  _finishShopAndStartWave() {
    this.scene.resume();
    // Pixel zoom in transition
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 6,
      duration: 800,
      ease: 'Stepped',
      easeParams: [12],
      onComplete: () => {
        this._startNextWave();
      }
    });
  }

  // ─────────────────────────────────────────────────────────
  //  Game over
  // ─────────────────────────────────────────────────────────
  _triggerGameOver() {
    this.state = STATE.GAME_OVER;
    const hi = Math.max(this.score, parseInt(localStorage.getItem('hiScore') || '0'));
    localStorage.setItem('hiScore', hi);

    flash(this, C.DANGER_RED, 0.7, 800);
    shake(this, 15, 600);

    const w = GAME_WIDTH, h = GAME_HEIGHT;
    this.add.rectangle(w / 2, h / 2, 500, 140, C.VOID, 0.95).setDepth(70);
    this.add.text(w / 2, h / 2 - 30, 'CODEBASE BREACHED BY VIBES', {
      fontFamily: 'monospace', fontSize: '30px', color: '#ff1744',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(71);
    this.add.text(w / 2, h / 2 + 10, `SCORE: ${this.score.toLocaleString()}`, {
      fontFamily: 'monospace', fontSize: '20px', color: '#f0f0ff',
    }).setOrigin(0.5).setDepth(71);
    this.add.text(w / 2, h / 2 + 38, 'PRESS SPACE TO RETRY', {
      fontFamily: 'monospace', fontSize: '15px', color: '#6b2fa0',
    }).setOrigin(0.5).setDepth(71);

    // DSoul.org Link
    const dsGroup = this.add.container(w / 2, h / 2 + 100).setDepth(71);
    const dsLogo = this.add.image(-110, 0, 'dsoul_logo').setOrigin(0.5);
    dsLogo.displayHeight = 30;
    dsLogo.scaleX = dsLogo.scaleY;
    dsLogo.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => window.open('https://dsoul.org', '_blank'));
    
    const dsText = this.add.text(-60, 0, 'Skill Up at DSoul.org', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#00e5ff',
      stroke: '#0a0014',
      strokeThickness: 3,
    }).setOrigin(0, 0.5);
    dsText.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => window.open('https://dsoul.org', '_blank'));
    dsGroup.add([dsLogo, dsText]);

    this.time.delayedCall(800, () => {
      this.input.keyboard.once('keydown-SPACE', () => {
        this.scene.stop('UIScene');
        this.scene.start('MenuScene');
      });
    });
  }

  // ─────────────────────────────────────────────────────────
  //  Helpers
  // ─────────────────────────────────────────────────────────
  _cleanupDead() {
    this.enemies = this.enemies.filter(e => {
      if (!e.alive) { e.destroy(); return false; }
      return true;
    });
  }

  _drawGrid() {
    const g = this.add.graphics().setDepth(1);
    LANES.forEach(y => {
      // Step tick marks
      for (let s = 0; s <= STEPS_TO_FORTRESS; s++) {
        const x = ENEMY_BOUNDARY_X + s * STEP_SIZE;
        g.lineStyle(1, 0x3d1a6b, 0.4);
        g.lineBetween(x, y - 12, x, y + 12);
      }
      // Lane dashes
      for (let x = ENEMY_BOUNDARY_X; x < GAME_WIDTH; x += 20) {
        g.lineStyle(1, 0x3d1a6b, 0.2);
        g.lineBetween(x, y, x + 10, y);
      }
    });
  }

  _drawAimLine() {
    this.aimGfx.clear();
    const lane   = this.tank.currentLane;
    const y      = LANES[lane];
    const target = this.enemies
      .filter(e => e.alive && (e.lane === lane || e.cfg.isBoss))
      .sort((a, b) => a.x - b.x)[0];

    if (!target) return;
    const pct      = this.chargeLevel / 100;
    const aimColor = this.ctx.isOptimal ? C.NEON_GREEN : this.ctx.isDanger ? C.DANGER_RED : C.NEON_CYAN;
    this.aimGfx.lineStyle(1, aimColor, 0.3 + pct * 0.45);
    this.aimGfx.lineBetween(this.tank.barrelTipX, y, target.x, target.y);
    this.aimGfx.lineStyle(1, aimColor, 0.55 + pct * 0.3);
    this.aimGfx.strokeRect(target.x - 18, target.y - 18, 36, 36);
    // Steps remaining label
    if (target.steps <= 3) {
      this.aimGfx.lineStyle(2, C.DANGER_RED, 0.7);
      this.aimGfx.strokeRect(target.x - 20, target.y - 20, 40, 40);
    }
  }

  // ─────────────────────────────────────────────────────────
  //  Moving perfect zone helpers
  // ─────────────────────────────────────────────────────────
  _generatePerfectZone() {
    const width  = Phaser.Math.Between(PERFECT_WIDTH_MIN, PERFECT_WIDTH_MAX);
    const center = Phaser.Math.FloatBetween(
      PERFECT_CENTER_MIN + width / 2,
      PERFECT_CENTER_MAX - width / 2,
    );
    this.perfectMin = center - width / 2;
    this.perfectMax = center + width / 2;
    this._perfectDriftPhase = 0;
  }

  _updatePerfectZoneDrift(delta) {
    if (this.isCharging) {
      this._perfectDriftPhase += delta * PERFECT_DRIFT_SPEED;
    }
    const drift = Math.sin(this._perfectDriftPhase) * PERFECT_DRIFT_RANGE;
    this.registry.set('perfectMin', this.perfectMin + drift);
    this.registry.set('perfectMax', this.perfectMax + drift);
  }

  _pushTargetKillCharge() {
    const lane   = this.tank.currentLane;
    const target = this.enemies
      .filter(e => e.alive && (e.lane === lane || e.cfg.isBoss))
      .sort((a, b) => a.x - b.x)[0];
    if (target) {
      const ctxMult = Math.max(0, 1 - Math.abs(this.ctx.pct - 60) / 60);
      const needed  = ctxMult > 0
        ? Math.ceil((target.hp / (BASE_DAMAGE * ctxMult)) * 100)
        : 101;
      this.registry.set('targetKillCharge', Math.min(101, needed));
    } else {
      this.registry.set('targetKillCharge', null);
    }
  }

  _floatText(x, y, msg, color = '#ffffff') {
    const t = this.add.text(x, y, msg, {
      fontFamily: 'monospace', fontSize: '14px', color,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(55);
    this.tweens.add({
      targets: t, y: y - 40, alpha: 0, duration: 900,
      onComplete: () => t.destroy(),
    });
  }

  _syncRegistry() {
    this.registry.set('score',       this.score);
    this.registry.set('wave',        this.waveNum);
    this.registry.set('turn',        this.turnNum);
    this.registry.set('ctx',         this.ctx.pct);
    this.registry.set('ctxColor',    this.ctx.color);
    this.registry.set('ctxSludge',   this.ctx.sludge);
    this.registry.set('ctxFloor',    this.ctx.floor);
    this.registry.set('shield',      this.fortress.shield);
    this.registry.set('state',       this.state);
    this.registry.set('charging',    this.isCharging);
    this.registry.set('chargeLevel', this.chargeLevel);
    this.registry.set('rewindAvail', this.ability.rewindAvailable);
    this.registry.set('rewindCount', this.ability.rewindCount);
    this.registry.set('splitPct',    this.ability.splitPct);
    this.registry.set('splitReady',  this.ability.splitReady);
    this.registry.set('splitMode',   this.splitMode);
    this.registry.set('hiScore',     parseInt(localStorage.getItem('hiScore') || '0'));
  }
}
