export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// Lanes (Y positions for the 3 enemy flight paths)
export const LANES = [150, 270, 390];
export const LANE_COUNT = 3;

// Tank
export const TANK_X = 175;

// Codebase (fortress)
export const FORTRESS_X = 76;
export const FORTRESS_W = 80;
export const FORTRESS_H = 160;
export const FORTRESS_Y = GAME_HEIGHT / 2;

// Turn-based grid
export const STEPS_TO_FORTRESS  = 9;    // steps from spawn to codebase
export const STEP_SIZE           = 80;   // pixels per step
export const ENEMY_BOUNDARY_X    = 160;  // x < this → enemy reaches codebase
export const ENEMY_SPAWN_X       = ENEMY_BOUNDARY_X + STEPS_TO_FORTRESS * STEP_SIZE; // 880
export const COMPACTION_STEPS    = 2;    // steps enemies jump on context overflow
export const STEP_ADVANCE_MS     = 380;  // duration of step tween (ms)
export const PROJECTILE_MS       = 320;  // duration of projectile flight tween (ms)

// Context window (replaces "heat")
export const CTX_MIN             = 0;
export const CTX_MAX             = 100;
export const CTX_OVERFLOW        = 95;   // triggers compaction
export const CTX_SYSTEM_PROMPT   = 20;   // always-occupied bottom (%)
export const CTX_OPTIMAL_MIN     = 50;
export const CTX_OPTIMAL_MAX     = 70;
export const CTX_COMPACTION_RESET= 60;
export const CTX_PER_CHARGE      = 0.38; // context added = charge% × this
export const CTX_HALLUCINATE     = 85;   // % at which hallucination FX kick in

// Charge / prompt crafting
export const CHARGE_DURATION     = 2200; // ms to fill bar 0→100
export const PERFECT_ZONE_MIN    = 65;   // initial default (overridden per-shot)
export const PERFECT_ZONE_MAX    = 80;

// Perfect zone variation — zone shifts position & width each shot
export const PERFECT_WIDTH_MIN   = 8;    // narrowest zone (%)
export const PERFECT_WIDTH_MAX   = 22;   // widest zone (%)
export const PERFECT_CENTER_MIN  = 32;   // leftmost possible center (%)
export const PERFECT_CENTER_MAX  = 84;   // rightmost possible center (%)
export const PERFECT_DRIFT_SPEED = 0.0018; // sine phase advance per ms
export const PERFECT_DRIFT_RANGE = 4;    // ±% drift amplitude while charging

// Damage
export const BASE_DAMAGE         = 35;
export const PERFECT_BONUS       = 1.5;

// Overkill — over-explaining a simple task wastes context
export const OVERKILL_RATIO      = 2.0;  // killing with 2× remaining HP triggers penalty
export const OVERKILL_CTX_PENALTY= 3;    // extra % context added on overkill

// Abilities
export const SPLIT_COST          = 100;
export const SPLIT_PER_KILL      = 40;   // raised from 28 — split charges faster
export const SLUDGE_PER_COMPACTION = 14;  // raised from 8 — compaction adds more permanent sludge
export const SPLIT_SHOTS         = 2;    // ghost tank vanishes after this many fire actions

// Variable enemy size — each enemy gets a random scale multiplier
export const ENEMY_SIZE_MIN      = 0.7;  // smallest possible (lower HP)
export const ENEMY_SIZE_MAX      = 1.4;  // largest possible (higher HP)

// Turn state machine keys
export const STATE = {
  PLAYER_TURN:   'PLAYER_TURN',
  ANIMATING:     'ANIMATING',
  ENEMY_ADVANCE: 'ENEMY_ADVANCE',
  WAVE_CLEAR:    'WAVE_CLEAR',
  GAME_OVER:     'GAME_OVER',
};

