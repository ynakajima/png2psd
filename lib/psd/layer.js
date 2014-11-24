'use strict';
var jDataView = require('jdataview');

/**
 * PSD Layer records
 * http://www.adobe.com/devnet-apps/photoshop/fileformatashtml/#50577409_13084
 */
function Layer() {
  this.top = 0;
  this.left = 0;
  this.width = 0;
  this.height = 0;
  this.blendmode = 'norm';
  this.opacity = 1;
  this.name = '';
  this.hasAlpha = true;
  this.channels = [];
}

/**
 * draw image
 * @param image {ImageData} image data
 */
Layer.prototype.drawImage = function(image) {
  this.width = image.width;
  this.height = image.height;
  this.hasAlpha = image.hasAlpha;
  this.channels = image.channels;
};

/**
 * return layer record binary data
 * @return {jDataView} layer record binary data
 */
Layer.prototype.toBinary = function() {
  var that = this;

  // Layer record
  var numChannel = this.channels.length;
  var layerRecordSize = 34 + 4 + 4 + 4 + (6 * numChannel);
  var layerRecord = new jDataView(layerRecordSize);

  // rectangle
  layerRecord.writeUint32(this.top); // top
  layerRecord.writeUint32(this.left); // left
  layerRecord.writeUint32(this.top + this.height); // bottom
  layerRecord.writeUint32(this.left + this.width); // right

  // number of channels in the layer 
  layerRecord.writeUint16(numChannel);
  
  // channnel infomation
  this.channels.forEach(function(channel, index) {
    // id
    var id = (that.hasAlpha && index === numChannel - 1) ? -1 : index;
    layerRecord.writeInt16(id); 

    // length
    var channelByteLength = channel.toBinary().byteLength;
    layerRecord.writeUint32(channelByteLength); 
  });

  // blend mode signature
  layerRecord.writeString('8BIM');

  // blend mode key
  layerRecord.writeString(this.blendmode);

  // opacity
  layerRecord.writeUint8(Math.round(this.opacity * 255));

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

  return layerRecord;
};

/**
 * return channel Image binary data
 * @return {jDataView} channel Image binary data
 */
Layer.prototype.getChannelImageBinary = function() {
  var that = this;
  var channelImageData = Buffer.concat(that.channels.map(function(channel) {
    return channel.toBinary().buffer;
  }));

  return new jDataView(channelImageData);
};

module.exports = Layer;

