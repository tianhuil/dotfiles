# Typescript Guidelines

## Core Principal

We prefer to use strong typing and functional programming but sometimes unit testing is necessary.  This is particularly true if

- **Deep Conditional Logic:** if statements aren’t type checked and nested if statements usually require unit testing.
- **Untypable logic**: sometimes things aren’t typable (even though there’s basically an underlying type system).  For example, you might have a class that returns measurements in feet or meters.  These are both typed as number but you cannot add measurements in feet and meters (and even multiplying them highly suspicious).

## Prefer Dependency Injection

```ts
// ✅  Correct
const in20thCentury = (today = new Date()) => {
  const year = today.getFullYear()
  return year >= 1900 || year < 2000
}

// in code
in20thCentury()

// in test
in20thCentury(mockDate)

// ❌  Incorrect
const in20thCentury = () => {
  const date = new Date()
  const year = date.getFullYear()
  return year >= 1900 || year < 2000
}
```

## Use `bun` testing over `jest`

- Built in typescript and environment variable support