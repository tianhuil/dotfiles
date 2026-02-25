---
name: nextjs-frontend
description: Develops React and Next.js front-end applications with shadcn/ui components, following modern best practices for App Router, server components, client-side data fetching, and design systems. Use when building or modifying Next.js front-end applications.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: application-development
---

# Next.js Frontend Development

## Core Principles

- **Default to App Router** unless project context indicates otherwise
- **Use shadcn/ui components** for consistent, accessible UI elements
- **Server Components First** - use RSC by default, add "use client" only when needed
- **Mobile-first responsive design** - design for small screens first
- **Semantic HTML and accessibility** - use proper elements and ARIA attributes
- **Modern React patterns** - leverage React 19.2 features and hooks appropriately

## Quick Reference

### Project Structure
```
app/              # App Router (layout.tsx, page.tsx, globals.css)
components/ui/    # shadcn/ui components
hooks/            # use-mobile, use-toast
lib/              # Utilities and helpers
├─ utils.ts      # Utilities (cn function)
scripts/          # Executable Node.js scripts
```

### File Operations
- **Read before editing** - ALWAYS use `read` tool first
- Use `write` for new files, `edit` for targeted changes
- Include change comments: `// <CHANGE> removing the header`
- Split large components - don't have monolithic `page.tsx`

### Component Guidelines
```tsx
// ✅ Server Component (default)
async function UserProfile({ id }: { id: string }) {
  const user = await fetchUser(id)
  return <UserCard user={user} />
}

// ✅ Client Component (when needed)
'use client'
import { useState } from 'react'
function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### Search Pattern
**broad → specific → verify relationships**
1. Use `glob` to understand project structure
2. Use `grep` to find relevant code patterns
3. Use `read` to examine files in detail
4. Check ALL matches, not just the first one

### Before Making Changes
- [ ] Is this the right file among multiple options?
- [ ] Does a parent/wrapper already handle this?
- [ ] Are there existing utilities/patterns?
- [ ] How does this fit into the architecture?

### Parallel Tool Calls
Call independent tools in parallel for efficiency:
```javascript
// ✅ Good: Parallel independent calls
read('app/page.tsx')
read('components/Header.tsx')
read('components/Footer.tsx')
```

## Design System Basics

### Colors
- Use exactly **3-5 colors total**
- 1 primary brand color + 2-3 neutrals + 1-2 accents
- NEVER exceed 5 colors without explicit permission
- Override text color when changing background color

### Typography
- Use **maximum 2 font families**
- Line-height: 1.4-1.6 for body text (`leading-relaxed`)
- Minimum 14px for body text

### Tailwind Patterns
- ✅ Use spacing scale: `p-4`, `mx-2`, `gap-4`
- ✅ Use semantic classes: `items-center`, `justify-between`
- ✅ Use responsive prefixes: `md:grid-cols-2`, `lg:text-xl`
- ✅ Use design tokens: `bg-background`, `text-foreground`
- ❌ Avoid arbitrary values: `p-[16px]`, `mx-[8px]`
- ❌ NEVER mix margin/padding with gap on same element

## Accessibility Essentials

- Use **semantic HTML**: `main`, `header`, `nav`, `section`, `article`
- Add **alt text** for all images (omit with `alt=""` for decorative)
- Use **ARIA roles** for custom components
- Use **sr-only** class for screen reader only text
- Test **keyboard navigation** and **screen reader announcements**
- Ensure **color contrast** meets WCAG standards

## Data Fetching Patterns

### Server Components (Default)
```tsx
async function getUser(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}`)
  if (!res.ok) throw new Error('Failed to fetch user')
  return res.json()
}
```

### Client-Side with SWR
```tsx
'use client'
import useSWR from 'swr'
const { data, error, isLoading } = useSWR('/api/user', fetcher)
```

### React 19.2 New Features

#### useEffectEvent
Extract non-reactive logic from Effects:
```tsx
'use client'
import { useEffectEvent } from 'react'
const onConnected = useEffectEvent(() => showNotification('Connected!', theme))
```

#### use() for Reading Resources
Read promises and context:
```tsx
'use client'
import { use } from 'react'
const data = use(promise) // Suspends until promise resolves
const theme = use(ThemeContext) // Can be called conditionally
```

#### Native Document Metadata
Render `<title>`, `<meta>`, and `<link>` tags directly in components:
```tsx
<BlogPost post={post}>
  <title>{post.title}</title>
  <meta name="description" content={post.excerpt} />
  <link rel="canonical" href={`https://example.com/blog/${post.slug}`} />
  <article>{post.content}</article>
