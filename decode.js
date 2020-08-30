const fs = require("fs");
const Jimp = require("jimp");
const jsQR = require("jsqr");

// Read QRCode image data from file
Jimp.read("qr-code.png", function (err, image) {
  if (err) {
    if (err.code === "ENOENT") {
      throw new Error("qr-code.png file not found.");
    } else {
      throw err;
    }
  }
  // Decode data from image data
  const decodedData = jsQR(image.bitmap.data, image.bitmap.width, image.bitmap.height);
  // Write decoded data to file
  fs.writeFile("snake-game.html", decodedData.data, function () {
    console.log("snake-game.html saved!");
  });
});