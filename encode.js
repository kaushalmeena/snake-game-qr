var fs = require("fs");
var minify = require("html-minifier").minify;
var QRCode = require("qrcode")

// Read index.html file contents
fs.readFile("index.html", "utf8", function (err, data) {
  if (err) {
    if (err.code === "ENOENT") {
      throw new Error("index.html file not found.")
    } else {
      throw err;
    }
  }
  // Minify contents of index.html
  var minifiedData = minify(data, {
    caseSensitive: true,
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeTagWhitespace: true,
    minifyCSS: true,
    minifyJS: true
  });
  // Generate QRCode for minified data
  QRCode.toFile("qr-code.png", minifiedData, function (err) {
    if (err) {
      throw err;
    }
    console.log("qr-code.png saved!");
  });
});
