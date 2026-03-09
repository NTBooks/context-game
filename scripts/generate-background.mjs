#!/usr/bin/env node
/**
 * Generate a pixel art parallax background layer using Google Imagen via @google/genai.
 * Always outputs at 320×180 (6× upscale target = 1920×1080) using nearest-neighbor resize.
 *
 * Usage:
 *   node generate-background.mjs --layer far --prompt "deep space nebula, purple and blue"
 *   node generate-background.mjs --layer mid --prompt "asteroid field, distant planets"
 *   node generate-background.mjs --layer near --prompt "space debris, broken satellites" --seamless
 *   node generate-background.mjs --out assets/backgrounds/custom.png --prompt "..."
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const OUTPUT_WIDTH = 320;
const OUTPUT_HEIGHT = 180;

const LAYER_PRESETS = {
  far: {
    out: "assets/backgrounds/bg-far.png",
    basePrompt:
      "deep space background, star field, purple and blue nebula clouds, distant galaxies, " +
      "tiny bright stars, dark void, cosmic dust, faint light streaks",
  },
  mid: {
    out: "assets/backgrounds/bg-mid.png",
    basePrompt:
      "space midground, asteroids floating, distant rocky planets, purple haze, " +
      "small moons, meteor fragments, space rocks silhouettes",
  },
  near: {
    out: "assets/backgrounds/bg-near.png",
    basePrompt:
      "space foreground, broken satellites, space debris, dark metallic structures, " +
      "floating circuit board fragments, near-black silhouettes, neon edge glow",
  },
};

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
    layer: null,
    prompt: null,
    out: null,
    seamless: false,
    model: "imagen-3.0-generate-002",
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--layer" && args[i + 1]) result.layer = args[++i];
    else if (args[i] === "--prompt" && args[i + 1]) result.prompt = args[++i];
    else if (args[i] === "--out" && args[i + 1]) result.out = args[++i];
    else if (args[i] === "--model" && args[i + 1]) result.model = args[++i];
    else if (args[i] === "--seamless") result.seamless = true;
  }
  return result;
}

async function generateBackground({ layer, prompt, out, seamless, model }) {
  loadEnv();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in environment or .env");

  const preset = layer ? LAYER_PRESETS[layer] : null;
  if (layer && !preset) throw new Error(`Unknown layer "${layer}". Use: far, mid, near`);

  const outPath = path.resolve(process.cwd(), out ?? preset?.out ?? "assets/backgrounds/bg-custom.png");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const stylePrefix =
    "pixel art background, retro arcade game, hard pixel edges, no anti-aliasing, " +
    "flat color areas, limited palette, dark space aesthetic, neon accents, ";

  const seamlessSuffix = seamless ? ", seamlessly tileable horizontally, left and right edges match" : "";

  const basePrompt = preset ? preset.basePrompt : "";
  const userPrompt = prompt ? prompt : "";
  const combined = [basePrompt, userPrompt].filter(Boolean).join(", ");
  const fullPrompt = stylePrefix + combined + seamlessSuffix;

  console.log(`Generating background: ${OUTPUT_WIDTH}×${OUTPUT_HEIGHT}`);
  console.log(`Layer: ${layer ?? "custom"} | Model: ${model}`);
  console.log(`Prompt: "${fullPrompt.slice(0, 100)}..."`);

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateImages({
    model,
    prompt: fullPrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: "image/png",
      aspectRatio: "16:9",
    },
  });

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) throw new Error("No image returned from API");

  const buffer = Buffer.from(imageBytes, "base64");

  await sharp(buffer)
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { kernel: sharp.kernel.nearest, fit: "fill" })
    .png()
    .toFile(outPath);

  console.log(`Saved: ${outPath} (${OUTPUT_WIDTH}×${OUTPUT_HEIGHT})`);
  console.log(`Tip: Scale 6× in-game for 1920×1080 fullscreen`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.layer && !args.prompt) {
    console.error(
      "Usage: node generate-background.mjs --layer <far|mid|near> [--prompt \"extra detail\"] [--seamless]\n" +
      "       node generate-background.mjs --prompt \"...\" --out assets/backgrounds/custom.png [--seamless]"
    );
    process.exit(1);
  }

  try {
    await generateBackground(args);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
