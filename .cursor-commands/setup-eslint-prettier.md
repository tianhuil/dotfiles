# ESLint & Prettier Setup Instructions

This document provides step-by-step instructions to reproduce the ESLint and Prettier configuration used in this project.

## Prerequisites

- Node.js (or Bun) installed
- VS Code (for editor integration)

## Step 1: Install Dependencies

Install the required ESLint and Prettier packages:

```bash
bun add -d \
  eslint@9.25.1 \
  @eslint/compat@^1.4.1 \
  @eslint/eslintrc \
  @eslint/js \
  @typescript-eslint/eslint-plugin@8.34.1 \
  @typescript-eslint/parser@8.34.1 \
  eslint-plugin-import@2.31.0 \
  eslint-plugin-jsx-a11y@6.10.2 \
  eslint-plugin-prettier@5.2.1 \
  eslint-plugin-react@7.37.5 \
  eslint-plugin-react-hooks@5.2.0 \
  eslint-plugin-unused-imports@4.1.4 \
  globals@16.0.0 \
  prettier@3.5.3 \
  @ianvs/prettier-plugin-sort-imports@^4.7.0 \
  eslint-config-prettier@9.1.0 \
  @next/eslint-plugin-next@15.3.4
```

## Step 2: Create ESLint Configuration

Create `eslint.config.mjs` in the project root:

```javascript
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import _import from "eslint-plugin-import";
import jsxA11Y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-plugin-prettier";
import react from "eslint-plugin-react";
import unusedImports from "eslint-plugin-unused-imports";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  globalIgnores([
    ".now/*",
    "**/*.css",
    "**/.changeset",
    "**/dist",
    "esm/*",
    "public/*",
    "tests/*",
    "scripts/*",
    "**/*.config.js",
    "**/.DS_Store",
    "**/node_modules",
    "**/coverage",
    "**/.next",
    "**/build",
    "!**/.commitlintrc.cjs",
    "!**/.lintstagedrc.cjs",
    "!**/jest.config.js",
    "!**/plopfile.js",
    "!**/react-shim.js",
    "!**/tsup.config.ts",
    "cosmos.imports.ts",
  ]),
  {
    extends: fixupConfigRules(
      compat.extends(
        "plugin:react/recommended",
        "plugin:prettier/recommended",
        "plugin:react-hooks/recommended",
        "plugin:jsx-a11y/recommended",
        "plugin:@next/next/recommended",
      ),
    ),
    plugins: {
      react: fixupPluginRules(react),
      "unused-imports": unusedImports,
      import: fixupPluginRules(_import),
      "@typescript-eslint": typescriptEslint,
      "jsx-a11y": fixupPluginRules(jsxA11Y),
      prettier: fixupPluginRules(prettier),
    },
    languageOptions: {
      globals: {
        ...Object.fromEntries(
          Object.entries(globals.browser).map(([key]) => [key, "off"]),
        ),
        ...globals.node,
      },
      parser: tsParser,
      ecmaVersion: 12,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-console": "off", // TODO: set to error before production
      "react/prop-types": "off",
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react-hooks/exhaustive-deps": "off",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/interactive-supports-focus": "warn",
      "prettier/prettier": "warn",
      "no-unused-vars": "off",
      "unused-imports/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          ignoreRestSiblings: false,
          argsIgnorePattern: "^_.*?$",
        },
      ],
      // Import ordering is handled by Prettier with @ianvs/prettier-plugin-sort-imports
      // to avoid conflicts between ESLint and Prettier
      "import/order": "off",
      "react/self-closing-comp": "warn",
      "react/jsx-sort-props": [
        "warn",
        {
          callbacksLast: true,
          shorthandFirst: true,
          noSortAlphabetically: false,
          reservedFirst: true,
        },
      ],
      "padding-line-between-statements": [
        "warn",
        {
          blankLine: "always",
          prev: "*",
          next: "return",
        },
        {
          blankLine: "always",
          prev: ["const", "let", "var"],
          next: "*",
        },
        {
          blankLine: "any",
          prev: ["const", "let", "var"],
          next: ["const", "let", "var"],
        },
      ],
    },
  },
]);
```

## Step 3: Create Prettier Configuration

Create `.prettierrc` in the project root:

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 80,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["@ianvs/prettier-plugin-sort-imports"],
  "importOrder": [
    "^(react/(.*)$)|^(react$)",
    "^(next/(.*)$)|^(next$)",
    "<BUILTIN_MODULES>",
    "",
    "<THIRD_PARTY_MODULES>",
    "",
    "^@/(.*)$",
    "",
    "^[./]"
  ],
  "importOrderParserPlugins": ["typescript", "jsx", "decorators-legacy"],
  "importOrderTypeScriptVersion": "5.0.0",
  "importOrderCaseSensitive": false
}
```

## Step 4: Create Prettier Ignore File

Create `.prettierignore` in the project root:

```
# Dependencies
node_modules
package-lock.json
bun.lock

# Build outputs
.next
dist
build
out
coverage

# Cache
.turbo
.eslintcache

# Logs
*.log

# System files
.DS_Store

# Git
.git

# Config files that should be formatted differently
pnpm-lock.yaml
yarn.lock
cosmos.imports.ts
```

## Step 5: Add Scripts to package.json

Add the following scripts to your `package.json`:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint --fix .",
    "format": "prettier --check .",
    "format:fix": "prettier --write .",
    "check": "eslint . && prettier --check . && tsc --noEmit && cspell \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "check:fix": "eslint --fix . && prettier --write ."
  }
}
```

