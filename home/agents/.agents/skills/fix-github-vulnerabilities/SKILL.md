---
name: fix-github-vulnerabilities
description: Find and fix repository vulnerabilities using GitHub Dependabot alerts. Detects dependency manager, fetches open alerts, updates vulnerable packages, and commits/pushes fixes. Use when the user asks to fix vulnerabilities, patch security issues, or address Dependabot alerts.
---

# Fix Repository Vulnerabilities

Scan for open Dependabot alerts, update vulnerable dependencies using the repo's native package manager, and push fixes.

## Step 1: Fetch Open Vulnerabilities

```bash
gh api repos/{owner}/{repo}/dependabot/alerts --jq '.[] | select(.state == "open") | {number, severity: .security_advisory.severity, ecosystem: .security_vulnerability.package.ecosystem, package: .security_vulnerability.package.name, vulnerable_range: .security_vulnerability.vulnerable_version_range, patched_version: .security_vulnerability.first_patched_version.identifier, summary: .security_advisory.summary, cve: (.security_advisory.cve_id // "N/A")}'
```

If the result is empty, report that there are no open vulnerabilities and stop.

Parse the output and group alerts by ecosystem. Present a summary to the user listing:
- Package name
- Ecosystem
- Severity
- Vulnerable version range
- Patched version
- CVE

## Step 2: Update Vulnerable Dependencies

Detect the repo's dependency manager and update each vulnerable package to at least the patched version.

### Rules:
- Update ALL vulnerable packages found in Step 1
- Target version must be at least `first_patched_version.identifier`
- Run the project's test suite (if detectable) to verify the updates don't break anything
- If tests fail, report which package(s) caused failures and ask the user how to proceed

## Step 3: Commit and Push

After all updates are applied and verified:

```bash
git add -A && git commit -m "fix: update vulnerable dependencies" -m "$(gh api repos/{owner}/{repo}/dependabot/alerts --jq '[.[] | select(.state == "open") | "- \(.security_vulnerability.package.name)@\(.security_vulnerability.first_patched_version.identifier) (\(.security_advisory.severity)) — \(.security_advisory.cve_id // .security_advisory.ghsa_id)"] | join("\n")')" && git push
```

If there is nothing to commit (no changes), report that and stop.

If the push fails (e.g., branch protection), inform the user and suggest creating a pull request instead:

```bash
git checkout -b fix/vulnerabilities/$(date +%Y-%m-%d) && git push -u origin fix/vulnerabilities/$(date +%Y-%m-%d) && gh pr create --title "fix: update vulnerable dependencies" --body "$(gh api repos/{owner}/{repo}/dependabot/alerts --jq '[.[] | select(.state == "open") | "- **\(.security_vulnerability.package.name)** `\(.security_vulnerability.first_patched_version.identifier)` (\(.security_advisory.severity)) — \(.security_advisory.cve_id // .security_advisory.ghsa_id)"] | join("\n")')"
```
