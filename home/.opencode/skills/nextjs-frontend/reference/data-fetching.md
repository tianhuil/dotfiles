# Data Fetching & State Management

Comprehensive guide for data fetching, caching, and state management in Next.js applications.

## Server Components (Default)

### Why Server Components?

Server Components are the default in Next.js App Router. They provide:

- **Better performance** - code runs on the server, less JavaScript sent to client
- **Direct database access** - no API routes needed
- **Automatic caching** - built-in caching and revalidation
- **Security** - secrets never exposed to client

### Basic Data Fetching

```tsx
// app/users/[id]/page.tsx
async function getUser(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}`, {
    // Next.js caching options
    next: { revalidate: 3600 },  // Revalidate after 1 hour
  })

  if (!res.ok) {
    throw new Error('Failed to fetch user')
  }

  return res.json()
}

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getUser(id)

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

### Fetch Options

```tsx
// Cache with revalidation
const data = await fetch(url, {
  next: { revalidate: 3600 },  // Seconds
})

// No caching (always fresh)
const data = await fetch(url, {
  cache: 'no-store',
})

// Static generation (build time)
const data = await fetch(url, {
  next: { revalidate: false },
})

// Tag-based revalidation
const data = await fetch(url, {
  next: { tags: ['users', 'user-details'] },
})
```

### Database Queries

```tsx
// lib/db.ts
import { prisma } from '@/lib/prisma'

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
  })
  return user
}

// app/users/[id]/page.tsx
import { getUserById } from '@/lib/db'

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getUserById(id)

  return <UserCard user={user} />
}
```

### Error Handling

```tsx
export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  try {
    const user = await getUser(id)
    return <UserCard user={user} />
  } catch (error) {
    if (error instanceof Error) {
      return <Error message={error.message} />
    }
    return <Error message="An unknown error occurred" />
  }
}
```

## Client-Side Data Fetching

### When to Use Client-Side Fetching

- **User interactions** - data that changes based on user actions
- **Real-time updates** - frequently changing data
- **Local state** - data that doesn't need server synchronization
- **Client-side filtering/sorting** - operations that don't require server

### SWR for Data Fetching

SWR is the recommended library for client-side data fetching. It provides:

- **Automatic caching** - deduplicates requests
- **Revalidation** - keeps data fresh
- **Error retry** - automatic retry on failure
- **Optimistic UI** - update UI before server response

#### Basic Usage

```tsx
'use client'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function UserProfile() {
  const { data, error, isLoading } = useSWR('/api/user', fetcher)

  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />
  return <div>{data.name}</div>
}
```

#### Conditional Fetching

```tsx
// Only fetch when userId is available
const { data } = useSWR(userId ? `/api/users/${userId}` : null, fetcher)
```

#### Manual Revalidation

```tsx
const { data, mutate } = useSWR('/api/user', fetcher)

// Refresh data
const handleRefresh = () => {
  mutate()  // Revalidates the key
}

// Optimistic update
const handleUpdate = async () => {
  // Update UI immediately
  mutate({ ...data, name: 'New Name' }, false)

  // Send to server
  await fetch('/api/user', {
    method: 'PUT',
    body: JSON.stringify({ name: 'New Name' }),
  })

  // Revalidate to get fresh data
  mutate()
}
```

#### Custom Hook Pattern

```tsx
// hooks/use-user.ts
'use client'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useUser(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/users/${id}` : null,
    fetcher
  )

  return {
    user: data,
    isLoading,
    isError: error,
    updateUser: async (updates: Partial<User>) => {
      mutate({ ...data, ...updates }, false)
      await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      mutate()
    },
  }
}

// Usage
function UserProfile({ userId }: { userId: string }) {
  const { user, isLoading, updateUser } = useUser(userId)

  if (isLoading) return <Spinner />
  return <div onClick={() => updateUser({ name: 'New' })}>{user.name}</div>
}
```

### SWR Global Configuration

```tsx
// app/layout.tsx (or swr-config.ts)
'use client'
import { SWRConfig } from 'swr'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (url) => fetch(url).then((res) => res.json()),
        refreshInterval: 0,  // Disable auto refresh by default
        revalidateOnFocus: false,  // Don't refresh on window focus
        revalidateOnReconnect: false,  // Don't refresh on reconnect
      }}
    >
      {children}
    </SWRConfig>
  )
}
```

## React 19.2 Features

### useEffectEvent

Extract non-reactive logic from Effects into reusable Effect Event functions:

```tsx
'use client'
import { useEffect, useEffectEvent } from 'react'

