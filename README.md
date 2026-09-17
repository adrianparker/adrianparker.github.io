# adrianparker.github.io

## Summary
This project is the personal blog of Adrian Parker, [AdrianParker.com](https://www.adrianparker.com/).

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

## Photos

Photos in posts are served from an S3 bucket behind CloudFront
(`mediaUrl` in `content/_data/site.json`), not from this repo. The build
never talks to AWS: everything it needs to know about a set of photos is in a
small manifest committed alongside the content.

### How it works

- Photos are grouped into **sets**. A set id is the file stem of the post or
  gig it belongs to, e.g. `Wine-Cork-Notice-Board-How-To` or
  `20260523-Teen-Jesus-and-the-Jean-Teasers`.
- `npm run photos` resizes a folder of source photos into the site's variants —
  400px and 800px wide, as webp and jpeg, EXIF stripped (GPS included) and
  orientation baked in — and uploads them to
  `photos/<set-id>/<name>-<width>.<format>` in the bucket. The originals are
  not uploaded.
- The same run writes the set's manifest, `content/_data/photoSets/<set-id>.json`:

  ```json
  {
    "photos": [
      { "name": "IMG_1401", "width": 800, "height": 600 },
      { "name": "IMG_1403", "width": 800, "height": 1066, "caption": "Optional, added by hand" }
    ]
  }
  ```

  `name` is the source filename without its extension; `width`/`height` are
  the largest variant's, so the page can reserve the right space before the
  image arrives. Array order is display order.
- The `image` shortcode looks the photo up in its manifest and emits the
  responsive `<picture>` (one `<source>` per format, jpeg `<img>` fallback,
  lazy-loaded, captioned). An unknown set or photo name fails the build.

Everything in `lib/photo-sets.mjs` and `lib/photo-publish.mjs` is unit-tested;
`scripts/publish-photos.mjs` is the thin command-line wrapper.

### Publishing a set

One-time setup: install the AWS CLI and add a profile named `blog-photos` to
`~/.aws/credentials` for an IAM user that can only `s3:PutObject` under the
bucket's `photos/` prefix (plus `s3:ListBucket`, which `sync` needs). Nothing
in this repo or in CI ever holds AWS credentials — the script shells out to
the AWS CLI, which reads the profile itself.

Put the photos for one post in a folder, then:

```
npm run photos -- <set-id> <folder> --upload
```

Without `--upload` it does everything except the upload and prints the
`aws s3 sync` command it would have run. Variants are written to
`.photos/<set-id>/` (gitignored). A source narrower than 800px (old phone
photos can be) is published at its native size under the 800 name, and the
manifest records its real dimensions; narrower than 400px is refused.
Commit the manifest with the post that uses it.

The upload sets `Cache-Control: public, max-age=31536000, immutable`, so a
changed photo must get a new name rather than be re-uploaded under the old one.

### Embedding a photo

```njk
{% image "Wine-Cork-Notice-Board-How-To/IMG_7118", "Alt text, also shown as the caption" %}
```

The first argument is `<set-id>/<name>`. The alt text is rendered as the
visible `<figcaption>` too, so write it to read as a caption.

### Embedding a whole set as a slideshow

Gigs do this through front matter — name the set and the gig layout renders
the slideshow after the review:

```yaml
photos: '20260523-Teen-Jesus-and-the-Jean-Teasers'
```

A post can place one inline instead:

```njk
{% slideshow "20260523-Teen-Jesus-and-the-Jean-Teasers", "Teen Jesus & the Jean Teasers @ San Fran" %}
```

The second argument names the set for screen readers and is the basis of
each photo's alt text when it has no caption of its own.

The slideshow is a native CSS scroll-snap strip framed like the video embed:
it swipes on a phone and scrolls on a trackpad with no JavaScript at all, and
the badge in the corner says how many photos there are. A small same-origin
script (`static/slideshow.js`) then adds previous/next buttons that wrap
round at either end, arrow-key stepping when the strip is focused, and
turns the badge into a "3 / 24" counter beside the post title. Only the first photo loads up front; the rest load as they come
into view. Nothing is fetched from anywhere but the media host — no
third-party script, no tracking.

A photo with a `caption` in the manifest shows it over the foot of its
slide.

### Adding to a set, or adding a caption

Re-run `npm run photos` on the folder with the new photos in it — existing
entries keep any fields you have added by hand (such as `caption`), new photos
are appended, and only the new variants actually transfer. To reorder, edit
the array. To caption a photo, add a `caption` to its entry and commit.
