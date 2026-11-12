---
name: tailwind-design-layers
description: Use when writing or reviewing Tailwind CSS, shadcn/ui, or cva styling. Classify each styling decision as a semantic token, component variant, or call-site utility; choose the smallest layer that fits and flag abstraction smells.
license: MIT
metadata:
  audience: developers
  workflow: styling-and-code-review
---

# Tailwind Design Layers

Sort every styling decision into one of three layers. Keep atoms as Tailwind utilities; group repeated choices in components, not new CSS classes or `@apply` rules.

| Layer | Meaning | Location | Name it by |
|---|---|---|---|
| **Token** — a shared brand or system value | Themeable value | `@theme` or CSS variables | Semantic role, such as `--primary` or `--radius` |
| **Variant** — a named repeated choice that flips multiple utilities | Component option or state | `cva` or `tailwind-variants` beside the component | The question it answers, such as `intent`, `size`, or `active` |
| **Utility** — one local CSS property | One-off styling | Call-site Tailwind class | The property, such as `p-4` or `w-full` |

## Choose the layer

Apply these tests in order:

1. If a rebrand or dark mode could change the value, use a semantic **Token**.
2. If component users choose among options and multiple properties change together, use a **Variant** axis.
3. If the rule is true only at this call site, use a **Utility** at the call site.

Default to call-site utilities. Promote only after repetition proves it:

- A utility cluster repeated three times belongs in component base classes.
- Consistent differences between copies belong in a named variant axis.
- The same arbitrary value used twice belongs in a token.

## Variant rules

- Use one axis per independent question: `intent`, `size`, `disabled`, or `active`.
- Model boolean states as boolean variants.
- Use `compoundVariants` for combinations; do not create an axis for one combination.
- Merge axes that always change together.
- Reference semantic tokens, never raw colors.
- Compose with `cn()` so caller classes win:

```ts
cn(button({ intent, size, active }), className)
```

Use `tailwind-variants` when a component has multiple slots or needs to extend a shared base. Otherwise prefer `cva`.

## Sharing across repositories

- Share tokens through one imported theme file containing `@theme` and shadcn CSS variables; apps override variables to reskin.
- Share variants through a package or monorepo workspace.
- Make Tailwind scan the package (`@source` in v4, `content` in v3).
- Decide whether shadcn components remain app-local copies or move into the shared package, and document that choice.

## Review smells

- A page or feature name as a variant value means the styling belongs at the call site.
- A component name in a token name means the value should be a semantic token.
- Repeated arbitrary values or hex codes indicate a missing token.
- New `.btn-*` classes or heavy `@apply` rules indicate logic that belongs in component variants.
- A variant value for every one-off is variant explosion; move one-offs back to `className`.

For a danger button, the red role is the `--destructive` token, `bg-destructive text-destructive-foreground` is the `danger` intent variant, and `mt-6 w-full` on one delete dialog is a call-site utility.
