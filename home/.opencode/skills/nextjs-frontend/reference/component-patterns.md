# Component Patterns

Comprehensive guide for building and organizing React components in Next.js applications.

## Component Architecture

### Component Size and Responsibility

```tsx
// ✅ Good: Small, focused component
export function UserCard({ user }: { user: User }) {
  return (
    <Card>
      <CardHeader>
        <Avatar src={user.avatar} alt={user.name} />
        <CardTitle>{user.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{user.email}</p>
      </CardContent>
    </Card>
  )
}

// ❌ Bad: Monolithic component
export function DashboardPage() {
  const [users, setUsers] = useState([])
  const [posts, setPosts] = useState([])
  const [stats, setStats] = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // 500+ lines of mixed concerns...
}
```

### Component Organization

```
components/
├── ui/                    # shadcn/ui components (don't modify)
├── layout/                # Layout components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Sidebar.tsx
│   └── Navigation.tsx
├── features/              # Feature-specific components
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── RecentActivity.tsx
│   │   └── UserList.tsx
│   └── posts/
│       ├── PostCard.tsx
│       └── CommentSection.tsx
└── shared/                # Reusable shared components
    ├── ButtonGroup.tsx
    ├── EmptyState.tsx
    └── LoadingSpinner.tsx
```

### Server vs Client Components

```tsx
// ✅ Server Component (default)
// Use when: fetching data, static content, no interactivity
export async function UserProfile({ userId }: { userId: string }) {
  const user = await fetchUser(userId)
  return <UserCard user={user} />
}

// ✅ Client Component (when needed)
// Use when: interactivity, browser APIs, hooks
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

### Composition Patterns

```tsx
// ✅ Good: Composable components
export function Button({ variant = 'default', size = 'md', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        buttonVariants({ variant, size })
      )}
      {...props}
    />
  )
}

export function ButtonGroup({ children, className }: ButtonGroupProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {children}
    </div>
  )
}

// Usage
<ButtonGroup>
  <Button variant="default">Primary</Button>
  <Button variant="outline">Secondary</Button>
  <Button variant="ghost">Tertiary</Button>
</ButtonGroup>
```

## shadcn/ui Components

### Available Components

Standard components available:

**Layout**: `Accordion`, `Alert`, `Avatar`, `Badge`, `Card`, `Collapsible`, `Dialog`, `Dropdown Menu`, `Popover`, `Scroll Area`, `Sheet`, `Tabs`, `Tooltip`

**Form**: `Button`, `Calendar`, `Checkbox`, `Command`, `Form`, `Input`, `Label`, `Radio Group`, `Select`, `Switch`, `Slider`, `Textarea`

**Feedback**: `Alert Dialog`, `Hover Card`, `Progress`, `Skeleton`, `Sonner`, `Toast`

**Navigation**: `Breadcrumb`, `Menubar`, `Navigation Menu`, `Pagination`, `Separator`, `Table`

**New Components**: `Button Group`, `Empty`, `Field`, `Input Group`, `Item`, `Kbd`, `Spinner`

### Using shadcn/ui Components

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form'

export function ExampleForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Example Form</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="Enter your email" />
        </div>
        <Button type="submit">Submit</Button>
      </CardContent>
    </Card>
  )
}
```

### Customizing shadcn/ui Components

```tsx
// Extend shadcn/ui components
import { Button as ShadcnButton } from '@/components/ui/button'

export function Button({ className, variant = 'default', ...props }: ButtonProps) {
  return (
    <ShadcnButton
      className={cn(
        'font-semibold transition-all duration-200',
        className
      )}
      variant={variant}
      {...props}
    />
  )
}

// Add new variants
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // Custom variant
        gradient: 'bg-gradient-to-r from-blue-500 to-teal-500 text-white hover:opacity-90',
      },
    },
  }
)
```

## Form Handling

### Form with react-hook-form and zod

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

const formSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof formSchema>

export function LoginForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify(values),
      })
      if (!response.ok) throw new Error('Login failed')
      // Handle success
    } catch (error) {
      // Handle error
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter your username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter your email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter your password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">Login</Button>
      </form>
    </Form>
  )
}
```

### Server Actions with Forms

```tsx
// app/actions.ts
'use server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function login(formData: FormData) {
  const data = schema.parse(Object.fromEntries(formData))

  // Process login
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  })

  if (!user) {
    throw new Error('Invalid credentials')
  }

  // Return user or redirect
  return { user }
}

// app/login/page.tsx
import { login } from '@/app/actions'

export default function LoginPage() {
  return (
    <form action={login} className="space-y-4">
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required />
      </div>
      <button type="submit">Login</button>
    </form>
  )
}
```

## Common Patterns

### Toast Notifications

```tsx
'use client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'

