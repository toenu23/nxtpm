const path = require('path');
const jetpack = require('fs-jetpack');
const archive = require('./archive');
const info = require('./info');
const manifest = require('./manifest');


module.exports = packageName => {

  return info(packageName)
  .then(archive.download)
  .then(archive.verify)
  .then(args => {
    const data = manifest.expand(args.packageInfo);
    jetpack.dir(targetDir);
    jetpack.write(
      path.join(targetDir, config.get('filename')),
      JSON.stringify(data, null, 2)
    );
    return archvie.extract(args.tmpFile, targetDir);
  });

};
