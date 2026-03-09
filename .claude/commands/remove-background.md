# Remove Background

Strip the background from a PNG image using corner-color detection with smooth
alpha blending. Based on sharp — no external AI API needed.

Usage: `/remove-background $ARGUMENTS`

Examples:
- `/remove-background assets/sprites/enemy-file.png`
- `/remove-background assets/sprites/tank-body.png assets/sprites/tank-body-no-bg.png`
- `/remove-background assets/sprites/fortress.png --low 10 --high 45`
- `/remove-background assets/sprites/task.png --feather 0`

## Steps

### 1. Ensure sharp is installed

Check if `node_modules/sharp` exists. If not, run:
```
pnpm add sharp
```

### 2. Run the remover

Pass `$ARGUMENTS` directly to the script:

```bash
node scripts/remove-background.mjs $ARGUMENTS
```

### 3. Report result

On success, the script prints `Saved: <output path>`. Relay this to the user.

If no output path was given, the output is saved as `<input-name>-no-bg.png` in the same directory.

### Available flags

| Flag | Default | Effect |
|------|---------|--------|
| `--sample N` | 15 | Number of pixels sampled from each edge to detect background color |
| `--low N` | 5 | Color distance below which pixels are fully transparent |
| `--high N` | 35 | Color distance above which pixels are fully opaque |
| `--feather N` | 1.5 | Gaussian blur radius applied to alpha channel (0 = sharp hard edge) |

### Tuning tips

- **Pixel art sprites** (hard edges, solid fill background): use `--feather 0 --low 0 --high 20`
- **Generated sprites** (slight color variation near edges): defaults work well
- **Dark background sprites**: if background is near-black, lower `--high` to 20
- **Multiple background tones**: increase `--sample` to 30 for better median detection
