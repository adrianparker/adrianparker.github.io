---
name: update-baselines
description: Regenerate the visual regression baseline screenshots for adrianparker.com after a deliberate design change. Use when visual regression tests fail because of an intentional CSS or layout change, or when Adrian asks to update/refresh the baselines.
---

# Update visual baselines

Baselines live in `tests/screenshots/` and are committed. Actuals land in `tests/screenshots-actual/` and are gitignored.

## Before you regenerate — stop and check

**A failing visual test is not automatically a stale baseline.** Decide which of these you're looking at:

- **Deliberate design change** (you edited CSS or layout markup) → regenerating is correct.
- **Change that should have been invisible** (dependency upgrade, template refactor, config change) → this is a **regression**. Investigate it. Do not regenerate.

Look at the diff image in `tests/screenshots-actual/diff-*.png` and confirm the change is what you intended, over the whole page — not just in the area you were working on.

Known trap: `tests/screenshots/home-page-mobile.png` is captured at exactly 768px, where the site's `max-width: 768px` media query collides with Pure.css's `min-width: 48em` grid tier. The current baseline captures that broken layout, so fixing the breakpoint will legitimately change it.

## Regenerate

```bash
npm run build
npx mocha tests/visual-regression.test.js --timeout 60000
```

Then copy actuals over baselines — **excluding the diff images**:

```bash
for f in tests/screenshots-actual/*.png; do
  case "$(basename "$f")" in diff-*) continue ;; esac
  cp "$f" tests/screenshots/
done
```

Do **not** use `cp tests/screenshots-actual/*.png tests/screenshots/`. That is what `TESTING.md` currently says and it is wrong — it sweeps the `diff-*.png` files into the committed baseline directory. Several megabytes of them are already in there from previous refreshes.

## Confirm and commit

```bash
git status --short tests/screenshots/
```

Every changed file should be a baseline you expected to change, and **no `diff-*.png` should appear**. If one does, delete it.

Commit the baselines **separately from the change that caused them**:

```bash
git add tests/screenshots/
git commit -m "Update visual baselines for <what changed>"
```

Two commits — the change, then the baselines — keeps the PR reviewable. A single commit mixing a CSS edit with eight binary PNGs hides the actual change.

## Re-run to confirm green

```bash
npx mocha tests/visual-regression.test.js --timeout 60000
```
