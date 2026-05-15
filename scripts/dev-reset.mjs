import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = [
  ".next/cache",
  ".next/trace",
];

for (const target of targets) {
  const absolutePath = path.join(root, target);
  if (!existsSync(absolutePath)) {
    continue;
  }

  rmSync(absolutePath, { force: true, recursive: true });
  console.log(`Removed stale dev artifact: ${target}`);
}

console.log("Dev reset complete.");
