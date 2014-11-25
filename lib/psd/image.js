'use strict';
var ChannelImageData = require('./channelimagedata'),
    jDataView = require('jdataview');

/**
 * PSD Image Data Section
 * http://www.adobe.com/devnet-apps/photoshop/fileformatashtml/#50577409_pgfId-1054855
 * 
 * @param width {number} width of psd file
 * @param height {number} height of psd file
 * @param colorSpace {string} colorSpace name
 *  'rgb'|'rgba'|'gray'|'graya' (derault: rgba) 
 * @param pixcels {jDataView} buffer of pixcels (rgba: [R,G,B,A,R,G,B,A...])
 */
function ImageData(width, height, colorSpace, pixcels) {
  // init params
  this.width = (typeof width === 'number') ? width : 0;
  this.height = (typeof height === 'number') ? height : 0;
  this.colorSpace = colorSpace.match(/^(gray|rgb)a?$/) ? colorSpace : 'rgba';
  this.colorMode = this.colorSpace.match(/^graya?$/) ? 'gray' : 'rgb';
  this.hasAlpha = (this.colorSpace === this.colorMode + 'a');
  this.pixcels = pixcels;
  this.numChannel = (this.colorMode === 'rgb') ? 3 : 1;
  this.numChannel += this.hasAlpha ? 1 : 0;
  this.numPixcels = this.numChannel * this.width * this.height;
  this.channels = [];

  if (this.pixcels.byteLength !== this.numPixcels) {
    throw new Error('mismatch number of pixcels.');
  }

  // init channels
  var that = this;
  var channels = [];
  for (var i = 0; i < this.numChannel; i++) {
    channels.push([]);
  }
  for (i = 0; i < this.numPixcels; i += this.numChannel) {
    for (var index = 0; index < this.numChannel; index++) { 
      channels[index].push(this.pixcels.getUint8(i + index));
    }
  }
  this.channels = channels.map(function(channel) {
    var pixcels = new jDataView(channel);
    return new ChannelImageData(that.width, that.height, pixcels);
  });
}

/**
 * return binary data
 * @return {Buffer} Image Data Section binary data
 */
ImageData.prototype.toBinary = function() {
  // set compression type
  var compType = new Buffer(2);
  compType.writeUInt16BE(0, 0); // RLE

  // get compressed image data
  var byteCounts = [];
  var compressedImages = [];
  this.channels.forEach(function(channel) {
    var comp = channel.compressRLE();
    byteCounts.push(comp.byteCounts.buffer);
    compressedImages.push(comp.image.buffer);
  });
  
  // return binary buffer
  return new jDataView(Buffer.concat([
    compType,
    //Buffer.concat(byteCounts),
    //Buffer.concat(compressedImages)
    Buffer.concat(this.channels.map(function(channel) {
      return channel.pixels.buffer;
    }))
  ]));
};

module.exports = ImageData;
