# Generate Background

Generate a pixel art parallax background layer for Project Infiltrator using Google Imagen.
Always outputs at **320×180 px** (designed for 6× in-engine upscale = 1920×1080).

Usage: `/generate-background $ARGUMENTS`

Examples:
- `/generate-background far`
- `/generate-background mid asteroid field`
- `/generate-background near space debris seamless`
- `/generate-background custom dark data center hallway`

## Steps

### 1. Ensure dependencies are installed

Check if `node_modules/@google/genai` exists. If not, run:
```
pnpm add @google/genai sharp
```

### 2. Resolve layer from arguments

Parse `$ARGUMENTS` for a layer keyword and optional extra description:

| Keyword | Output path | Default description |
|---------|-------------|---------------------|
| `far` | `assets/backgrounds/bg-far.png` | Deep space star field, purple/blue nebula clouds, distant galaxies |
| `mid` | `assets/backgrounds/bg-mid.png` | Asteroid field, distant rocky planets, purple haze, small moons |
| `near` | `assets/backgrounds/bg-near.png` | Broken satellites, space debris, dark metallic structures, neon edge glow |
| none / `custom` | `assets/backgrounds/bg-custom.png` | Use the full argument as description |

If `seamless` or `tile` appears in `$ARGUMENTS`, add the `--seamless` flag to the command.

### 3. Build the command

```bash
node scripts/generate-background.mjs \
  --layer <far|mid|near> \
  --prompt "<any extra description from arguments>" \
  [--seamless]
```

For custom (no layer keyword matched):
```bash
node scripts/generate-background.mjs \
  --prompt "<full argument text>" \
  --out "assets/backgrounds/bg-custom.png" \
  [--seamless]
```

### 4. Report result

After the script completes, tell the user:
- Output file path
- Dimensions: 320×180 px
- In-game display size at 6× scale: 1920×1080
- Parallax scroll speed recommendation (far=0.1×, mid=0.4×, near=0.8×)

If the script fails with an API error, show the error and suggest checking `GEMINI_API_KEY` in `.env`.

### Layer design notes (for context)

- **Far layer** scrolls slowest — should look like a static starfield/nebula backdrop
- **Mid layer** has identifiable silhouettes (planets, asteroids) at medium density
- **Near layer** has bold dark silhouettes with neon edge accents, scrolls fastest
- All layers use the master palette: `#0a0014` to `#6b2fa0` range for darks, `#00e5ff`/`#39ff14` for neon accents
- Backgrounds do NOT have background removal applied (they are full-bleed)
