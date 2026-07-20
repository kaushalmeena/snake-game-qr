import { minify as minifyHtml } from "html-minifier-terser";

/**
 * Baseline entrant: not an AI model but the general-purpose tool
 * html-minifier-terser, with every size option it offers turned on. It stands
 * on the leaderboard as the score any model must beat to be worth anything.
 */

export const meta = {
  model: "html-minifier-terser",
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
