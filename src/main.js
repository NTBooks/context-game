import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import BootScene   from './scenes/BootScene.js';
import MenuScene   from './scenes/MenuScene.js';
import GameScene   from './scenes/GameScene.js';
import UIScene     from './scenes/UIScene.js';
import ShopScene   from './scenes/ShopScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
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

const game = new Phaser.Game(config);

let _recovering = false;

function recoverFromError(err) {
  if (_recovering) return;
  _recovering = true;
  try {
    const gameScene = game.scene.getScene('GameScene');
    if (gameScene && gameScene.scene.isActive()) {
      gameScene._triggerBugReport(err || new Error('Unexpected error'));
    } else {
      game.scene.getScenes(true).forEach(s => {
        if (s.scene.key !== 'MenuScene') game.scene.stop(s.scene.key);
      });
      game.scene.start('MenuScene');
    }
  } catch (_) {
    window.location.reload();
  }
  setTimeout(() => { _recovering = false; }, 2000);
}

window.onerror = (msg, src, line, col, err) => {
  console.error('[Game crash caught]', msg, { src, line, col, err });
  recoverFromError(err || new Error(String(msg)));
  return true;
};

window.onunhandledrejection = (evt) => {
  console.error('[Unhandled promise rejection]', evt.reason);
  const err = evt.reason instanceof Error ? evt.reason : new Error(String(evt.reason));
  recoverFromError(err);
};
