# Design System

Comprehensive guide for the design system used in Next.js applications with shadcn/ui and Tailwind CSS.

## Color System

### Core Principles

**ALWAYS use exactly 3-5 colors total**

- **1 primary brand color** - choose appropriately for the design
- **2-3 neutrals** - white, grays, off-whites, black variants
- **1-2 accents** - for highlights, alerts, emphasis
- **NEVER exceed 5 colors** without explicit user permission
- **NEVER use purple or violet prominently** unless explicitly asked
- **ALWAYS override text color** when changing background color

### Required Color Structure

```tsx
// ✅ Good: Balanced color palette
const colors = {
  primary: 'blue-600',      // Brand color
  neutral: {
    white: 'white',
    light: 'slate-50',
    medium: 'slate-100',
    dark: 'slate-900',
    black: 'black'
  },
  accent: 'emerald-500'     // Single accent color
}
// Total: 1 primary + 5 neutrals + 1 accent = 7 colors (within range)

// ❌ Bad: Too many colors
const colors = {
  primary: 'blue-600',
  secondary: 'purple-600',     // Unnecessary
  tertiary: 'pink-600',        // Unnecessary
  accent1: 'emerald-500',
  accent2: 'orange-500',      // Too many accents
  // ...more colors
}
```

### Gradient Rules

- **Avoid gradients entirely** - use solid colors by default
- If gradients are necessary:
  - Use only as **subtle accents**, never for primary elements
  - Use **analogous colors**: blue→teal, purple→pink, orange→red
  - **NEVER mix opposing temperatures**: pink→green, orange→blue, red→cyan
  - **Maximum 2-3 color stops**, no complex gradients

```tsx
// ✅ Good: Subtle accent gradient
<div className="bg-gradient-to-r from-blue-500 to-teal-500" />

// ❌ Bad: Opposing temperature gradient
<div className="bg-gradient-to-r from-pink-500 to-green-500" />

// ❌ Bad: Complex gradient with too many stops
<div className="bg-gradient-to-r from-blue-500 to-purple-500 to-pink-500 to-red-500" />
```

### Design Tokens

```css
/* globals.css */
@import 'tailwindcss'

@theme inline {
  /* Background colors */
  --color-background: 0 0% 100%;
  --color-foreground: 222.2 84% 4.9%;

  /* Primary colors */
  --color-primary: 221.2 83.2% 53.3%;
  --color-primary-foreground: 210 40% 98%;

  /* Muted/secondary */
  --color-muted: 210 40% 96.1%;
  --color-muted-foreground: 215.4 16.3% 46.9%;

  /* Accents */
  --color-accent: 210 40% 96.1%;
  --color-accent-foreground: 222.2 47.4% 11.2%;

  /* Borders */
  --color-border: 214.3 31.8% 91.4%;
  --color-input: 214.3 31.8% 91.4%;

  /* Radius */
  --radius: 0.5rem;

  /* Fonts */
  --font-sans: 'Geist', 'Geist Fallback';
  --font-mono: 'Geist Mono', 'Geist Mono Fallback';
}
```

**Usage in components**:
```tsx
// ✅ Good: Using design tokens
<div className="bg-background text-foreground border-border" />

// ❌ Bad: Using hard-coded colors
<div className="bg-white text-gray-900 border-gray-200" />
```

## Typography

### Core Principles

**ALWAYS limit to maximum 2 font families total**

- **One font for headings** - can use multiple weights (400, 500, 600, 700)
- **One font for body text** - typically a sans-serif for readability
- **NEVER use more than two font families**

### Required Font Structure

```tsx
// ✅ Good: Two fonts
fonts = {
  heading: 'Inter',    // Multiple weights: 400, 500, 600, 700
  body: 'Inter'        // Same font family
}

// ✅ Good: Two different fonts
fonts = {
  heading: 'Playfair Display',  // Serif for headings
  body: 'Inter'                 // Sans-serif for body
}

// ❌ Bad: Three or more fonts
fonts = {
  heading: 'Playfair Display',
  body: 'Inter',
  code: 'Fira Code',          // Too many
  caption: 'Roboto'
}
```

### Typography Implementation Rules

```tsx
// ✅ Good: Proper line-height and sizing
<p className="leading-relaxed text-base">Readable body text</p>

// ❌ Bad: Too small line-height or font size
<p className="leading-tight text-sm">Hard to read</p>

// ✅ Good: Appropriate font weights
<h1 className="font-bold text-4xl">Heading</h1>
<p className="font-normal text-base">Body text</p>

// ❌ Bad: Decorative font for body
<p className="font-display text-xs">Hard to read decorative text</p>
```

