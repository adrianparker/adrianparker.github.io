# Site nav: design handoff

Give every desktop page the same left-hand navigation: the normal sidebar, with the collapse feature that only app pages have today. App pages stop using the separate app nav at desktop width. This is **Option C** from the nav exploration.

Desktop only. **Nothing changes below the 47.999em breakpoint**, on any page.

This folder is the whole brief:

| File | What it is |
|---|---|
| `README.md` | This spec. Where it and the design files disagree, this file wins. |
| `design/NavC-Post.dc.html` | A gig post with the new nav. Opens collapsed, dark theme. |
| `design/NavC-App.dc.html` | Gig History with the new nav. Opens expanded, light theme. |
| `design/canvas.json` | Artboard layout and the handoff note. |

The live design canvas is <https://claude.ai/artifact/GLu1eGeRx7xN9S77DoYMeg>. It is private, so ask Adrian to share it if you can't open it. It also holds options A and B, which were not chosen.

### About the `.dc.html` files

These come from a design tool. `{{ … }}`, `<sc-for>`, `<sc-if>`, `<x-dc>` and the `class Component extends DCLogic` script are that tool's syntax. **Don't copy them into the site.** Read them for layout, spacing and type sizes. Both artboards work in the tool's Play mode: the theme and collapse buttons work, and the nav links jump between the two pages.

The artboards' `t-dark` / `t-light` variables are the site's existing tokens. Use the tokens, not the hex values.

Content inside the artboards is filler: `[Recent post]`, `[Gig photo]` and `[The rest of the review]` are placeholders. The real sidebar lists come from the existing collections.

---

## Repo rules that apply

Read `CLAUDE.md` and `CLAUDE-code.md` first. In short:

- Work on a branch and open a PR. **Never push to `master`**, and never merge.
- All new JS in `lib/` needs unit tests, and coverage stays at 100% (`.c8rc.json`).
- There is one stylesheet, `static/index.css`.
- No `style="…"` attributes (they force `'unsafe-inline'` into the CSP). Inline `<script>` blocks are fine, `lib/csp-hash.mjs` hashes them.
- This change moves every desktop page, so **every desktop visual baseline will change**. Regenerate them in a separate commit, after Adrian has seen the diffs.

---

## What changes, in one paragraph

Today, content pages (`base-layout.njk`) use the sidebar: a 25% Pure.css column holding the mugshot, site name, theme toggle and `sidebar-nav.njk`. App pages (`app-layout.njk`) use `app-nav.njk` instead: four section links with Bebas letters, collapsible to a 60px rail. After this change, both layouts render the sidebar at desktop width. The sidebar becomes a fixed-width column instead of 25%, which closes the empty space between the nav and the content, and it gains a Collapse control. Collapsed, it shows a rail of section letters (A, P, G), like the app nav's rail.

---

## Layout (desktop, 48em and up)

### Expanded sidebar

A fixed-width column, **250px** in all:

| Part | Width |
|---|---|
| Inset from the window edge | 32px |
| Nav column (mugshot, lists, toggles) | 170px, the existing `--sidebar-nav-width` |
| Gap to the content | 48px |

- It replaces the `pure-u-md-1-4` / `pure-u-md-3-4` split on desktop. The content column takes the remaining width (`flex: 1 1 0; min-width: 0`).
- The content column's left padding goes to 0, because the 48px gap lives in the sidebar column. Right padding stays at 4% on content pages; app pages keep the app's own right padding (24px in the artboard).
- Vertical positions do not change: the sidebar keeps `margin-top: var(--content-top-offset)` (50px) and `.post`/`.posts` keep `margin-top: 60px`.
- The sidebar stays sticky, scrolls within `100vh`, and paints no background, as today.

Suggested new tokens, declared with the existing ones:

```css
--sidebar-inset: 32px;
--sidebar-gutter: 48px;
--sidebar-width: 250px;      /* inset + nav width + gutter */
--sidebar-rail-width: 92px;  /* 8px inset + 44px rail + 40px gutter */
```

### Contents, top to bottom

1. **Mugshot**, 170×158, linking home. Unchanged.
2. **Site name.** Keep it, as today. The artboard leaves it out; that was an oversight, not a decision.
3. **Nav lists** from `sidebar-nav.njk`: Apps, Posts, Gigs, Elsewhere. Unchanged in size, spacing and type. Nav items must not get any narrower than 170px.
4. **Foot row:** the theme toggle and a new **Collapse** button side by side, 8px apart, 24px below the last list item. Both are the existing theme-toggle button style: 44px tall, 1px `--color-rule` border, 4px radius, 0.9em text, hover turns text and border `--color-accent`.
   - Collapse reads "‹ Collapse", with the chevron `aria-hidden`.
   - Moving the theme toggle from under the site name to the foot is part of this design. See open question 1.

### Apps section

It already lists every app from `collections.app`, and marks the current one with `.pure-menu-selected` and `aria-current="page"`. On app pages this now does its job: the current app is marked exactly like the current post or gig (`--color-nav-current`, not a link).

Keep the "All apps..." link. The artboards drop it, but Posts and Gigs both end with an "All …" link, and the point of the change is for Apps to behave like them.

### Collapsed rail

**92px** in all: 8px inset, a 44px-wide column, then a 40px gap to the content. Top margin stays 50px. Centred in the 44px column, top to bottom:

1. **Mugshot** cropped to 34×34, `--radius-mugshot` (3px), `object-fit: cover`, linking home with `aria-label="{{ site.name }} - home"`. 20px below it:
2. **Section letters** A, P and G, linking to `/apps/`, `/posts/` and `/gigs/`.
   - Each is a 44×44 link, Bebas Neue at about 21px (1.3em), centred, in `--color-muted`. Hover: `--color-accent`.
   - Each has an `aria-label` naming the section ("Apps", "Posts", "Gigs").
   - The **current section** is `--color-accent` with a 2px `--color-accent` rule on its leading edge, the same marker as today's `.app-nav-link.is-current`. It keeps its link and gets `aria-current="true"` (it marks the section, not the page itself).
   - "Current section" uses the logic already in `app-nav.njk` (`isApps`, `isPosts`, `isGigs`). The home page and pages in none of the three mark none.
   - There is no H letter. The mugshot is the way home, as it is when expanded.
3. 24px below the letters, a column of two 44×44 icon-only buttons, 12px apart:
   - **Expand** ("›"), `aria-label="Expand navigation"`.
   - **Theme toggle**, label hidden, its `aria-label` already says "Switch to … theme".

The rail letters are placeholders, as in `app-nav.njk` today. Keep that file's note about swapping them for masked SVG icons later.

### Motion

The sidebar's width eases over 180ms, as the app nav does today. Nothing else animates.

---

## State and behaviour

- Reuse what exists. `head.njk` already reads `localStorage.appNav` and sets `<html data-app-nav="collapsed|expanded">` before paint. That now applies on every page, not just app pages, so a reader's choice follows them across the site. Keep the names, so preferences readers have already set carry over.
- Move the collapse click handler out of `app-nav.njk` into a partial both layouts include, or into the sidebar partial. Keep its `aria-expanded` and `aria-label` updates and the `app_nav_toggled` analytics event. Consider adding the layout (`post` or `app`) as an event property; ask before changing the event shape (see open questions).
- Collapsed hides the mugshot-and-lists view (the site name, `.custom-restricted-width` nav and the theme toggle's label) and shows the rail. Use CSS on `:root[data-app-nav="collapsed"]`, not JS-built markup.
- Without JavaScript: no Collapse button and no rail, as now (`html.js` gates both). The expanded sidebar is the no-JS experience.
- The collapsed state must not affect anything below 48em. The existing app-nav rule ("A desktop collapse must not follow the reader onto a phone") already does this for app pages; do the same for the sidebar.

## Mobile (below 47.999em): leave alone

- Content pages keep today's centred header and `mobile-nav.njk`.
- App pages keep today's 48px `.app-nav-bar` and push-down sheet. The simplest way is for `app-layout.njk` to render both: the sidebar (desktop only) and `app-nav.njk` (mobile only, hidden at 48em and up). Only one is ever displayed, so screen readers meet one nav.
- `tests/app-nav.test.mjs` (the sheet's keyboard behaviour) must keep passing unchanged.

## Clean-up

Once app pages use the sidebar on desktop, remove the desktop-only app nav rules that nothing uses any more: the `.app-nav` sticky column, the rail width and the `.app-nav-collapse` button among them. Remove `--app-nav-width`, `--app-rail-width`, `--app-gutter` and `--app-content-top` only if nothing else still reads them.

The app `<h1>` used to be aligned with the site name in the app nav (`--app-content-top`, `text-box` trim). With the sidebar there is no site name beside it, so the app header aligns with the post `<h1>` instead: the app column's top matches `.post` (60px in the artboard). Keep the `text-box` trim on the app h1 if it helps that line up.

Don't change anything else: post measure, app internals, the footer and the subscribe form stay as they are.

---

## Accessibility

- Every interactive element in the rail and the foot row is at least 44×44px.
- Icon-only buttons and rail letters have `aria-label`s. Chevrons and icons are `aria-hidden`.
- The Collapse/Expand button carries `aria-expanded` and `aria-controls` pointing at the sidebar.
- Focus is the site's 2px `--color-accent` outline, 2px offset, on every link and button.
- Known, unchanged: the current entry in dark theme is `--color-nav-current` #666 on #333, 2.2:1. This design does not fix it, and neither should the PR. It is now visible on app pages too, where the app nav used the accent colour.

## Tests to add or update

- **Smoke:** an app page (e.g. `/GigHistory/`) renders the sidebar with the Apps list, marks its own entry with `aria-current="page"`, includes the Collapse button and the rail letters, and still renders the mobile `.app-nav-bar`. Update the existing check at `tests/smoke.test.mjs` around line 373 that reads `.app-nav-bar a, .app-nav a`.
- **Collapse behaviour** (extend `tests/app-nav.test.mjs` or a new file on its own port): clicking Collapse sets `data-app-nav="collapsed"`, writes `localStorage.appNav`, survives a reload, and works the same on a post page and an app page. At 390px a stored "collapsed" changes nothing.
- **Theme:** the rail and the foot row are readable in both themes (extend `tests/theme.test.mjs`).
- **Analytics:** `app_nav_toggled` still fires, now from post pages too.
- **Visual regression:** every desktop baseline changes. 390px baselines should **not** change; if they do, that is a regression. Add a desktop baseline for one page collapsed. Regenerate in a separate commit, only after Adrian confirms (see the `update-baselines` skill).
- No new `lib/` code is expected. If logic moves there, it needs 100% unit coverage.

## Open questions for Adrian

1. The foot row sits below the Elsewhere list, about 1,000px down. On a short window it is off screen until the sidebar scrolls. Should the theme toggle and Collapse stay at the foot as designed, or sit under the site name, where the theme toggle is today?
2. Should the `app_nav_toggled` event gain a property saying which layout it came from, or keep its current shape?