function ChatRoom({ roomId, theme }: { roomId: string; theme: string }) {
  const onConnected = useEffectEvent(() => {
    showNotification('Connected!', theme)
  })

  useEffect(() => {
    const connection = createChatConnection(roomId)
    connection.on('connected', () => onConnected())

    return () => {
      connection.disconnect()
    }
  }, [roomId])  // No need to include 'theme' or 'onConnected'
}
```

**When to use useEffectEvent**:
- When you need to access a value in a useEffect but don't want re-renders
- When you have event handlers inside effects
- When you want to call external APIs with current values

### use() for Reading Resources

The new `use()` API allows reading promises and context in render:

```tsx
'use client'
import { use } from 'react'

function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise) // Suspends until promise resolves
  return comments.map(comment => <p key={comment.id}>{comment.text}</p>)
}

function Page({ commentsPromise }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  )
}

// Can also read context conditionally
function Heading({ children }: { children: React.ReactNode }) {
  if (!children) return null
  const theme = use(ThemeContext) // Works after early returns
  return <h1 style={{ color: theme.color }}>{children}</h1>
}
```

### `<Activity>` Component

Hide and restore the UI and internal state of its children:

```tsx
'use client'
import { Activity } from 'react'

function Dashboard() {
  const [isShowingSidebar, setIsShowingSidebar] = useState(true)

  return (
    <div className="flex">
      <Activity mode={isShowingSidebar ? "visible" : "hidden"}>
        <Sidebar />
      </Activity>
      <MainContent />
    </div>
  )
}
```

**When to use `<Activity>`**:
- When you want to preserve component state when hidden
- For toggleable panels that should remember their state
- For improving performance by hiding instead of unmounting

### Native Document Metadata

React 19.2 adds native support for rendering `<title>`, `<meta>`, and `<link>` tags:

```tsx
function BlogPost({ post }: { post: Post }) {
  return (
    <article>
      <title>{post.title}</title>
      <meta name="description" content={post.excerpt} />
      <meta name="keywords" content={post.tags.join(', ')} />
      <link rel="canonical" href={`https://example.com/blog/${post.slug}`} />
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  )
}
```

### Stylesheets with Precedence

Control stylesheet loading order with the `precedence` prop:

```tsx
function App() {
  return (
    <Suspense fallback="loading...">
      <link rel="stylesheet" href="/critical.css" precedence="high" />
      <link rel="stylesheet" href="/styles.css" precedence="default" />
      <article className="content">
        {/* Content depends on both stylesheets */}
      </article>
    </Suspense>
  )
}
```

### Resource Preloading

Preload resources like fonts, scripts, and stylesheets:

```tsx
import { preload, preconnect, prefetchDNS } from 'react-dom'

function MyComponent() {
  preconnect('https://fonts.googleapis.com')
  preload('https://fonts.gstatic.com', { as: 'font' })
  preload('/api/data', { as: 'fetch' })

  return <div>Content</div>
}
```

## Server Actions

### Server Actions for Mutations

Server Actions are functions that run on the server and can be called from client components:

```tsx
// app/actions.ts
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function updateUser(id: string, data: UpdateUserData) {
  // Update database
  const user = await prisma.user.update({
    where: { id },
    data,
  })

  // Revalidate cache
  revalidatePath(`/users/${id}`)
  revalidateTag('users')

  return user
}

// app/users/[id]/page.tsx
'use client'
import { updateUser } from '@/app/actions'

export function UserForm({ userId }: { userId: string }) {
  const handleSubmit = async (formData: FormData) => {
    const name = formData.get('name') as string
    await updateUser(userId, { name })
  }

  return <form action={handleSubmit}>...</form>
}
```

### useActionState

Manage action state with the new React 19 hook:

```tsx
'use client'
import { useActionState } from 'react'
import { updateProfile } from '@/app/actions'

