import fs from "node:fs";
import path from "node:path";
import Image from "@11ty/eleventy-img";

import { IMAGE_WIDTHS, IMAGE_FORMATS } from "./shortcodes.mjs";

/** Source files the publish script will pick up from a folder. */
export const PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png"];

/**
 * Photo files in a folder, sorted by name. That order becomes the set's
 * display order — iPhone `IMG_NNNN` names and Flickr export ids are both
 * chronological, and the manifest can be reordered by hand afterwards.
 */
export function listSourcePhotos(sourceDir) {
  return fs.readdirSync(sourceDir)
    .filter((file) => PHOTO_EXTENSIONS.includes(path.extname(file).toLowerCase()))
    .sort();
}

/** `IMG_1401.jpeg` → `IMG_1401`, the name the manifest and the URLs use. */
export function photoName(file) {
  return path.parse(file).name;
}

/** `IMG_1401`, 800, "webp" → `IMG_1401-800.webp`, matching photoUrl(). */
export function variantFilename(name, width, format) {
  return `${name}-${width}.${format}`;
}

/**
 * Generates every width × format variant of each photo in `sourceDir` into
 * `outDir` and returns the set manifest. Anything already in
 * `existingManifest` for a photo of the same name — a hand-written caption,
 * say — is kept, so re-running after adding photos does not undo edits.
 *
 * The variants are what get served, so the manifest records the largest
 * variant's dimensions, orientation already applied (eleventy-img bakes EXIF
 * rotation into the output and drops the rest of the EXIF, GPS included).
 *
 * A source narrower than the largest width — old phone photos off Flickr can
 * be 700px — is kept at its native size under the largest variant's name,
 * so the URLs the shortcode builds still resolve; the manifest's width and
 * height then say how big it really is. Narrower than the smallest width
 * is refused, since the smaller variant's URL could not be honoured.
 */
export async function buildPhotoSet(
  sourceDir,
  outDir,
  existingManifest = { photos: [] },
  widths = IMAGE_WIDTHS,
  formats = IMAGE_FORMATS
) {
  const files = listSourcePhotos(sourceDir);
  if (files.length === 0) {
    throw new Error(`No photos (${PHOTO_EXTENSIONS.join(", ")}) in ${sourceDir}`);
  }

  const names = files.map(photoName);
  const duplicate = names.find((name, i) => names.indexOf(name) !== i);
  if (duplicate) {
    throw new Error(`Two source files would both be published as "${duplicate}" — rename one`);
  }

  const existing = new Map(existingManifest.photos.map((photo) => [photo.name, photo]));
  const smallestWidth = Math.min(...widths);
  const largestWidth = Math.max(...widths);
  const lastFormat = formats[formats.length - 1];
  const photos = [];

  for (const file of files) {
    const name = photoName(file);
    const metadata = await Image(path.join(sourceDir, file), {
      widths: [...widths],
      formats: [...formats],
      outputDir: outDir,
      // eleventy-img never enlarges: a source narrower than the largest
      // width yields a native-size variant instead, which gets the largest
      // width's name so the shortcode's URL for it still resolves.
      filenameFormat: (id, src, width, format) =>
        variantFilename(name, widths.includes(width) ? width : largestWidth, format)
    });

    const variants = metadata[lastFormat];
    const largest = variants[variants.length - 1];
    if (largest.width < smallestWidth) {
      throw new Error(`${file} is only ${largest.width}px wide; sources must be at least ${smallestWidth}px`);
    }

    photos.push({ ...existing.get(name), name, width: largest.width, height: largest.height });
  }

  return { photos };
}
