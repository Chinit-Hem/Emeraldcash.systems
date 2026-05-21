import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredDirectories = [
  "src/app",
  "src/app/api",
  "src/components",
  "src/components/ui",
  "src/config",
  "src/lib",
  "src/repositories",
  "src/services",
  "src/styles",
  "src/types",
  "public",
  "docs",
  "docs/todo",
  "docs/archive",
  "scripts",
  "scripts/deploy",
  "scripts/migrations",
  "tests",
];

const allowedRootFiles = new Set([
  ".DS_Store",
  ".env",
  ".env.example",
  ".env.local",
  ".gitignore",
  ".npmrc",
  "blackbox_mcp_settings.json",
  "eslint.config.mjs",
  "middleware.ts",
  "next-env.d.ts",
  "next.config.ts",
  "package-lock.json",
  "package.json",
  "postcss.config.mjs",
  "README.md",
  "render.yaml",
  "structure-check.mjs",
  "tailwind.config.js",
  "tailwind.config.ts",
  "tsconfig.json",
  "tsconfig.tsbuildinfo",
  "vercel.json",
  "TODO.md",
]);

const allowedRootDirectories = new Set([
  ".git",
  ".github",
  ".next",
  ".sixth",
  ".vscode",
  "apps-script",
  "docs",
  "node_modules",
  "public",
  "scripts",
  "src",
  "test-results",
  "tests",
]);

const looseRootFilePatterns = [
  /^.*_TODO\.md$/i,
  /^.*_SUMMARY\.md$/i,
  /^.*_REPORT\.md$/i,
  /^.*_PLAN\.md$/i,
  /^.*-log\.txt$/i,
  /^.*_summary\.txt$/i,
  /^.*migration.*\.sql$/i,
  /^deploy\.sh$/i,
  /^auto-deploy\.sh$/i,
];

const warnings = [];
const failures = [];

function exists(relativePath) {
  return existsSync(path.join(root, relativePath));
}

for (const directory of requiredDirectories) {
  if (!exists(directory)) {
    failures.push(`Missing required directory: ${directory}`);
  }
}

for (const entry of readdirSync(root)) {
  const absolutePath = path.join(root, entry);
  const isDirectory = statSync(absolutePath).isDirectory();

  if (isDirectory && !allowedRootDirectories.has(entry)) {
    warnings.push(`Unexpected root directory: ${entry}`);
  }

  if (!isDirectory) {
    const isAllowed = allowedRootFiles.has(entry);
    const isLooseProjectArtifact = looseRootFilePatterns.some((pattern) =>
      pattern.test(entry),
    );

    if (!isAllowed || isLooseProjectArtifact) {
      failures.push(
        `Move root file "${entry}" into docs/, scripts/, public/, or src/ as appropriate.`,
      );
    }
  }
}

const legacySharedCandidates = [
  "src/app/components/Sidebar.tsx",
  "src/app/components/TopBar.tsx",
  "src/app/components/OptimizedLink.tsx",
  "src/app/components/OptimizedImage.tsx",
];

for (const filePath of legacySharedCandidates) {
  if (exists(filePath)) {
    warnings.push(
      `Legacy shared UI still exists at ${filePath}. Prefer moving shared UI to src/components/ and feature UI to src/features/<feature>/components. (Planned refactor; keep imports stable via re-exports if needed.)`,
    );
  }
}

const legacyRouteComponents = [
  "src/app/(app)/vehicles/VehiclesClient.tsx",
  "src/app/(app)/vehicles/VehiclesClientEnhanced.tsx",
  "src/app/(app)/settings/SettingsContent.tsx",
];

for (const filePath of legacyRouteComponents) {
  if (exists(filePath)) {
    warnings.push(
      `${filePath} is a route-adjacent client component. Move it to src/features/ when that feature is next edited.`,
    );
  }
}

if (warnings.length > 0) {
  console.log("Structure warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
  console.log("");
}

if (failures.length > 0) {
  console.error("Structure check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Structure check passed.");
