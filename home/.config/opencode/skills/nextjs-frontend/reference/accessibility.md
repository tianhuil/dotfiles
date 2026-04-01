# Accessibility

Comprehensive guide for building accessible Next.js applications with shadcn/ui components.

## Semantic HTML

### Why Semantic HTML Matters

Semantic HTML provides:
- **Better accessibility** - screen readers understand the structure
- **Improved SEO** - search engines understand content meaning
- **Easier maintenance** - code is more readable and organized

### HTML5 Semantic Elements

```tsx
// ✅ Good: Using semantic elements
<main>
  <header>
    <nav>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </nav>
  </header>

  <article>
    <h1>Article Title</h1>
    <p>Article content...</p>
  </article>

  <aside>
    <h2>Related</h2>
    <ul>...</ul>
  </aside>

  <footer>
    <p>© 2024</p>
  </footer>
</main>

// ❌ Bad: Using divs for everything
<div>
  <div>
    <div>
      <ul>
        <li><a href="/">Home</a></li>
      </ul>
    </div>
  </div>
</div>
```

### Heading Hierarchy

```tsx
// ✅ Good: Proper heading hierarchy
<main>
  <h1>Main Page Title</h1>

  <section>
    <h2>Section Title</h2>
    <h3>Subsection Title</h3>
  </section>

  <section>
    <h2>Another Section</h2>
  </section>
</main>

// ❌ Bad: Skipping heading levels
<h1>Title</h1>
<h4>Subsection</h4>  // Skips h2 and h3
```

### Landmarks

Landmarks help screen reader users navigate quickly:

```tsx
// ✅ Good: Using landmarks
<header>
  <nav aria-label="Main navigation">
    <ul>...</ul>
  </nav>
</header>

<main>
  <section aria-labelledby="section-1-title">
    <h2 id="section-1-title">Section Title</h2>
    <p>Content...</p>
  </section>
</main>

<aside aria-label="Sidebar">
  <h2>Related Links</h2>
  <ul>...</ul>
</aside>

<footer aria-label="Footer">
  <p>Copyright</p>
</footer>
```

## ARIA Roles and Attributes

### When to Use ARIA

ARIA should be used when:
- Semantic HTML is not available
- Building custom components that behave like standard elements
- Providing additional context for screen readers

**Note**: Don't overuse ARIA - semantic HTML is always preferred.

### Common ARIA Roles

```tsx
// Button with icon
<button
  aria-label="Close dialog"
  onClick={onClose}
>
  <X className="h-4 w-4" />
</button>

// Custom checkbox
<button
  role="checkbox"
  aria-checked={isChecked}
  onClick={() => setIsChecked(!isChecked)}
  aria-label={label}
>
  {isChecked && <CheckIcon />}
</button>

// Custom tab interface
<div role="tablist" aria-label="Settings tabs">
  <button
    role="tab"
    aria-selected={activeTab === 'general'}
    aria-controls="general-panel"
    onClick={() => setActiveTab('general')}
  >
    General
  </button>
  <button
    role="tab"
    aria-selected={activeTab === 'advanced'}
    aria-controls="advanced-panel"
    onClick={() => setActiveTab('advanced')}
  >
    Advanced
  </button>
</div>

<div
  id="general-panel"
  role="tabpanel"
  aria-labelledby="general-tab"
  hidden={activeTab !== 'general'}
>
  General settings
</div>
```

### Live Regions

```tsx
// For dynamic content updates
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {loadingMessage}
</div>

// For urgent updates (alerts, errors)
<div
  role="alert"
  aria-live="assertive"
>
  {errorMessage}
</div>
```

### Descriptive Labels

```tsx
// ✅ Good: Descriptive labels
<button aria-label="Delete item" onClick={onDelete}>
  <TrashIcon />
</button>

<input
  id="email"
  type="email"
  aria-label="Email address"
  required
/>

// ✅ Good: Using labels (preferred)
<label htmlFor="email">Email address</label>
<input id="email" type="email" required />

// ❌ Bad: No label or aria-label
<input type="email" />
```

### Hidden Content

```tsx
// ✅ Good: Screen reader only text
<span className="sr-only">
  Press Enter to submit form
</span>

// ✅ Good: Decorative content
<img
  src="/decorative.png"
  alt=""
  aria-hidden="true"
/>

<div aria-hidden="true">
  {/* Content visible only to sighted users */}
</div>
```

## Focus Management

### Visible Focus States

