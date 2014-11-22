'use strict';
var jDataView = require('jdataview'),
    PNGDecoder = require('png-stream').Decoder,
    concat = require('concat-frames'),
    encodeRLE = require('./lib/packbits').encode,
    fs = require('fs'),
    COLOR_MODE = {gray: 1, graya: 1, rgb: 3, rgba: 3},
    NUM_CHANNEL = {gray: 1, graya: 2, rgb: 3, rgba: 4},
    HAS_ALPHA = {gray: false, graya: true, rgb: false, rgba: true};

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
 * @param colorspace {string} rgb or rgba or gray or graya
 * @param pngBuffer {Buffer} buffer of pngfile
 * @param callback {function} function(psdFileBuffer)
 */

function convertPNG2PSD (width, height, colorspace, pngBuffer, callback) {
  // check colorspace
  if (typeof COLOR_MODE[colorspace] === 'undefined') {
    throw new Error('colorspace : ' + colorspace + ' is not supported.');
  }

  // init
  var numChannel = NUM_CHANNEL[colorspace];
  var colormode = COLOR_MODE[colorspace];
  var hasAlpha = HAS_ALPHA[colorspace];

  // read png image
  var imageDataSize = width * height; 
  var pngData = [];
  for (var i = 0, l = numChannel; i < l; i++) {
    pngData.push(new jDataView(new Buffer(imageDataSize)));
  }

  // read png data
  for (i = 0, l = pngBuffer.length; i < l; i += numChannel) {
    for (var index = 0; index < numChannel; index++) { 
      pngData[index].writeUint8(pngBuffer.readUInt8(i + index));
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
  var layerChannnels = [];
  for (i = 0; i < numChannel; i++) {
    layerChannnels.push({
      id: i,
      data: pngData[i].buffer
    });
  }
  if (hasAlpha) {
    layerChannnels[numChannel - 1].id = -1; 
  }

  // channnel image data
  var channelImageData = [];
  layerChannnels.forEach(function(channel) {
    var compression = new Buffer(2);
    compression.writeUInt16BE(1, 0); // RLE
    
    // RLE compress
    var compressedLines = [];
    var byteCounts = new jDataView(new Buffer(height * 2));
    byteCounts.buffer.fill(0);

    for (i = 0; i < height; i++) {
      // read line data 
      var start = i * width; 
      var end = start + width - 1;
      var compressedLine = encodeRLE(channel.data.slice(start, end));
      compressedLines.push(compressedLine);
      byteCounts.writeUint16(compressedLine.length);
    }
    
    // concat channel data 
    channelImageData.push(Buffer.concat([
      compression, // compression
      byteCounts.buffer, // byte counts
      Buffer.concat(compressedLines) // RLE compressed data
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
  var globalLayerMaskInfoSize = 4 + 2 + 8 + 2 + 1 + 1;
  var globalLayerMaskInfo = new jDataView(new Buffer(globalLayerMaskInfoSize));
  globalLayerMaskInfo.writeUint32(globalLayerMaskInfoSize - 4); // length
  globalLayerMaskInfo.writeUint16(0); // Overlay color space
  globalLayerMaskInfo.writeUint32(0); // 4 * 2 byte color components
  globalLayerMaskInfo.writeUint32(0); // 4 * 2 byte color components
  globalLayerMaskInfo.writeUint16(0); // Opacity
  globalLayerMaskInfo.writeUint8(0); // kind
  globalLayerMaskInfo.writeUint8(0); // Filler: zeros

  // Aadditional layer information (Unicode layer name)
  var layerName = 'png2psd';
  var additionalLayerInfoSize = (4 * 3) + (4 + (2* layerName.length));
  var additionalLayerInfo = new jDataView(new Buffer(additionalLayerInfoSize));

  additionalLayerInfo.writeString('8BIM'); // signature
  additionalLayerInfo.writeString('luni'); // Key: Unicode layer name
  additionalLayerInfo.writeUint32(additionalLayerInfoSize - (4 * 3));
  
  additionalLayerInfo.writeUint32(layerName.length); // Unicode length
  for (i = 0, l = layerName.length; i < l; i++) {
    var codepoint = layerName.charCodeAt(i);
    additionalLayerInfo.writeUint16(codepoint); // write Unicode value
  }

  // Length of the layer and mask information section.
  var layerAndMaskInfoHeader = new jDataView(new Buffer(4));
  layerAndMaskInfoHeader.writeUint32(
    layerInfo.length +
    globalLayerMaskInfo.buffer.length +
    additionalLayerInfo.buffer.length
  );

  // layer and mask info
  var layerAndMaskInfo = Buffer.concat([
    layerAndMaskInfoHeader.buffer,
    layerInfo,
    globalLayerMaskInfo.buffer,
    additionalLayerInfo.buffer
  ]);


  /**
   * Image Data Block
   * - The complete merged image data
   */
  var imageDataHeader = new jDataView(new Buffer(2));
  var imageData = [];
  for (i = 0; i < numChannel; i++) {
    imageData.push(new jDataView(new Buffer(imageDataSize)));
  }

  // write header
  imageDataHeader.writeUint16(1); // RLE

  // read png data and compress RLE
  for (i = 0; i < imageDataSize; i++) {
    // get alpha value
    var alpha = hasAlpha ? pngData[numChannel - 1].getUint8(i) : 255;

    // read png pixel data and write image data
    for (var j = 0; j < numChannel; j++) {
      var color = pngData[j].getUint8(i);
      if (hasAlpha && j === numChannel - 1) {
        imageData[j].writeUint8(alpha);
      } else {
        imageData[j].writeUint8(alphaBlendWithWhite(color, alpha));
      }
    }
  }

  // RLE compress
  var byteCounts = [];
  var compressedImageData = [];
  for (i = 0; i < numChannel; i++) {
    byteCounts.push(new Buffer(height * 2));
    compressedImageData.push([]);
  } 

  for (i = 0; i < height; i++) {
    // read inedata by channel
    var start = i * width;
    var end = start + width - 1;
    
    for (var k = 0; k < numChannel; k++) {
      var channel = imageData[k];
      var compressedLine = encodeRLE(channel.buffer.slice(start, end));
      compressedImageData[k].push(compressedLine);
      byteCounts[k].writeUInt16BE(compressedLine.length, i * 2);
    }
  }

  // caoncat byte counts
  byteCounts = Buffer.concat(byteCounts);

  // concat image data
  compressedImageData = Buffer.concat(
    compressedImageData.map(function(channel) {
      return Buffer.concat(channel);
    })
  );

  /**
   * create psd buffer
   */
  var psd = Buffer.concat([
    header.buffer,
    colorModeData.buffer,
    imageResources.buffer,
    layerAndMaskInfo,
    imageDataHeader.buffer,
    byteCounts,
    compressedImageData
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

