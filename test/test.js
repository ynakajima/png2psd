'use strict';
require('mocha');
require('chai').should();

var png2psd = require('../'),
    fs = require('fs'),
    path = require('path'),
    async = require('async'),
    pngFilePath = path.join(__dirname, './fixtures/image.png'),
    psdFilePath = path.join(__dirname, './fixtures/image.psd'),
    alphaPNGFilePath = path.join(__dirname, './fixtures/alpha.png'),
    alphaPSDFilePath = path.join(__dirname, './fixtures/alpha.psd');
    
describe('png2psd', function() {
  this.timeout(10000);

  it('should convert PNG file to PSD file.', function(done) {

    async.parallel([
      function(callback) {
        png2psd(pngFilePath, function(psdFileBuffer) {
          // read comparison file
          fs.readFile(psdFilePath, function(err, buffer) {
            if (err) return callback(err);
            psdFileBuffer.should.to.deep.equal(buffer);
            callback();
          });
        });
      },
      function(callback) {
        // alpha channel
        png2psd(alphaPNGFilePath, function(psdFileBuffer) {
          // read comparison file
          fs.readFile(alphaPSDFilePath, function(err, buffer) {
            if (err) return callback(err);
            psdFileBuffer.should.to.deep.equal(buffer);
            callback();
          });
        });
      }], function(err) {
        if (err) return done(err);
        done();
      });

  });
});


