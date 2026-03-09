import { GAME_WIDTH, GAME_HEIGHT, C } from '../constants.js';

const SKILLS = [
  { id: 'damage', name: 'Coding Conventions', desc: '+25% Base Damage', icon: 'skill_damage' },
  { id: 'cost', name: 'Static Code Analysis', desc: '-20% Token Usage', icon: 'skill_cost' },
  { id: 'rewind', name: 'Upgrade Tier', desc: '+1 Extra Rewind Limit', icon: 'skill_rewind' },
  { id: 'charge', name: 'Multitasking', desc: '+50% Split Charge Rate', icon: 'skill_charge' },
  { id: 'heal', name: 'Merge Review', desc: 'Heals 30% Integrity', icon: 'skill_heal' },
  { id: 'splits', name: 'More Tokens', desc: '+1 Ghost Ship', icon: 'skill_splits' },
];

export default class ShopScene extends Phaser.Scene {
  constructor() { super('ShopScene'); }

  create() {
    this.scene.bringToTop();
    this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH, GAME_HEIGHT, C.VOID, 0.9).setDepth(0);
    
    // Header
    this.add.text(GAME_WIDTH/2, 80, 'SKILL.MD SHOP', {
      fontFamily: 'monospace', fontSize: '38px', color: '#ff00ff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH/2, 130, 'SELECT ONE SKILL TO INSTALL', {
      fontFamily: 'monospace', fontSize: '18px', color: '#aaccff',
    }).setOrigin(0.5);

    // Pick 3 random skills
    // Create a copy to shuffle
    const pool = [...SKILLS];
    Phaser.Utils.Array.Shuffle(pool);
    const choices = pool.slice(0, 3);

    choices.forEach((skill, i) => {
      const x = GAME_WIDTH/2 + (i - 1) * 260;
      const y = GAME_HEIGHT/2 + 20;

      // Card bg
      const card = this.add.rectangle(x, y, 220, 280, 0x1a0035).setInteractive({ useHandCursor: true });
      card.setStrokeStyle(2, C.NEON_CYAN);

      // Icon
      const icon = this.add.image(x, y - 60, skill.icon).setDisplaySize(128, 128);
      
      // Name
      this.add.text(x, y + 40, skill.name, {
        fontFamily: 'monospace', fontSize: '20px', color: '#39ff14',
      }).setOrigin(0.5);

      // Desc
      this.add.text(x, y + 80, skill.desc, {
        fontFamily: 'monospace', fontSize: '15px', color: '#aaccff', align: 'center', wordWrap: { width: 200 }
      }).setOrigin(0.5);

      card.on('pointerover', () => { card.setFillStyle(0x3d1a6b); });
      card.on('pointerout', () => { card.setFillStyle(0x1a0035); });
      card.on('pointerdown', () => this._selectSkill(skill.id));
    });
  }

  _selectSkill(id) {
    const ups = this.registry.get('upgrades') || { damage: 0, cost: 0, rewind: 0, charge: 0, splits: 0, heal: 0 };
    ups[id] = (ups[id] || 0) + 1;
    this.registry.set('upgrades', ups);

    if (id === 'heal') {
      this.registry.set('pendingHeal', 30);
    }
    
    this.scene.stop();
    const gameScene = this.scene.get('GameScene');
    if (gameScene) {
      gameScene._finishShopAndStartWave();
    }
  }
}
