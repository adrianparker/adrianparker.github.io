# adrianparker.github.io

## Summary
This project is the personal blog of Adrian Parker, [AdrianParker.com](https://www.adrianparker.com/).

I write seldom, but when I do, it's probably on topics like product management, finance, software, scuba diving, or travel; adorned with whimsical anecdotes about life and random other things that interest me.

## Tech

Website is static content, generated using [Eleventy](https://www.11ty.dev/) and hosted on [GitHub Pages](https://pages.github.com/).

**Styling**: Custom CSS (`static/index.css`) built on [Pure.css](https://purecss.io/) framework with a dark theme and responsive design.

**Deployment**: Automated via [GitHub Actions](https://github.com/features/actions) workflow — changes pushed to `master` branch trigger build validation (smoke tests) and automatic deployment to GitHub Pages.

Highly recommended looking into Eleventy and GitHub Pages if you are wanting a website of your own.

## How To

### Install

Git clone into a directory, change into that directory, then:
```
npm install
npm run build
```

### Serve site locally

Open Terminal at root of folder, then run this command.
```
npm run serve
```
You should see output showing you the site is now being served, most likely at localhost:8080. Ctrl-C to terminate the server. It will live reload on file changes.

### Run tests

Automated tests validate the build and design:
```
npm test
```

This runs smoke tests (build validation) and visual regression tests (screenshot comparisons). See [TESTING.md](./TESTING.md) for detailed testing documentation, including how to run tests individually and update baselines.

## Creating Posts

Blog posts are written in markdown and placed in `content/posts/`. Each file:
- Uses kebab-case naming: `My-Post-Title.md`
- Includes YAML front matter with `title`, `navtitle`, and `metadesc`
- Is automatically converted to HTML and deployed

Example:
```markdown
---
layout: post-layout.njk
title: My Blog Post
navtitle: My Post
summary: Displayed on homepage entry and at top or article
metadesc: A brief description for search engines
date: YYYY-MM-DD
readingtime: N minutes
tags: ['post']
---

# My Blog Post

Post content in markdown...
```
