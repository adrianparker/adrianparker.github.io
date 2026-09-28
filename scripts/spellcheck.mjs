/*
  Spell checks posts and gigs (every markdown file under content/posts/).

    npm run spellcheck                # check every post and gig
    node scripts/spellcheck.mjs <file> [<file> ...]   # check specific files

  Only rendered content is checked — front matter, Nunjucks, HTML, and URLs
  are stripped first (see lib/spellcheck-targets.mjs). Project-wide accepted
  words live in cspell.json; per-file ones go in a
  `<!-- cspell:words XYZ -->` comment in that file. See README.md → Spell
  checking.

  Exits non-zero and prints a `file:line word` list on any misspelling.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spellCheckDocument, readSettings } from "cspell-lib";

import { extractSpellcheckText } from "../lib/spellcheck-targets.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const POSTS_DIR = path.join(ROOT, "content", "posts");
const CONFIG_FILE = path.join(ROOT, "cspell.json");

function findAllPosts (dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) { return findAllPosts(entryPath); }
    return entry.name.endsWith(".md") ? [entryPath] : [];
  });
}

/**
 * Spell checks one markdown file's extracted content. Returns a list of
 * `{ file, line, word }` for each misspelling found.
 */
export async function checkFile (filePath, settings) {
  const markdown = fs.readFileSync(filePath, "utf8");
  const text = extractSpellcheckText(markdown);
  const relativePath = path.relative(ROOT, filePath);

  const result = await spellCheckDocument(
    { uri: `file://${filePath}`, text, languageId: "plaintext" },
    { generateSuggestions: false, noConfigSearch: false },
    settings
  );

  return result.issues.map((issue) => ({
    file: relativePath,
    line: issue.line.position.line + 1,
    word: issue.text
  }));
}

async function main () {
  const args = process.argv.slice(2);
  const files = args.length > 0 ? args.map((arg) => path.resolve(arg)) : findAllPosts(POSTS_DIR);
  const settings = await readSettings(CONFIG_FILE);

  const allIssues = [];
  for (const file of files) {
    const issues = await checkFile(file, settings);
    allIssues.push(...issues);
  }

  if (allIssues.length === 0) {
    console.log(`Spell check passed (${files.length} file(s) checked).`);
    return;
  }

  console.error("Spelling errors found:");
  for (const { file, line, word } of allIssues) {
    console.error(`${file}:${line} ${word}`);
  }
  process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