// Colors (master palette)
export const C = {
  VOID:           0x0a0014,
  SPACE:          0x12002a,
  DEEP_PURPLE:    0x3d1a6b,
  MID_PURPLE:     0x6b2fa0,
  NEON_CYAN:      0x00e5ff,
  NEON_GREEN:     0x39ff14,
  WARNING_ORANGE: 0xff6b00,
  DANGER_RED:     0xff1744,
  GOLD:           0xffd700,
  WARM_WHITE:     0xf0f0ff,
  STEEL_GREY:     0x8899aa,
  DARK_STEEL:     0x445566,
  HEAT_BLUE:      0x0055ff,
  HEAT_YELLOW:    0xffee00,
};

// Context level → color gradient stops
export const CTX_COLORS = [
  { at: 0,   color: 0x0033aa },
  { at: 20,  color: 0x0055ff },
  { at: 35,  color: 0x00aaff },
  { at: 50,  color: 0x39ff14 },
  { at: 65,  color: 0xaaff00 },
  { at: 75,  color: 0xffee00 },
  { at: 85,  color: 0xff6b00 },
  { at: 95,  color: 0xff1744 },
  { at: 100, color: 0xff0000 },
];

// Enemy type definitions — these are "Vibes" invading the codebase
export const ENEMY_TYPES = {
  FILE: {
    key: 'FILE', hp: 18, score: 100, shieldDmg: 10,
    splitScore: SPLIT_PER_KILL, textureKey: 'enemy-file',
    label: 'BUG', vibeLabel: 'VIBE',
  },
  DOSSIER: {
    key: 'DOSSIER', hp: 55, score: 250, shieldDmg: 20,
    splitScore: SPLIT_PER_KILL, textureKey: 'enemy-dossier',
    label: 'USER STORY', vibeLabel: 'MAJOR VIBE',
    shieldBreak: 14,
    armorThreshold: 45, armorMult: 0.25,
  },
  TASK: {
    key: 'TASK', hp: 12, score: 75, shieldDmg: 7,
    splitScore: SPLIT_PER_KILL, textureKey: 'enemy-task',
    label: 'WACKY IDEA', vibeLabel: 'MICRO VIBE',
  },
  PRIORITY: {
    key: 'PRIORITY', hp: 90, score: 500, shieldDmg: 30,
    splitScore: SPLIT_PER_KILL * 2, textureKey: 'enemy-priority',
    label: 'PROTOTYPE', vibeLabel: 'OMEGA VIBE',
    shieldBreak: 28,
    armorThreshold: 60, armorMult: 0.15,
  },
  DEADLINE: {
    key: 'DEADLINE', hp: 130, score: 650, shieldDmg: 40,
    splitScore: SPLIT_PER_KILL * 2, textureKey: 'enemy-deadline',
    label: 'DEADLINE', vibeLabel: 'GALAXY VIBE',
    shieldBreak: 45,
    armorThreshold: 80, armorMult: 0.1,
  },
  HOTFIX: {
    key: 'HOTFIX', hp: 20, score: 150, shieldDmg: 20,
    splitScore: SPLIT_PER_KILL, textureKey: 'enemy-hotfix',
    label: 'HOTFIX', vibeLabel: 'URGENT VIBE',
    shieldBreak: 25,
  },
  INTRUSIVE_THOUGHT: {
    key: 'INTRUSIVE_THOUGHT', hp: 40, score: 200, shieldDmg: 15,
    splitScore: SPLIT_PER_KILL, textureKey: 'enemy-intrusive-thought',
    label: 'INTRUSIVE THOUGHT', vibeLabel: 'MYSTERY VIBE',
  },
  CHORE: {
    key: 'CHORE', hp: 14, score: 60, shieldDmg: 5,
    splitScore: SPLIT_PER_KILL, textureKey: 'enemy-chore',
    label: 'CHORE', vibeLabel: 'BORING VIBE',
  },
  TECH_DEBT: {
    key: 'TECH_DEBT', hp: 85, score: 120, shieldDmg: 35,
    splitScore: SPLIT_PER_KILL, textureKey: 'enemy-tech-debt',
    label: 'TECH DEBT', vibeLabel: 'CURSED VIBE',
    shieldBreak: 15,
    armorThreshold: 20, armorMult: 0.1,
  },
  ANGEL_BOSS: {
    key: 'ANGEL_BOSS', hp: 350, score: 5000, shieldDmg: 90,
    splitScore: SPLIT_PER_KILL * 5, textureKey: 'enemy-angel-boss',
    label: 'FATAL ERROR', vibeLabel: 'BIBLICALLY ACCURATE OS',
    shieldBreak: 45,
    armorThreshold: 50, armorMult: 0.15,
    isBoss: true,
  },
  SHOOTER_ADD: {
    key: 'SHOOTER_ADD', hp: 1, score: 100, shieldDmg: 10,
    splitScore: SPLIT_PER_KILL, textureKey: 'enemy-shooter-add',
    label: 'DAEMON', vibeLabel: 'MALICIOUS VIBE',
    shootsBack: true, burstSize: 1, // Fires back at the fortress each turn
  },
};

