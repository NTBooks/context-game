import { C, GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { sfxMenuStart, isMuted, toggleMute as toggleSfxMute } from '../effects/SoundFX.js';
import { getMusicSystem } from '../audio/MusicSystem.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const music = getMusicSystem();
    music.play('menu');

    // Unlock audio on first click/tap/key (browser requires user gesture)
    const unlock = () => {
      music.resumeContext();
      this.input.off('pointerdown', unlock);
      this.input.keyboard.off('keydown', unlock);
      if (this._audioHint) {
        this._audioHint.destroy();
        this._audioHint = null;
      }
    };
    this.input.once('pointerdown', unlock);
    this.input.keyboard.on('keydown', unlock);

    // Hint so user knows to interact to hear music
    this._audioHint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 72, 'Click or tap to enable audio', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#6b2fa0',
    }).setOrigin(0.5).setAlpha(0.85);

    // Background
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-base');
    this.add.shader('vapor_fog', GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    this.bgClouds = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'bg-clouds');

    // Title (pulled up for breathing room)
    this.add.text(GAME_WIDTH / 2, 58, 'CURSE OF THE\nZERO-GRAVITY CODE:\nCLAWED\'S REVENGE', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#00e5ff',
      stroke: '#0a0014',
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 0, color: '#00e5ff', blur: 20, fill: true },
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 118, 'DEFEND YOUR CODEBASE — CRUSH THE VIBES', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#ff88ff',
      stroke: '#0a0014', strokeThickness: 2,
    }).setOrigin(0.5);

    const menuUp = GAME_HEIGHT * 0.1;

    // Enemy preview row
    const previewX = GAME_WIDTH / 2 - 80;
    ['enemy-file', 'enemy-dossier', 'enemy-task', 'enemy-priority'].forEach((key, i) => {
      this.add.image(previewX + i * 56, 248 - menuUp, key).setScale(2);
    });

    // Hi-score
    const hiScore = parseInt(localStorage.getItem('hiScore') || '0');
    this.add.text(GAME_WIDTH / 2, 312 - menuUp, `HI-SCORE: ${hiScore.toLocaleString()}`, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffd700',
    }).setOrigin(0.5);

    // Controls reference — left-aligned block so key column and "—" line up
    const keyWidth = 16; // monospace chars for key column
    const padKey = (key) => key.padEnd(keyWidth);
    const controls = [
      { key: '↑ / ↓', desc: 'move cannon between lanes' },
      { key: 'HOLD SPACE', desc: 'craft your prompt (fill the bar)' },
      { key: 'RELEASE', desc: 'send prompt! (hit the PERFECT zone for bonus)' },
      { key: 'ENTER', desc: 'skip turn (enemies still advance!)' },
      { key: 'R', desc: 'REWIND: undo last context increase (1× per wave)' },
      { key: 'Q', desc: 'SPLIT: spawn ghost tank on another lane (2 shots)' },
      { key: 'M', desc: 'toggle sound on / off' },
    ];
    const controlBlockWidth = 420;
    const controlStartY = 322 - menuUp;
    const lineHeight = 19;
    const miscLineHeight = 17;
    controls.forEach((row, i) => {
      const line = `${padKey(row.key)}—  ${row.desc}`;
      const color = '#aaccff';
      this.add.text(GAME_WIDTH / 2 - controlBlockWidth / 2, controlStartY + i * lineHeight, line, {
        fontFamily: 'monospace', fontSize: '12px', color,
      }).setOrigin(0, 0.5);
    });
    const miscLines = [
      'Mouse: move up/down = lanes · click = fire (locks lane) · right-click = Rewind/Split menu',
      '',
      'overflow? COMPACTION — vibes jump forward + SLUDGE builds up!',
      'sludge clears between sessions — keep context in OPTIMAL zone (50-70%)',
    ];
    const miscStartY = controlStartY + controls.length * lineHeight + 6;
    miscLines.forEach((line, i) => {
      const color = line.startsWith('overflow') || line.startsWith('sludge') ? '#ff6b00' : '#aaccff';
      this.add.text(GAME_WIDTH / 2 - controlBlockWidth / 2, miscStartY + i * miscLineHeight, line, {
        fontFamily: 'monospace', fontSize: '12px', color,
      }).setOrigin(0, 0.5);
    });

    // Start button — click here to begin (mouse); Space still works from anywhere
    const startText = this.add.text(GAME_WIDTH / 2, 472, '[ PRESS SPACE TO BEGIN ]', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#39ff14',
      stroke: '#0a0014',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // DSoul.org Link (below misc block, with padding from bottom)
    const dsGroup = this.add.container(GAME_WIDTH / 2, 522);
    const dsLogo = this.add.image(-100, 0, 'dsoul_logo').setOrigin(0.5);
    dsLogo.displayHeight = 24;
    dsLogo.scaleX = dsLogo.scaleY;
    dsLogo.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => window.open('https://dsoul.org', '_blank'));

    const dsText = this.add.text(-60, 0, 'Skill Up at DSoul.org', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#00e5ff',
      stroke: '#0a0014',
      strokeThickness: 2,
    }).setOrigin(0, 0.5);
    dsText.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => window.open('https://dsoul.org', '_blank'));
    dsGroup.add([dsLogo, dsText]);

    // Blink
    this.tweens.add({
      targets: startText,
      alpha: 0.1,
      duration: 550,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Mute icons (bottom right, with padding from edge)
    const iconSize = 26;
    const bottomPadding = 22;
    const iconY = GAME_HEIGHT - bottomPadding - iconSize / 2;
    const pad = 12;
    const gap = 6;
    const musicX = GAME_WIDTH - pad - gap - iconSize - iconSize / 2;
    const sfxX = GAME_WIDTH - pad - iconSize / 2;
    this._menuMusicIcon = this._muteIcon(musicX, iconY, iconSize, '♪', () => {
      getMusicSystem().toggleMute();
      this._menuMusicIcon.setAlpha(getMusicSystem().isMuted() ? 0.4 : 1);
    });
    this._menuMusicIcon.setAlpha(getMusicSystem().isMuted() ? 0.4 : 1);
    this._menuSfxIcon = this._muteIcon(sfxX, iconY, iconSize, 'S', () => {
      toggleSfxMute();
      this._menuSfxIcon.setAlpha(isMuted() ? 0.4 : 1);
    });
    this._menuSfxIcon.setAlpha(isMuted() ? 0.4 : 1);
    this.input.keyboard.on('keydown-M', () => {
      getMusicSystem().toggleMute();
      this._menuMusicIcon.setAlpha(getMusicSystem().isMuted() ? 0.4 : 1);
    });

    const startGame = () => {
      sfxMenuStart();
      this.scene.start('GameScene');
      this.scene.launch('UIScene');
    };
    this.input.keyboard.once('keydown-SPACE', startGame);
    startText.once('pointerdown', (pointer) => {
      // On touch devices, `pointer.button` can be `undefined`; treat that as a primary tap.
      if (pointer.button == null || pointer.button === 0) startGame();
    });

    // Version tag (padded from bottom edge)
    this.add.text(GAME_WIDTH - 8, GAME_HEIGHT - 14,
      'v0.1 | PHASER 3 + GEMINI PIXEL ART', {
      fontFamily: 'monospace', fontSize: '9px', color: '#3d1a6b',
    }).setOrigin(1, 1);
  }

  _muteIcon(x, y, size, symbol, onTap) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, size, size, 0x1a0035, 0.95)
      .setStrokeStyle(1, 0x445566);
    const label = this.add.text(0, 0, symbol, {
      fontFamily: 'monospace',
      fontSize: symbol === '♪' ? '18px' : '14px',
      color: '#aaccff',
    }).setOrigin(0.5);
    container.add([bg, label]);
    container.setSize(size, size);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', onTap);
    container.on('pointerover', () => bg.setStrokeStyle(1, 0x00e5ff));
    container.on('pointerout', () => bg.setStrokeStyle(1, 0x445566));
    return container;
  }

  update(time, delta) {
    if (this.bgClouds) {
      this._bgCloudOffset = (this._bgCloudOffset || 0) + delta * 0.05;
      this.bgClouds.tilePositionX = Math.floor(this._bgCloudOffset / 4) * 4;
    }
  }
}
