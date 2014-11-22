'use strict';
require('mocha');
require('chai').should();

var png2psd = require('../'),
    fs = require('fs'),
    path = require('path'),
    fixturesDir = path.join(__dirname, './fixtures/');
    
describe('png2psd', function() {

  it('should convert RGB PNG file to RGB PSD file.', function(done) {
    this.timeout(8000);
    test('rgb', done);
  });

  it('should convert RGBA PNG file to RGBA PSD file.', function(done) {
    this.timeout(8000);
    test('rgba', done);
  });

  it('should convert Grayscale PNG file ' + 
     'to Grayscale PSD file.', function(done) {
    this.timeout(8000);
    test('gray', done);
  });

  it('should convert Grayscale (with Alpha) PNG file ' +
     'to Grayscale (with Alpha) PSD file.', function(done) {
    this.timeout(8000);
    test('graya', done);
  });

});

function test(colorspace, done) {
  var pngFilePath = path.join(fixturesDir, colorspace + '.png');
  var psdFilePath = path.join(fixturesDir, colorspace + '.psd');
  
  // conver
  png2psd(pngFilePath, function(psdFileBuffer) {
    // read comparison file
    fs.readFile(psdFilePath, function(err, buffer) {
      if (err) return done(err);
      psdFileBuffer.should.to.deep.equal(buffer);
      done();
    });
  });
}

