import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { SUBMISSIONS_DIR } from "./config.js";

/**
 * Reads the model submissions. Each submission is a folder under output/ named
 * for the model (kebab-case slug) containing the hand-golfed `output.html` and
 * a `WRITEUP.md`. (Replaces the old minifier-function model — submissions are
 * now static pages, per input/PROMPT.md.)
 */

/**
 * @typedef {object} Submission
 * @property {string} slug - folder name / model id (kebab-case)
 * @property {string} name - display name (the kebab-case slug, verbatim)
 * @property {string} html - the golfed page (trailing whitespace trimmed)
 * @property {string} outputPath - repo-relative path to output.html
 * @property {string|null} writeupPath - repo-relative path to WRITEUP.md, if present
 */

const exists = (p) => stat(p).then(() => true, () => false);

/**
 * @returns {Promise<Submission[]>} submissions with an output.html, slug-sorted
 */
export async function readEntries() {
  const dirents = await readdir(SUBMISSIONS_DIR, { withFileTypes: true });
  const slugs = dirents.filter((d) => d.isDirectory()).map((d) => d.name).sort();

  const submissions = [];
  for (const slug of slugs) {
    const outputFile = resolve(SUBMISSIONS_DIR, slug, "output.html");
    if (!(await exists(outputFile))) continue; // skip folders without a page
    // trimEnd so an editor's trailing newline doesn't inflate the score.
    const html = (await readFile(outputFile, "utf8")).trimEnd();
    const writeupFile = resolve(SUBMISSIONS_DIR, slug, "WRITEUP.md");
    submissions.push({
      slug,
      name: slug, // kebab-case, shown verbatim
      html,
      outputPath: `./output/${slug}/output.html`,
      writeupPath: (await exists(writeupFile)) ? `./output/${slug}/WRITEUP.md` : null,
    });
  }
  if (submissions.length === 0) {
    throw new Error(`no submissions found in ${SUBMISSIONS_DIR} (expected output/<model>/output.html)`);
  }
  return submissions;
}
