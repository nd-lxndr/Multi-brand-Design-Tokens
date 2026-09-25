/**
 * build-tokens.ts
 * ----------------
 * Reads /tokens/manifest.json to discover every brand + mode combination
 * your Figma export defines, merges Primitives -> Semantic -> Components
 * for each one, resolves {references}, and writes one CSS file per
 * brand/mode combo to /dist.
 *
 * This mirrors how Tokens Studio's own manifest.json works, so the
 * pipeline doesn't need brand names hardcoded anywhere - it discovers
 * them from the manifest, the same way Figma's plugin does.
 *
 * Run with: npm run build:tokens
 */

import * as fs from "fs";
import * as path from "path";

// ---- Types -----------------------------------------------------------
interface TokenLeaf {
  $value: string;
  $type: string;
}

interface TokenNode {
  [key: string]: TokenNode | TokenLeaf;
}

interface FlatToken {
  value: string;
  type: string;
}

interface Manifest {
  name: string;
  collections: Record<string, { modes: Record<string, string[]> }>;
}

function isTokenLeaf(node: TokenNode | TokenLeaf): node is TokenLeaf {
  return (
    typeof (node as TokenLeaf).$value === "string" &&
    typeof (node as TokenLeaf).$type === "string"
  );
}

const TOKENS_DIR = path.join(__dirname, "..", "tokens");
const DIST_DIR = path.join(__dirname, "..", "dist");

function loadJson<T>(fileName: string): T {
  const raw = fs.readFileSync(path.join(TOKENS_DIR, fileName), "utf-8");
  return JSON.parse(raw) as T;
}

// ---- Step 1: figure out every valid (brand, mode) build target --------
// A build target needs: a Primitives file (always), a Semantic file for
// that brand + mode, and a Components file for that brand. We discover
// all three from manifest.json rather than hardcoding brand names.
interface BuildTarget {
  brand: string;
  mode: string;
  semanticFile: string;
  componentsFile: string;
}

function getPrimitiveFiles(manifest: Manifest): string[] {
  const primitives = manifest.collections["Primitives"];
  if (!primitives) return [];
  return Object.values(primitives.modes).flat();
}

function getBuildTargets(manifest: Manifest): BuildTarget[] {
  const targets: BuildTarget[] = [];
  const componentCollection = manifest.collections["Components"];

  for (const collectionName of Object.keys(manifest.collections)) {
    if (!collectionName.startsWith("Semantic ")) continue;

    const brand = collectionName.replace("Semantic ", "");
    const semanticModes = manifest.collections[collectionName].modes;
    const componentFiles = componentCollection?.modes[brand];

    if (!componentFiles) {
      console.warn(`⚠ No Components set found for brand "${brand}" - skipping`);
      continue;
    }

    for (const mode of Object.keys(semanticModes)) {
      targets.push({
        brand,
        mode,
        semanticFile: semanticModes[mode][0],
        componentsFile: componentFiles[0],
      });
    }
  }

  return targets;
}

// ---- Step 2: flatten + resolve, same as before, just $value/$type -----
function flatten(node: TokenNode, prefix: string[] = []): Record<string, FlatToken> {
  let result: Record<string, FlatToken> = {};
  for (const key of Object.keys(node)) {
    const value = node[key];
    const currentPath = [...prefix, key];
    if (isTokenLeaf(value)) {
      result[currentPath.join(".")] = { value: value.$value, type: value.$type };
    } else {
      result = { ...result, ...flatten(value as TokenNode, currentPath) };
    }
  }
  return result;
}

function resolveReferences(flat: Record<string, FlatToken>): Record<string, FlatToken> {
  const resolved: Record<string, FlatToken> = { ...flat };
  const REFERENCE = /^\{(.+)\}$/;
  let changed = true;
  let safety = 0;

  while (changed && safety < 10) {
    changed = false;
    safety++;
    for (const key of Object.keys(resolved)) {
      const match = resolved[key].value.match(REFERENCE);
      if (match && resolved[match[1]] !== undefined) {
        resolved[key] = { ...resolved[key], value: resolved[match[1]].value };
        changed = true;
      }
    }
  }
  return resolved;
}

function toCssVarName(tokenPath: string): string {
  return `--${tokenPath.replace(/\./g, "-")}`;
}

function withUnit(value: string, type: string): string {
  switch (type) {
    case "spacing":
    case "borderRadius":
    case "dimension":
      return /^[\d.]+$/.test(value) ? `${value}px` : value; // already has "px" for some dimension tokens
    default:
      return value;
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ---- Step 3: build one CSS file per brand/mode target -------------------
function buildTarget(target: BuildTarget, primitiveFiles: string[]): void {
  const merged: TokenNode = {};

  for (const file of primitiveFiles) {
    Object.assign(merged, loadJson<TokenNode>(file));
  }
  Object.assign(merged, loadJson<TokenNode>(target.semanticFile));
  Object.assign(merged, loadJson<TokenNode>(target.componentsFile));

  const flat = flatten(merged);
  const resolved = resolveReferences(flat);

  const lines = Object.entries(resolved)
    .map(([tokenPath, token]) => `  ${toCssVarName(tokenPath)}: ${withUnit(token.value, token.type)};`)
    .sort();

  const fileName = `tokens.${slugify(target.brand)}.${slugify(target.mode)}.css`;
  const selector = `[data-brand="${slugify(target.brand)}"][data-mode="${slugify(target.mode)}"]`;
  const css = `${selector} {\n${lines.join("\n")}\n}\n`;

  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR);
  fs.writeFileSync(path.join(DIST_DIR, fileName), css, "utf-8");
  console.log(`✔ ${fileName} — ${Object.keys(resolved).length} tokens`);
}

// ---- Run ------------------------------------------------------------------
const manifest = loadJson<Manifest>("manifest.json");
const primitiveFiles = getPrimitiveFiles(manifest);
const targets = getBuildTargets(manifest);

console.log(`Found ${targets.length} brand/mode targets:`);
targets.forEach((t) => console.log(`  - ${t.brand} / ${t.mode}`));

targets.forEach((t) => buildTarget(t, primitiveFiles));
