import { SPLIT_COST, SPLIT_PER_KILL } from '../constants.js';

export const REWINDS_PER_SESSION = 3;

export class AbilitySystem {
  constructor(scene) {
    this.scene = scene;
    this.rewindCount = REWINDS_PER_SESSION;
    this.splitCharge = 0;
  }

  resetWave() {
    const ups = this.scene.registry.get('upgrades') || {};
    this.rewindCount = REWINDS_PER_SESSION + (ups.rewind || 0);
    // Split charge persists across waves intentionally
  }

  get rewindAvailable() { return this.rewindCount > 0; }

  /** Call after each enemy kill. Returns true if split became ready. */
  addSplitCharge(amount = SPLIT_PER_KILL) {
    const ups = this.scene.registry.get('upgrades') || {};
    const chargeMult = 1 + (ups.charge || 0) * 0.5;
    
    const wasReady = this.splitReady;
    this.splitCharge = Math.min(SPLIT_COST, this.splitCharge + (amount * chargeMult));
    return !wasReady && this.splitReady;
  }

  get splitReady() { return this.splitCharge >= SPLIT_COST; }
  get splitPct() { return (this.splitCharge / SPLIT_COST) * 100; }

  useRewind(heatSystem) {
    if (this.rewindCount <= 0) return false;
    const success = heatSystem.rewind();
    if (success) {
      this.rewindCount--;
      return true;
    }
    return false;
  }

  /** Returns true if split was used. */
  useSplit() {
    if (!this.splitReady) return false;
    this.splitCharge = 0;
    return true;
  }
}
