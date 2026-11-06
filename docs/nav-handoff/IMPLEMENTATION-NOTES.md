# Site nav, Option C: where the build differs from the handoff

This file lists every place where the implementation on branch `nav/option-c` differs from `README.md` and the artboards, and why. Anything not listed was built as specified.

## Open questions, answered by Adrian

### 1. Theme toggle and Collapse sit under the site name, not in a foot row

The spec put the two buttons 24px below the Elsewhere list, about 1,000px down. On a laptop-height window they would be off screen until the sidebar scrolled. They now sit side by side where the theme toggle was before, under the site name:

```
[mugshot 170×158]
ADRIANPARKER.COM
[ ☀ Light ] [ ‹ Collapse ]
APPS …
```

The spacing is unchanged from the old theme toggle: 2.1em above, 0.4em below.

The collapsed rail keeps the designed order: mugshot, A/P/G, Expand, theme.

### 2. `app_nav_toggled` gained a `layout` property

The event now sends `{ to: 'collapsed' | 'expanded', layout: 'post' | 'app' }`. The change is additive, so existing insights on `to` keep working.

## Variations found during the build

### 3. Rail letters use `--color-subtle`, not `--color-muted`

In dark theme, `--color-muted` is #666 on #262626. That is 2.6:1, under the 3:1 minimum for a control. `--color-subtle` is #a3a3a3 in dark theme, about 7:1. In light theme both tokens are #55606b, so light theme is unchanged. The current section is still `--color-accent` with its 2px leading rule.

A new theme test asserts at least 3:1 for every displayed rail letter and sidebar control, in both themes and in both states (expanded and collapsed).

**For Design:** if muted letters were a deliberate choice for a quieter rail, a different token that passes 3:1 is needed.

### 4. The controls row needs tighter button padding to fit 170px

At the theme toggle's usual padding (0.8em each side), "☀ Light" (77px), the 8px gap and "‹ Collapse" (94px) come to 179px, wider than the 170px column. In the row, both buttons now use 0.5em horizontal padding, and Collapse stretches (`flex: 1`) to fill the remaining width. The pair spans exactly 170px, from 32px to 202px.

By estimate, the artboard's `.ctl` (12px padding, 14px text) overflows the same way, by roughly 10px. The excess lands in the 48px gutter, which makes it easy to miss.

### 5. The app column's top padding is 52px, not 60px

The spec's goal is that the app `<h1>` lines up with a post `<h1>`. With 60px it sat about 8px lower:

- **Post `<h1>`:** the top of its capitals is at 53.6px (48px Bebas Neue in a 55.2px line box).
- **App `<h1>`:** it is trimmed to its capitals (`text-box`) and sits under the app shell's 2px top padding.

52px puts the app `<h1>`'s capitals at 54px. The artboard's 60px assumed the app's top lines up with the top of `.post`, but a real post page starts with its `<h1>`, not with the date line shown in the artboard.

A related fix: the app shell dropped its mobile padding (`1.5rem 4%`) only from 850px up, not at the 48em (768px) desktop breakpoint. Between 768px and 849px, app content sat 21px right of and 22px below post content. It now switches at 48em, and app and post headings line up at every desktop width.

### 6. The rail's landmark is labelled "Section shortcuts"

The spec gives the rail no label. Its `<nav>` needs one, and "Sections" is already used by the mobile menu and the app-page mobile sheet. The HTML validator rejects duplicate landmark names even when only one is displayed.

### 7. Collapsed: focus order differs from visual order

In the DOM, the buttons are theme first, then Collapse, which gives the expanded row "Theme, Collapse" left to right. The rail draws Expand above the theme button (`column-reverse`), as designed, but keyboard focus still reaches the theme button first.

**For Design:** to fix this, either the expanded row becomes "Collapse, Theme", or the rail puts theme above Expand.

### 8. The mugshot appears twice in the markup

The expanded 170×158 mugshot is not a link, and the site name beneath it is the home link, as before. The rail needs its 34×34 mugshot to be the home link. So the rail has its own small linked copy, and CSS shows exactly one of the two. Both use the same image, so it downloads once. One visible home link at a time keeps screen readers from hearing "home" twice in a row.

### 9. Padding eases along with width

The spec says only the width animates. The padding also changes (inset 32 → 8px, gutter 48 → 40px). Snapping it while the width eased made the contents jump, so padding eases over the same 180ms, as the artboard's `.side` transition already does.

## Consequences of the spec, noted for awareness

- **Short app pages now scroll 50px.** The sidebar keeps the content pages' 50px top margin above a `100vh` sticky column, so an app shorter than the window (for example the EXIF Viewer) now scrolls by 50px, as content pages already did. The old app nav was exactly `100vh` with no margin.
- **App columns are narrower.** At 1200px the app column drops from about 978px to 926px, so Gig History's table rows wrap more and the page is about 2,600px taller.
- **Known issue, unchanged:** the current entry's contrast in dark theme (2.2:1) is now visible on app pages too, as the README predicted.

## Not built

There is no `--radius-mugshot` token, despite the README's mention. The rail mugshot uses `3px` directly, as the old app nav mugshot did.
