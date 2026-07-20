import { minify as minifyHtml } from "html-minifier-terser";

/**
 * The baseline, not a competitor: the general-purpose tool
 * html-minifier-terser with every size option it offers turned on. The
 * leaderboard shows it as the floor a model must beat to be worth anything —
 * it lives here, outside models/, so it never counts as a submission.
 */

export const label = "html-minifier-terser";

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
