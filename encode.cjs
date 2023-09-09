const { minify } = require("html-minifier-terser");
const QRCode = require("qrcode");

const fileData = await Bun.file("input.html").text();

const encodedData = await minify(fileData, {
  collapseWhitespace: true,
  useShortDoctype: true,
  minifyJS: {
    mangle: {
      toplevel: true,
    },
  },
  minifyCSS: true,
});

QRCode.toFile("qr-code.png", encodedData, (err) => {
  if (err) {
    throw err;
  }
  console.log("qr-code.png saved!");
});
