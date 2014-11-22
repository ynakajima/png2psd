png2psd
=======

convert PNG file to PSD file.

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