```tsx
// ✅ Good: Clear focus indicator
<button className="focus:ring-2 focus:ring-blue-500">
  Click me
</button>

// ✅ Good: Custom focus styles with Tailwind
<button className="outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
  Click me
</button>

// ❌ Bad: Hiding focus entirely
<button className="outline-none focus:outline-none">
  Click me
</button>
```

### Keyboard Navigation

```tsx
// ✅ Good: All interactive elements are keyboard accessible
<a href="/page">Link</a>
<button onClick={handleClick}>Button</button>
<input type="text" />

// ✅ Good: Custom clickable div with keyboard support
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
>
  Custom button
</div>

// ❌ Bad: Div that's only clickable with mouse
<div onClick={handleClick}>
  Not keyboard accessible
</div>
```

### Focus Management in Modals

```tsx
'use client'
import { useEffect, useRef } from 'react'

export function Modal({ isOpen, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Focus first focusable element
      const firstFocusable = modalRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement
      firstFocusable?.focus()

      // Trap focus within modal
      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return

        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as NodeListOf<HTMLElement>

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }

      document.addEventListener('keydown', handleTab)
      return () => document.removeEventListener('keydown', handleTab)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        {children}
      </div>
    </div>
  )
}
```

## Images and Media

### Alt Text

```tsx
// ✅ Good: Descriptive alt text
<img
  src="/chart.png"
  alt="Bar chart showing sales revenue increased 25% from Q1 to Q2"
/>

// ✅ Good: Decorative image (screen readers skip)
<img src="/decoration.png" alt="" />

// ✅ Good: Using aria-hidden for decorative SVG
<svg aria-hidden="true">
  <path d="..." />
</svg>

// ❌ Bad: No alt text
<img src="/chart.png" />

// ❌ Bad: Not helpful alt text
<img src="/chart.png" alt="chart" />

// ❌ Bad: Using alt text for decorative elements
<img src="/separator.png" alt="horizontal line separator" />
```

### Next.js Image Component

```tsx
import Image from 'next/image'

// ✅ Good: With proper alt text
<Image
  src="/hero.jpg"
  alt="Team celebrating product launch"
  width={1920}
  height={1080}
/>

// ✅ Good: Decorative image
<Image
  src="/pattern.png"
  alt=""
  width={100}
  height={100}
/>

// ❌ Bad: Missing alt text
<Image
  src="/hero.jpg"
  width={1920}
  height={1080}
/>
```

## Forms and Inputs

### Labels

```tsx
// ✅ Good: Explicit label association
<label htmlFor="email">Email address</label>
<input
  id="email"
  type="email"
  required
/>

// ✅ Good: aria-label for buttons without text
<button aria-label="Close dialog">
  <XIcon />
</button>

// ✅ Good: aria-labelledby for complex inputs
<div className="space-y-2">
  <label id="address-label">Address</label>
  <input
    aria-labelledby="address-label"
    type="text"
    placeholder="Street address"
  />
  <input
    aria-labelledby="address-label"
    type="text"
    placeholder="City"
  />
</div>

// ❌ Bad: Missing labels
<input type="email" placeholder="Email" />
```

### Error Messages

```tsx
// ✅ Good: Associated error messages
<div className="space-y-2">
  <label htmlFor="password">Password</label>
  <input
    id="password"
    type="password"
    aria-invalid={errors.password ? 'true' : 'false'}
    aria-describedby="password-error"
  />
  {errors.password && (
    <p id="password-error" className="text-red-500" role="alert">
      {errors.password}
    </p>
  )}
</div>

// ✅ Good: Form-level error summary
<div role="alert" aria-atomic="true">
  <h3>There were 2 errors:</h3>
  <ul>
    <li><a href="#email-error">Email is required</a></li>
    <li><a href="#password-error">Password must be at least 8 characters</a></li>
  </ul>
</div>
```

### Required Fields

```tsx
// ✅ Good: Indicate required fields
<label htmlFor="email">
  Email address <span aria-hidden="true">*</span>
</label>
<input
  id="email"
  type="email"
  required
  aria-required="true"
/>

// ✅ Good: Use aria-label for asterisk
<label htmlFor="email">
  Email address
  <span className="sr-only">(required)</span>
  <span aria-hidden="true">*</span>
</label>
```

## Screen Reader Only Content

### Tailwind sr-only Class

```tsx
// Hidden from visual display, visible to screen readers
<span className="sr-only">Press Enter to submit form</span>

// Use for context that's visually obvious
<button>
  <XIcon className="h-4 w-4" />
  <span className="sr-only">Close</span>
</button>

// Use for skip links
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4">
  Skip to main content
</a>
```

