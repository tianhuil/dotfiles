/**
 * Ambient type shim for js-yaml (node-fallback YAML parser).
 * The extension's node_modules lives in the stowed target dir (~/.pi/...),
 * not in the repo, so tsc cannot resolve the real package types from here.
 * Only the `load` function is used (see index.ts).
 */
declare module "js-yaml" {
  export function load(input: string): unknown;
}
