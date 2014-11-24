png2psd
=======

convert PNG file to PSD file.

[![Build Status](http://img.shields.io/travis/ynakajima/png2psd/master.svg?style=flat)](http://travis-ci.org/ynakajima/png2psd) [![Code Climate](http://img.shields.io/codeclimate/github/ynakajima/png2psd.svg?style=flat)](https://codeclimate.com/github/ynakajima/png2psd) [![npm version](http://img.shields.io/npm/v/png2psd.svg?style=flat)](https://www.npmjs.org/package/png2psd) [![npm downloads](http://img.shields.io/npm/dm/png2psd.svg?style=flat)](https://www.npmjs.org/package/png2psd) ![dependencies](http://img.shields.io/david/ynakajima/png2psd.svg?style=flat) [![license MIT](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](https://github.com/ynakajima/png2psd/blob/master/LICENSE)

## cli

### install
```sh
npm install -g png2psd
```

### usage
```sh
png2psd source.png export.psd
```

## node module

### install
```sh
npm install png2psd
```

### usage
```node
var png2psd = require('png2psd'),
    fs = require('fs');

// file path
var pngFilePath = 'source.png';
var psdFilePath = 'export.psd';

// convert
png2psd(pngFilePath, function(psdFileBuffer) {
  // save psd file
  fs.writeFile(psdFilePath, psdFileBuffer, function(err) {
    if (err) throw err;
    console.log('save psd file.');
  });
});
```
