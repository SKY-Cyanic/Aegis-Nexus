import Phaser from 'phaser';
import GameScene from './scenes/GameScene';

const launch = (containerId: string, bootData?: object): Phaser.Game => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: containerId,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        // FIX: The gravity object requires both x and y properties.
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [], // Start with an empty scene array
    backgroundColor: '#0f172a', // slate-900
  };

  const game = new Phaser.Game(config);
  game.scene.add('GameScene', GameScene, true, bootData); // Add scene manually and auto-start with bootData

  return game;
};

export { launch };