### Line-Height Guidelines

| Element | Line-Height | Tailwind Class |
|---------|-------------|----------------|
| Body text | 1.4-1.6 | `leading-relaxed`, `leading-6` |
| Headings | 1.1-1.3 | `leading-tight`, `leading-none` |
| Captions | 1.4-1.6 | `leading-relaxed` |

### Text Balance and Pretty

Use `text-balance` or `text-pretty` for optimal line breaks:

```tsx
<h1 className="text-balance">This heading will have balanced line breaks</h1>

<p className="text-pretty">This paragraph will have optimal line breaks for readability</p>
```

### Font Setup in Next.js

```tsx
// app/layout.tsx
import { Geist, Geist_Mono } from 'next/font/google'

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',  // Improves loading performance
})

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

```css
/* globals.css */
@import 'tailwindcss'

@theme inline {
  --font-sans: 'Geist', 'Geist Fallback';
  --font-mono: 'Geist Mono', 'Geist Mono Fallback';
}
```

### Using Fonts in Components

```tsx
// Apply fonts using Tailwind classes
<h1 className="font-sans text-4xl font-bold">Heading</h1>
<p className="font-sans text-base">Body text</p>
<code className="font-mono text-sm">Code snippet</code>

// Override with font-serif if needed (defined in globals.css)
<h2 className="font-serif text-3xl">Serif heading</h2>
```

## Tailwind CSS Implementation

### Layout Method Priority

Use this hierarchy for layout decisions:

1. **Flexbox** for most layouts: `flex items-center justify-between`
2. **CSS Grid** only for complex 2D layouts: `grid grid-cols-3 gap-4`
3. **NEVER use floats or absolute positioning** unless absolutely necessary

```tsx
// ✅ Good: Flexbox for most layouts
<div className="flex items-center justify-between p-4">
  <h1>Title</h1>
  <Button>Action</Button>
</div>

// ✅ Good: Grid for 2D layouts
<div className="grid grid-cols-3 gap-4">
  <Card>1</Card>
  <Card>2</Card>
  <Card>3</Card>
  <Card>4</Card>
  <Card>5</Card>
  <Card>6</Card>
</div>

// ❌ Bad: Using float
<div className="float-left">Content</div>

// ❌ Bad: Using absolute positioning unnecessarily
<div className="absolute top-0 left-0">Content</div>
```

### Required Tailwind Patterns

#### Spacing Scale

```tsx
// ✅ Good: Use spacing scale
<div className="p-4 mx-2 py-6" />
<button className="px-6 py-2" />

// ❌ Bad: Arbitrary values
<div className="p-[16px] mx-[8px] py-[24px]" />
<button className="px-[24px] py-[8px]" />
```

#### Gap Classes

```tsx
// ✅ Good: Use gap for spacing between flex/grid children
<div className="flex gap-4">
  <Item>1</Item>
  <Item>2</Item>
  <Item>3</Item>
</div>

// ✅ Good: Gap with directional control
<div className="grid grid-cols-2 gap-x-2 gap-y-4">
  <Item>1</Item>
  <Item>2</Item>
</div>

// ❌ Bad: Margin on children instead of gap
<div className="flex">
  <Item className="mr-4">1</Item>  // ❌
  <Item className="mr-4">2</Item>  // ❌
  <Item>3</Item>
</div>
```

#### Semantic Classes

```tsx
// ✅ Good: Semantic classes
<div className="flex items-center justify-between text-center" />

// ❌ Bad: Manual alignment
<div className="flex flex items-center justify-items-center" />
```

#### Responsive Prefixes

```tsx
// ✅ Good: Mobile-first responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>1</Card>
  <Card>2</Card>
  <Card>3</Card>
</div>

<p className="text-sm md:text-base lg:text-lg">Responsive text</p>

// ❌ Bad: Design desktop-first
<div className="grid grid-cols-3 gap-4 md:grid-cols-1">
```

#### Font Classes

```tsx
// ✅ Good: Apply fonts using Tailwind font utilities
<p className="font-sans">Sans-serif text</p>
<h1 className="font-serif">Serif heading</h1>
<code className="font-mono">Mono code</code>
```

#### Design Token Classes

```tsx
// ✅ Good: Use design tokens for theming
<div className="bg-background text-foreground border-border" />
<button className="bg-primary text-primary-foreground hover:bg-primary/90" />
<p className="text-muted-foreground">Muted text</p>