export function ProfileForm() {
  const [error, submitAction, isPending] = useActionState(
    async (prevState, formData) => {
      const name = formData.get('name') as string
      const result = await updateProfile(name)
      if (!result.success) {
        return result.error
      }
      return null
    },
    null
  )

  return (
    <form action={submitAction}>
      <input name="name" />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Update'}
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </form>
  )
}
```

### useFormStatus

Access parent form's pending state from child components:

```tsx
'use client'
import { useFormStatus } from 'react-dom'

export function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  )
}

// Usage in form
<form action={updateProfile}>
  <SubmitButton />
</form>
```

### useOptimistic

Show optimistic updates during mutations:

```tsx
'use client'
import { useOptimistic } from 'react'
import { updateName } from '@/app/actions'

export function NameEditor({ currentName }: { currentName: string }) {
  const [optimisticName, setOptimisticName] = useOptimistic(currentName)

  const submitAction = async (formData: FormData) => {
    const newName = formData.get('name') as string
    setOptimisticName(newName)
    await updateName(newName)
  }

  return (
    <form action={submitAction}>
      <p>Your name: {optimisticName}</p>
      <input name="name" defaultValue={currentName} />
    </form>
  )
}
```

### Server Actions with Forms

```tsx
// app/actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTodo(formData: FormData) {
  const title = formData.get('title') as string

  await prisma.todo.create({
    data: { title },
  })

  revalidatePath('/todos')
  redirect('/todos')
}

// app/todos/page.tsx
import { createTodo } from '@/app/actions'

export default function TodosPage() {
  return (
    <form action={createTodo}>
      <input name="title" placeholder="Add todo" />
      <button type="submit">Add</button>
    </form>
  )
}
```

### Server Actions with useTransition

```tsx
'use client'
import { useTransition } from 'react'
import { updateUser } from '@/app/actions'

export function UserForm({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await updateUser(userId, Object.fromEntries(formData))
    })
  }

  return (
    <form action={handleSubmit}>
      <input name="name" />
      <button disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  )
}
```

## Caching Strategies

### Static Data (Build Time)

```tsx
// Generate at build time
export const revalidate = false

export default async function StaticPage() {
  const data = await fetch('https://api.example.com/data')
  return <div>{data.content}</div>
}
```

## Route Handlers (API Endpoints)

### Basic Route Handler

```tsx
// app/api/users/route.ts
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const users = await db.users.findMany()
  return Response.json(users)
}

export async function POST(request: Request) {
  const data = await request.json()
  const user = await db.users.create(data)
  return Response.json(user, { status: 201 })
}
```

### Dynamic Route Handlers

```tsx
// app/api/users/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await db.users.findUnique({ where: { id } })
  return Response.json(user)
}
```

### Request Handling

```tsx
// app/api/search/route.ts
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  const results = await db.users.findMany({
    where: {
      name: { contains: query }
    }
  })

  return Response.json(results)
}
```

### Streaming Responses

```tsx
// app/api/stream/route.ts
export async function POST(req: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 10; i++) {
        const chunk = encoder.encode(`data: ${i}\n`)
        controller.enqueue(chunk)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
    },
  })
}
```

### Cookies and Headers

```tsx
// app/api/auth/route.ts
import { cookies } from 'next/headers'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')

  const headersList = await headers()
  const origin = headersList.get('origin')

  return Response.json({ authenticated: !!token })
}
```

### Webhooks

```tsx
// app/api/webhooks/stripe/route.ts
import crypto from 'crypto'

export async function POST(request: Request) {
  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  if (signature !== expectedSignature) {
    return new Response('Invalid signature', { status: 401 })
  }

  // Process webhook
  const event = JSON.parse(payload)

  return new Response('OK', { status: 200 })
}
```

### Time-Based Revalidation

```tsx
// Revalidate every hour
export const revalidate = 3600

export default async function Page() {
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 },
  })
  return <div>{data.content}</div>
}
```

### On-Demand Revalidation

```tsx
// On the client
'use client'
import { revalidatePath, revalidateTag } from 'next/cache'

