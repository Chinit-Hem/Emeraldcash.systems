import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // Global ignores - must be first to prevent processing
  globalIgnores([
    "scripts/**",
    "apps-script/**",
    ".next/**",
    ".next_old/**",
    "out/**",
    "build/**",
    "dist/**",
    "node_modules/**",
    "coverage/**",
    "next-env.d.ts",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
  ]),
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Keep VS Code Problems focused on build-breaking issues. This repo has
      // legacy screens with intentionally parked props/state and dynamic images.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
      "@next/next/no-page-custom-font": "off",
      "react-hooks/incompatible-library": "off",
      "import/no-anonymous-default-export": "off",
      // Downgrade jsx-a11y rules to warning only
      "jsx-a11y/role-supports-aria-props": "warn",
      // Suppress experimental React Compiler rules that flag standard patterns
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/static-components": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off"
    }
  }
]);

export default eslintConfig;
