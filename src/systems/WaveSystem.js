import { WAVE_DEFS, ENEMY_TYPES } from '../constants.js';

/**
 * Turn-based WaveSystem.
 * Instead of timers, enemies are associated with a spawnTurn index.
 * GameScene calls getSpawnsForTurn(n) each time enemies advance.
 */
export class WaveSystem {
  constructor(scene) {
    this.scene = scene;
    this._events = [];      // current wave's spawn events
    this._waveNum = 0;
  }

  /** Load wave data for the given wave number (1-indexed). */
  startWave(waveNum) {
    this._waveNum = waveNum;
    this._events  = this._getWaveEvents(waveNum).slice(); // copy
  }

  /** Returns array of spawn events whose spawnTurn matches turnNum. */
  getSpawnsForTurn(turnNum) {
    return this._events.filter(e => e.spawnTurn === turnNum);
  }

  /** True when every scheduled spawn has already passed (turn > max spawnTurn). */
  allSpawnsDone(waveNum) {
    if (this._events.length === 0) return true;
    const maxTurn = Math.max(...this._events.map(e => e.spawnTurn));
    // We compare against how many advances have happened (scene.turnNum)
    return this.scene.turnNum > maxTurn;
  }

  _getWaveEvents(waveNum) {
    // Every 5th wave is a mighty Boss wave
    if (waveNum % 5 === 0) {
      return [
        { type: 'ANGEL_BOSS', lane: 1, spawnTurn: 0 },
        { type: 'SHOOTER_ADD', lane: 0, spawnTurn: 0 },
        { type: 'SHOOTER_ADD', lane: 2, spawnTurn: 0 },
        { type: 'SHOOTER_ADD', lane: 0, spawnTurn: 2 },
        { type: 'SHOOTER_ADD', lane: 2, spawnTurn: 2 },
      ];
    }
    const idx = waveNum - 1;
    if (idx < WAVE_DEFS.length) return WAVE_DEFS[idx];
    return this._generateWave(waveNum);
  }

  _generateWave(waveNum) {
    const types   = Object.keys(ENEMY_TYPES);
    const count   = 3 + Math.floor(waveNum * 1.3);
    const events  = [];
    let turn      = 0;
    for (let i = 0; i < count; i++) {
      const typeIdx = Math.min(
        types.length - 1,
        Math.floor(Math.random() * Math.min(types.length, 1 + Math.floor(waveNum / 2)))
      );
      events.push({ type: types[typeIdx], lane: i % 3, spawnTurn: turn });
      if (i % 2 === 1) turn++;                 // new enemies every 2 spawns
    }
    if (waveNum >= 4 && !events.find(e => e.type === 'PRIORITY')) {
      events.push({ type: 'PRIORITY', lane: 1, spawnTurn: turn });
    }
    return events;
  }
}
