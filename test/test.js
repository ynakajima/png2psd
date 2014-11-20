'use strict';
require('mocha');
require('chai').should();

var png2psd = require('../'),
    fs = require('fs'),
    path = require('path'),
    pngFilePath = path.join(__dirname, './fixtures/image.png'),
    psdFilePath = path.join(__dirname, './fixtures/image.psd');
    
describe('png2psd', function() {

  it('should convert png file to psd file.', function(done) {
    png2psd(pngFilePath, function(psdFileBuffer) {
      // read comparison file
      fs.readFile(psdFilePath, function(err, buffer) {
        if (err) return done(err);
        psdFileBuffer.should.to.deep.equal(buffer);
        done();
      });
    });
  });

});
