# Generate Image

Generate a pixel art game sprite for Project Infiltrator using Google Imagen.
The argument is the asset name or a free-form description.

Usage: `/generate-image $ARGUMENTS`

Examples:
- `/generate-image FILE enemy`
- `/generate-image tank body`
- `/generate-image explosion sheet`
- `/generate-image glowing cyan health bar icon`

## Steps

### 1. Ensure dependencies are installed

Check if `node_modules/@google/genai` exists. If not, run:
```
pnpm add @google/genai sharp
```

### 2. Resolve asset from the known sprite table

Match `$ARGUMENTS` (case-insensitive, partial match) against this table:

| Keywords | Width | Height | Output path | Prompt addition |
|----------|-------|--------|-------------|-----------------|
| `file`, `file enemy` | 32 | 32 | `assets/sprites/enemy-file.png` | `pixel filing cabinet, small angel wings, glowing eye slot, purple and violet` |
| `dossier` | 32 | 32 | `assets/sprites/enemy-dossier.png` | `winged folder with illuminati eye, clasps visible, purple and violet` |
| `task` | 32 | 32 | `assets/sprites/enemy-task.png` | `wispy checkmark ghost, trailing motion pixels, purple and violet` |
| `priority` | 32 | 32 | `assets/sprites/enemy-priority.png` | `gold-trimmed flying document, "P" badge, golden glow, purple and violet` |
| `tank body`, `tank` | 64 | 32 | `assets/sprites/tank-body.png` | `chunky tracked vehicle, steel grey chassis, neon cyan accent stripe, side profile` |
| `tank barrel`, `barrel` (single) | 32 | 16 | `assets/sprites/tank-barrel.png` | `single cannon barrel, neon cyan glow at tip, side profile` |
| `split barrel`, `dual barrel` | 48 | 16 | `assets/sprites/tank-barrel-split.png` | `dual parallel cannon barrels, neon cyan glow tips, side profile` |
| `fortress`, `home base` | 128 | 96 | `assets/sprites/fortress.png` | `brutalist pixel fortress, 3 floors, steel grey walls, dark windows, antenna, cyan shield glow` |
| `projectile`, `beam` | 16 | 8 | `assets/sprites/projectile.png` | `horizontal water beam, neon cyan core, white center pixel, side view` |
| `explosion` | 128 | 32 | `assets/sprites/explosion.png` | `4-frame explosion spritesheet, frames left to right, orange red burst, pixel debris` |

If `$ARGUMENTS` does not match any keyword, use:
- Width: 32, Height: 32
- Output: `assets/sprites/<slugified-argument>.png`
- Prompt: the raw argument text

Ask the user to confirm the dimensions if the asset is unrecognized.

### 3. Build the prompt

Combine the style prefix with the matched prompt addition:

```
pixel art sprite, retro arcade game asset, hard pixel edges, no anti-aliasing,
no gradients, flat shading, clean black outline, limited 16-color palette,
dark space background, neon cyan and purple color scheme,
<prompt addition from table above>
```

### 4. Run the generator

```bash
node scripts/generate-image.mjs \
  --prompt "<full prompt>" \
  --width <W> \
  --height <H> \
  --out "<output path>"
```

The script automatically runs background removal after generation. Pass `--no-bg-remove` only for backgrounds or full-bleed sprites where transparency is not needed.

### 5. Report result

After the script exits successfully, tell the user:
- The output file path
- The exact dimensions
- Whether background was removed (and the `-no-bg.png` path)

If the script fails with an API error, show the error message and suggest checking `GEMINI_API_KEY` in `.env`.
