# Design Guidelines

Display the full art style guide for Project Infiltrator and write it to `assets/STYLE_GUIDE.md`.

## Steps

1. Print the style guide below to the terminal for the user to read.
2. Write the exact same content to `assets/STYLE_GUIDE.md` (create the `assets/` directory if it does not exist).
3. Confirm: "Style guide written to assets/STYLE_GUIDE.md"

---

## Project Infiltrator — Pixel Art Style Guide

### Rendering Rules
- **Hard pixels only** — nearest-neighbor scaling at all times, zero anti-aliasing
- **No gradients** — flat fills and dithering only
- **No sub-pixel effects** — if it doesn't land on a pixel grid, it doesn't exist
- **Outline rule** — all sprites have a 1px solid dark outline (`#0a0014` or `#12002a`)
- **16 colors max per sprite** — NES/Game Boy Color discipline

### Master Palette

| Role | Hex | Usage |
|------|-----|-------|
| Void black | `#0a0014` | Deepest background, sprite outlines |
| Space black | `#12002a` | Dark fills, shadow areas |
| Deep purple | `#3d1a6b` | Nebula base, enemy fill |
| Mid purple | `#6b2fa0` | Enemy highlight, mid nebula |
| Neon cyan | `#00e5ff` | Player tank, beam, UI accents |
| Neon green | `#39ff14` | Optimal heat zone, health |
| Warning orange | `#ff6b00` | High heat, caution UI |
| Danger red | `#ff1744` | Overheat, damage, low health |
| Gold | `#ffd700` | Priority enemies, perfect prompt |
| Warm white | `#f0f0ff` | Highlights, star points |
| Steel grey | `#8899aa` | Fortress walls, file cabinets |
| Dark steel | `#445566` | Fortress shadow, metal detail |
| Heat blue | `#0055ff` | Low/cool heat level |
| Heat yellow | `#ffee00` | Mid-high heat |
| Skin/tan | `#ddaa77` | (reserved for future characters) |
| Transparent | — | Always PNG with alpha channel |

### Sprite Size Table

| Asset | Canvas | Output File |
|-------|--------|-------------|
| FILE enemy | 32×32 | `assets/sprites/enemy-file.png` |
| DOSSIER enemy | 32×32 | `assets/sprites/enemy-dossier.png` |
| TASK enemy | 32×32 | `assets/sprites/enemy-task.png` |
| PRIORITY variant | 32×32 | `assets/sprites/enemy-priority.png` |
| Tank body | 64×32 | `assets/sprites/tank-body.png` |
| Tank barrel (single) | 32×16 | `assets/sprites/tank-barrel.png` |
| Tank barrel (split) | 48×16 | `assets/sprites/tank-barrel-split.png` |
| Fortress | 128×96 | `assets/sprites/fortress.png` |
| Projectile beam | 16×8 | `assets/sprites/projectile.png` |
| Explosion sheet (4 frames) | 128×32 | `assets/sprites/explosion.png` |
| UI icons | 32×32 | `assets/sprites/icon-*.png` |

### Background Layer Table

All backgrounds render at **320×180** — scaled ×6 in-engine = 1920×1080.

| Layer | Depth | Scroll Speed | Output File |
|-------|-------|--------------|-------------|
| Far | Farthest | 0.1× | `assets/backgrounds/bg-far.png` |
| Mid | Middle | 0.4× | `assets/backgrounds/bg-mid.png` |
| Near | Closest | 0.8× | `assets/backgrounds/bg-near.png` |

### Sprite Design Conventions

**Enemies** — purple/violet dominant, small white or gold eye/glow detail
- FILE: pixel filing cabinet with small angel wings, glowing eye slot
- DOSSIER: winged folder with illuminati eye, clasps visible
- TASK: wispy checkmark ghost, trailing motion pixels
- PRIORITY: gold-trimmed variant of any enemy type, "P" badge top-right corner

**Tank (AQUA-REBEL)**
- Body: chunky tracked vehicle, steel-grey with cyan accent stripe
- Barrel: points right, neon cyan glow at tip
- Split mode: dual parallel barrels, slightly wider frame

**Fortress (HOME BASE)**
- Brutalist pixel architecture, 3–4 floors visible
- Steel grey walls, dark window slots, antenna on top
- Shield visible as cyan glow border when shield > 0%

**Projectile**
- 16×8 horizontal beam, cyan core with white center pixel
- Particle trail rendered by engine (not baked into sprite)

**Explosion (4-frame sheet, 128×32)**
- Frame 1: small white core burst
- Frame 2: orange/red radial burst
- Frame 3: orange pixels scattering
- Frame 4: fading debris pixels

### Image Generation Prompt Template

```
pixel art, {subject}, retro arcade game asset, hard pixel edges, no anti-aliasing,
no gradients, flat shading, clean black outline (#0a0014), limited 16-color palette,
dark space background, neon cyan and purple color scheme, {size} sprite canvas,
isometric-friendly perspective
```

**Enemy variant addition:**
```
+ purple and violet dominant colors, glowing eye detail, small feathered wings
```

**Tank/player variant addition:**
```
+ steel grey chassis, neon cyan accent, tracked wheels, side profile view
```
