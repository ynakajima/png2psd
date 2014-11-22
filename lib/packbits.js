/**
 * packbits.js
 *
 * origin: https://github.com/kmike/packbits/blob/master/src/packbits.py
 * LICENSE: MIT
 */
"use strict";

/**
 * Encodes data using PackBits encoding.
 * @param data {Buffer} source buffer
 * @return {Buffer} encoded buffer
 */
exports.encode = function(data) {
  var result = [];

  if (data.length === 0) return new Error('buffer length is 0');
  
  if (data.length === 1) {
    result.push(0x00);
    result.push(data[0]);
    return new Buffer(result);
  }

  var buf = [];  
  var pos = 0;
  var repeatCount = 0;
  var MAX_LENGTH = 127;

  // we can safely start with RAW sa empty RAW sequences
  // are handled by finishRAW()
  var state = 'RAW';

  function finishRAW() {
    if (buf.length === 0) {
      return;
    }
    result.push(buf.length - 1);
    result = result.concat(buf);
    buf = [];
  }

  function finishRLE() {
    result.push(256 - (repeatCount - 1));
    result.push(data[pos]);
  }

  while (pos < data.length - 1) {
    var currentByte = data[pos];

    if (data[pos] === data[pos + 1]) {
      if (state === 'RAW') {
        // end of RAW data
        finishRAW();
        state = 'RLE';
        repeatCount = 1;
      } else if (state === 'RLE') {
        if (repeatCount === MAX_LENGTH) {
          // restart the encoding
          finishRLE();
          repeatCount = 0;
        }
        // move to next byte
        repeatCount += 1;
      }
    } else {
      if (state === 'RLE') {
        repeatCount += 1;
        finishRLE();
        state = 'RAW';
        repeatCount = 0;
      } else if (state === 'RAW') {
        if (buf.length === MAX_LENGTH) {
          // restart the encoding
          finishRAW();
        }

        buf.push(currentByte);
      }
    }

    pos += 1;
  }

  if (state === 'RAW') {
      buf.push(data[pos]);
      finishRAW();
  } else if (state === 'RLE') {
    repeatCount += 1;
    finishRLE();
  }
 
  return new Buffer(result);
};