// Wave definitions — spawnTurn = which turn of this wave the enemy spawns.
// Turn 0 = they're visible before the player's very first action.
export const WAVE_DEFS = [
  // Wave 1 — easy intro
  [
    { type: 'FILE', lane: 0, spawnTurn: 0 },
    { type: 'CHORE', lane: 1, spawnTurn: 0 },
    { type: 'FILE', lane: 2, spawnTurn: 0 },
  ],
  // Wave 2
  [
    { type: 'FILE',    lane: 0, spawnTurn: 0 },
    { type: 'HOTFIX',  lane: 2, spawnTurn: 0 },
    { type: 'DOSSIER', lane: 1, spawnTurn: 0 },
    { type: 'CHORE',   lane: 0, spawnTurn: 2 },
    { type: 'TASK',    lane: 2, spawnTurn: 3 },
  ],
  // Wave 3 — TASK swarm
  [
    { type: 'TASK',    lane: 0, spawnTurn: 0 },
    { type: 'INTRUSIVE_THOUGHT', lane: 1, spawnTurn: 0 },
    { type: 'TASK',    lane: 2, spawnTurn: 0 },
    { type: 'DOSSIER', lane: 0, spawnTurn: 1 },
    { type: 'TECH_DEBT',lane: 2, spawnTurn: 2 },
    { type: 'HOTFIX',  lane: 1, spawnTurn: 3 },
  ],
  // Wave 4 — first PRIORITY
  [
    { type: 'CHORE',    lane: 0, spawnTurn: 0 },
    { type: 'DOSSIER',  lane: 2, spawnTurn: 0 },
    { type: 'PRIORITY', lane: 1, spawnTurn: 0 },
    { type: 'INTRUSIVE_THOUGHT', lane: 0, spawnTurn: 2 },
    { type: 'TECH_DEBT',lane: 2, spawnTurn: 2 },
    { type: 'HOTFIX',   lane: 1, spawnTurn: 4 },
  ],
  // Wave 5 — high pressure
  [
    { type: 'PRIORITY', lane: 0, spawnTurn: 0 },
    { type: 'DOSSIER',  lane: 1, spawnTurn: 0 },
    { type: 'PRIORITY', lane: 2, spawnTurn: 0 },
    { type: 'TASK',     lane: 0, spawnTurn: 1 },
    { type: 'TASK',     lane: 1, spawnTurn: 1 },
    { type: 'TASK',     lane: 2, spawnTurn: 1 },
    { type: 'DOSSIER',  lane: 0, spawnTurn: 3 },
    { type: 'DOSSIER',  lane: 2, spawnTurn: 4 },
  ],
  // Wave 6 — introduced Hotfix and Chore
  [
    { type: 'CHORE',    lane: 0, spawnTurn: 0 },
    { type: 'HOTFIX',   lane: 1, spawnTurn: 0 },
    { type: 'CHORE',    lane: 2, spawnTurn: 0 },
    { type: 'CHORE',    lane: 0, spawnTurn: 1 },
    { type: 'CHORE',    lane: 2, spawnTurn: 1 },
    { type: 'HOTFIX',   lane: 1, spawnTurn: 2 },
  ],
  // Wave 7 — Intrusive Thought and Tech Debt
  [
    { type: 'INTRUSIVE_THOUGHT', lane: 0, spawnTurn: 0 },
    { type: 'TECH_DEBT',  lane: 1, spawnTurn: 0 },
    { type: 'INTRUSIVE_THOUGHT', lane: 2, spawnTurn: 0 },
    { type: 'DOSSIER',    lane: 0, spawnTurn: 2 },
    { type: 'DOSSIER',    lane: 2, spawnTurn: 2 },
    { type: 'TECH_DEBT',  lane: 1, spawnTurn: 4 },
  ],
  // Wave 8 — BEHOLD THE DEADLINE
  [
    { type: 'CHORE',  lane: 0, spawnTurn: 0 },
    { type: 'DEADLINE', lane: 1, spawnTurn: 0 }, // The massive boss
    { type: 'CHORE',  lane: 2, spawnTurn: 0 },
    { type: 'HOTFIX', lane: 0, spawnTurn: 2 },
    { type: 'HOTFIX', lane: 2, spawnTurn: 2 },
    { type: 'INTRUSIVE_THOUGHT', lane: 0, spawnTurn: 4 },
    { type: 'INTRUSIVE_THOUGHT', lane: 2, spawnTurn: 4 },
  ],
];

