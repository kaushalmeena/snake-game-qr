const fs = require("fs");
const Jimp = require("jimp");
const jsQR = require("jsqr");

// Read QRCode image data from file
Jimp.read("qr-code.png", (err, image) => {
  if (err) {
    if (err.code === "ENOENT") {
      throw new Error("qr-code.png file not found.");
    } else {
      throw err;
    }
  }
  // Decode data from image data
  const decodedData = jsQR(
    image.bitmap.data,
    image.bitmap.width,
    image.bitmap.height
  );
  // Write decoded data to file
  fs.writeFile("output.html", decodedData.data, (err) => {
    if (err) {
      throw err;
    }
    console.log("output.html saved!");
  });
});
