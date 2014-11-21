'use strict';
var jDataView = require('jdataview'),
    PNGDecoder = require('png-stream').Decoder,
    concat = require('concat-frames'),
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
      convertPNG2PSD(image.width, image.height, image.colorSpace, image.pixels,
        function(psdFileBuffer) {
          callback(psdFileBuffer);
        });
    }));
};

/**
 * convertPNG2PSD
 * @param width {number} width of png
 * @param height {number} height of png
 * @param colorspace {string} rgb or rgba
 * @param pngBuffer {Buffer} buffer of pngfile
 * @param callback {function} function(psdFileBuffer)
 */

function convertPNG2PSD (width, height, colorspace, pngBuffer, callback) {

  // init
  var isRGBA = (colorspace.toLowerCase() === 'rgba');
  var numPNGChannel = isRGBA ? 4 : 3;
  var numChannel = 3;
  var colormode = 3; // RBG

  // read png image
  var imageDataSize = width * height; 
  var pngData = {
    r: new jDataView(new Buffer(imageDataSize)),
    g: new jDataView(new Buffer(imageDataSize)),
    b: new jDataView(new Buffer(imageDataSize))
  };

  if (isRGBA) {
    pngData.a = new jDataView(new Buffer(imageDataSize));
  }

  // read png data
  for (var i = 0, l = pngBuffer.length; i < l; i += numPNGChannel) {
    // read and write RGBA
    pngData.r.writeUint8(pngBuffer.readUInt8(i));
    pngData.g.writeUint8(pngBuffer.readUInt8(i + 1));
    pngData.b.writeUint8(pngBuffer.readUInt8(i + 2));
    if (isRGBA) {
      pngData.a.writeUint8(pngBuffer.readUInt8(i + 3));
    }
  }

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
  header.writeUint16(numChannel); // number of color chunnel
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

  // Layer channels
  var layerChannnels = [
    {id: 0, data: pngData.r.buffer}, // red
    {id: 1, data: pngData.g.buffer}, // green
    {id: 2, data: pngData.b.buffer}  // blue

  ];

  if (isRGBA) {
    layerChannnels.push({id: -1, data: pngData.a.buffer}); // alpha
  }

  // channnel image data
  var channelImageData = [];
  layerChannnels.forEach(function(channel) {
    var compression = new Buffer(2);
    compression.writeUInt16BE(0, 0); // Raw Data

    // concat channel data 
    channelImageData.push(Buffer.concat([
      compression, // compression
      channel.data // image data
    ]));
  });
  channelImageData = Buffer.concat(channelImageData);

  // Layer record
  var layerRecordSize = 34 + 4 + 4 + 4 + (6 * layerChannnels.length);
  var layerRecordBuffer = new Buffer(layerRecordSize);
  layerRecordBuffer.fill(0);
  var layerRecord = new jDataView(layerRecordBuffer);

  // rectangle
  layerRecord.writeUint32(0); // top
  layerRecord.writeUint32(0); // left
  layerRecord.writeUint32(height); // bottom
  layerRecord.writeUint32(width); // right

  // number of channels in the layer 
  layerRecord.writeUint16(layerChannnels.length);
  
  // channnel infomation
  layerChannnels.forEach(function(channel) {
    // id
    layerRecord.writeInt16(channel.id); 

    // length
    layerRecord.writeUint32(channel.data.length); 
  });

  // blend mode signature
  layerRecord.writeString('8BIM');

  // blend mode key
  layerRecord.writeString('norm'); // normal

  // opacity
  layerRecord.writeUint8(255);

  // clipping
  layerRecord.writeUint8(0); // base

  // flags
  layerRecord.writeUint8(parseInt('00001000', 2));

  // filler (zero)
  layerRecord.writeUint8(0);

  // length of the extra data field 
  layerRecord.writeUint32(4 + 4 + 4);

  // layer mask data
  layerRecord.writeUint32(0);

  // layer blending ranges data
  layerRecord.writeUint32(0); // length

  // Layer name: Pascal string, padded to a multiple of 4 bytes.
  layerRecord.writeUint8(3);
  layerRecord.writeUint8('P'.charCodeAt(0));
  layerRecord.writeUint8('N'.charCodeAt(0));
  layerRecord.writeUint8('G'.charCodeAt(0));


  // Layer info header
  var layerInfoHeader = new jDataView(new Buffer(6));
  
  // Length of the layers info section, rounded up to a multiple of 2. 
  var layerInfoLength = 2 + layerRecord.buffer.length + channelImageData.length;
  var layerInfoLengthPad = layerInfoLength % 2;
  layerInfoHeader.writeUint32(layerInfoLength + layerInfoLengthPad);

  // Layer count
  layerInfoHeader.writeUint16(1);

  // padBaffer
  var padBaffer = new Buffer(layerInfoLengthPad);
  padBaffer.fill(0);
  
  // layer info
  var layerInfo = Buffer.concat([
    layerInfoHeader.buffer,
    layerRecord.buffer,
    channelImageData,
    padBaffer
  ]);

  // Global layer mask info
  var globalLayerMaskInfo = new jDataView(new Buffer(4));
  globalLayerMaskInfo.writeUint32(0);

  // Length of the layer and mask information section.
  var layerAndMaskInfoHeader = new jDataView(new Buffer(4));
  layerAndMaskInfoHeader.writeUint32(
    layerInfo.length + globalLayerMaskInfo.buffer.length
  );

  // layer and mask info
  var layerAndMaskInfo = Buffer.concat([
    layerAndMaskInfoHeader.buffer,
    layerInfo,
    globalLayerMaskInfo.buffer
  ]);


  /**
   * Image Data Block
   * - The complete merged image data
   */
  var imageDataHeader = new jDataView(new Buffer(2));
  var imageData = {
    r: new jDataView(new Buffer(imageDataSize)),
    g: new jDataView(new Buffer(imageDataSize)),
    b: new jDataView(new Buffer(imageDataSize))
  };

  // write header
  imageDataHeader.writeUint16(0); // Raw image data
  
  // read png data
  for (i = 0, l = pngData.r.buffer.length; i < l; i++) {
    // get alpha value
    var alpha = isRGBA ? pngData.a.getUint8(i) : 255;

    // get RGB
    var r = pngData.r.getUint8(i);
    var g = pngData.g.getUint8(i);
    var b = pngData.b.getUint8(i);
    
    // write RGB (alpha blend with white background)
    imageData.r.writeUint8(alphaBlendWithWhite(r, alpha));
    imageData.g.writeUint8(alphaBlendWithWhite(g, alpha));
    imageData.b.writeUint8(alphaBlendWithWhite(b, alpha));
  }

  /**
   * create psd buffer
   */
  var psd = Buffer.concat([
    header.buffer,
    colorModeData.buffer,
    imageResources.buffer,
    layerAndMaskInfo,
    imageDataHeader.buffer,
    imageData.r.buffer,
    imageData.g.buffer,
    imageData.b.buffer
  ]);

  callback(psd);
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

