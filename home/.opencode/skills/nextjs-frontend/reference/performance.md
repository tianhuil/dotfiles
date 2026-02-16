# Performance Optimization

Comprehensive guide for optimizing Next.js applications for performance.

## Image Optimization

### Next.js Image Component

Always use the Next.js Image component for optimal performance:

```tsx
// ✅ Good: Using Next.js Image
import Image from 'next/image'

export function HeroImage() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero banner"
      width={1920}
      height={1080}
      priority  // For above-the-fold images
      placeholder="blur"  // Better perceived performance
    />
  )
}

// ❌ Bad: Using regular img tag
export function HeroImage() {
  return (
    <img src="/hero.jpg" alt="Hero banner" width="1920" height="1080" />
  )
}
```

### Remote Images

```tsx
// Configure remote domains in next.config.mjs
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
        port: '',
        pathname: '/images/**',
      },
    ],
  },
}

// Use remote images
<Image
  src="https://example.com/images/product.jpg"
  alt="Product"
  width={800}
  height={600}
/>
```

### Responsive Images

```tsx
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1920}
  height={1080}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="w-full"
/>
```

### Placeholder Images

```tsx
// Blur placeholder
<Image
  src="/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
/>

// Color placeholder
<Image
  src="/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="rgb(200, 200, 200)"
/>
```

## Code Splitting

### Dynamic Imports

```tsx
// ✅ Good: Lazy load heavy components
'use client'
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <LoadingSpinner />,
  ssr: false,  // Disable SSR if component uses browser APIs
})

export function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <HeavyChart />
    </div>
  )
}

// ✅ Good: Lazy load on interaction
'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'

const HeavyModal = dynamic(() => import('@/components/HeavyModal'))

export function Page() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      {isOpen && <HeavyModal onClose={() => setIsOpen(false)} />}
    </div>
  )
}
```

### Named Exports

```tsx
// components/modals.tsx
export function LoginModal() { /* ... */ }
export function RegisterModal() { /* ... */ }

// Dynamic import with named export
const LoginModal = dynamic(
  () => import('@/components/modals').then(mod => mod.LoginModal),
  { loading: () => <LoadingSpinner /> }
)
```

### Route-based Code Splitting

Next.js automatically code splits routes. Each route is loaded only when visited:

```
app/
├── page.tsx           # Automatically code split
├── dashboard/
│   └── page.tsx       # Automatically code split
└── settings/
    └── page.tsx       # Automatically code split
```

## Memoization

### React.memo

```tsx
'use client'
import { memo } from 'react'

// ✅ Good: Memoize expensive component
const ExpensiveComponent = memo(function ExpensiveComponent({ data }: { data: Data[] }) {
  return (
    <div>
      {data.map(item => (
        <Card key={item.id}>
          <ComplexVisualization data={item} />
        </Card>
      ))}
    </div>
  )
})

// ✅ Good: Memoize with custom comparison
const MemoizedCard = memo(
  Card,
  (prevProps, nextProps) => {
    return prevProps.item.id === nextProps.item.id
  }
)
```

### useMemo

```tsx
'use client'
import { useMemo } from 'react'

export function DataList({ items, filter }: DataListProps) {
  // ✅ Good: Memoize expensive computation
  const filteredItems = useMemo(
    () => items.filter(item => item.category === filter),
    [items, filter]
  )

  // ✅ Good: Memoize sorted list
  const sortedItems = useMemo(
    () => [...filteredItems].sort((a, b) => a.name.localeCompare(b.name)),
    [filteredItems]
  )

  return (
    <div>
      {sortedItems.map(item => <Item key={item.id} item={item} />)}
    </div>
  )
}
```

### useCallback

```tsx
'use client'
import { useState, useCallback } from 'react'

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([])

  // ✅ Good: Memoize callback to prevent re-renders
  const addTodo = useCallback((text: string) => {
    setTodos(prev => [...prev, { id: Date.now(), text, completed: false }])
  }, [])

  const toggleTodo = useCallback((id: number) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )
  }, [])

  const deleteTodo = useCallback((id: number) => {
    setTodos(prev => prev.filter(todo => todo.id !== id))
  }, [])

  return (
    <div>
      <TodoForm onAdd={addTodo} />
      <TodoList
        todos={todos}
        onToggle={toggleTodo}
        onDelete={deleteTodo}
      />
    </div>
  )
}
```

## React Compiler

The React Compiler automatically optimizes components:

```javascript
// next.config.mjs
const nextConfig = {
  reactCompiler: true,
}

export default nextConfig
```

### What the Compiler Does

- Automatically memoizes values (no need for useMemo/useCallback)
- Optimizes re-renders
- Handles dependency arrays
- Reduces boilerplate code

```tsx
// Before: Manual optimization
'use client'
import { useState, useMemo, useCallback } from 'react'

export function Component({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const filtered = useMemo(
    () => items.filter(item => item.category === filter),
    [items, filter]
  )

  const handleSelect = useCallback((id: string) => {
    setSelected(id)
  }, [])

  return <div>{/* ... */}</div>
}

// After: With React Compiler (simpler code)
'use client'
import { useState } from 'react'

export function Component({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const filtered = items.filter(item => item.category === filter)
  const handleSelect = (id: string) => setSelected(id)

  return <div>{/* ... */}</div>
}
```

## Caching

### Server Component Caching