// ❌ Bad: Hard-coded colors
<div className="bg-white text-gray-900 border-gray-200" />
<button className="bg-blue-600 text-white hover:bg-blue-700" />
```

#### Text Balance/Pretty

```tsx
// ✅ Good: Use for headings and paragraphs
<h1 className="text-balance">This heading will have balanced lines</h1>
<p className="text-pretty">This paragraph will have optimal breaks</p>
```

#### Mixing Margin/Padding with Gap

```tsx
// ❌ Bad: Mixing margin/padding with gap
<div className="flex gap-4 p-4">  // Mixed spacing
  <Item>1</Item>
  <Item>2</Item>
</div>

// ✅ Good: Use one approach consistently
<div className="flex gap-4">
  <Item>1</Item>
  <Item>2</Item>
</div>

// ✅ Or: Use padding on container, no gap
<div className="flex p-4">
  <Item>1</Item>
  <Item>2</Item>
</div>
```

#### Space-* Classes

```tsx
// ❌ Bad: Using space-* classes
<div className="space-y-4">
  <Item>1</Item>
  <Item>2</Item>
</div>

// ✅ Good: Use gap instead
<div className="flex flex-col gap-4">
  <Item>1</Item>
  <Item>2</Item>
</div>
```

## Mobile-First Responsive Design

### Principles

**ALWAYS design mobile-first, then enhance for larger screens**

```tsx
// ✅ Good: Mobile-first
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>1</Card>
  <Card>2</Card>
  <Card>3</Card>
</div>

<p className="text-sm md:text-base lg:text-lg">Responsive text</p>

// ❌ Bad: Desktop-first
<div className="grid grid-cols-3 gap-4 md:grid-cols-1">
```

### Common Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large desktops |

### Responsive Patterns

```tsx
// Responsive layout
<div className="flex flex-col md:flex-row gap-4">
  <Sidebar className="w-full md:w-64" />
  <Content className="flex-1" />
</div>

// Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <Card>1</Card>
  <Card>2</Card>
  <Card>3</Card>
  <Card>4</Card>
</div>

// Responsive text
<h1 className="text-2xl md:text-3xl lg:text-4xl">Heading</h1>

// Responsive padding
<div className="p-4 md:p-8 lg:p-12">Content</div>
```

## Dark Mode

### Theme Colors

```css
/* globals.css */
@theme inline {
  /* Light mode */
  --color-background: 0 0% 100%;
  --color-foreground: 222.2 84% 4.9%;

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    --color-background: 222.2 84% 4.9%;
    --color-foreground: 210 40% 98%;
  }
}
```

### Using Dark Mode

```tsx
// Use design tokens - they automatically adapt
<div className="bg-background text-foreground">
  <h1>Title</h1>
  <p>Content that adapts to dark mode</p>
</div>

// Manual dark mode (if using custom theme)
<div className="dark:bg-slate-900 dark:text-white">
```

### Color Contrast

When overriding colors in dark mode, **ALWAYS ensure proper contrast**:

```tsx
// ✅ Good: Good contrast in both modes
<div className="bg-background text-foreground hover:bg-muted">
  <span className="text-muted-foreground">Subtle text</span>
</div>

// ❌ Bad: Poor contrast
<div className="bg-gray-900 text-gray-700">
  <span className="text-gray-600">Hard to read</span>
</div>
```

## Best Practices Checklist

### Color System
- [ ] Using exactly 3-5 colors total
- [ ] Have 1 primary brand color
- [ ] Have 2-3 neutral colors
- [ ] Have 1-2 accent colors
- [ ] Not using purple/violet prominently (unless asked)
- [ ] Override text color when changing background color
- [ ] Using design tokens, not hard-coded colors

### Typography
- [ ] Using maximum 2 font families
- [ ] One font for headings (with multiple weights)
- [ ] One font for body text
- [ ] Line-height 1.4-1.6 for body text
- [ ] Not using decorative fonts for body text
- [ ] Body text is 14px or larger

### Tailwind
- [ ] Using spacing scale (p-4, mx-2, etc.)
- [ ] Using gap classes for spacing
- [ ] Using semantic classes (items-center, justify-between)
- [ ] Using responsive prefixes (md:, lg:)
- [ ] Applying fonts via font classes
- [ ] Using design tokens (bg-background, text-foreground)
- [ ] Wrapping titles in text-balance or text-pretty
- [ ] Not mixing margin/padding with gap
- [ ] Not using space-* classes

### Responsive Design
- [ ] Designing mobile-first
- [ ] Using appropriate breakpoints
- [ ] Testing on mobile devices
- [ ] Layouts work on all screen sizes
