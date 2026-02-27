---
name: react-query-usequery-patterns
description: Best practices for architecting useQuery calls in React Query (TanStack Query).
license: MIT
compatibility: opencode
metadata:
  audience: users
  workflow: general
---

# React Query: useQuery Architecture Patterns

## How to use this skill

When a user asks about useQuery placement, deduplication, or component architecture with React Query:

1. **Identify their concern** — are they worried about network requests, prop drilling, re-renders, or code organization?
2. **Lead with the core answer**: call `useQuery` in each component directly — React Query deduplicates automatically.
3. **Show the relevant pattern(s)** from below based on their specific situation.
4. **Use the summary table** at the end to give a quick comparison if they're weighing options.

Always reassure the user that co-locating queries does **not** cause extra network requests — this is the most common misconception.

---

## Core Principle

When multiple components need the same data, **call `useQuery` in each component directly** rather than hoisting to a parent and prop drilling.

React Query automatically **deduplicates** requests with the same `queryKey`. If multiple components call `useQuery` with the same key simultaneously, only **one network request** is made. All components share the same cached result.

---

## Pattern 1: ✅ Co-located Queries (Recommended)

Each component owns its data. One network request is made regardless.

```tsx
function UserCard() {
  const { data } = useQuery({ queryKey: ['user'], queryFn: fetchUser });
  return <div>{data?.name}</div>;
}

function UserAvatar() {
  const { data } = useQuery({ queryKey: ['user'], queryFn: fetchUser });
  return <img src={data?.avatar} />;
}

function UserStats() {
  const { data } = useQuery({ queryKey: ['user'], queryFn: fetchUser });
  return <div>{data?.stats}</div>;
}

// Parent doesn't touch data at all
function ProfilePage() {
  return (
    <>
      <UserCard />
      <UserAvatar />
      <UserStats />
    </>
  );
}
```

**Why this is correct:**
- All three `useQuery` calls share the same `queryKey: ['user']`
- React Query fires exactly **one** network request
- Components are self-contained and portable — move them anywhere in the tree
- The parent has no data coupling to its children

---

## Pattern 2: ❌ Prop Drilling from Parent (Anti-pattern)

```tsx
// Don't do this — it fights against React Query's design
function ProfilePage() {
  const { data } = useQuery({ queryKey: ['user'], queryFn: fetchUser });
  return (
    <>
      <UserCard user={data} />
      <UserAvatar user={data} />
      <UserStats user={data} />
    </>
  );
}
```

**Why this is worse:**
- Components are no longer self-contained — they can't be reused or moved without their parent
- The parent must know what each child needs
- You lose React Query's cache subscription model
- Still only one network request — so you gain nothing over Pattern 1

---

## Pattern 3: ✅ Custom Hook (Most Idiomatic)

Wrap `useQuery` in a custom hook to centralize config. Each component still calls the hook independently, and deduplication still applies.

```tsx
// hooks/useUser.ts
export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000, // config defined once
  });
}

// Each component calls the hook directly — still one network request
function UserCard() {
  const { data } = useUser();
  return <div>{data?.name}</div>;
}

function UserAvatar() {
  const { data } = useUser();
  return <img src={data?.avatar} />;
}
```

This is the **recommended default** — co-location plus DRY config.

---

## Pattern 4: ✅ `select` for Fine-grained Re-renders

Use `select` when components only care about a slice of the data. One network request still fires; each component only re-renders when **its specific slice** changes.

```tsx
function UserCard() {
  const { data: name } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    select: (data) => data.name, // re-renders only when name changes
  });
  return <div>{name}</div>;
}

function UserAvatar() {
  const { data: avatar } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    select: (data) => data.avatar, // re-renders only when avatar changes
  });
  return <img src={avatar} />;
}
```

Combine with Pattern 3 (custom hook) for the cleanest version:

```tsx
export function useUserName() {
  return useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    select: (data) => data.name,
  });
}
```

---

## How Deduplication Works

When components mount simultaneously with the same `queryKey`:

1. **First call** — fires a network request, stores a pending promise in the cache
2. **Subsequent calls** — attach to the existing promise; no new request is made
3. **All components** resolve together when the promise settles
4. **Future renders** — served from cache; no request if within `staleTime`

> ⚠️ Deduplication only applies to simultaneous or near-simultaneous mounts. Once data becomes stale and a component re-focuses/re-mounts, a new background refetch fires — but again, only one, shared across all active subscribers.

---

## Summary Table

| Approach | Network Requests | Component Portability | Recommended |
|---|---|---|---|
| `useQuery` in each component | 1 (deduplicated) | ✅ High | ✅ Yes |
| `useQuery` in parent + prop drill | 1 | ❌ Low | ❌ No |
| Custom hook wrapping `useQuery` | 1 (deduplicated) | ✅ High | ✅ Best default |
| `select` per component | 1 (deduplicated) | ✅ High | ✅ For render optimization |

---

## Common Misconceptions to Address

If a user seems to believe any of the following, correct them directly:

- **"Won't each component make its own request?"** — No. React Query deduplicates by `queryKey`. One request, many subscribers.
- **"I need to hoist state to avoid duplicate fetches."** — This is the React Context / useState mental model. React Query is different — co-location is safe and preferred.
- **"I should use Context to share query results."** — React Query's cache *is* your shared state. Don't wrap it in Context.
