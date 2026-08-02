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

Known trap: the mobile baselines are captured at exactly 768px, where the site's `max-width: 768px` media query collides with Pure.css's `min-width: 48em` grid tier. Those baselines record that broken layout, so fixing the breakpoint (#18) will legitimately change them.

**After any image-pipeline change, delete `_site` first.** `@11ty/eleventy-img` skips regenerating images that already exist, so a plain rebuild leaves stale files and the suite passes misleadingly. This bit during the Eleventy 3 upgrade: two runs passed before `rm -rf _site` revealed a deterministic 834,337-pixel difference.

## Regenerate

```bash
rm -rf _site tests/screenshots-actual && npm run test:visual
```

Then copy actuals over baselines — **excluding the diff images**:

```bash
for f in tests/screenshots-actual/*.png; do
  case "$(basename "$f")" in diff-*) continue ;; esac
  cp "$f" tests/screenshots/
done
```

Do **not** use `cp tests/screenshots-actual/*.png tests/screenshots/`. It sweeps the `diff-*.png` files into the committed baseline directory; 8.5MB of them accumulated that way before it was caught.

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
npm run test:visual
```

If a page fails intermittently rather than consistently, do not reach for the
threshold. The suite is deterministic by design — it waits for every image to
report `complete` and blocks third-party scripts. Intermittent failure means
something remote is affecting that page; find it.

## Adding a page

Add one line to `testPages` in `tests/config.js`. The suite crosses it with
every viewport automatically. The first run fails with "No baseline" — that is
correct, generate and commit them.
