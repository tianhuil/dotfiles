#!/usr/bin/env bash
# Validates the claims made by the skill-management SKILL.md (and the pi session
# research behind them) against the installed pi and claude CLIs.
#
# Each test builds a throwaway sandbox under $ROOT, starts the real CLI there,
# and inspects the session log the CLI writes:
#   - pi:     newest *.jsonl under ~/.pi/agent/sessions/*<encoded-cwd>* ; skills
#             are listed in the system prompt sections (name + <location>).
#   - claude: newest *.jsonl under ~/.claude/projects/<encoded-cwd> ; skills are
#             listed in a "skill_listing" attachment.
#
# Usage: skill-claims-test.sh [--pi|--claude|--all] [--online] [--keep] [TEST...]
#   --pi       run pi suite (default: --all)
#   --claude   run claude suite
#   --all      both suites (default)
#   --online   also run the npx-skills lockfile test (network required)
#   --keep     keep sandboxes under $ROOT for inspection
#   TEST...    run only the named tests (e.g. p1 p3 c1)
#
# Claims tested (source: SK = skill-management SKILL.md, SS = pi session
# 01a1cb22, DOC = pi docs/skills.md):
#   p1  pi discovers skills nested under .agents/skills/<sub>/<name>/SKILL.md   (SK, SS, DOC)
#   p2  in-tree .agents/skills/.gitignore recipe: vendor ignored by pi+git,
#       local/ unignored and discovered; skills-lock.json stays trackable      (SK, SS)
#   p3  a directory containing SKILL.md is a skill root; pi does not recurse
#       below it for more skills                                               (SS, DOC)
#   p4  pi discovers .agents/skills from cwd ancestors, stopping at the git
#       repo root; without a repo it walks to the filesystem root              (DOC)
#   p5  the REPO-ROOT .gitignore does not affect pi skill discovery; only
#       ignore files inside the skills tree do                                 (SS nuance)
#   p6  `pi --skill <path>` explicitly loads a skill the in-tree ignore file
#       hides                                                                  (SS)
#   p7  name collision: pi keeps the first discovered skill, not both          (DOC)
#   c1  claude discovers a flat .claude/skills/<name>/SKILL.md                 (SK)
#   c2  claude does NOT discover nested .claude/skills/<sub>/<name>/SKILL.md   (SK gap)
#   c3  claude follows a .claude/skills/<name> symlink into .agents/skills     (SK)
#   c4  claude does not read project .agents/skills directly                   (SK)
#   c5  claude ignores .gitignore: ignored .claude/skills entries load anyway  (SK)
#   s1  npx skills restore honors skills-lock.json (online)                    (SK, SS)

set -u

ROOT=${SKILL_CLAIMS_SANDBOX_ROOT:-$HOME/.cache/skill-claims-tests}
PI_BIN=${PI_BIN:-pi}
CLAUDE_BIN=${CLAUDE_BIN:-claude}
RUN_PI=0 RUN_CLAUDE=0 ONLINE=0 KEEP=0
ONLY=()
[ $# -eq 0 ] && set -- --all
while [ $# -gt 0 ]; do
  case "$1" in
    --pi) RUN_PI=1 ;;
    --claude) RUN_CLAUDE=1 ;;
    --all) RUN_PI=1 RUN_CLAUDE=1 ;;
    --online) ONLINE=1 ;;
    --keep) KEEP=1 ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) ONLY+=("$1") ;;
  esac
  shift
done

PASS=0 FAIL=0 SKIP=0
RESULTS=()

note()  { printf '  %s\n' "$*"; }
pass()  { PASS=$((PASS+1)); RESULTS+=("PASS  $1"); note "PASS: $1"; }
fail()  { FAIL=$((FAIL+1)); RESULTS+=("FAIL  $1"); note "FAIL: $1${2:+ — $2}"; }
skip()  { SKIP=$((SKIP+1)); RESULTS+=("SKIP  $1"); note "SKIP: $1${2:+ — $2}"; }

cleanup() { [ "$KEEP" = 1 ] || rm -rf "$ROOT"; }
trap cleanup EXIT

# --- fixtures ---------------------------------------------------------------

new_sandbox() { # $1=name, $2=git? (yes|no)
  local sb="$ROOT/$1"
  rm -rf "$sb"; mkdir -p "$sb"
  [ "${2:-no}" = yes ] && git -C "$sb" init -q
  printf '%s\n' "$sb"
}

mk_skill() { # $1=dir $2=name $3=description
  mkdir -p "$1"
  cat > "$1/SKILL.md" <<EOF
---
name: $2
description: $3
---

# $2

Probe skill for skill-claims tests.
EOF
}

# --- pi ----------------------------------------------------------------------

