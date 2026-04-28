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
      // Allow underscore-prefixed variables to be unused (intentional destructuring)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      // Downgrade react-hooks/exhaustive-deps to warning only
      "react-hooks/exhaustive-deps": "warn",
      // Downgrade no-img-element to warning only
      "@next/next/no-img-element": "warn",
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
