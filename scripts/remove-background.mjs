#!/usr/bin/env node
/**
 * Remove background from images with smooth, blended transparency.
 * Detects background color from corners/edges, uses smoothstep for alpha, feathers edges.
 *
 * Usage: node remove-background.mjs <input> [output] [--sample N] [--low N] [--high N] [--feather N]
 */

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

function parseArgs(args) {
  const result = { input: null, output: null, sample: 15, low: 5, high: 35, feather: 1.5 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--sample" && args[i + 1]) result.sample = Number(args[++i]);
    else if (args[i] === "--low" && args[i + 1]) result.low = Number(args[++i]);
    else if (args[i] === "--high" && args[i + 1]) result.high = Number(args[++i]);
    else if (args[i] === "--feather" && args[i + 1]) result.feather = Number(args[++i]);
    else if (!args[i].startsWith("--")) {
      if (!result.input) result.input = args[i];
      else result.output = args[i];
    }
  }
  return result;
}

function resolvePath(p) {
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function detectBackgroundColor(data, width, height, channels, sampleSize) {
  const samples = [];
  const n = Math.min(sampleSize, Math.floor(Math.min(width, height) / 4));

  const add = (x, y) => {
    const i = (y * width + x) * channels;
    samples.push([data[i], data[i + 1], data[i + 2]]);
  };

  for (let i = 0; i < n; i++) {
    add(i, 0);
    add(width - 1 - i, 0);
    add(0, i);
    add(width - 1, i);
    add(i, height - 1);
    add(width - 1 - i, height - 1);
    add(0, height - 1 - i);
    add(width - 1, height - 1 - i);
  }

  const median = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  const r = median(samples.map((s) => s[0]));
  const g = median(samples.map((s) => s[1]));
  const b = median(samples.map((s) => s[2]));

  return { r, g, b };
}

async function removeBackground(inputPath, outputPath, options) {
  const { sample, low, high, feather } = options;

  const resolved = resolvePath(inputPath);
  if (!fs.existsSync(resolved)) throw new Error(`File not found: ${resolved}`);

  const { data, info } = await sharp(resolved)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const channels = info.channels ?? 4;

  const bg = detectBackgroundColor(data, width, height, channels, sample);

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dist = colorDistance(r, g, b, bg.r, bg.g, bg.b);
    const alpha = Math.round(255 * smoothstep(low, high, dist));
    data[i + 3] = alpha;
  }

  let result = sharp(Buffer.from(data), { raw: { width, height, channels } });

  if (feather > 0) {
    const alphaOnly = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i += channels) {
      alphaOnly[i] = data[i + 3];
      alphaOnly[i + 1] = data[i + 3];
      alphaOnly[i + 2] = data[i + 3];
      alphaOnly[i + 3] = 255;
    }
    const blurredAlpha = await sharp(Buffer.from(alphaOnly), { raw: { width, height, channels } })
      .blur(feather)
      .raw()
      .toBuffer();

    for (let i = 0; i < data.length; i += channels) {
      data[i + 3] = blurredAlpha[i];
    }
    result = sharp(Buffer.from(data), { raw: { width, height, channels } });
  }

  const out = outputPath ? resolvePath(outputPath) : path.join(path.dirname(resolved), `${path.basename(resolved, path.extname(resolved))}-no-bg.png`);
  await result.png().toFile(out);
  return out;
}

async function main() {
  const { input, output, sample, low, high, feather } = parseArgs(process.argv.slice(2));

  if (!input) {
    console.error("Usage: node remove-background.mjs <input> [output] [--sample N] [--low N] [--high N] [--feather N]");
    process.exit(1);
  }

  try {
    const outPath = await removeBackground(input, output, { sample, low, high, feather });
    console.log("Saved:", outPath);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