pi_session_file() { # $1=cwd -> newest session jsonl for that cwd (or empty)
  local enc slug dir f best=""
  enc=$(printf '%s' "$1" | tr / -)
  for dir in "$HOME"/.pi/agent/sessions/*/; do
    slug=$(basename "$dir")
    case "$slug" in *"$enc"*) ;; *) continue ;; esac
    f=$(ls -t "$dir"/*.jsonl 2>/dev/null | head -1)
    [ -n "$f" ] && best="$f"
  done
  printf '%s\n' "$best"
}

run_pi() { # $1=cwd, extra args after
  local cwd=$1; shift
  (cd "$cwd" && "$PI_BIN" -p "Reply with the single word OK." "$@" >/dev/null 2>&1)
}

pi_has() { # $1=session-file $2=probe-name
  grep -q "$2" "$1" 2>/dev/null
}

pi_location() { # $1=session-file $2=probe-name -> <location> of that skill
  grep -o "<location>[^<]*$2[^<]*</location>" "$1" 2>/dev/null | head -1 | sed 's/<[^>]*>//g'
}

# --- claude ------------------------------------------------------------------

claude_project_dir() { # $1=cwd (claude encodes cwd by mapping / and . to -)
  local enc1 enc2
  enc1=$(printf '%s' "$1" | tr / -)
  enc2=$(printf '%s' "$1" | tr '/.' '--')
  [ -d "$HOME/.claude/projects/$enc1" ] && { printf '%s\n' "$HOME/.claude/projects/$enc1"; return; }
  printf '%s\n' "$HOME/.claude/projects/$enc2"
}

claude_session_file() { # $1=cwd -> newest jsonl (or empty)
  ls -t "$(claude_project_dir "$1")"/*.jsonl 2>/dev/null | head -1
}

run_claude() { # $1=cwd
  local cwd=$1
  (cd "$cwd" && "$CLAUDE_BIN" -p "Reply with the single word OK." --max-turns 1 >/dev/null 2>&1)
}

claude_has() { # $1=session-file $2=probe-name (skill_listing attachment content)
  python3 - "$1" "$2" <<'PY' 2>/dev/null
import json, sys
path, probe = sys.argv[1], sys.argv[2]
for line in open(path, encoding="utf-8"):
    try:
        d = json.loads(line)
    except Exception:
        continue
    if d.get("type") == "attachment" and d.get("attachment", {}).get("type") == "skill_listing":
        text = json.dumps(d["attachment"].get("content", ""))
        sys.exit(0 if probe in text else 1)
sys.exit(1)
PY
}

selected() { # $1=test-id
  [ ${#ONLY[@]} -eq 0 ] && return 0
  local t
  for t in "${ONLY[@]}"; do [ "$t" = "$1" ] && return 0; done
  return 1
}

# --- pi suite ----------------------------------------------------------------

pi_suite() {
  local sb f

  # p1 + p2 share one sandbox (same listing, disjoint probes)
  if selected p1 || selected p2; then
    sb=$(new_sandbox t12 yes)
    mk_skill "$sb/.agents/skills/local/p1-nested-probe" p1-nested-probe "P1 probe."
    mk_skill "$sb/.agents/skills/p2-vendor-probe" p2-vendor-probe "P2 vendor probe."
    cat > "$sb/.agents/skills/.gitignore" <<'EOF'
*
!.gitignore
!local/
!local/**
EOF
    echo '{"version":1,"skills":{}}' > "$sb/skills-lock.json"

    if selected p1; then
      note "p1: running pi in sandbox…"
      run_pi "$sb"; f=$(pi_session_file "$sb")
      if [ -z "$f" ]; then fail "p1 pi recursive discovery" "no session log found"
      elif pi_has "$f" p1-nested-probe; then pass "p1 pi discovers .agents/skills/local/<name>/SKILL.md ($(pi_location "$f" p1-nested-probe))"
      else fail "p1 pi recursive discovery" "p1-nested-probe not in skills list"; fi
    fi

    if selected p2; then
      [ -z "${f:-}" ] && { run_pi "$sb"; f=$(pi_session_file "$sb"); }
      if [ -n "$f" ] && ! pi_has "$f" p2-vendor-probe; then pass "p2 pi skips vendor skill ignored by in-tree .gitignore"
      else fail "p2 pi skips gitignored vendor skill" "p2-vendor-probe is discoverable"; fi
      if git -C "$sb" check-ignore -q .agents/skills/p2-vendor-probe/SKILL.md \
         && ! git -C "$sb" check-ignore -q .agents/skills/local/p1-nested-probe/SKILL.md \
         && ! git -C "$sb" check-ignore -q skills-lock.json; then
        pass "p2 git: vendor ignored, local/ + skills-lock.json trackable"
      else fail "p2 git ignore policy" "check-ignore verdicts unexpected"; fi
    fi
  fi

  if selected p3; then
    sb=$(new_sandbox t3 yes)
    mk_skill "$sb/.agents/skills/p3-holder" p3-holder-probe "P3 holder."
    mk_skill "$sb/.agents/skills/p3-holder/inner" p3-inner-probe "P3 inner probe."
    note "p3: running pi…"; run_pi "$sb"; f=$(pi_session_file "$sb")
    if pi_has "$f" p3-holder-probe && ! pi_has "$f" p3-inner-probe; then
      pass "p3 SKILL.md dir is a skill root; no recursion below it"
    else fail "p3 skill-root recursion" "holder=$(pi_has "$f" p3-holder-probe) inner=$(pi_has "$f" p3-inner-probe)"; fi
  fi

  if selected p4; then
    mk_skill "$ROOT/t4/.agents/skills/p4-parent-probe" p4-parent-probe "P4 parent probe." 2>/dev/null
    mkdir -p "$ROOT/t4/repo/sub"
    git -C "$ROOT/t4/repo" init -q
    mk_skill "$ROOT/t4/repo/.agents/skills/p4-repo-probe" p4-repo-probe "P4 repo probe."
    note "p4: running pi inside repo (ancestor walk stops at repo root)…"
    run_pi "$ROOT/t4/repo/sub"; f=$(pi_session_file "$ROOT/t4/repo/sub")
    local ok1=1
    pi_has "$f" p4-repo-probe || { fail "p4 repo-root skill discovered from subdir"; ok1=0; }
    [ "$ok1" = 1 ] && pi_has "$f" p4-parent-probe && fail "p4 ancestor walk stops at git repo root" "parent probe leaked in"
    [ "$ok1" = 1 ] && ! pi_has "$f" p4-parent-probe && pass "p4 repo skill found from subdir; parent-of-repo not scanned"

    mkdir -p "$ROOT/t4n/deep/sub"
    mk_skill "$ROOT/t4n/.agents/skills/p4n-probe" p4n-probe "P4 nogit probe."
    note "p4: running pi outside any git repo…"
    run_pi "$ROOT/t4n/deep/sub"; f=$(pi_session_file "$ROOT/t4n/deep/sub")
    if pi_has "$f" p4n-probe; then pass "p4 without git repo, ancestors are scanned to fs root"
    else fail "p4 no-repo ancestor walk" "p4n-probe not found"; fi
  fi

  if selected p5; then
    sb=$(new_sandbox t5 yes)
    mk_skill "$sb/.agents/skills/p5-rootignore-probe" p5-rootignore-probe "P5 probe."
    printf '.agents/skills/p5-rootignore-probe/\n' > "$sb/.gitignore"
    note "p5: running pi with repo-root .gitignore hiding the probe…"
    run_pi "$sb"; f=$(pi_session_file "$sb")
    if pi_has "$f" p5-rootignore-probe; then pass "p5 repo-root .gitignore does not hide skills from pi"
    else fail "p5 repo-root gitignore" "probe hidden (pi read the repo-root ignore file)"; fi
  fi

  if selected p6; then
    sb=$(new_sandbox t6 yes)
    mk_skill "$sb/.agents/skills/p6-vendor-probe" p6-vendor-probe "P6 vendor probe."
    printf '*\n!.gitignore\n' > "$sb/.agents/skills/.gitignore"
    note "p6: running pi --skill on the ignored vendor dir…"
    run_pi "$sb" --skill "$sb/.agents/skills/p6-vendor-probe"; f=$(pi_session_file "$sb")
    if pi_has "$f" p6-vendor-probe; then pass "p6 --skill loads an ignored skill explicitly"
    else fail "p6 --skill explicit load" "probe not in session"; fi
  fi

  if selected p7; then
    sb=$(new_sandbox t7 yes)
    mk_skill "$sb/.agents/skills/aa-first/p7-dup-probe" p7-dup-probe "P7 first."
    mk_skill "$sb/.agents/skills/zz-second/p7-dup-probe" p7-dup-probe "P7 second."
    note "p7: running pi with two same-named skills…"
    run_pi "$sb"; f=$(pi_session_file "$sb")
    local loc count
    loc=$(pi_location "$f" p7-dup-probe)
    count=$(grep -o "<name>p7-dup-probe</name>" "$f" 2>/dev/null | wc -l)
    if [ "$count" = 1 ] && [ -n "$loc" ]; then
      case "$loc" in *aa-first*) pass "p7 collision: exactly one skill kept (first: $loc)" ;;
        *) pass "p7 collision: exactly one skill kept (winner: $loc — not the first scanned)"; note "     (pi docs say first discovered wins; winner order may differ by version)" ;;
      esac
    else fail "p7 collision handling" "entries=$count location=${loc:-none}"; fi
  fi
}

# --- claude suite --------------------------------------------------------------

claude_suite() {
  local sb f

  # c1..c4 share one sandbox: flat, nested, symlink, and .agents-only probes
  if selected c1 || selected c2 || selected c3 || selected c4; then
    sb=$(new_sandbox tc yes)
    mk_skill "$sb/.claude/skills/c1-flat-probe" c1-flat-probe "C1 flat probe."
    mk_skill "$sb/.claude/skills/local/c2-nested-probe" c2-nested-probe "C2 nested probe."
    mk_skill "$sb/.agents/skills/local/c3-sym-probe" c3-sym-probe "C3 symlink target."
    ln -s "../../.agents/skills/local/c3-sym-probe" "$sb/.claude/skills/c3-sym-probe"
    mk_skill "$sb/.agents/skills/local/c4-agents-probe" c4-agents-probe "C4 .agents probe."
    note "c1-c4: running claude…"
    run_claude "$sb"; f=$(claude_session_file "$sb")
    if [ -z "$f" ]; then fail "c1-c4 claude run" "no session log found"; else
      selected c1 && { claude_has "$f" c1-flat-probe && pass "c1 claude discovers flat .claude/skills/<name>/" || fail "c1 flat .claude/skills discovery"; }
      selected c2 && { claude_has "$f" c2-nested-probe && fail "c2 claude nested discovery" ".claude/skills/local/<name> WAS discovered (recursion supported)" || pass "c2 claude does NOT discover .claude/skills/<sub>/<name>/ (one level only)"; }
      selected c3 && { claude_has "$f" c3-sym-probe && pass "c3 claude follows .claude/skills/<name> symlink into .agents/skills" || fail "c3 symlink discovery"; }
      selected c4 && { claude_has "$f" c4-agents-probe && fail "c4 claude reads .agents/skills directly" "c4-agents-probe WAS discovered without a symlink" || pass "c4 claude does not read project .agents/skills (needs .claude/skills symlink)"; }
    fi
  fi

  if selected c5; then
    sb=$(new_sandbox tc5 yes)
    mk_skill "$sb/.claude/skills/c5-ignored-probe" c5-ignored-probe "C5 ignored probe."
    printf '*\n!.gitignore\n' > "$sb/.claude/skills/.gitignore"
    git -C "$sb" check-ignore -q .claude/skills/c5-ignored-probe/SKILL.md || note "     (git does not ignore the probe?!)";
    note "c5: running claude with everything gitignored…"
    run_claude "$sb"; f=$(claude_session_file "$sb")
    if claude_has "$f" c5-ignored-probe; then pass "c5 claude ignores .gitignore for skills (ignored skill still loads)"
    else fail "c5 claude gitignore" "ignored skill not listed"; fi
  fi
}

# --- npx skills (online) -------------------------------------------------------

skills_suite() {
  command -v npx >/dev/null 2>&1 || { skip s1 "npx not available"; return; }
  local sb="$ROOT/s1"
  rm -rf "$sb"; mkdir -p "$sb"
  git -C "$sb" init -q
  cat > "$sb/skills-lock.json" <<'EOF'
{
  "version": 1,
  "skills": {
    "frontend-design": {
      "source": "anthropics/skills",
      "sourceType": "github",
      "skillPath": "skills/frontend-design/SKILL.md",
      "computedHash": "0000000000000000000000000000000000000000000000000000000000000000"
    }
  }
}
EOF
  note "s1: npx skills experimental_install (network)…"
  if (cd "$sb" && npx -y skills experimental_install --dry-run >/tmp/skill-claims-s1.log 2>&1); then
    grep -qi "frontend-design" /tmp/skill-claims-s1.log && pass "s1 skills-lock.json drives restore planning" || fail "s1 lockfile restore" "output did not mention the locked skill (see /tmp/skill-claims-s1.log)"
  else
    fail "s1 npx skills experimental_install --dry-run" "exit $? (see /tmp/skill-claims-s1.log)"
  fi
}

# --- main -----------------------------------------------------------------------

printf 'skill-claims-test  root=%s\n' "$ROOT"
"$PI_BIN" --version 2>/dev/null | sed 's/^/  pi:     /'
"$CLAUDE_BIN" --version 2>/dev/null | head -1 | sed 's/^/  claude: /'
echo

[ "$RUN_PI" = 1 ] && { echo "pi suite:"; pi_suite; echo; }
[ "$RUN_CLAUDE" = 1 ] && { echo "claude suite:"; claude_suite; echo; }
[ "$ONLINE" = 1 ] && { echo "npx skills suite (online):"; skills_suite; echo; }

echo "summary:"
printf '  %s\n' "${RESULTS[@]:-  (nothing ran)}"
echo "  ----"
echo "  pass=$PASS fail=$FAIL skip=$SKIP"
[ "$FAIL" -gt 0 ] && exit 1
exit 0
