

# Storybook Integration Guide

This document covers how HeroUI configures Storybook internally, and provides complete instructions for setting up Storybook in an external project that uses HeroUI as a dependency.

---

## Table of Contents

1. [How HeroUI Uses Storybook (Internal Architecture)](#how-heroui-uses-storybook-internal-architecture)
2. [Setting Up Storybook in a HeroUI Project](#setting-up-storybook-in-a-heroui-project)
   - [Prerequisites](#prerequisites)
   - [Installation](#installation)
   - [Tailwind CSS & HeroUI Plugin Integration](#tailwind-css--heroui-plugin-integration)
   - [Storybook Main Configuration](#storybook-main-configuration)
   - [Preview & Global Decorators](#preview--global-decorators)
   - [Dark Mode Setup](#dark-mode-setup)
   - [Light Mode Only](#light-mode-only)
   - [Writing Stories](#writing-stories)
3. [Key Concepts & Patterns](#key-concepts--patterns)

---

## How HeroUI Uses Storybook (Internal Architecture)

### Repository Overview

HeroUI is a **pnpm workspaces monorepo** managed with **Turborepo**. The workspace is split into:

- `packages/components/` — 40+ individual component packages (`@heroui/button`, `@heroui/input`, etc.)
- `packages/core/` — Core packages: `@heroui/system`, `@heroui/theme`
- `packages/hooks/` — 30+ shared React hooks
- `packages/utilities/` — Shared utilities including `@heroui/stories-utils`
- `packages/storybook/` — The centralized Storybook configuration package
- `apps/docs/` — The public documentation site

Storybook lives in `packages/storybook/` and consumes stories from across the entire monorepo via glob patterns.

---

### Technology Stack

| Aspect           | Technology                   | Version  |
|------------------|------------------------------|----------|
| Build Tool       | Vite                         | 5.4.11   |
| Framework        | React                        | 18.3.0   |
| Storybook        | `@storybook/react-vite`      | 8.5.0    |
| CSS              | Tailwind CSS                 | 4.x      |
| Dark Mode        | `storybook-dark-mode`        | 4.0.2    |
| Language         | TypeScript                   | 5.7.3    |
| Package Manager  | pnpm                         | 10.x     |
| Monorepo Tool    | Turborepo                    | 2.4.4    |
| Theme System     | `@heroui/theme`              | workspace |
| Provider         | `@heroui/system`             | workspace |

---

### File Structure

```
packages/storybook/
├── .storybook/
│   ├── main.ts              # Core Storybook configuration
│   ├── preview.tsx          # Global decorators, parameters, globals
│   ├── style.css            # Tailwind directives + custom dark mode overrides
│   ├── welcome.mdx          # Landing page (MDX format)
│   └── addons/
│       └── react-strict-mode/
│           ├── register.tsx # Manager UI (toolbar checkbox)
│           └── index.tsx    # Preview decorator (wraps in React.StrictMode)
├── public/                  # Static assets served by Storybook
│   ├── dark-logo.svg
│   ├── light-logo.svg
│   └── images/assets/       # Sample images used in stories
├── tailwind.config.js       # Tailwind + HeroUI plugin config for Storybook
├── postcss.config.js        # PostCSS setup
├── vite.config.ts           # Vite config with React and Tailwind plugins
└── package.json
```

---

### `.storybook/main.ts` — Core Configuration

```typescript
import {dirname, join} from "path";
import remarkGfm from "remark-gfm";
import type {StorybookConfig} from "@storybook/react-vite";

function getAbsolutePath(value: string) {
  return dirname(require.resolve(join(value, "package.json")));
}

const config: StorybookConfig = {
  stories: [
    "./.storybook/welcome.mdx",
    "../../components/**/stories/**/*.stories.@(js|jsx|ts|tsx)",
    "../../core/theme/stories/*.stories.@(js|jsx|ts|tsx)",
  ],

  staticDirs: ["../public"],

  addons: [
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-essentials"),
    getAbsolutePath("@storybook/addon-links"),
    getAbsolutePath("storybook-dark-mode"),
    {
      name: "@storybook/addon-docs",
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],  // GitHub Flavored Markdown in MDX docs
          },
        },
      },
    },
    "./addons/react-strict-mode/register",  // Custom strict mode toggle addon
  ],

  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {},
  },

  core: {
    disableTelemetry: true,
  },

  typescript: {
    reactDocgen: false,  // Props documented manually via argTypes, not inferred
  },
};

export default config;
```

**Key points:**
- Uses `@storybook/react-vite` (not webpack) as the builder.
- Stories are discovered via glob across all component packages. Each component has its own `stories/` folder.
- `reactDocgen` is disabled — prop types are defined explicitly in each story's `argTypes`, not auto-generated.
- Includes a custom in-tree addon for toggling React Strict Mode from the toolbar.

---

### `.storybook/preview.tsx` — Global Decorators & Parameters

```tsx
import React from "react";
import type {Preview} from "@storybook/react";
import {HeroUIProvider} from "@heroui/system";
import {withStrictModeSwitcher} from "./addons/react-strict-mode";
import "./style.css";

const decorators: Preview["decorators"] = [
  (Story, {globals: {locale, disableAnimation, labelPlacement}}) => {
    // Detect RTL languages via Intl.Locale API
    const direction =
      new Intl.Locale(locale)?.textInfo?.direction === "rtl" ? "rtl" : undefined;

    return (
      <HeroUIProvider
        locale={locale}
        disableAnimation={disableAnimation}
        labelPlacement={labelPlacement}
      >
        <div className="bg-dark" lang={locale} dir={direction}>
          <Story />
        </div>
      </HeroUIProvider>
    );
  },
  ...(process.env.NODE_ENV !== "production" ? [withStrictModeSwitcher] : []),
];

const preview: Preview = {
  decorators,
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    options: {
      storySort: {
        method: "alphabetical",
        order: ["Foundations", "Components"],
      },
    },
    darkMode: {
      current: "dark",        // Default to dark mode
      stylePreview: true,     // Apply dark mode to preview iframe too
      darkClass: "dark",
      lightClass: "light",
      classTarget: "html",    // Adds class to <html> element (required by Tailwind)
      dark: {
        appBg: "#161616",
        barBg: "black",
        background: "black",
        appBorderRadius: 14,
        brandImage: "/dark-logo.svg",
      },
      light: {
        appBorderRadius: 14,
        brandImage: "/light-logo.svg",
      },
    },
  },
  // Toolbar globals available in all stories
  globalTypes: {
    locale: {
      name: "Locale",
      description: "Internationalization locale",
      toolbar: {
        icon: "globe",
        items: [
          {value: "en-US", title: "English"},
          {value: "ar-AE", title: "Arabic (RTL)"},
          {value: "ja-JP", title: "Japanese"},
          // ... 30+ locales including RTL languages
        ],
        showName: true,
      },
    },
    disableAnimation: {
      name: "Disable Animation",
      toolbar: {
        icon: "lightning",
        items: [
          {value: false, title: "Animations on"},
          {value: true, title: "Animations off"},
        ],
        showName: true,
      },
    },
    labelPlacement: {
      name: "Label Placement",
      toolbar: {
        items: [
          {value: undefined, title: "Default"},
          {value: "outside", title: "Outside"},
          {value: "outside-left", title: "Outside Left"},
          {value: "inside", title: "Inside"},
        ],
        showName: true,
      },
    },
  },
};

export default preview;
```

**Key points:**
- Every story is automatically wrapped in `<HeroUIProvider>` — no manual setup needed per story.
- Locale selection drives RTL layout via the `dir` attribute on the wrapper `div`.
- The `disableAnimation` and `labelPlacement` globals flow through `HeroUIProvider` and affect all components simultaneously.
- The Strict Mode switcher addon is only injected in development (not production Storybook builds).

---

### Tailwind CSS Integration

**`tailwind.config.js`:**

```javascript
import {heroui} from "@heroui/theme/plugin";

export default {
  content: [
    "./.storybook/welcome.mdx",
    "../components/*/src/**/*.{js,jsx,ts,tsx}",
    "../components/*/stories/**/*.{js,jsx,ts,tsx}",
    "../core/theme/src/components/**/*.{js,jsx,ts,tsx}",
    "../core/theme/src/utils/**/*.{js,jsx,ts,tsx}",
    "../core/theme/stories/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",       // Must match storybook-dark-mode classTarget
  plugins: [
    heroui({
      addCommonColors: true,
    }),
  ],
};
```

**`postcss.config.js`:**

```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**`vite.config.ts`:**

```typescript
import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ["@storybook/theming", "@mdx-js/react"],
  },
});
```

**`.storybook/style.css`:**

```css
@import "tailwindcss";
@config "../tailwind.config.js";

/* Custom dark mode overrides for Storybook UI elements */
.dark .sbdocs-wrapper {
  background-color: #161616;
}
/* ... other Storybook UI dark mode overrides */
```

**Key points:**
- Tailwind v4 is used with both the Vite plugin (`@tailwindcss/vite`) and the PostCSS plugin.
- `darkMode: "class"` is mandatory so that the `storybook-dark-mode` addon's class toggle works correctly.
- The `content` paths must include all files where HeroUI classes might appear (including the `@heroui/theme` source).
- The `heroui()` plugin adds HeroUI's semantic color system, component variants, and CSS variables to Tailwind.

---

### Story File Organization

Each component package has a `stories/` directory:

```
packages/components/button/
├── src/
│   ├── button.tsx
│   └── index.ts
└── stories/
    └── button.stories.tsx
```

**Example story file (`button.stories.tsx`):**

```typescript
import type {Meta, StoryObj} from "@storybook/react";
import {button} from "@heroui/theme";
import {Button} from "../src";

export default {
  title: "Components/Button",
  component: Button,
  argTypes: {
    variant: {
      control: {type: "select"},
      options: ["solid", "bordered", "light", "flat", "faded", "shadow", "ghost"],
    },
    color: {
      control: {type: "select"},
      options: ["default", "primary", "secondary", "success", "warning", "danger"],
    },
    size: {
      control: {type: "select"},
      options: ["sm", "md", "lg"],
    },
    radius: {
      control: {type: "select"},
      options: ["none", "sm", "md", "lg", "full"],
    },
    isDisabled: {control: {type: "boolean"}},
    isLoading: {control: {type: "boolean"}},
    disableRipple: {control: {type: "boolean"}},
  },
} satisfies Meta<typeof Button>;

type Story = StoryObj<typeof Button>;

const defaultProps = {
  children: "Button",
  ...button.defaultVariants,
};

export const Default: Story = {
  args: {...defaultProps},
};

export const WithIcons: Story = {
  args: {
    ...defaultProps,
    startContent: <CameraIcon />,
  },
};

export const IsLoading: Story = {
  args: {
    ...defaultProps,
    isLoading: true,
  },
};
```

---

### Build Scripts

**Root `package.json`:**

```json
{
  "scripts": {
    "sb": "pnpm --filter @heroui/storybook dev",
    "dev": "pnpm sb",
    "build:sb": "pnpm --filter @heroui/storybook build",
    "start:sb": "pnpm --filter @heroui/storybook start"
  }
}
```

**`packages/storybook/package.json`:**

```json
{
  "scripts": {
    "dev": "pnpm storybook dev -p 6006",
    "build": "pnpm storybook build",
    "start": "pnpm dlx http-server storybook-static"
  }
}
```

Storybook is deliberately excluded from the main Turborepo build pipeline so it can be built independently without blocking component builds.

---

### Shared Story Utilities

The `@heroui/stories-utils` package (`packages/utilities/stories-utils`) provides shared helpers:

- **Hooks** — e.g., `usePokemonList` for async list demos
- **Mock data** — Pre-built data structures for testing components with realistic content

---

## Setting Up Storybook in a HeroUI Project

This section walks through setting up Storybook from scratch in a standalone project that has HeroUI installed as a dependency.

### Prerequisites

- Node.js 18+
- A React project with HeroUI installed (see the [HeroUI installation guide](https://heroui.com/docs/guide/installation))
- Tailwind CSS configured in the project

---

### Installation

**1. Install Storybook**

```bash
npx storybook@latest init
```

Choose **React** as the framework. If prompted for a builder, choose **Vite**.

**2. Install required addons and dependencies**

```bash
# Core Storybook addons
npm install --save-dev \
  @storybook/addon-a11y \
  @storybook/addon-essentials \
  @storybook/addon-links \
  storybook-dark-mode

# Markdown support in MDX docs
npm install --save-dev remark-gfm

# Tailwind v4 (if not already installed)
npm install --save-dev tailwindcss @tailwindcss/vite @tailwindcss/postcss
```

---

### Tailwind CSS & HeroUI Plugin Integration

**1. Configure Tailwind**

Create or update `tailwind.config.js`:

```javascript
import {heroui} from "@heroui/theme/plugin";

export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./stories/**/*.{js,jsx,ts,tsx}",
    // Include HeroUI's own source so it can purge its classes correctly
    "./node_modules/@heroui/theme/dist/**/*.{js,mjs}",
  ],
  darkMode: "class",   // Required for storybook-dark-mode to work
  plugins: [
    heroui(),
    // Or with options:
    // heroui({
    //   addCommonColors: true,
    //   themes: {
    //     light: {
    //       colors: {
    //         primary: "#006FEE",
    //       },
    //     },
    //   },
    // }),
  ],
};
```

> **Important:** `darkMode: "class"` must be set. HeroUI's dark mode is class-based and the `storybook-dark-mode` addon must be able to toggle a class on the `<html>` element.

**2. Configure PostCSS**

Create `postcss.config.js`:

```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**3. Configure Vite**

Create or update `vite.config.ts`:

```typescript
import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    // Ensure these are pre-bundled to avoid Storybook issues
    include: ["@storybook/theming", "@mdx-js/react"],
  },
});
```

---

### Storybook Main Configuration

Update `.storybook/main.ts`:

```typescript
import {dirname, join} from "path";
import remarkGfm from "remark-gfm";
import type {StorybookConfig} from "@storybook/react-vite";

function getAbsolutePath(value: string): string {
  return dirname(require.resolve(join(value, "package.json")));
}

const config: StorybookConfig = {
  stories: [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    // Or discover stories alongside components:
    // "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],

  addons: [
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-essentials"),
    getAbsolutePath("@storybook/addon-links"),
    getAbsolutePath("storybook-dark-mode"),
    {
      name: "@storybook/addon-docs",
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
  ],

  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {},
  },

  core: {
    disableTelemetry: true,
  },

  typescript: {
    // Set to false if you want to define argTypes manually (HeroUI's approach)
    // Set to "react-docgen-typescript" to auto-generate prop tables from TypeScript
    reactDocgen: false,
  },
};

export default config;
```

---

### Preview & Global Decorators

Create or replace `.storybook/preview.tsx`:

```tsx
import React from "react";
import type {Preview} from "@storybook/react";
import {HeroUIProvider} from "@heroui/react";
import "./style.css";

const preview: Preview = {
  decorators: [
    // Wrap every story in HeroUIProvider
    (Story, {globals: {locale}}) => {
      const direction =
        typeof locale === "string" &&
        new Intl.Locale(locale)?.textInfo?.direction === "rtl"
          ? "rtl"
          : undefined;

      return (
        <HeroUIProvider locale={locale}>
          <div
            className="min-h-screen bg-background text-foreground p-4"
            lang={locale}
            dir={direction}
          >
            <Story />
          </div>
        </HeroUIProvider>
      );
    },
  ],

  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    options: {
      storySort: {
        method: "alphabetical",
      },
    },
    darkMode: {
      current: "dark",       // Start in dark mode
      stylePreview: true,    // Apply dark/light to the preview iframe
      darkClass: "dark",
      lightClass: "light",
      classTarget: "html",   // Toggle class on <html> — required for Tailwind class strategy
      dark: {
        appBg: "#161616",
        barBg: "#000000",
        background: "#000000",
        appBorderRadius: 8,
      },
      light: {
        appBorderRadius: 8,
      },
    },
  },

  globalTypes: {
    locale: {
      name: "Locale",
      description: "Internationalization locale",
      defaultValue: "en-US",
      toolbar: {
        icon: "globe",
        items: [
          {value: "en-US", right: "LTR", title: "English (US)"},
          {value: "ar-AE", right: "RTL", title: "Arabic"},
          {value: "zh-CN", right: "LTR", title: "Chinese (Simplified)"},
          {value: "ja-JP", right: "LTR", title: "Japanese"},
          {value: "fr-FR", right: "LTR", title: "French"},
          {value: "de-DE", right: "LTR", title: "German"},
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
```

**Create `.storybook/style.css`:**

```css
@import "tailwindcss";
@config "../tailwind.config.js";

/*
  Override Storybook's own UI elements for dark mode consistency.
  These selectors target the docs panel iframe and sidebar.
*/
.dark .sbdocs-wrapper {
  background-color: #161616;
  color: #e4e4e7;
}

.dark .sbdocs-content {
  color: #e4e4e7;
}
```

---

### Writing Stories

**Basic story structure:**

```tsx
// stories/button.stories.tsx
import type {Meta, StoryObj} from "@storybook/react";
import {Button} from "@heroui/react";

const meta = {
  title: "Components/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    variant: {
      control: {type: "select"},
      options: ["solid", "bordered", "light", "flat", "faded", "shadow", "ghost"],
    },
    color: {
      control: {type: "select"},
      options: ["default", "primary", "secondary", "success", "warning", "danger"],
    },
    size: {
      control: {type: "select"},
      options: ["sm", "md", "lg"],
    },
    isDisabled: {control: "boolean"},
    isLoading: {control: "boolean"},
    disableRipple: {control: "boolean"},
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Click me",
    color: "primary",
    variant: "solid",
  },
};

export const Ghost: Story = {
  args: {
    children: "Ghost Button",
    color: "primary",
    variant: "ghost",
  },
};

export const Disabled: Story = {
  args: {
    children: "Disabled",
    isDisabled: true,
  },
};
```

**Story with controlled state:**

```tsx
import type {Meta, StoryObj} from "@storybook/react";
import React, {useState} from "react";
import {Switch} from "@heroui/react";

const meta = {
  title: "Components/Switch",
  component: Switch,
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

// Use a render function for stories that require internal state
export const Controlled: Story = {
  render: (args) => {
    const [isSelected, setIsSelected] = useState(false);

    return (
      <Switch
        {...args}
        isSelected={isSelected}
        onValueChange={setIsSelected}
      >
        {isSelected ? "On" : "Off"}
      </Switch>
    );
  },
};
```

**Story with a per-story decorator:**

```tsx
export const Centered: Story = {
  decorators: [
    (Story) => (
      <div className="flex items-center justify-center w-screen h-screen">
        <Story />
      </div>
    ),
  ],
  args: {
    children: "Centered Button",
  },
};
```

**Story using HeroUI's theme plugin classes directly:**

```tsx
// Custom themed card story
export const CustomThemed: Story = {
  render: () => (
    <div className="flex gap-4">
      <div className="bg-primary text-primary-foreground rounded-lg p-4">
        Primary
      </div>
      <div className="bg-secondary text-secondary-foreground rounded-lg p-4">
        Secondary
      </div>
      <div className="bg-danger text-danger-foreground rounded-lg p-4">
        Danger
      </div>
    </div>
  ),
};
```

---

### Dark Mode Setup

The dark mode integration relies on three cooperating layers:

1. **Tailwind** — `darkMode: "class"` means dark styles activate when the `dark` class is on `<html>`.

2. **`storybook-dark-mode` addon** — Adds a sun/moon toggle to the Storybook toolbar and applies the configured `darkClass`/`lightClass` to the `classTarget` element (`html` in this setup).

3. **HeroUI** — Its CSS variables and component styles respect the `.dark` class on the root element, automatically flipping to dark color tokens.

The `classTarget: "html"` setting is the critical link — without it, the dark class is added to the wrong element and Tailwind's class strategy won't activate HeroUI's dark styles.

**Verify your setup works:**

```tsx
// stories/dark-mode-test.stories.tsx
import React from "react";
import {Button, Card, CardBody} from "@heroui/react";

export default {title: "Test/Dark Mode"};

export const DarkModeTest = () => (
  <Card className="max-w-sm">
    <CardBody className="flex flex-col gap-3">
      <p className="text-foreground">This text should flip with dark mode.</p>
      <p className="text-default-500">Secondary text color.</p>
      <Button color="primary">Primary Button</Button>
      <Button color="danger" variant="bordered">Danger Bordered</Button>
    </CardBody>
  </Card>
);
```

Toggle the sun/moon icon in the Storybook toolbar — all colors should switch correctly.

---

### Light Mode Only

If your project only uses HeroUI's light theme and you don't want a dark/light toggle at all, there are two approaches depending on whether you still want the `storybook-dark-mode` addon.

#### Option A: Keep the addon, default to light

The simplest change. Set `current: "light"` in the `darkMode` parameter block in `preview.tsx`. The toggle remains in the toolbar but starts in light mode:

```tsx
// .storybook/preview.tsx
parameters: {
  darkMode: {
    current: "light",      // Default to light instead of dark
    stylePreview: true,
    darkClass: "dark",
    lightClass: "light",
    classTarget: "html",
  },
},
```

#### Option B: Remove the addon entirely, hardcode light mode

If you want no dark/light toggle at all, remove `storybook-dark-mode` from your dependencies and from the `addons` array in `main.ts`, then apply the `light` class to `<html>` yourself.

**1. Remove the addon from `main.ts`:**

```typescript
// .storybook/main.ts
addons: [
  getAbsolutePath("@storybook/addon-a11y"),
  getAbsolutePath("@storybook/addon-essentials"),
  getAbsolutePath("@storybook/addon-links"),
  // storybook-dark-mode removed
],
```

**2. Apply the `light` class to `<html>` via `preview-head.html`:**

Create `.storybook/preview-head.html`. Storybook injects this file's contents into the `<head>` of the preview iframe, and it's the right place to set a class on `<html>` without any JavaScript:

```html
<!-- .storybook/preview-head.html -->
<script>
  document.documentElement.classList.add("light");
</script>
```

This runs before any story renders, so HeroUI's CSS variables resolve against the `.light` selector from the very first paint.

> **Why not just set `class="light"` in HTML directly?**
> Storybook controls the preview iframe's `<html>` element and does not expose a way to set attributes on it declaratively. The inline `<script>` in `preview-head.html` is the supported escape hatch.

**3. Keep `darkMode: "class"` in Tailwind:**

Even in a light-only setup, do not remove `darkMode: "class"` from `tailwind.config.js`. HeroUI's theme plugin scopes all its CSS variables under `.dark` and `.light` selectors at build time. Without the class strategy, Tailwind will not generate those scoped rules, and HeroUI's color tokens will not resolve correctly.

Since the `dark` class is never applied to `<html>`, the dark styles simply never activate — `darkMode: "class"` being present causes no harm.

**4. Remove the `darkMode` parameter block from `preview.tsx`:**

With the addon gone the `darkMode` parameter key is ignored anyway, but it is cleaner to remove it:

```tsx
// .storybook/preview.tsx
const preview: Preview = {
  decorators: [...],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    options: {
      storySort: {method: "alphabetical"},
    },
    // darkMode block removed
  },
};
```

**5. Remove the dark-mode CSS overrides from `style.css`:**

The `.dark .sbdocs-wrapper` overrides in `style.css` are no longer needed:

```css
/* .storybook/style.css */
@import "tailwindcss";
@config "../tailwind.config.js";

/* No dark mode overrides needed */
```

---

## Key Concepts & Patterns

### `HeroUIProvider` is Required

Every story (or the global preview decorator) must render inside `<HeroUIProvider>`. This provider:
- Sets up HeroUI's internal context
- Passes locale for i18n-aware components (e.g., date pickers, calendars)
- Controls `disableAnimation` globally
- Sets default `labelPlacement` for form components

Putting it in the global decorator in `preview.tsx` is the recommended approach — you write it once and all stories benefit automatically.

### Class-Based Dark Mode is Mandatory

HeroUI's theming system uses CSS variables scoped to `.dark` and `.light` selectors. Tailwind must be configured with `darkMode: "class"` (not `"media"`). The `storybook-dark-mode` addon's `classTarget: "html"` and `darkClass: "dark"` settings must match what Tailwind expects.

### Tailwind Content Paths Must Include HeroUI Dist

For Tailwind's purge/content scanning to find all HeroUI classes, include the distribution files:

```javascript
content: [
  // Your files
  "./src/**/*.{js,jsx,ts,tsx}",
  "./stories/**/*.{js,jsx,ts,tsx}",
  // HeroUI dist — critical for class detection
  "./node_modules/@heroui/theme/dist/**/*.{js,mjs}",
]
```

Without this, many HeroUI component classes will be purged in production builds.

### The `heroui()` Plugin Registers All Color Tokens

The `heroui()` Tailwind plugin from `@heroui/theme/plugin` registers:
- Semantic color utilities: `bg-primary`, `text-secondary-foreground`, `border-danger`, etc.
- Layout colors: `bg-background`, `text-foreground`, `border-divider`
- Content layers: `bg-content1` through `bg-content4`
- Component-level CSS variables consumed by HeroUI's internal styles

This plugin must be included in the Tailwind config's `plugins` array for any of HeroUI's color classes to work.

### Use Vite, Not Webpack

HeroUI's internal Storybook uses `@storybook/react-vite`. HeroUI component packages are built with `tsup` and export modern ESM. Webpack-based Storybook setups may encounter bundling issues with these ESM packages. When initializing Storybook, select Vite as the builder.

### `reactDocgen: false` for Manual Prop Tables

HeroUI disables automatic prop documentation generation (`reactDocgen: false`) because:
- HeroUI components use complex generic types and `VariantProps` from `tailwind-variants` that the docgen tools don't handle well.
- `argTypes` are defined explicitly per story, giving full control over the controls panel.

If your project has simpler component types, you can keep `reactDocgen` enabled (the default) for automatic prop table generation.

### Story `argTypes` vs Auto-Generated Controls

When `reactDocgen: false`, you must define `argTypes` manually in each story's default export. Map them to the appropriate control types:

```typescript
argTypes: {
  // Select dropdown
  variant: {control: {type: "select"}, options: ["solid", "bordered", "ghost"]},
  // Boolean toggle
  isDisabled: {control: "boolean"},
  // Text input
  placeholder: {control: "text"},
  // Color picker (matches the `color` pattern set in parameters)
  backgroundColor: {control: "color"},
}
```
