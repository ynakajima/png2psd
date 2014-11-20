'use strict';
var jDataView = require('jdataview'),
    fastImageSize = require('fast-image-size'),
    PNG = require('png-js');

/**
 * png2psd
 * @param pngFilePath {string} png filepath 
 * @param callback {function} function(psdFileBuffer)
 */
module.exports = function(pngFilePath, callback) {
  // read png file
  fastImageSize(pngFilePath, function(image) {
    PNG.decode(pngFilePath, function(pngBuffer) {
      
      // conver psd
      convertPNG2PSD(image.width, image.height, pngBuffer,
        function(psdFileBuffer) {
          callback(psdFileBuffer);
        });
    });
  }); 
};

/**
 * convertPNG2PSD
 * @param width {number} width of png
 * @param height {number} height of png
 * @param pngBuffer {Buffer} buffer of pngfile
 * @param callback {function} function(psdFileBuffer)
 */

function convertPNG2PSD (width, height, pngBuffer, callback) {

  // init
  var numChunnel = 3;
  var colormode = 3; // RBG

  /**
   * header
   */
  var header = new jDataView(new Buffer(26));
  header.buffer.fill(0);

  // write
  header.writeString('8BPS'); // Signature
  header.writeUint16(1); // Version 1
  header.writeUint16(0); // Reserved
  header.writeUint16(0); // Reserved
  header.writeUint16(0); // Reserved
  header.writeUint16(numChunnel); // number of color chunnel
  header.writeUint32(height); // rows
  header.writeUint32(width); // columns
  header.writeUint16(8); // Depth
  header.writeUint16(colormode); // color mode


  /**
   * Color Mode Data Block
   */
  var colorModeData = new jDataView(new Buffer(4));
  colorModeData.buffer.fill(0);

  // write data
  colorModeData.writeUint32(0);


  /**
   * Image Resources Block
   */
  var imageResources = new jDataView(new Buffer(4));

  // write data
  imageResources.writeUint32(0);


  /**
   * Layer and Mask Information Block
   */
  var layerMaskInfo = new jDataView(new Buffer(4));

  // write data
  layerMaskInfo.writeUint32(0);


  /**
   * Image Data Block
   * - The complete merged image data
   */
  var imageDataHeader = new jDataView(new Buffer(2));
  var imageDataSize = (numChunnel * width * height); 
  var imageData = new jDataView(new Buffer(imageDataSize));

  // read png data
  var rgb = {r: [], g: [], b: [], a: []};
  for (var i = 0, l = pngBuffer.length; i < l; i += 4) {
    rgb.r.push(pngBuffer.readUInt8(i));
    rgb.g.push(pngBuffer.readUInt8(i + 1));
    rgb.b.push(pngBuffer.readUInt8(i + 2));
    rgb.a.push(pngBuffer.readUInt8(i + 3));
  }

  // write header
  imageDataHeader.writeUint16(0); // Raw image data
  
  // write red plane
  rgb.r.forEach(function(color) {
    imageData.writeUint8(color);
  });

  // write green plane
  rgb.g.forEach(function(color) {
    imageData.writeUint8(color);
  });

  // write blue plane
  rgb.b.forEach(function(color) {
    imageData.writeUint8(color);
  });


  /**
   * create psd buffer
   */
  var psd = Buffer.concat([
    header.buffer,
    colorModeData.buffer,
    imageResources.buffer,
    layerMaskInfo.buffer,
    imageDataHeader.buffer,
    imageData.buffer
  ]);

  callback(psd);
}

