'use strict';
require('mocha');
require('chai').should();

var packbits = require('../../lib/packbits');
var data = [
  80, 80, 80, // -2, 80
  81, 82, 83, 84, 85, // 4, 81, 82, 83, 84, 85
  86, 86, 86, 86, 86, // -4, 86
  87, 88, 89 // 2, 87, 88, 89
];
var collectResult = new Buffer([
  (256 - 2), 80,
  4, 81, 82, 83, 84, 85,
  (256 - 4), 86,
  2, 87, 88, 89
]);

describe('packbits', function() {

  describe('encode', function() {

    it('should return encoded data using PackBits encoding', function() {
      var encodedBuffer = packbits.encode(new Buffer(data));
      encodedBuffer.should.be.to.an.instanceof(Buffer);
      encodedBuffer.should.be.deep.equal(collectResult);
    });

  });

});

