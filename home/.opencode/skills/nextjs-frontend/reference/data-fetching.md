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

## React 19 Features

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
