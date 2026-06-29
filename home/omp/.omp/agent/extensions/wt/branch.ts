// ---------------------------------------------------------------------------
// Branch name utilities — pure functions
// ---------------------------------------------------------------------------

interface BranchRule {
  pattern: RegExp;
  prefix: string;
}

const BRANCH_PREFIXES: BranchRule[] = [
  { pattern: /\b(fix|bug|crash|error|regression)\b/, prefix: "fix" },
  { pattern: /\b(chore|maintenance|dep|upgrade|tooling)\b/, prefix: "chore" },
  {
    pattern: /\b(refactor|restructure|rewrite|cleanup)\b/,
    prefix: "refactor",
  },
  { pattern: /\b(doc|readme|comment|documentation)\b/, prefix: "docs" },
  { pattern: /\b(test|spec|coverage)\b/, prefix: "test" },
  { pattern: /\b(perf|performance|speed|optimize)\b/, prefix: "perf" },
  { pattern: /\b(ci|cd|pipeline|workflow|action)\b/, prefix: "ci" },
  { pattern: /\b(format|lint|prettier)\b/, prefix: "style" },
  { pattern: /\b(build|bundler|compile)\b/, prefix: "build" },
  { pattern: /\b(design|prototype|spike)\b/, prefix: "design" },
  { pattern: /\b(research|investigate|explore|poc)\b/, prefix: "research" },
];

export function slugify(text: string, max = 50): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max) || "untitled"
  );
}

export function inferBranchPrefix(task: string): string {
  const lower = task.toLowerCase();
  for (const { pattern, prefix } of BRANCH_PREFIXES) {
    if (pattern.test(lower)) return prefix;
  }
  return "feat";
}

export function buildBranchName(task: string): string {
  const prefix = inferBranchPrefix(task);
  // Derive slug from first sentence
  const firstLine = task.split(/[.\n]/)[0] || task;
  return `${prefix}/${slugify(firstLine)}`;
}
