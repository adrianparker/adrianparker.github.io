#!/usr/bin/env bash
# Blocks any `git push` that would land on master/main.
#
# Enforces the working agreement in CLAUDE.md: Claude branches and opens a PR;
# Adrian merges. A push to master deploys straight to production, so this is a
# hook rather than a convention.
#
# Pushing a feature branch is allowed and expected.
#
# Wired up as a PreToolUse hook on Bash in .claude/settings.json.
# Exit 0 = allow, exit 2 = block (stderr is shown to Claude).

set -uo pipefail

payload=$(cat)

# Pull tool_input.command out of the hook payload. Node is always present here
# (this is a Node project) and avoids depending on python3 / Xcode CLT.
command=$(printf '%s' "$payload" | node -e '
  let s = "";
  process.stdin.on("data", d => s += d).on("end", () => {
    try { process.stdout.write(JSON.parse(s)?.tool_input?.command ?? ""); }
    catch { process.stdout.write(""); }
  });
' 2>/dev/null)

# Not a push? Nothing to do.
case "$command" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

# Case 1: master/main named explicitly.
# Catches `git push origin master`, `git push -f origin HEAD:main`, etc.
if printf '%s' "$command" | grep -Eq 'git push([^&|;]*)\b(master|main)\b'; then
  echo "BLOCKED: that command pushes to master/main." >&2
  echo "Push a feature branch and open a PR instead — see the working agreement in CLAUDE.md." >&2
  exit 2
fi

# Case 2: a bare `git push` while sitting on master/main.
branch=$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [ "$branch" = "master" ] || [ "$branch" = "main" ]; then
  echo "BLOCKED: current branch is '$branch', so this push would land on it." >&2
  echo "Create a feature branch and open a PR instead — see the working agreement in CLAUDE.md." >&2
  exit 2
fi

exit 0
