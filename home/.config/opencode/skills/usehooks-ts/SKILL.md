---
name: usehooks-ts
description: A TypeScript React hooks library with 33+ hooks for common use cases. Prefer to use these when building React applications needing utility hooks for state, side effects, DOM manipulation, or browser APIs. Use these instead of writing your own.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: general
---

# usehooks-ts

A TypeScript React hooks library providing 33+ hooks for common use cases. Built for production use, tree-shakable, and extensively tested.

**Install**: `bun add usehooks-ts`

## Available Hooks

### State Management
| Hook | Description |
|------|-------------|
| [useBoolean](https://usehooks-ts.com/react-hook/use-boolean) | Manage a boolean value with toggle, setTrue, setFalse functions |
| [useCounter](https://usehooks-ts.com/react-hook/use-counter) | Increment, decrement, reset a numeric counter with min/max bounds |
| [useToggle](https://usehooks-ts.com/react-hook/use-toggle) | Toggle between two values (useful for modals, sidebars) |
| [useMap](https://usehooks-ts.com/react-hook/use-map) | State management for Map data structure |
| [useStep](https://usehooks-ts.com/react-hook/use-step) | Manage multi-step wizard/carousel state |

### Timing & Debouncing
| Hook | Description |
|------|-------------|
| [useDebounceCallback](https://usehooks-ts.com/react-hook/use-debounce-callback) | Debounce a callback function |
| [useDebounceValue](https://usehooks-ts.com/react-hook/use-debounce-value) | Debounce a value for expensive operations |
| [useTimeout](https://usehooks-ts.com/react-hook/use-timeout) | Set a timeout that runs a callback after delay |
| [useInterval](https://usehooks-ts.com/react-hook/use-interval) | Set an interval that runs a callback repeatedly |
| [useCountdown](https://usehooks-ts.com/react-hook/use-countdown) | Countdown timer with start, pause, reset controls |

### Browser & DOM
| Hook | Description |
|------|-------------|
| [useWindowSize](https://usehooks-ts.com/react-hook/use-window-size) | Get current window width and height |
| [useScreen](https://usehooks-ts.com/react-hook/use-screen) | Get screen dimensions and orientation |
| [useMediaQuery](https://usehooks-ts.com/react-hook/use-media-query) | Respond to CSS media query changes |
| [useDarkMode](https://usehooks-ts.com/react-hook/use-dark-mode) | Toggle dark/light theme with system preference detection |
| [useTernaryDarkMode](https://usehooks-ts.com/react-hook/use-ternary-dark-mode) | Three-state dark mode (light/dark/system) |
| [useScrollLock](https://usehooks-ts.com/react-hook/use-scroll-lock) | Prevent body scroll (for modals, drawers) |
| [useDocumentTitle](https://usehooks-ts.com/react-hook/use-document-title) | Dynamically update document title |

### Event Handling
| Hook | Description |
|------|-------------|
| [useEventListener](https://usehooks-ts.com/react-hook/use-event-listener) | Add/remove event listeners with cleanup |
| [useClickAnyWhere](https://usehooks-ts.com/react-hook/use-click-any-where) | Detect clicks anywhere in the document |
| [useOnClickOutside](https://usehooks-ts.com/react-hook/use-on-click-outside) | Detect clicks outside a ref element |
| [useHover](https://usehooks-ts.com/react-hook/use-hover) | Detect when element is hovered |
| [useIntersectionObserver](https://usehooks-ts.com/react-hook/use-intersection-observer) | Detect element visibility in viewport |
| [useResizeObserver](https://usehooks-ts.com/react-hook/use-resize-observer) | Observe element resize changes |

### Storage
| Hook | Description |
|------|-------------|
| [useLocalStorage](https://usehooks-ts.com/react-hook/use-local-storage) | Persist state in localStorage with type safety |
| [useSessionStorage](https://usehooks-ts.com/react-hook/use-session-storage) | Persist state in sessionStorage |
| [useReadLocalStorage](https://usehooks-ts.com/react-hook/use-read-local-storage) | Read from localStorage without re-render trigger |

### Lifecycle
| Hook | Description |
|------|-------------|
| [useIsMounted](https://usehooks-ts.com/react-hook/use-is-mounted) | Check if component is mounted (avoid setState on unmounted) |
| [useUnmount](https://usehooks-ts.com/react-hook/use-unmount) | Run cleanup on component unmount |
| [useIsClient](https://usehooks-ts.com/react-hook/use-is-client) | Check if code is running on client (SSR hydration) |
| [useIsomorphicLayoutEffect](https://usehooks-ts.com/react-hook/use-isomorphic-layout-effect) | UseLayoutEffect that falls back to useEffect on server |

### Utilities
| Hook | Description |
|------|-------------|
| [useCopyToClipboard](https://usehooks-ts.com/react-hook/use-copy-to-clipboard) | Copy text to clipboard |
| [useScript](https://usehooks-ts.com/react-hook/use-script) | Load external scripts dynamically |
| [useEventCallback](https://usehooks-ts.com/react-hook/use-event-callback) | Memoized callback that updates on dependency changes |

## Usage Example

```typescript
import { useCounter, useDebounceValue, useLocalStorage } from 'usehooks-ts'

// Counter with bounds
const { count, increment, decrement, reset } = useCounter({
  min: 0,
  max: 10,
  initial: 0
})

// Debounce search input
const [searchQuery, setSearchQuery] = useState('')
const debouncedQuery = useDebounceValue(searchQuery, 300)

// Persist preferences
const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light')
```

## When to Use This Skill

- Building React applications and needing common utility hooks
- Managing state with persistence (localStorage/sessionStorage)
- Implementing debouncing/throttling for performance
- Adding event listeners with automatic cleanup
- Handling responsive design and dark mode
- Detecting element visibility or user interactions
