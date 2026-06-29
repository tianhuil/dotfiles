import { test, expect, describe } from "bun:test";
import { slugify, inferBranchPrefix, buildBranchName } from "./branch";

// ──────────────────────────────────────────────────
// slugify
// ──────────────────────────────────────────────────

describe("slugify", () => {
  test("normal text becomes hyphenated lowercase", () => {
    expect(slugify("Add user authentication")).toBe("add-user-authentication");
  });

  test("leading and trailing special chars are stripped", () => {
    expect(slugify("---fix-login---")).toBe("fix-login");
  });

  test("multiple special chars collapse into single hyphen", () => {
    expect(slugify("fix  login   bug")).toBe("fix-login-bug");
  });

  test("whitespace and punctuation become hyphens", () => {
    expect(slugify("fix.login.bug")).toBe("fix-login-bug");
    expect(slugify("fix_login_bug")).toBe("fix-login-bug");
  });

  test("default max truncation at 50 characters", () => {
    const long =
      "this is an extremely long branch name that should definitely be truncated at fifty characters";
    const result = slugify(long);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result).toBe(
      "this-is-an-extremely-long-branch-name-that-should-",
    );
  });

  test("custom max parameter is respected", () => {
    expect(slugify("add user authentication to the login page", 20)).toBe(
      "add-user-authenticat",
    );
  });

  test("empty string returns untitled", () => {
    expect(slugify("")).toBe("untitled");
  });

  test("string with only special chars returns untitled", () => {
    expect(slugify("   ---   ")).toBe("untitled");
  });

  test("unicode and special chars are stripped", () => {
    expect(slugify("fix 🚀 login bug")).toBe("fix-login-bug");
    expect(slugify("café au lait")).toBe("caf-au-lait");
  });
});

// ──────────────────────────────────────────────────
// inferBranchPrefix
// ──────────────────────────────────────────────────

describe("inferBranchPrefix", () => {
  test("fix keyword returns fix prefix", () => {
    expect(inferBranchPrefix("fix login crash")).toBe("fix");
  });

  test("bug keyword returns fix prefix", () => {
    expect(inferBranchPrefix("bug in checkout")).toBe("fix");
  });

  test("chore keyword returns chore prefix", () => {
    expect(inferBranchPrefix("chore upgrade deps")).toBe("chore");
  });

  test("refactor keyword returns refactor prefix", () => {
    expect(inferBranchPrefix("refactor auth module")).toBe("refactor");
  });

  test("docs keyword returns docs prefix", () => {
    expect(inferBranchPrefix("doc readme updates")).toBe("docs");
  });

  test("test keyword returns test prefix", () => {
    expect(inferBranchPrefix("test payment flow")).toBe("test");
  });

  test("perf keyword returns perf prefix", () => {
    expect(inferBranchPrefix("perf optimize queries")).toBe("perf");
  });

  test("ci keyword returns ci prefix", () => {
    expect(inferBranchPrefix("ci add lint step")).toBe("ci");
  });

  test("style keyword returns style prefix", () => {
    expect(inferBranchPrefix("format codebase")).toBe("style");
  });

  test("build keyword returns build prefix", () => {
    expect(inferBranchPrefix("build esm bundle")).toBe("build");
  });

  test("design keyword returns design prefix", () => {
    expect(inferBranchPrefix("design new ui")).toBe("design");
  });

  test("research keyword returns research prefix", () => {
    expect(inferBranchPrefix("research migration options")).toBe("research");
  });

  test("no matching keyword returns feat", () => {
    expect(inferBranchPrefix("add user login")).toBe("feat");
  });

  test("empty string returns feat", () => {
    expect(inferBranchPrefix("")).toBe("feat");
  });

  test("case insensitive matching", () => {
    expect(inferBranchPrefix("FIX login crash")).toBe("fix");
    expect(inferBranchPrefix("REFACTOR Auth Module")).toBe("refactor");
    expect(inferBranchPrefix("CI Pipeline")).toBe("ci");
  });
});

// ──────────────────────────────────────────────────
// buildBranchName
// ──────────────────────────────────────────────────

describe("buildBranchName", () => {
  test("full flow with simple task", () => {
    expect(buildBranchName("Add user authentication")).toBe(
      "feat/add-user-authentication",
    );
  });
  test("uses inferred prefix from task content", () => {
    expect(buildBranchName("fix login crash")).toBe(
      "fix/fix-login-crash",
    );
  });

  test("multi-sentence task uses first sentence only", () => {
    expect(buildBranchName("Add user auth.\nImplement tests")).toBe(
      "feat/add-user-auth",
    );
  });

  test("empty task returns feat/untitled", () => {
    expect(buildBranchName("")).toBe("feat/untitled");
  });

  test("first sentence with trailing period is stripped", () => {
    expect(buildBranchName("Add user auth. Also write tests.")).toBe(
      "feat/add-user-auth",
    );
  });
  test("newline split takes first line before period", () => {
    expect(buildBranchName("fix login\nThen do other stuff")).toBe(
      "fix/fix-login",
    );
  });
});