```tsx
// ✅ Good: Cache with revalidation
export async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { revalidate: 3600 },  // Revalidate every hour
  })
  return res.json()
}

// ✅ Good: Tag-based caching
export async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { tags: ['posts'] },
  })
  return res.json()
}

// ✅ Good: Force fresh data
export async function getRealTimeData() {
  const res = await fetch('https://api.example.com/live', {
    cache: 'no-store',
  })
  return res.json()
}
```

### Cache Components (Next.js 16)

```tsx
// File-level cache
'use cache'

export default async function Page() {
  const data = await fetch('/api/data')
  return <div>{data.content}</div>
}

// Component-level cache
export async function CachedComponent({ id }: { id: string }) {
  'use cache'
  const data = await fetch(`/api/items/${id}`)
  return <div>{data.name}</div>
}
```

### SWR Caching

```tsx
'use client'
import useSWR from 'swr'

// ✅ Good: Default SWR caching
const { data } = useSWR('/api/user', fetcher)

// ✅ Good: Custom cache configuration
const { data } = useSWR('/api/user', fetcher, {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  refreshInterval: 0,
  dedupingInterval: 60000,  // Deduplicate requests within 60s
})

// ✅ Good: Prefetch data for navigation
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'

export function LinkWithPrefetch({ href, children }: LinkWithPrefetchProps) {
  const router = useRouter()

  const handleMouseEnter = () => {
    mutate(href, fetcher(href))
  }

  return (
    <Link
      href={href}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </Link>
  )
}
```

## Performance Monitoring

### Web Vitals

Next.js includes built-in Web Vitals:

```tsx
// app/layout.tsx
import { WebVitals } from '@/components/web-vitals'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <WebVitals />
      </body>
    </html>
  )
}

// components/web-vitals.tsx
'use client'
import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    console.log(metric)
    // Send to analytics
  })

  return null
}
```

### Performance Budgets

```javascript
// next.config.mjs
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
}
```

## Font Optimization

### Font Loading

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',  // Improve loading performance
  variable: '--font-sans',
  preload: true,
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>{children}</body>
    </html>
  )
}
```

### Font Subsetting

```tsx
// Only load needed characters
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],  // Only needed weights
  display: 'swap',
})
```

## Bundle Size Optimization

### Tree Shaking

```tsx
// ✅ Good: Import only what you need
import { Button } from '@/components/ui/button'

// ❌ Bad: Import entire library
import * as UI from '@/components/ui'
```

### Analyze Bundle Size

```bash
# Build with bundle analyzer
npx next build --analyze

# Or use the plugin
npm install @next/bundle-analyzer
```

```javascript
// next.config.mjs
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  // Your config
}

module.exports = withBundleAnalyzer(nextConfig)
```

## Server-Side Optimization

### Turbopack

```javascript
// next.config.mjs
const nextConfig = {
  // Turbopack is now the default in Next.js 16
  // No configuration needed
}
```

### Server Actions

```tsx
// ✅ Good: Use Server Actions to reduce client code
'use server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function updatePost(id: string, data: PostData) {
  await prisma.post.update({ where: { id }, data })
  revalidatePath(`/posts/${id}`)
}
```

### Streaming

```tsx
// Stream large data sets
import { Suspense } from 'react'

export default function Page() {
  return (
    <div>
      <Suspense fallback={<Loading />}>
        <SlowComponent />
      </Suspense>
      <FastComponent />
    </div>
  )
}
```

## Client-Side Optimization

### Lazy Loading Components

```tsx
'use client'
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <LoadingSpinner />,
})

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<Loading />}>
        <HeavyChart />
      </Suspense>
    </div>
  )
}
```

### Virtualization

```tsx
// Use react-window or react-virtual for long lists
'use client'
import { FixedSizeList } from 'react-window'

export function LargeList({ items }: { items: Item[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <ItemCard item={items[index]} />
    </div>
  )

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  )
}
```

### Debouncing and Throttling

```tsx
'use client'
import { useState, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'

export function SearchInput() {
  const [query, setQuery] = useState('')

  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      // API call after 500ms
      search(value)
    },
    500
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    debouncedSearch(e.target.value)
  }

  return (
    <input
      type="search"
      value={query}
      onChange={handleChange}
      placeholder="Search..."
    />
  )
}
```

## Performance Checklist

### Images
- [ ] Using Next.js Image component for all images
- [ ] Images have proper dimensions (width/height)
- [ ] Above-the-fold images use priority prop
- [ ] Using blur placeholder for better perceived performance
- [ ] Responsive images with appropriate sizes prop
- [ ] Images are optimized (WebP format when possible)

### Code Splitting
- [ ] Large components lazy loaded with dynamic import
- [ ] Loading states for lazy loaded components
- [ ] Heavy components only loaded when needed
- [ ] Bundle size analyzed regularly

### Memoization
- [ ] Expensive components use React.memo
- [ ] Expensive computations use useMemo
- [ ] Event handlers use useCallback
- [ ] React Compiler enabled (when appropriate)

### Caching
- [ ] Server data appropriately cached
- [ ] Cache revalidation strategies implemented
- [ ] SWR configured for client-side state
- [ ] Cache Components used where appropriate

### Performance Monitoring
- [ ] Web Vitals tracked
- [ ] Performance budgets set
- [ ] Bundle size monitored
- [ ] Regular performance audits

### Fonts
- [ ] Fonts optimized and preloaded
- [ ] Using display: 'swap' for better loading
- [ ] Only loading necessary font weights
- [ ] Font subsetting for large font files

### Best Practices
- [ ] Server Components used by default
- [ ] Client Components only when necessary
- [ ] Minimal client-side JavaScript
- [ ] CSS optimized (critical CSS inlined)
- [ ] Third-party scripts loaded efficiently
