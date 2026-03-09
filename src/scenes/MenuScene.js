import { C, GAME_WIDTH, GAME_HEIGHT } from '../constants.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    // Background
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-base');
    this.bgClouds = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'bg-clouds');

    // Title
    this.add.text(GAME_WIDTH / 2, 105, 'CURSE OF THE\nANTIGRAVITY CODEX:\nCLAUDE\'S REVENGE', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#00e5ff',
      stroke: '#0a0014',
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 0, color: '#00e5ff', blur: 20, fill: true },
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 168, 'DEFEND YOUR CODEBASE — CRUSH THE VIBES', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#ff88ff',
      stroke: '#0a0014', strokeThickness: 2,
    }).setOrigin(0.5);

    // Enemy preview row
    const previewX = GAME_WIDTH / 2 - 80;
    ['enemy-file', 'enemy-dossier', 'enemy-task', 'enemy-priority'].forEach((key, i) => {
      this.add.image(previewX + i * 56, 230, key).setScale(2);
    });

    // Hi-score
    const hiScore = parseInt(localStorage.getItem('hiScore') || '0');
    this.add.text(GAME_WIDTH / 2, 275, `HI-SCORE: ${hiScore.toLocaleString()}`, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffd700',
    }).setOrigin(0.5);

    // Controls reference
    const controls = [
      '↑ / ↓          —  move cannon between lanes',
      'HOLD SPACE      —  craft your prompt (fill the bar)',
      'RELEASE         —  send prompt! (hit the PERFECT zone for bonus)',
      'ENTER           —  skip turn (enemies still advance!)',
      'R               —  REWIND: undo last context increase (1× per wave)',
      'Q               —  SPLIT: spawn ghost tank on another lane (2 shots)',
      '',
      'overflow? COMPACTION — vibes jump forward + SLUDGE builds up!',
      'sludge clears between sessions — keep context in OPTIMAL zone (50-70%)',
    ];
    controls.forEach((line, i) => {
      const color = line.startsWith('context') || line.startsWith('keep') ? '#ff6b00' : '#aaccff';
      this.add.text(GAME_WIDTH / 2, 318 + i * 19, line, {
        fontFamily: 'monospace', fontSize: '12px', color,
      }).setOrigin(0.5);
    });

    // Start button
    const startText = this.add.text(GAME_WIDTH / 2, 506, '[ PRESS SPACE TO BEGIN ]', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#39ff14',
      stroke: '#0a0014',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Blink
    this.tweens.add({
      targets: startText,
      alpha: 0.1,
      duration: 550,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Start on space
    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.start('GameScene');
      this.scene.launch('UIScene');
    });

    // Version tag
    this.add.text(GAME_WIDTH - 8, GAME_HEIGHT - 8,
      'v0.1 | PHASER 3 + GEMINI PIXEL ART', {
      fontFamily: 'monospace', fontSize: '9px', color: '#3d1a6b',
    }).setOrigin(1, 1);
  }

  update(time, delta) {
    if (this.bgClouds) {
      this.bgClouds.tilePositionX += delta * 0.05;
    }
  }
}
