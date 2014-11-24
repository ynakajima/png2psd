'use strict';
var PNGDecoder = require('png-stream').Decoder,
    concat = require('concat-frames'),
    PSD = require('./lib/psd/psd'),
    ImageData = require('./lib/psd/image'),
    Layer = require('./lib/psd/layer'),
    jDataView = require('jdataview'),
    fs = require('fs');

/**
 * png2psd
 * @param pngFilePath {string} png filepath 
 * @param callback {function} function(psdFileBuffer)
 */
module.exports = function(pngFilePath, callback) {
  // read png file
  fs.createReadStream(pngFilePath)
    .pipe(new PNGDecoder())
    .pipe(concat(function(frames) {
      var image = frames[0];
      convertPNG2PSD(image, function(psdFileBuffer) {
        callback(psdFileBuffer);
      });
    }));
};

/**
 * convertPNG2PSD
 * @param image {png} png image data
 * @param callback {function} function(psdBuffer)
 */
function convertPNG2PSD (png, callback) {
  // create psd data
  var psd = new PSD(png.width, png.height, png.colorSpace);

  // append layer
  var image = new ImageData(png.width, png.height, 
    png.colorSpace, new jDataView(png.pixels));
  var layer = new Layer();
  layer.drawImage(image);
  psd.appendLayer(layer);

  // create merged image data
  psd.imageData = new ImageData(png.width, png.height, 
    png.colorSpace, new jDataView(png.pixels));

  // alpha blend whth white background
  if (psd.hasAlpha) {
    var channels = psd.imageData.channels;
    var alphaPixels = channels[channels.length - 1].pixels;
    for (var i = 0, l = channels.length - 1; i < l; i++) {
      var pixels = channels[i].pixels;
      for (var index = 0; index < pixels.byteLength; index++) {
        var color = pixels.getUint8(index);
        var alpha = alphaPixels.getUint8(index);
        var blendedColor = alphaBlendWithWhite(color, alpha);
        pixels.setUint8(index, blendedColor);
      }
    }
  }

  callback(psd.toBinary());
}

/**
 * Alpha blend with white background
 * @param srcColor {number} source color (0-255)
 * @param srcAlpha {number} source alpha (0-255)
 * @return {number} alpha blended color (0-255)
 */
function alphaBlendWithWhite(srcColor, srcAlpha) {
  var MAX = 255,
      MIN = 0,
      ALPHA_MAX = 1,
      WHITE = 255;
  if (srcAlpha === MAX) return srcColor;
  if (srcAlpha === MIN) return MAX;

  var alpha = srcAlpha / MAX;
  return Math.round((srcColor * alpha) + (WHITE * (ALPHA_MAX - alpha)));
}


