const path = require('path');
const jetpack = require('fs-jetpack');
const archive = require('./archive');
const info = require('./info');
const manifest = require('./manifest');
const config = require('./util/config');


module.exports = (packageName, targetDir) => {

  targetDir = targetDir || process.cwd();
  const dir = path.join(targetDir, packageName);
  jetpack.dir(dir);
  if (jetpack.list(dir).length > 0) {
    throw new Error('Target directory is not empty');
  }
  return info(packageName)
  .then(archive.download)
  .then(archive.verify)
  .then(args => {
    const data = manifest.expand(args.packageInfo);
    jetpack.write(
      path.join(dir, config.get('filename')),
      JSON.stringify(data, null, 2)
    );
    return archive.extract(args.tmpFile, targetDir);
  });

};
