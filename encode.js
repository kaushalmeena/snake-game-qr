const fs = require("fs");
const { minify } = require("html-minifier-terser");
const QRCode = require("qrcode");

// Read input.html file contents
fs.readFile("input.html", "utf8", async (err, data) => {
  if (err) {
    if (err.code === "ENOENT") {
      throw new Error("input.html file not found.");
    } else {
      throw err;
    }
  }
  // Minify contents of input.html
  const minifiedData = await minify(data, {
    collapseWhitespace: true,
    useShortDoctype: true,
    minifyJS: {
      mangle: {
        toplevel: true,
      },
    },
    minifyCSS: true,
  });
  // Generate QRCode for minified data
  QRCode.toFile("qr-code.png", minifiedData, (err) => {
    if (err) {
      throw err;
    }
    console.log("qr-code.png saved!");
  });
});
