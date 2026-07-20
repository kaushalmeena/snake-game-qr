import { minify as minifyHtml } from "html-minifier-terser";

/**
 * Baseline: html-minifier-terser with every size option it offers turned on.
 * This is what a general-purpose tool can do without understanding the game —
 * the score to beat for any hand-written algorithm on the leaderboard.
 */

export const meta = {
  algo: "html-minifier-terser",
  model: "none (reference tool)",
};

export function minify(inputHtml) {
  return minifyHtml(inputHtml, {
    collapseWhitespace: true,
    useShortDoctype: true,
    removeAttributeQuotes: true,
    removeOptionalTags: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: {
      mangle: { toplevel: true },
      compress: { passes: 3, unsafe: true, booleans_as_integers: true },
    },
  });
}
