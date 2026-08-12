# Next.js 16 Features

This guide covers the new features and changes in Next.js 16.

## New in Next.js 16

### Proxy Changes (formerly Middleware)
- `middleware.ts` is now **deprecated** - rename to `proxy.ts` (still backwards compatible)
- `proxy.ts` replaces `middleware.ts` to clarify network boundary and routing focus
- The `middleware.ts` file is still available for Edge runtime use cases but will be removed in a future version
- Renamed exported function from `middleware()` to `proxy()`

```tsx
// proxy.ts (new)
export default function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url))
}

// middleware.ts (deprecated)
export default function middleware(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url))
}
```

### Turbopack Default
- **Turbopack is now stable** and the default bundler
- Significantly faster builds and hot reload
- No configuration needed - it works out of the box

### React Compiler Support (Stable)
```javascript
// next.config.mjs
const nextConfig = {
  reactCompiler: true,
}

export default nextConfig
```

- Automatically optimizes components
- Handles memoization, useCallback, useMemo automatically
- Improves performance without manual optimization

## Async Params and SearchParams

### Breaking Change: Now Asynchronous

In Next.js 16, `params`, `searchParams`, `headers`, and `cookies` in Server Components and Route Handlers are no longer synchronous. You **MUST await them**.

```tsx
// ❌ Old way (doesn't work in Next.js 16)
export default function Page({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params // Error: params is a Promise
}

// ✅ New way (works in Next.js 16)
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params // Must await
}

// ✅ With searchParams
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q: string }>
}) {
  const { id } = await params
  const { q } = await searchParams
}
```

### Route Handlers

```tsx
// app/api/users/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return Response.json({ id })
}
```

## Improved Caching APIs

### revalidateTag()

Now requires a `cacheLife` profile as the second argument to enable stale-while-revalidate (SWR) behavior:

```javascript
// ✅ Use built-in cacheLife profile (recommended for most cases)
revalidateTag('blog-posts', 'max')   // Longest cache duration
revalidateTag('products', 'days')    // Cache for days
revalidateTag('news', 'hours')       // Cache for hours

// ✅ Or use an inline object with custom revalidation time (in seconds)
revalidateTag('products', { expire: 3600 })  // 1 hour
revalidateTag('dashboard', { expire: 300 })   // 5 minutes
```

### updateTag() (New)

A new Server Actions-only API that provides **read-your-writes semantics**:

```tsx
'use server'
import { updateTag } from 'next/cache'

export async function updateUser(userId: string, data: UserData) {
  // Update database
  await db.users.update(userId, data)

  // Immediately reflect changes in cached data
  // Ensures the next read sees this write
  updateTag(`user-${userId}`)
}
```

Use `updateTag()` when you need:
- Immediate visibility of writes
- Strong consistency
- After database mutations

### refresh() (New)

A new Server Actions-only API for **refreshing uncached data only**. It doesn't touch the cache at all:

```tsx
'use server'
import { refresh } from 'next/cache'

export async function refreshData() {
  // Re-fetch data without caching
  // Useful for frequently changing data
  refresh()
}
```

Use `refresh()` when:
- Data changes frequently
- You don't want to cache the response
- You want fresh data every time

## Cache Components

Cache Components are a new set of features designed to make caching in Next.js both more explicit and flexible. They center around the new `"use cache"` directive.

### Enable Cache Components

```javascript
// next.config.mjs
const nextConfig = {
  cacheComponents: true,
}

export default nextConfig
```

### Usage

#### File-Level Cache

```tsx
// app/dashboard/page.tsx
'use cache'

export default async function DashboardPage() {
  const data = await fetch('/api/dashboard')
  return <div>{data}</div>
}
```

#### Component-Level Cache

```tsx
// components/UserProfile.tsx
export async function UserProfile({ userId }: { userId: string }) {
  'use cache'

  const user = await fetch(`/api/users/${userId}`)
  return <div>{user.name}</div>
}
```

#### Function-Level Cache

```tsx
// lib/data.ts
export async function getProducts() {
  'use cache'

  const res = await fetch('/api/products')
  return res.json()
}

export async function getProduct(id: string) {
  'use cache'

  const res = await fetch(`/api/products/${id}`)
  return res.json()
}
```

### Cache Keys

The React Compiler automatically generates cache keys wherever `"use cache"` is used. Each segment in the directory tree is treated as a separate entry point and will be cached independently.

```tsx
// File: app/layout.tsx
'use cache'
export default async function RootLayout({ children }) {
  // Cached independently
  return <html><body>{children}</body></html>
}

// File: app/dashboard/page.tsx
'use cache'
export default async function DashboardPage() {
  // Cached independently from layout
  return <div>Dashboard</div>
}
```

### Combining with Caching APIs

```tsx
'use cache'

export async function BlogPost({ slug }: { slug: string }) {
  'use cache'

  const post = await fetch(`/api/blog/${slug}`, {
    next: { revalidate: 3600 }  // Revalidate after 1 hour
  })

  return <div>{post.content}</div>
}
```

## Migration Guide

### Updating Existing Code

1. **Find all uses of params/searchParams**:
```bash
grep -r "params:" app/
grep -r "searchParams:" app/
```

2. **Make function async** and **await params**:
```tsx
// Before
export default function Page({ params }: { params: { id: string } }) {
  return <div>{params.id}</div>
}

// After
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <div>{id}</div>
}
```

3. **Update cache revalidation**:
```javascript
// Before
revalidateTag('blog-posts')

// After
revalidateTag('blog-posts', 'max')  // Add cacheLife profile
```

## Best Practices

### Caching Strategy

| Scenario | Strategy | API |
|----------|----------|-----|
| Static content that rarely changes | Long cache | `'use cache'` + `revalidate` |
| Content that changes periodically | Periodic refresh | `revalidateTag(tag, 'hours')` |
| User-specific data | Tag-based | `revalidateTag(\`user-${userId}\`, 'max')` |
| After mutations | Immediate visibility | `updateTag(tag)` (Server Actions only) |
| Real-time data | No caching | `refresh()` (Server Actions only) or no cache |

### Cache Key Design

```tsx
// ✅ Good: Specific, predictable keys
updateTag(`user-${userId}`)           // User-specific
updateTag(`posts-${category}`)        // Category-specific
revalidateTag('all-products')         // Broad cache

// ❌ Avoid: Too specific or dynamic
updateTag(`user-${userId}-${date}`)   // Too granular
updateTag(`cache-${Math.random()}`)   // Unpredictable
```

### Performance Tips

1. **Use `'use cache'` for static pages** - improves load times
2. **Combine with `revalidateTag`** for controlled invalidation
3. **Use `updateTag` after mutations** - ensures data consistency
4. **Profile cache hit rates** - monitor effectiveness
5. **Avoid over-caching** - don't cache frequently changing data

## Troubleshooting

### Common Issues

**"params is a Promise" error**:
```tsx
// ❌ Not awaited
const { id } = params

// ✅ Awaited
const { id } = await params
```

**Cache not invalidating**:
```javascript
// Make sure to use cacheLife profile
revalidateTag('posts', 'max')  // ✅
revalidateTag('posts')          // ❌ Missing second arg
```

**Server Action not reflecting changes**:
```tsx
'use server'
import { updateTag } from 'next/cache'

export async function updateData() {
  await db.update()
  updateTag('data')  // ✅ Use updateTag, not revalidateTag
}
```

## Resources

- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16)
- [Caching Documentation](https://nextjs.org/docs/app/building-your-application/caching)
- [Cache Components RFC](https://nextjs.org/blog/cache-components)