export function RefreshButton() {
  const handleRefresh = async () => {
    await fetch('/api/revalidate', { method: 'POST' })
  }

  return <button onClick={handleRefresh}>Refresh</button>
}

// API route: app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  revalidatePath('/dashboard')
  revalidateTag('users')
  return NextResponse.json({ revalidated: true })
}
```

### Tag-Based Revalidation

```tsx
// Fetch with tag
const data = await fetch('/api/posts', {
  next: { tags: ['posts'] },
})

// Revalidate tag
import { revalidateTag } from 'next/cache'
revalidateTag('posts')
```

### Cache Invalidation with Server Actions

```tsx
'use server'
import { revalidateTag } from 'next/cache'

export async function updatePost(id: string, data: PostData) {
  await prisma.post.update({ where: { id }, data })
  revalidateTag('posts')
}
```

## State Management Patterns

### Server Component State

```tsx
// Use async functions for data
export default async function Dashboard() {
  const [users, posts, stats] = await Promise.all([
    fetchUsers(),
    fetchPosts(),
    fetchStats(),
  ])

  return <DashboardContent users={users} posts={posts} stats={stats} />
}
```

### Client Component State

```tsx
'use client'
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  )
}
```

### URL State

```tsx
'use client'
import { useSearchParams, useRouter } from 'next/navigation'

export function FilterBar() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const handleFilterChange = (filter: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('filter', filter)
    router.push(`?${params.toString()}`)
  }

  return (
    <button onClick={() => handleFilterChange('active')}>
      Show Active
    </button>
  )
}
```

### Global State with React Context

```tsx
// context/theme-context.tsx
'use client'
import { createContext, useContext, useState } from 'react'

type Theme = 'light' | 'dark'

const ThemeContext = createContext<{
  theme: Theme
  toggleTheme: () => void
}>({
  theme: 'light',
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  const toggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
```

## Best Practices

### When to Use Server Components
- [ ] Fetching data from databases or APIs
- [ ] Rendering static content
- [ ] Keeping secrets safe
- [ ] Reducing JavaScript bundle size
- [ ] Improving initial page load performance

### When to Use Client Components
- [ ] Handling user interactions (click, hover, etc.)
- [ ] Using browser APIs (window, localStorage, etc.)
- [ ] Using React hooks (useState, useEffect, etc.)
- [ ] Managing client-side state
- [ ] Using third-party libraries requiring client-side execution

### Data Fetching Best Practices
- [ ] Use Server Components by default for data fetching
- [ ] Use SWR for client-side state that needs to sync between components
- [ ] NEVER fetch inside useEffect (use RSC or SWR instead)
- [ ] Implement proper error handling and loading states
- [ ] Use appropriate caching strategies
- [ ] Revalidate cache after mutations

### State Management Best Practices
- [ ] Keep state as close to where it's used as possible
- [ ] Use URL state for shareable state
- [ ] Use React Context sparingly (only for truly global state)
- [ ] Server Actions for mutations
- [ ] Optimistic updates for better UX

### Performance Tips
- [ ] Use `Promise.all()` for parallel data fetching
- [ ] Implement proper caching strategies
- [ ] Use streaming for large data sets
- [ ] Lazy load components that aren't immediately needed
- [ ] Minimize client-side state
- [ ] Use React Compiler for automatic optimizations

### Common Anti-Patterns

```tsx
// ❌ Anti-pattern: Fetching in useEffect
'use client'
useEffect(() => {
  fetch('/api/data').then(data => setData(data))
}, [])

// ✅ Correct: Use Server Component or SWR
// Server Component
const data = await fetch('/api/data')

// Or client with SWR
const { data } = useSWR('/api/data', fetcher)

// ❌ Anti-pattern: Fetching multiple times sequentially
const users = await fetchUsers()
const posts = await fetchPosts()
const stats = await fetchStats()

// ✅ Correct: Fetch in parallel
const [users, posts, stats] = await Promise.all([
  fetchUsers(),
  fetchPosts(),
  fetchStats(),
])
```
