#!/usr/bin/env node
/**
 * Generate a pixel art sprite using Google Imagen via @google/genai.
 * Resizes output to exact pixel dimensions using sharp (nearest-neighbor).
 *
 * Usage:
 *   node generate-image.mjs --prompt "..." --width 32 --height 32 --out assets/sprites/enemy-file.png
 *   node generate-image.mjs --prompt "..." --width 64 --height 32 --out assets/sprites/tank-body.png [--no-bg-remove]
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// Load .env manually (no dotenv dependency needed)
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

function parseArgs(args) {
  const result = {
    prompt: null,
    width: 32,
    height: 32,
    out: null,
    bgRemove: true,
    model: "imagen-3.0-generate-002",
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--prompt" && args[i + 1]) result.prompt = args[++i];
    else if (args[i] === "--width" && args[i + 1]) result.width = Number(args[++i]);
    else if (args[i] === "--height" && args[i + 1]) result.height = Number(args[++i]);
    else if (args[i] === "--out" && args[i + 1]) result.out = args[++i];
    else if (args[i] === "--model" && args[i + 1]) result.model = args[++i];
    else if (args[i] === "--no-bg-remove") result.bgRemove = false;
  }
  return result;
}

// Pick the best aspect ratio Imagen supports for the given dimensions
function bestAspectRatio(width, height) {
  const ratio = width / height;
  const supported = [
    { ratio: 1 / 1, value: "1:1" },
    { ratio: 4 / 3, value: "4:3" },
    { ratio: 3 / 4, value: "3:4" },
    { ratio: 16 / 9, value: "16:9" },
    { ratio: 9 / 16, value: "9:16" },
  ];
  let best = supported[0];
  let bestDiff = Infinity;
  for (const s of supported) {
    const diff = Math.abs(s.ratio - ratio);
    if (diff < bestDiff) { bestDiff = diff; best = s; }
  }
  return best.value;
}

async function generateSprite({ prompt, width, height, out, bgRemove, model }) {
  loadEnv();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in environment or .env");

  const outPath = path.resolve(process.cwd(), out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const aspectRatio = bestAspectRatio(width, height);

  const stylePrefix =
    "pixel art sprite, retro arcade game asset, hard pixel edges, no anti-aliasing, " +
    "no gradients, flat shading, clean black outline, limited 16-color palette, " +
    "dark space background, neon cyan and purple color scheme, ";

  const fullPrompt = stylePrefix + prompt;

  console.log(`Generating: ${width}×${height} — "${fullPrompt.slice(0, 80)}..."`);
  console.log(`Model: ${model} | Aspect ratio: ${aspectRatio}`);

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateImages({
    model,
    prompt: fullPrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: "image/png",
      aspectRatio,
    },
  });

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) throw new Error("No image returned from API");

  const buffer = Buffer.from(imageBytes, "base64");

  // Resize to exact sprite dimensions using nearest-neighbor (preserves pixel art crispness)
  await sharp(buffer)
    .resize(width, height, { kernel: sharp.kernel.nearest, fit: "fill" })
    .png()
    .toFile(outPath);

  console.log(`Saved: ${outPath}`);

  if (bgRemove) {
    const noBgPath = outPath.replace(/\.png$/, "-no-bg.png");
    console.log("Removing background...");
    execSync(`node ${path.resolve(process.cwd(), "scripts/remove-background.mjs")} "${outPath}" "${noBgPath}"`, {
      stdio: "inherit",
    });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.prompt || !args.out) {
    console.error(
      "Usage: node generate-image.mjs --prompt \"...\" --width 32 --height 32 --out assets/sprites/name.png [--no-bg-remove] [--model imagen-3.0-generate-002]"
    );
    process.exit(1);
  }

  try {
    await generateSprite(args);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
