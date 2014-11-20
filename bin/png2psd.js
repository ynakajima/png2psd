#!env node
'use strict';
var png2psd = require('../'),
    fs = require('fs');

if (process.argv.length < 4) {
  console.error('usage: png2psd source.png export.psd');
  process.exit(1);
}

// file path
var pngFilePath = process.argv[2];
var psdFilePath = process.argv[3];

// convert
png2psd(pngFilePath, function(psdFileBuffer) {
  fs.writeFile(psdFilePath, psdFileBuffer, function(err) {
    if (err) throw err;
  });
});

