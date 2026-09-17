import fs from "node:fs";
import path from "node:path";

/**
 * Where the per-set manifests live, one `<set-id>.json` each. Under _data so
 * `npm run serve` watches them, but they are read from disk here rather than
 * through Eleventy's global data: a shortcode's `this.ctx` has a different
 * shape under Liquid (markdown posts) and Nunjucks (layouts), and reading the
 * file sidesteps that.
 */
export const PHOTO_SETS_DIR = "content/_data/photoSets";

/** Bucket prefix the publish script uploads a set's variants under. */
export const PHOTOS_PREFIX = "photos";

/**
 * Reads a set manifest: `{ photos: [{ name, width, height, caption? }] }`.
 * Missing set → throw, so a typo fails the build instead of shipping a page
 * with a broken image.
 */
export function loadPhotoSet(setId, setsDir = PHOTO_SETS_DIR) {
  const file = path.join(setsDir, `${setId}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Unknown photo set "${setId}" — expected a manifest at ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** Resolves a `<set-id>/<name>` reference to its manifest entry. */
export function findPhoto(setId, name, setsDir = PHOTO_SETS_DIR) {
  const set = loadPhotoSet(setId, setsDir);
  const photo = set.photos.find((p) => p.name === name);
  if (!photo) {
    throw new Error(`No photo "${name}" in set "${setId}" — names in the set: ${set.photos.map((p) => p.name).join(", ")}`);
  }
  return photo;
}

/** URL of one uploaded variant. */
export function photoUrl(mediaUrl, setId, name, width, format) {
  return `${mediaUrl}/${PHOTOS_PREFIX}/${setId}/${name}-${width}.${format}`;
}

/**
 * The manifest entry expressed in the shape eleventy-img returns, so the
 * same <picture> builder serves both local and uploaded photos:
 * `{ webp: [{ url, width, height, sourceType, srcset }], jpeg: [...] }`,
 * smallest first. `photo.width`/`height` are the largest variant's; the
 * smaller ones scale proportionally.
 *
 * The URL always carries the nominal width (`-800`), but a photo whose
 * source was narrower than that was published at its native size under
 * that name (see photo-publish.mjs), so the srcset descriptor and the
 * dimensions come from the manifest, never from the nominal width.
 */
export function photoVariants(mediaUrl, setId, photo, widths, formats) {
  return Object.fromEntries(
    formats.map((format) => [
      format,
      widths.map((nominalWidth) => {
        const url = photoUrl(mediaUrl, setId, photo.name, nominalWidth, format);
        const width = Math.min(nominalWidth, photo.width);
        return {
          url,
          width,
          height: Math.round((photo.height * width) / photo.width),
          sourceType: `image/${format}`,
          srcset: `${url} ${width}w`
        };
      })
    ])
  );
}
