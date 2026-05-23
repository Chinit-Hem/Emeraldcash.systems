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
  ".env",
  ".env.example",
  ".env.local",
  ".git",
  ".gitignore",
  ".npmrc",
  "blackbox_mcp_settings.json",
  "capacitor.config.ts",
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
  "tailwind.config.ts",
  "tsconfig.json",
  "tsconfig.tsbuildinfo",
  "vercel.json",
  "TODO.md",
]);

const allowedRootDirectories = new Set([
  ".git",
  ".github",
  ".codex",
  ".next",
  ".sixth",
  ".vscode",
  "android",
  "apps-script",
  "assets",
  "docs",
  "ios",
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
const ignoredWalkDirectories = new Set([".git", ".next", "node_modules", "test-results"]);

const disallowedPaths = [
  {
    path: "tailwind.config.js",
    message: "Remove empty tailwind.config.js and use tailwind.config.ts as the single Tailwind config.",
  },
  {
    path: "src/services/next.config.ts",
    message: "Remove misplaced src/services/next.config.ts; Next.js config belongs at the project root.",
  },
  {
    path: "src/services/SomeService.ts",
    message: "Remove scaffold service src/services/SomeService.ts or rename it to a real domain service.",
  },
  {
    path: "src/app/api/some-resource",
    message: "Remove scaffold API route src/app/api/some-resource or rename it to a real API domain.",
  },
];

function exists(relativePath) {
  return existsSync(path.join(root, relativePath));
}

function findFilesByName(directory, fileName, matches = []) {
  for (const entry of readdirSync(directory)) {
    const absolutePath = path.join(directory, entry);
    const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
    const isDirectory = statSync(absolutePath).isDirectory();

    if (isDirectory) {
      if (!ignoredWalkDirectories.has(entry)) {
        findFilesByName(absolutePath, fileName, matches);
      }
      continue;
    }

    if (entry === fileName) {
      matches.push(relativePath);
    }
  }

  return matches;
}

for (const directory of requiredDirectories) {
  if (!exists(directory)) {
    failures.push(`Missing required directory: ${directory}`);
  }
}

for (const disallowedPath of disallowedPaths) {
  if (exists(disallowedPath.path)) {
    failures.push(disallowedPath.message);
  }
}

for (const filePath of findFilesByName(root, ".DS_Store")) {
  failures.push(`Remove OS metadata file: ${filePath}`);
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
