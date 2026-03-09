import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import BootScene   from './scenes/BootScene.js';
import MenuScene   from './scenes/MenuScene.js';
import GameScene   from './scenes/GameScene.js';
import UIScene     from './scenes/UIScene.js';
import ShopScene   from './scenes/ShopScene.js';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0a0014',
  pixelArt: true,
  antialias: false,
  scene: [BootScene, MenuScene, GameScene, UIScene, ShopScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
