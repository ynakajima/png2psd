'use strict';
var jDataView = require('jdataview'),
    COLOR_MODE = {gray: 1, rgb: 3};

/**
 * PSD binary creator
 * @param width {number} width of psd file
 * @param height {number} height of psd file
 * @param colorSpace {string} colorSpace name
 *  'rgb'|'rgba'|'gray'|'graya' (derault: rgba)
 */
function PSD(width, height, colorSpace) {
  // init params
  this.width = (typeof width === 'number') ? width : 0;
  this.height = (typeof height === 'number') ? height : 0;
  this.colorSpace = colorSpace.match(/^(gray|rgb)a?$/) ? colorSpace : 'rgba';
  this.colorMode = this.colorSpace.match(/^graya?$/) ? 'gray' : 'rgb';
  this.hasAlpha = (this.colorSpace === this.colorMode + 'a');
  this.numChannel = (this.colorMode === 'rgb') ? 3 : 1;
  this.numChannel += this.hasAlpha ? 1 : 0;
  this.imageData = null;

  // init layer
  this.layers = [];
}

/**
 * return PSD binary
 * @return {Buffer} PSD File binary buffer
 */
PSD.prototype.toBinary = function() {
  // header
  var header = _getHeaderBinary(this);

  // Color Mode Data Block
  var colorModeData = new jDataView(new Buffer(4));
  colorModeData.writeUint32(0);

  // Image Resources Block
  var imageResources = new jDataView(new Buffer(4));
  imageResources.writeUint32(0);

  // Layer Block
  var layer = new jDataView(new Buffer(4));
  layer.writeUint32(0);

  // Image Data Block
  var imageData = this.imageData.toBinary();

  // return buffer
  return new Buffer.concat([
    header.buffer,
    colorModeData.buffer,
    imageResources.buffer,
    layer.buffer,
    imageData.buffer
  ]);
};

// return header buffer
function _getHeaderBinary(psd) {
  var header = new jDataView(new Buffer(26));
  header.buffer.fill(0);
  header.writeString('8BPS'); // Signature
  header.writeUint16(1); // Version 1
  header.writeUint16(0); // Reserved
  header.writeUint16(0); // Reserved
  header.writeUint16(0); // Reserved
  header.writeUint16(psd.numChannel); // number of color chunnel
  header.writeUint32(psd.height); // rows
  header.writeUint32(psd.width); // columns
  header.writeUint16(8); // Depth
  header.writeUint16(COLOR_MODE[psd.colorMode]); // color mode

  return header;
}

module.exports = PSD;