## shadcn/ui and Accessibility

### Accessible Components

shadcn/ui components are built with accessibility in mind:

```tsx
// ✅ Good: shadcn/ui components are accessible
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'

// Button - accessible by default
<Button>Click me</Button>

// Dialog - manages focus, aria-modal
<Dialog>
  <DialogTrigger>Open Dialog</DialogTrigger>
  <DialogContent>Dialog content</DialogContent>
</Dialog>

// Form - labels, error handling built-in
<Form>
  <FormField
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
      </FormItem>
    )}
  />
</Form>

// Toast - role="alert", aria-live
const { toast } = useToast()
toast({
  title: "Success",
  description: "Your changes have been saved",
})
```

## Color Contrast

### WCAG Standards

- **AA Standard** (minimum): 4.5:1 for normal text, 3:1 for large text
- **AAA Standard** (enhanced): 7:1 for normal text, 4.5:1 for large text

### Checking Contrast

```tsx
// ✅ Good: Good contrast ratios
<div className="bg-white text-gray-900">  // Ratio: ~21:1 (AAA)
  High contrast text
</div>

<div className="bg-blue-600 text-white">  // Ratio: ~5.4:1 (AA)
  Readable blue text
</div>

// ❌ Bad: Poor contrast
<div className="bg-gray-200 text-gray-300">  // Ratio: ~1.3:1 (Fail)
  Hard to read
</div>

<div className="bg-red-500 text-pink-500">  // Ratio: ~1.6:1 (Fail)
  Very hard to read
</div>
```

### Using Design Tokens

```tsx
// ✅ Good: Design tokens ensure proper contrast
<div className="bg-background text-foreground">Content</div>
<button className="bg-primary text-primary-foreground">Button</button>
<p className="text-muted-foreground">Subtle text</p>

// These automatically adapt to light/dark mode with proper contrast
```

## Accessibility Testing

### Keyboard Navigation

Test that all interactive elements work with keyboard only:

```
1. Use Tab to navigate through elements
2. Use Shift+Tab to navigate backwards
3. Use Enter/Space to activate buttons and links
4. Use Arrow keys for menus and dropdowns
5. Use Escape to close modals and dropdowns
```

### Screen Reader Testing

Test with screen readers:
- **NVDA** (Windows, free)
- **JAWS** (Windows, commercial)
- **VoiceOver** (macOS, built-in)
- **TalkBack** (Android, built-in)

### Automated Testing

```tsx
// Use jest-axe for automated accessibility testing
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('page is accessible', async () => {
  render(<HomePage />)
  const results = await axe(document.body)
  expect(results).toHaveNoViolations()
})
```

## Best Practices Checklist

### Semantic HTML
- [ ] Using appropriate HTML5 elements (main, nav, header, footer)
- [ ] Maintaining proper heading hierarchy (h1 → h2 → h3)
- [ ] Using landmarks for navigation (nav, main, aside)
- [ ] Not skipping heading levels

### ARIA Attributes
- [ ] Using ARIA labels when necessary
- [ ] Providing descriptive labels for icon-only buttons
- [ ] Using live regions for dynamic content (aria-live)
- [ ] Setting aria-hidden for decorative content
- [ ] Not overusing ARIA (prefer semantic HTML)

### Forms
- [ ] All form controls have labels
- [ ] Error messages are associated with inputs (aria-describedby)
- [ ] Required fields are indicated (aria-required)
- [ ] Form validation errors are announced (role="alert")

### Keyboard Accessibility
- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Focus is trapped in modals
- [ ] Custom components handle keyboard events

### Focus Management
- [ ] Clear focus indicators (ring, outline)
- [ ] Focus moves logically through content
- [ ] Modal traps focus within itself
- [ ] Focus returns after closing modal

### Images
- [ ] All images have alt text
- [ ] Decorative images have alt=""
- [ ] Alt text is descriptive and helpful
- [ ] Complex images have long descriptions

### Color and Contrast
- [ ] Text meets WCAG AA contrast ratios (4.5:1)
- [ ] Large text meets WCAG AA contrast ratios (3:1)
- [ ] Interactive elements have sufficient contrast
- [ ] Color is not the only way to convey information

### Testing
- [ ] Tested keyboard navigation
- [ ] Tested with screen reader
- [ ] Automated accessibility tests pass
- [ ] Manual accessibility review completed
