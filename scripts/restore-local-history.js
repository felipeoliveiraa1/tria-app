#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const HIST_DIR = path.join(process.env.HOME, "Library", "Application Support", "Cursor", "User", "History");
const WORKSPACE = "/Users/felipeporto/Documents/tria-voa/tria-app";
const CUTOFF = new Date("2025-08-14T19:00:00-03:00").getTime();

function safeMkdirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function restoreFromDir(dir) {
  const entriesPath = path.join(HIST_DIR, dir, "entries.json");
  if (!fs.existsSync(entriesPath)) return [];
  let json;
  try {
    json = JSON.parse(fs.readFileSync(entriesPath, "utf8"));
  } catch (e) {
    return [];
  }
  const resourceUri = json.resource; // file:///...
  if (!resourceUri || !resourceUri.startsWith("file:///")) return [];
  const originalPath = decodeURI(resourceUri.replace("file://", ""));
  if (!originalPath.startsWith(WORKSPACE)) return [];

  // Escolher o blob pela data de mtime do arquivo físico (não pelo campo timestamp do json)
  let chosen = null;
  for (const entry of (json.entries || [])) {
    const blobPath = path.join(HIST_DIR, dir, entry.id);
    if (!fs.existsSync(blobPath)) continue;
    const st = fs.statSync(blobPath);
    const mt = st.mtime.getTime();
    if (mt <= CUTOFF) {
      if (!chosen || mt > chosen.mt) {
        chosen = { id: entry.id, blobPath, mt };
      }
    }
  }
  if (!chosen) return [];

  safeMkdirSync(path.dirname(originalPath));
  fs.copyFileSync(chosen.blobPath, originalPath);
  return [{ originalPath, blobPath: chosen.blobPath, mtime: new Date(chosen.mt).toISOString() }];
}

function main() {
  if (!fs.existsSync(HIST_DIR)) {
    console.error("History dir not found:", HIST_DIR);
    process.exit(1);
  }
  const dirs = fs.readdirSync(HIST_DIR);
  const restored = [];
  for (const d of dirs) {
    const dirPath = path.join(HIST_DIR, d);
    try {
      const stats = fs.statSync(dirPath);
      const day = new Date(stats.mtime);
      if (day.getFullYear() === 2025 && day.getMonth() === 7 && day.getDate() === 14) {
        const res = restoreFromDir(d);
        restored.push(...res);
      }
    } catch {}
  }
  console.log(JSON.stringify({ restoredCount: restored.length, restored }, null, 2));
}

main();
