'use strict';
var jDataView = require('jdataview'),
    encodeRLE = require('../util/packbits').encode;

/**
 * Channel image data
 * @param width {number} channel width 
 * @param height {number} channel height
 * @param pixels {jDataView} data buffer of pixels
 */
function ChannelImageData(width, height, pixels) {
  this.width = width;
  this.height = height;
  this.pixels = pixels;
}

/**
 * return RLE compressed Data
 * @return {Object} RLE compressed Data
 *  {byteCouts: {jDataView}, image: {jDataView}}
 */
ChannelImageData.prototype.compressRLE = function() {
  // RLE compress
  var width = this.width;
  var height = this.height;
  var compressedLines = [];
  var byteCounts = new jDataView(new Buffer(this.height * 2));
  byteCounts.buffer.fill(0);

  for (var i = 0; i < height; i++) {
    // read line data 
    var start = i * width; 
    var end = start + width - 1;
    var compressedLine = encodeRLE(this.pixels.buffer.slice(start, end));
    compressedLines.push(compressedLine);
    byteCounts.writeUint16(compressedLine.length);
  }

  return {
    byteCounts: byteCounts,
    image: new jDataView(Buffer.concat(compressedLines))
  };
};

/**
 * return binary data
 * @return {Buffer} layer channel binary data
 */
ChannelImageData.prototype.toBinary = function() {
  // set compression type
  var compType = new Buffer(2);
  compType.writeUInt16BE(0, 0); // RLE
  
  // get RLE compressed data
  //var compressedData = this.compressRLE();

  return new jDataView(Buffer.concat([
    compType, // compression
    this.pixels.buffer
    //compressedData.byteCounts.buffer, // byte counts
    //compressedData.image.buffer // RLE compressed data
  ]));
};

module.exports = ChannelImageData;

