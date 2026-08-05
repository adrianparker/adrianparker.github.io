// The EXIF Viewer web bundle is built by its own repo's `prepare` script
// when `exifcmdline` is installed (see eleventy.config.mjs for the
// passthrough copy). Vite hashes the output filenames per build, so they
// are resolved here rather than hardcoded in front matter — a version bump
// would otherwise silently break the page until someone noticed and
// hand-edited the hash.
const fs = require("node:fs");
const path = require("node:path");

const ASSETS_DIR = path.join(
  __dirname, "..", "..", "node_modules", "exifcmdline", "web", "dist", "assets"
);

module.exports = () => {
  const files = fs.readdirSync(ASSETS_DIR);
  const css = files.find((file) => file.endsWith(".css"));
  const js = files.find((file) => file.endsWith(".js"));

  if (!css || !js) {
    throw new Error(`Could not find built EXIF Viewer assets in ${ASSETS_DIR}`);
  }

  return {
    stylesheet: `/dist/assets/${css}`,
    script: `/dist/assets/${js}`
  };
};