</BlogPost>
```

#### Stylesheets with Precedence
Load stylesheets with priority control:
```tsx
<link rel="stylesheet" href="/styles.css" precedence="high" />
<link rel="stylesheet" href="/theme.css" precedence="default" />
```

## shadcn/ui Components

For UI, we prefer to use shadcn/ui components because unlike other libraries:

1. Code is in the repo making it easier for Agentic agents to read and understand
2. It is possible to modify them (as a last resort) if they cannot be used as-is

### Only Modify shadcn/ui Components as a Last Resort

Strongly prefer to use existing components and compose them together. If you find yourself needing to modify a component, ask:
- Is there an existing component that can be composed to achieve this?
- Can I achieve this with props or by wrapping the component?
- If I must modify, can I do so in a way that doesn't break existing usage?

### Available Components
Standard: `button`, `card`, `input`, `form`, `dialog`, `dropdown-menu`, `toast`, `tabs`, `table`, `select`, `checkbox`, `radio-group`, `switch`, `slider`, `progress`, `badge`, `avatar`, `alert`, `accordion`, `collapsible`, `tooltip`, `popover`, `command`, `navigation-menu`, `menubar`, `context-menu`, `scroll-area`, `separator`, `sheet`, `skeleton`, `sonner`

New: `button-group`, `empty`, `field`, `input-group`, `item`, `kbd`, `spinner`

Charts: Built with Recharts, use `ChartTooltip` when needed

### Usage
```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
```

## Images and Media

### Placeholder Images
```tsx
// ✅ Hard-code the full URL with query
<img src="/placeholder.svg?height=400&width=600&query=modern+dashboard" />

// ❌ DON'T: String concatenation
<img src={`/placeholder.svg?height=${height}&width=${width}`} />
```

### Image Optimization
```tsx
import Image from 'next/image'
<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1920}
  height={1080}
  priority // For above-the-fold images
/>
```

### Icons
- Use **Lucide React** icons (comes with shadcn/ui)
- Consistent sizing: 16px, 20px, or 24px
- NEVER use emojis as icon replacements

## Performance

- Use **Next.js Image** component for all images
- **Lazy load** heavy components with `dynamic()`
- Use **useMemo** for expensive computations
- Use **useCallback** for function props
- Enable **React Compiler** in next.config.mjs

## AI Integration

### Vercel AI SDK
```tsx
import { generateText } from 'ai'
const { text } = await generateText({
  model: 'openai/gpt-5-mini',
  prompt: 'Generate content',
})
```

### Notes
- Supported: AWS Bedrock, Google Vertex, OpenAI, Fireworks AI, Anthropic
- NEVER use `runtime = 'edge'` in API routes with AI SDK
- Use only `'ai'` and `'@ai-sdk'` packages

## Environment Variables

```bash
# Server-side (no prefix)
DATABASE_URL="postgresql://..."

# Client-side (MUST prefix with NEXT_PUBLIC_)
NEXT_PUBLIC_API_URL="https://api.example.com"
```

## Common Patterns

### Toast Notifications
```tsx
'use client'
import { useToast } from '@/hooks/use-toast'
const { toast } = useToast()
toast({ title: "Success", description: "Saved!" })
```

### Mobile Detection
```tsx
'use client'
import { useMediaQuery } from '@/hooks/use-mobile'
const isMobile = useMediaQuery('(max-width: 768px)')
```

### Form with shadcn/ui
```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const formSchema = z.object({ email: z.string().email() })
const form = useForm({ resolver: zodResolver(formSchema) })
```

## Postamble Style

After making changes, write a **2-4 sentence** postamble explaining your code or summarizing changes. NEVER write more than a paragraph unless explicitly asked.

## Debugging

```tsx
console.log("[Component] User data received:", userData)
console.log("[Component] State updated:", newState)
// Remove after fixing issues
```

---

## Detailed Reference Guides

For in-depth coverage of specific topics, see the reference guides:

- **[Next.js 16.1 Features](reference/nextjs-16-features.md)** - Async params, proxy.ts, Turbopack, React Compiler

- **[Design System](reference/design-system.md)** - Color system, typography, Tailwind patterns, design tokens, font setup


- **[Accessibility](reference/accessibility.md)** - Semantic HTML, ARIA attributes, screen readers, keyboard navigation, WCAG compliance

- **[Component Patterns](reference/component-patterns.md)** - shadcn/ui usage, form handling, layouts, common patterns, examples

- **[Performance Optimization](reference/performance.md)** - Image optimization, code splitting, memoization, React Compiler, best practices

## Best Practices Checklist

### Before Writing Code
- [ ] Read existing files to understand patterns
- [ ] Check for existing utilities/components
- [ ] Understand the broader architecture
- [ ] Verify this is the right approach

### Code Quality
- [ ] Components are small and focused
- [ ] Used semantic HTML elements
- [ ] Added proper ARIA attributes
- [ ] Included alt text for images
- [ ] Used design tokens, not hard-coded colors
- [ ] Applied responsive classes
- [ ] Followed mobile-first design

### Performance
- [ ] Used server components where possible
- [ ] Optimized images with Next.js Image
- [ ] Lazy loaded heavy components when needed
- [ ] Used SWR for client-side state (not useEffect)

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader announcements included
- [ ] Color contrast meets WCAG standards
- [ ] Form labels are properly associated
- [ ] Focus states are visible

### Testing
- [ ] Component renders without errors
- [ ] Interactive elements work as expected
- [ ] Responsive design looks good on mobile
- [ ] Dark mode contrast is adequate
- [ ] No console errors or warnings
