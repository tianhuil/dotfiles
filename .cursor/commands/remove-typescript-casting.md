# Remove Typescript Casting

Search for type casting in *.ts or *.tsx files (start with the below):

```bash
grep -rE '\w+ as \w+' --include='*.ts' --include='*.tsx' .
```

If you find any real type casts:

Research the types involved research library types as needed (use serena MCP if available).
Avoid typecasting in general by properly annotating function params and return values upstream.
Always avoid using `as any` and try to avoid `as unknown`.