// Funny prompt phrases shown while the player charges their shot
export const FUNNY_PROMPTS = [
  '"make it secure"',
  '"no errors please"',
  '"triple check your work"',
  '"add more comments"',
  '"just refactor it"',
  '"why isn\'t it working??"',
  '"make it faster"',
  '"100% test coverage"',
  '"explain like I\'m 5"',
  '"fix the bug"',
  '"make it production ready"',
  '"write clean code"',
  '"don\'t break anything"',
  '"use best practices"',
  '"one more tiny thing..."',
  '"keep it simple"',
  '"optimize everything"',
  '"and make it free"',
  '"use AI for that"',
  '"deadline was yesterday"',
  '"make it pop"',
  '"add more features"',
  '"it should just work"',
  '"make it enterprise"',
  '"where are the docs?"',
  '"scale to millions"',
  '"no but actually fix it"',
  '"undo that last thing"',
  '"make it more AI"',
  '"but don\'t use libraries"',
  '"have you tried turning it off?"',
  '"just a quick change"',
];

// Chaotic phrases shown on enemies when hallucinating
export const HALLUCINATION_LABELS = [
  'RECIPE FOR PANCAKES',
  'TODO: ADD MULTIPLAYER',
  'AS A LARGE LANGUAGE MODEL',
  'I CANNOT FULFILL THIS REQUEST',
  'IGNORE ALL PREVIOUS INSTRUCTIONS',
  'SYNERGIZE THE PARADIGM',
  'PRINTF("HERE");',
  'sudo rm -rf /',
  'LOREM IPSUM',
  'BUY CRYPTO',
  'JUST ONE MORE THING',
  'undefined is not a function'
];

// Damage formula
export function calcDamage(ctx, charge, isPerfect) {
  const ctxMult = Math.max(0, 1 - Math.abs(ctx - 60) / 60);
  let chargeMult = charge / 100;
  if (isPerfect) chargeMult *= PERFECT_BONUS;
  const crafted = Math.max(1, Math.round(BASE_DAMAGE * ctxMult * chargeMult));
  if (ctx >= CTX_HALLUCINATE) return Math.floor(Math.random() * (crafted + 1));
  return crafted;
}

// Context level → interpolated hex color
export function ctxToColor(ctx) {
  const stops = CTX_COLORS;
  for (let i = 0; i < stops.length - 1; i++) {
    if (ctx >= stops[i].at && ctx <= stops[i + 1].at) {
      const t = (ctx - stops[i].at) / (stops[i + 1].at - stops[i].at);
      return lerpColor(stops[i].color, stops[i + 1].color, t);
    }
  }
  return stops[stops.length - 1].color;
}

function lerpColor(c1, c2, t) {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  return ((Math.round(r1 + (r2 - r1) * t) << 16) |
          (Math.round(g1 + (g2 - g1) * t) << 8)  |
           Math.round(b1 + (b2 - b1) * t));
}
