'use strict';
var jDataView = require('jdataview'),
    Layer = require('./layer'),
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
 * Append Layer
 * @param layer {Layer} layer object
 */
PSD.prototype.appendLayer = function(layer) {
  if (layer instanceof Layer) {
    this.layers.push(layer);  
  }
  return this;
};

/**
 * return PSD binary
 * @return {Buffer} PSD File binary buffer
 */
PSD.prototype.toBinary = function() {
  // header
  var header = _getHeaderBinary(this);

  // Color Mode Data Block
  var colorModeData = new jDataView(4);
  colorModeData.writeUint32(0);

  // Image Resources Block
  var imageResources = new jDataView(4);
  imageResources.writeUint32(0);

  // Layer Block
  var layer = _createLayerBlockBuffer(this); 

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

function _createLayerBlockBuffer(psd) {
  if (psd.layers.length === 0) {
    var nullLayer = new jDataView(4);
    nullLayer.writeUint32(0);
    return nullLayer;
  }

  // layer records
  var layerRecords = Buffer.concat(psd.layers.map(function(layer) {
    return layer.toBinary().buffer; 
  }));
  
  // layer channel image data
  var layerChannnelImageData = Buffer.concat(psd.layers.map(function(layer) {
    return layer.getChannelImageBinary().buffer;
  }));
  
  // layer info length
  var layerInfoLength = 4 + 2 + layerRecords.length +
    layerChannnelImageData.length;
  
  // layer padding
  var layerInfoPadding = new Buffer(layerInfoLength % 2);
  layerInfoPadding.fill(0); 
  layerInfoLength += layerInfoPadding.length;

  // layer info header
  var layerInfoHeader = new jDataView(4 + 2);
  layerInfoHeader.writeUint32(layerInfoLength - 4); // Length of the layers info
  var layerCount = psd.layers.length;
  layerInfoHeader.writeInt16(layerCount); // Layer count

  // layer info
  var layerInfo = Buffer.concat([
    layerInfoHeader.buffer,
    layerRecords,
    layerChannnelImageData,
    layerInfoPadding
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
  
  // layer block
  var layerHedaer = new jDataView(4);
  var layerLength = layerInfo.length + globalLayerMaskInfoSize;
  layerHedaer.writeUint32(layerLength); // Length of the layer section
  
  // layer
  var layer = new jDataView(Buffer.concat([
    layerHedaer.buffer,
    layerInfo,
    globalLayerMaskInfo.buffer
  ]));
  
  return layer;
}

module.exports = PSD;
