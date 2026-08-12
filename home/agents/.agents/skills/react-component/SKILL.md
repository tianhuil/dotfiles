---
name: react-component
description: React component conventions including naming, props, hooks, and structure. Use when writing or reviewing React components.
metadata:
  audience: developers
  workflow: coding
---

# React Component Guidelines

## Component Declaration

Use `const` with explicit `React.FC` typing:

```tsx
const ButtonComp: React.FC<ButtonProps> = ({ onClick, isDisabled, children }) => {
  return (
    <button onClick={onClick} disabled={isDisabled}>
      {children}
    </button>
  );
};
```

## Naming Conventions

- Components: `*Comp` suffix (`ButtonComp`, `HeaderComp`)
- Props: `*Props` suffix (`ButtonProps`, `HeaderProps`)

```tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

const ButtonComp: React.FC<ButtonProps> = ({ label, onClick, variant }) => {
  return <button onClick={onClick}>{label}</button>;
};
```

## Prop Naming

- Use descriptive, boolean-prefixed names: `isDisabled`, `isLoading`, `isActive`
- Follow React conventions: `onClick`, `onChange`, `onSubmit`

```tsx
type ButtonProps = {
  onClick: () => void;
  isDisabled?: boolean;
  isLoading?: boolean;
};
```

## Prop Destructuring

Always destructure props, never access via `props.`:

```tsx
const UserCard: React.FC<UserCardProps> = ({ name, email, avatar }) => {
  return <div>{name}</div>;
};
```

## React Hooks

Use `React.*` namespace for all hooks:

```tsx
import React from "react";

const Counter: React.FC = () => {
  const [count, setCount] = React.useState<number>(0);
  React.useEffect(() => { /* ... */ }, []);
  return <div>{count}</div>;
};
```

## Return Statement

Always use explicit `return`, even for single-line components:

```tsx
const Icon: React.FC<{ icon: ReactNode }> = ({ icon }) => {
  return <span>{icon}</span>;
};
```

## Prefer Composition Over Boolean Props

Instead of boolean flags that change behavior, compose components:

```tsx
const SpecialComp = () => <Comp icon={IconX} text="special" />;
const NotSpecialComp = () => <Comp icon={IconY} text="not special" />;
```

## Named Exports Only

No default exports for components:

```tsx
export const ButtonComp: React.FC<ButtonProps> = ({ ... }) => { ... };
```
