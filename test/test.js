'use strict';
require('mocha');
require('chai').should();

var png2psd = require('../'),
    fs = require('fs'),
    path = require('path'),
    pngFilePath = path.join(__dirname, './fixtures/image.png'),
    psdFilePath = path.join(__dirname, './fixtures/image.psd'),
    alphaPNGFilePath = path.join(__dirname, './fixtures/alpha.png'),
    alphaPSDFilePath = path.join(__dirname, './fixtures/alpha.psd');
    
describe('png2psd', function() {

  it('should convert PNG file to PSD file.', function(done) {
    png2psd(pngFilePath, function(psdFileBuffer) {
      // read comparison file
      fs.readFile(psdFilePath, function(err, buffer) {
        if (err) return done(err);
        psdFileBuffer.should.to.deep.equal(buffer);
        done();
      });
    });
  });

  it('should convert to PSD file that was blended on a white background, ' +
     'when PNG has an alpha value.', function(done) {

    png2psd(alphaPNGFilePath, function(psdFileBuffer) {
      // read comparison file
      fs.readFile(alphaPSDFilePath, function(err, buffer) {
        if (err) return done(err);
        psdFileBuffer.should.to.deep.equal(buffer);
        done();
      });
    }); 

   });

});