### Script Descriptions

- `lint`: Run ESLint to check for linting errors
- `lint:fix`: Run ESLint and automatically fix fixable issues
- `format`: Check if files are formatted correctly with Prettier
- `format:fix`: Format all files with Prettier
- `check`: Run all checks (ESLint, Prettier, TypeScript, and spell check)
- `check:fix`: Run ESLint and Prettier with auto-fix enabled

## Step 6: Configure VS Code

Create `.vscode/settings.json` in the project root:

```json
{
  // Editor Settings
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },
  // Language-specific Settings
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[jsonc]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  // ESLint Settings
  "eslint.enable": true,
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  // Prettier Settings
  "prettier.enable": true,
  "prettier.requireConfig": true,
  // File Settings
  "files.eol": "\n",
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true
}
```

### Required VS Code Extensions

Install the following VS Code extensions:

1. **ESLint** (`dbaeumer.vscode-eslint`)
2. **Prettier - Code formatter** (`esbenp.prettier-vscode`)

You can install them via the VS Code Extensions marketplace or run:

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
```

## Step 7: Verify Setup

Run the following commands to verify everything is working:

```bash
# Check linting
bun run lint

# Check formatting
bun run format

# Run all checks
bun run check

# Auto-fix issues
bun run check:fix
```

## Step 8: Set Up GitHub Actions CI

Create a GitHub Actions workflow to automatically run checks, typecheck, and tests on push and pull requests.

### Create GitHub Actions Workflow

Create the directory `.github/workflows` if it doesn't exist, then create `ci.yml`:

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/ci.yml` with the following content:

```yaml
name: CI

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Cache Bun dependencies
        uses: actions/cache@v4
        with:
          path: |
            ~/.bun/install/cache
            node_modules
          key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lock') }}
          restore-keys: |
            ${{ runner.os }}-bun-

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run check
        run: bun run check

      - name: Run typecheck
        run: bun run typecheck

      - name: Run tests
        run: bun test
```

### Workflow Features

- **Triggers**: Runs on push and pull requests to `main` and `staging` branches
- **Bun Setup**: Uses the official `oven-sh/setup-bun@v2` action
- **Dependency Caching**: Caches Bun's install cache and `node_modules` for faster builds
- **Frozen Lockfile**: Uses `--frozen-lockfile` to ensure consistent installs
- **Comprehensive Checks**: Runs `check`, `typecheck`, and `test` scripts

### Add CI Badge to README

Add a CI status badge to your `README.md` file to display the workflow status. Add the badge near the top of the README, typically right after the title:

```markdown
# Your Project Title

![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg)

Your project description...
```

Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repository name.

You can get these by running

```bash
> git remote get-url origin 2>/dev/null || echo "no-remote"
```

The badge will automatically update to show the status of your latest workflow run (passing, failing, or in progress) and will link to the workflow page when clicked.

## Features

### ESLint Configuration

- **TypeScript support**: Uses `@typescript-eslint` parser and plugin
- **React support**: Includes React and React Hooks plugins
- **Accessibility**: JSX a11y rules enabled
- **Next.js**: Includes Next.js specific rules
- **Unused imports**: Automatically detects and warns about unused imports
- **Prettier integration**: ESLint runs Prettier checks

### Prettier Configuration

- **Import sorting**: Automatically sorts imports using `@ianvs/prettier-plugin-sort-imports`
- **Import order**: React → Next.js → Built-ins → Third-party → @ aliases → Relative
- **Consistent formatting**: 2-space indentation, semicolons, double quotes
- **Line endings**: LF (Unix-style)

### VS Code Integration

- **Format on save**: Automatically formats files when saving
- **ESLint on save**: Automatically fixes ESLint issues when saving
- **File settings**: Ensures consistent line endings and trailing whitespace handling

### GitHub Actions CI

- **Automated testing**: Runs checks, typecheck, and tests on every push and PR
- **Dependency caching**: Speeds up workflow runs by caching Bun dependencies
- **Status badge**: Visual indicator of CI status in README

## Troubleshooting

### ESLint not working in VS Code

1. Ensure ESLint extension is installed
2. Reload VS Code window (`Cmd+Shift+P` → "Reload Window")
3. Check VS Code output panel for ESLint errors

### Prettier not formatting

1. Ensure Prettier extension is installed
2. Check that `.prettierrc` exists in project root
3. Verify `prettier.requireConfig` is set to `true` in VS Code settings

### Import sorting not working

1. Ensure `@ianvs/prettier-plugin-sort-imports` is installed
2. Verify the plugin is listed in `.prettierrc` plugins array
3. Run `bun run format:fix` to manually format imports

### GitHub Actions workflow not running

1. Ensure the workflow file is in `.github/workflows/ci.yml`
2. Check that you're pushing to or creating a PR targeting `main` or `staging` branches
3. Verify the workflow file syntax is valid YAML
4. Check the Actions tab in your GitHub repository for error messages

### CI badge not displaying

1. Ensure the badge URL uses the correct username and repository name
2. Verify the workflow file is named `ci.yml` (or update the badge URL to match your workflow filename)
3. Check that at least one workflow run has completed (badge won't show until first run)
