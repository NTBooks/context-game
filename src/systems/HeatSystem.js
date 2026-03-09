import {
  CTX_MAX, CTX_OVERFLOW,
  CTX_SYSTEM_PROMPT,
  CTX_PER_CHARGE, SLUDGE_PER_COMPACTION,
  ctxToColor,
} from '../constants.js';

/** Manages the context window fill level. */
export class HeatSystem {
  constructor(scene) {
    this.scene             = scene;
    this.sludge            = 0;   // permanent sludge from compactions (% units)
    this.active            = 0;   // current fill above floor (% units)
    this._activeBeforeShot = 0;
    this.canRewind         = false;
    this._onOverheat       = null;
  }

  onOverheat(cb) { this._onOverheat = cb; }

  /** Bottom of the usable region: system prompt + accumulated sludge */
  get floor()     { return CTX_SYSTEM_PROMPT + this.sludge; }

  /** Total context fill percentage (0–100) */
  get pct()       { return Math.min(CTX_MAX, this.floor + this.active); }

  get color()     { return ctxToColor(this.pct); }
  get isOptimal() { return this.pct >= 50 && this.pct <= 70; }
  get isDanger()  { return this.pct >= 85; }

  /** Record current level, add context from a shot. Returns { newHeat, overheated }. */
  addFromShot(chargePercent) {
    this._activeBeforeShot = this.active;
    this.canRewind = true;
    
    const ups = this.scene.registry.get('upgrades') || {};
    const costMult = Math.max(0.1, 1 - (ups.cost || 0) * 0.20);
    this.active += chargePercent * CTX_PER_CHARGE * costMult;

    if (this.pct >= CTX_OVERFLOW) {
      // Compaction: build sludge, reset active fill
      this.sludge = Math.min(60, this.sludge + SLUDGE_PER_COMPACTION);
      this.active = 0;
      this.canRewind = false;
      if (this._onOverheat) this._onOverheat();
      return { newHeat: this.pct, overheated: true };
    }
    return { newHeat: this.pct, overheated: false };
  }

  /** Add a flat % of context (e.g. overkill penalty). Triggers compaction if overflow. */
  addFlat(pct) {
    this.active += pct;
    if (this.pct >= CTX_OVERFLOW) {
      this.sludge = Math.min(60, this.sludge + SLUDGE_PER_COMPACTION);
      this.active = 0;
      this.canRewind = false;
      if (this._onOverheat) this._onOverheat();
    }
  }

  /** Undo context from the last shot. */
  rewind() {
    if (!this.canRewind) return false;
    this.active = this._activeBeforeShot;
    this.canRewind = false; // Only allow one rewind per action
    return true;
  }

  /** Call at the start of each new session — clears sludge and active fill. */
  resetForSession() {
    this.sludge = 0;
    this.active = 0;
    this.canRewind = false;
  }
}
