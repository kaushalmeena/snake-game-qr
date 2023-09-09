const Jimp = require("jimp");
const jsQR = require("jsqr");

const imageData = await Jimp.read("qr-code.png");

const decodedData = jsQR(
  imageData.bitmap.data,
  imageData.bitmap.width,
  imageData.bitmap.height
);

await Bun.write("output.html", decodedData.data);

console.log("output.html saved!");
