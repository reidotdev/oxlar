import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";

export default defineConfig([
  // `**/`-prefixed so build output is ignored at any depth (nested worktrees).
  globalIgnores([
    "**/dist/**",
    "**/.astro/**",
    "**/node_modules/**",
    "studio/**",
    "**/*.d.ts",
    "src/lib/sanity/sanity.types.ts",
    ".claude/worktrees/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  ...astro.configs["jsx-a11y-recommended"],
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "no-restricted-globals": ["error", "localStorage", "sessionStorage"],
    },
  },
]);