export function ExampleComponent() {
  const { toast } = useToast()

  const showSuccess = () => {
    toast({
      title: "Success",
      description: "Your changes have been saved.",
      variant: "default",
    })
  }

  const showError = () => {
    toast({
      title: "Error",
      description: "Something went wrong. Please try again.",
      variant: "destructive",
    })
  }

  return (
    <div className="space-x-2">
      <Button onClick={showSuccess}>Show Success</Button>
      <Button onClick={showError} variant="destructive">Show Error</Button>
    </div>
  )
}
```

### Mobile Detection

```tsx
'use client'
import { useMediaQuery } from '@/hooks/use-mobile'

export function ResponsiveLayout() {
  const isMobile = useMediaQuery('(max-width: 768px)')

  return (
    <div>
      {isMobile ? <MobileNavigation /> : <DesktopNavigation />}
    </div>
  )
}

// hooks/use-mobile.tsx
'use client'
import { useState, useEffect } from 'react'

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }

    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)

    return () => media.removeEventListener('change', listener)
  }, [matches, query])

  return matches
}
```

### Empty State

```tsx
export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// Usage
<EmptyState
  icon={<FileSearch className="h-12 w-12" />}
  title="No results found"
  description="Try adjusting your search or filters to find what you're looking for."
  action={<Button>Clear filters</Button>}
/>
```

### Loading State

```tsx
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-primary border-t-transparent ${sizeClasses[size]}`} />
  )
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner />
    </div>
  )
}
```

### Data Table

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function DataTable<T extends { id: string }>({
  data,
  columns,
}: DataTableProps<T>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key}>{column.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id}>
            {columns.map((column) => (
              <TableCell key={column.key}>
                {column.render ? column.render(item) : item[column.key as keyof T]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Usage
const columns = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
]

<DataTable data={users} columns={columns} />
```

### Modal

```tsx
'use client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function Modal({ trigger, title, children }: ModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

// Usage
<Modal
  trigger={<Button>Open Modal</Button>}
  title="Create New Item"
>
  <CreateItemForm />
</Modal>
```

### Tabs

```tsx
'use client'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function TabbedContent({ tabs }: { tabs: Tab[] }) {
  const [activeTab, setActiveTab] = useState(tabs[0].value)

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}

// Usage
<TabbedContent
  tabs={[
    { value: 'general', label: 'General', content: <GeneralSettings /> },
    { value: 'advanced', label: 'Advanced', content: <AdvancedSettings /> },
  ]}
/>
```

## Layout Components

### Header

```tsx
export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <a href="/" className="mr-6 flex items-center space-x-2">
            <Icons.logo />
            <span className="hidden font-bold sm:inline-block">App</span>
          </a>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <a href="/dashboard">Dashboard</a>
            <a href="/settings">Settings</a>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Search />
          </div>
          <nav className="flex items-center">
            <Button variant="ghost" size="icon">
              <Icons.bell />
            </Button>
            <UserMenu />
          </nav>
        </div>
      </div>
    </header>
  )
}
```

### Sidebar

```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

export function Sidebar({ items }: { items: SidebarItem[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Icons.menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SidebarContent items={items} onItemClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <SidebarContent items={items} />
      </div>
    </>
  )
}

function SidebarContent({ items, onItemClick }: SidebarContentProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm font-medium md:grid md:grid-rows-[auto_1fr] md:gap-4">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          onClick={onItemClick}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            pathname === item.href && "bg-accent text-accent-foreground"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.title}
        </a>
      ))}
    </nav>
  )
}
```

### Footer

```tsx
export function Footer() {
  return (
    <footer className="border-t">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <h3 className="font-semibold">Product</h3>
            <ul className="space-y-2">
              <li><a href="/features" className="text-sm text-muted-foreground hover:text-foreground">Features</a></li>
              <li><a href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</a></li>
            </ul>
          </div>
          {/* More columns */}
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>© 2024 App. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
```

## Best Practices

### Component Design
- [ ] Components are small and focused (single responsibility)
- [ ] Components are reusable and composable
- [ ] Props are clearly typed
- [ ] Components have default values where appropriate
- [ ] Avoid prop drilling (use composition or context)

### Server vs Client
- [ ] Use Server Components by default
- [ ] Only use "use client" when necessary
- [ ] Keep client components at the leaves of the component tree
- [ ] Minimize client-side JavaScript

### Performance
- [ ] Use dynamic import for large components
- [ ] Lazy load components that aren't immediately needed
- [ ] Use React.memo for expensive components
- [ ] Avoid unnecessary re-renders

### Accessibility
- [ ] All interactive elements are keyboard accessible
- [ ] Proper ARIA attributes are used
- [ ] Focus is managed correctly
- [ ] Screen reader announcements are included

### Testing
- [ ] Components are tested in isolation
- [ ] Interactive elements work as expected
- [ ] Edge cases are covered
- [ ] Accessibility is tested
