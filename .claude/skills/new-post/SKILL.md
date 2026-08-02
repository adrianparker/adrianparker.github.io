---
name: new-post
description: Scaffold a new blog post for adrianparker.com with correct front matter, filename, and excerpt marker. Use when Adrian asks to start, draft, or create a new blog post (not a gig — use new-gig for concerts).
---

# New blog post

Create a post in `content/posts/`. For a concert review, use the `new-gig` skill instead.

## 1. Gather

Ask only for what you don't already have:

- **Title** — as displayed at the top of the article.
- **Navtitle** — short form for the sidebar. Offer a shortened title as the default; many posts just reuse the title.
- **Summary** — one line, shown on the index page and under the title.
- **Metadesc** — a search-engine description. Distinct from the summary: written for someone deciding whether to click from a results page.
- **Tags** — always `post`. Ask whether to add `popular` (surfaces it in the desktop sidebar) or a topic tag such as `diving`.

## 2. Filename

`content/posts/Kebab-Case-Title.md` — capitalised words joined by hyphens, matching the title. Examples in the repo: `Can-I-Touch-Your-Feet.md`, `Cognitive-Reframing.md`, `Tangalooma-Wrecks.md`.

Strip apostrophes and punctuation. `Can I Touch Your Feet?` → `Can-I-Touch-Your-Feet.md`.

This becomes the URL, so confirm it with Adrian before writing if the mapping isn't obvious.

## 3. Write the file

Keep this key order exactly:

```yaml
---
layout: post-layout.njk
title: 'Full Title As Displayed'
navtitle: 'Short Title For Sidebar'
summary: 'One line shown on the index and at the top of the article'
metadesc: 'A brief description for search engines'
date: YYYY-MM-DD
readingtime: 'N minutes'
tags: ['post']
---

## Opening heading

First paragraph.

<!-- excerpt -->

Rest of the post.
```

- `date` — today, unless Adrian says otherwise.
- `readingtime` — word count ÷ 200, rounded up. `'1 minute'` singular, `'N minutes'` plural. Recalculate this if you substantially edit the post later.
- Body starts with `##`, not `#` — the layout already renders the title as the `<h1>`.
- The `<!-- excerpt -->` marker sets what appears on index pages. Put it after the first paragraph or two — enough to draw someone in, not the whole opening section.

## 4. Verify

```bash
npm run build
```

Confirm `_site/posts/<Slug>/index.html` exists and the post appears on `_site/index.html`. Then check it renders:

```bash
npm run serve
```

## Notes

- Images use `{% image "img/photo.jpg", "Alt text" %}`. The alt text is **also rendered as the visible figcaption**, so write it to work as a caption.
- Video uses `{% video "/video/clip.mp4" %}`.
- Don't commit to `master` — branch and open a PR, per CLAUDE.md.
