import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const nextDir = path.join(root, ".next");

// Turbopack/Next dev can leave partially-written manifests and local KV/db artifacts.
// Removing the entire .next directory is the most reliable way to prevent:
// - .next/dev/routes-manifest.json ENOENT races
// - embedded storage SST/compaction failures due to stale/locked files
if (existsSync(nextDir)) {
  rmSync(nextDir, { force: true, recursive: true });
  console.log("Removed stale Next dev directory: .next");
}

// Keep any other dev cleanup targets small and explicit.
const targets = [
  // Some setups can also write to .vercel/cache or similar. Leave these untouched here
  // unless needed.
];

for (const target of targets) {
  const absolutePath = path.join(root, target);
  if (!existsSync(absolutePath)) continue;
  rmSync(absolutePath, { force: true, recursive: true });
  console.log(`Removed stale dev artifact: ${target}`);
}

console.log("Dev reset complete.");

