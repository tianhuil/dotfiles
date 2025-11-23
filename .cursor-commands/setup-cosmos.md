# React Cosmos Setup Guide

## 1. Install Dependencies

Install React Cosmos and related dependencies using Bun:

```bash
bun add -d react-cosmos react-cosmos-plugin-webpack
```

Install Babel and Webpack loaders needed for Cosmos:

```bash
bun add -d @babel/core @babel/preset-env @babel/preset-react @babel/preset-typescript babel-loader
bun add -d css-loader style-loader postcss-loader html-webpack-plugin
```

## 2. Create Configuration Files

### **cosmos.config.json**

Create this file in your project root:

```json
{
  "plugins": ["react-cosmos-plugin-webpack"],
  "staticPath": "public",
  "watchDirs": ["app"],
  "fixturesDir": ".",
  "fixtureFileSuffix": "fixture",
  "webpack": {
    "configPath": "./cosmos.webpack.config.js"
  },
  "port": 5001,
  "exportPath": "cosmos-export"
}
```

**Configuration breakdown:**
- `plugins`: Use the webpack plugin for bundling
- `staticPath`: Serve static files from `public/` directory
- `watchDirs`: Watch the `app/` directory for fixture changes
- `fixturesDir`: Root directory for finding fixtures (`.` means project root)
- `fixtureFileSuffix`: Files ending with `.fixture.tsx` will be recognized as fixtures
- `webpack.configPath`: Custom webpack config for Cosmos
- `port`: Dev server runs on port 5001
- `exportPath`: Static export destination directory

### **cosmos.webpack.config.js**

Create this file in your project root:

```javascript
const path = require("path");

module.exports = {
  mode: "development",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env",
              [
                "@babel/preset-react",
                {
                  runtime: "automatic",
                },
              ],
              "@babel/preset-typescript",
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
    ],
  },
};
```

**Configuration breakdown:**
- Sets up `@/` alias for imports from project root
- Configures Babel to transpile TypeScript and React (with automatic JSX runtime)
- Handles CSS with style-loader, css-loader, and postcss-loader for Tailwind support

### **cosmos.decorator.tsx**

Create this file to wrap all fixtures with global styles:

```typescript
import React from "react";

import "@/styles/globals.css";

/**
 * Cosmos decorator that wraps all fixtures with global styles and padding
 */
const CosmosDecorator = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="dark text-foreground bg-background min-h-screen flex flex-col items-center gap-4 p-2 sm:p-8">
      {children}
    </div>
  );
};

export default CosmosDecorator;
```

**Purpose:**
- Applies global CSS (including Tailwind)
- Wraps all fixtures in a consistent container with theme styling
- Provides consistent padding and layout

## 3. Add NPM Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "cosmos": "cosmos --expose-imports --port 5001",
    "cosmos:export": "bun cosmos-export --expose-imports && ...",
    "deploy:cosmos": "wrangler pages deploy ./cosmos-export --project-name your-project-name --commit-dirty=true",
    "predeploy:cosmos": "bun cosmos:export"
  }
}
```

## 4. Create Fixture Files

Fixtures should follow the naming pattern `*.fixture.tsx` and be placed in your component directories.

**Example fixture structure** (`app/qubit/display.fixture.tsx`):

```typescript
import { useValue, useFixtureSelect } from "react-cosmos/client";
import { YourComponent } from "./your-component";

const YourComponentFixture = () => {
  // Interactive controls
  const [isConnected] = useValue("isConnected", { defaultValue: true });
  const [selectedOption] = useFixtureSelect("option", {
    options: ["option1", "option2", "option3"],
    defaultValue: "option1",
  });

  return (
    <YourComponent
      isConnected={isConnected}
      option={selectedOption}
    />
  );
};

export default YourComponentFixture;
```

**Key patterns:**
- Export a default component for the fixture
- Use `useValue` for boolean/string/number controls
- Use `useFixtureSelect` for dropdown selections
- Set display name for better debugging

## 5. Run Cosmos

Start the development server:

```bash
bun run cosmos
```

This will:
- Start Cosmos on `http://localhost:5001`
- Auto-discover all `*.fixture.tsx` files
- Enable hot reloading for fixtures
- Generate `cosmos.imports.ts` (auto-generated, add to `.gitignore`)

## 6. Export Static Build (Optional)

To create a static export for deployment:

```bash
bun run cosmos:export
```

This generates a static site in the `cosmos-export/` directory that can be deployed to:
- Cloudflare Pages
- Vercel
- Netlify
- Any static hosting service

## 7. Important Notes

1. **Auto-generated files**: The file `cosmos.imports.ts` is automatically generated by Cosmos. Add it to `.gitignore`.

2. **Path aliases**: Ensure your webpack config's `@` alias matches your TypeScript config:
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./*"]
       }
     }
   }
   ```

3. **CSS Support**: The webpack config includes PostCSS support, which works with Tailwind CSS automatically if you have `postcss.config.js` configured.

4. **HeroUI/NextUI**: If using component libraries like HeroUI, they work seamlessly in Cosmos with the decorator applying theme classes.

5. **Fixture Organization**: Keep fixtures next to their components (e.g., `Button.tsx` and `Button.fixture.tsx` in the same directory).

## 8. Common Fixture Patterns

### Testing multiple states:

```typescript
export default {
  'Loading State': <YourComponent loading={true} />,
  'Error State': <YourComponent error="Failed to load" />,
  'Success State': <YourComponent data={mockData} />,
};
```

### Using fixture hooks:

```typescript
import { useMemo } from "react";
import { useValue } from "react-cosmos/client";

const MyFixture = () => {
  const [count] = useValue("count", { defaultValue: 0 });

  const derivedValue = useMemo(() => count * 2, [count]);

  return <YourComponent count={count} doubled={derivedValue} />;
};
```
