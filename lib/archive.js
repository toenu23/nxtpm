const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const request = require('request');
const tmp = require('tmp');
const Targz = require('tar.gz');
const jetpack = require('fs-jetpack');
const config = require('./util/config');
const log = require('./util/log');


module.exports = {


  extract: (tmpFile, targetDir) => {
    return new Promise((resolve, reject) => {
      const compress = new Targz();
      compress.extract(tmpFile.name, targetDir, err => {
        if (err) {
          return reject(err);
        }
        const fullPath = path.resolve(targetDir);
        log.info('Package extracted to %s', fullPath);
        resolve();
      });
    });
  },


  create: (dir, outfile) => {
    // Move nxtpm.json to tmp dir
    let tempFile;
    const manifest = path.resolve(
      path.join(dir, config.get('filename'))
    );
    if (jetpack.exists(manifest)) {
      tempFile = tmp.tmpNameSync();
      jetpack.move(manifest, tempFile);
    }
    const compress = new Targz();
    return new Promise((resolve, reject) => {
      compress.compress(dir, outfile, err => {
        if (err) {
          return reject(err);
        }
        log.info('Created', path.resolve(outfile));
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(outfile);
        stream.on('data', data => hash.update(data, 'utf8'));
        stream.on('end', () => {
          const checksum = hash.digest('hex');
          log.info('Checksum %s (sha256)', checksum);
          if (tempFile) {
            jetpack.move(tempFile, manifest);
          }
          resolve(checksum);
        });
      });
    });
  },


  download: packageInfo => {
    const manifest = packageInfo.manifest;
    const url = manifest.resources[manifest.version].url;
    const tmpFile = tmp.fileSync();
    const stream = fs.createWriteStream(tmpFile.name);
    return new Promise((resolve, reject) => {
      request
      .get(url, reject)
      .on('response', resp => {
        log.info('GET %s %s', url, resp.statusCode);
        if (resp.statusCode !== 200) {
          return reject('Invalid status code ' + resp.statusCode);
        }
      })
      .on('end', () => {
        resolve({
          packageInfo: packageInfo,
          tmpFile: tmpFile,
        });
      })
      .on('error', reject)
      .pipe(stream);
    });
  },


  verify: args => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(args.tmpFile.name);
    const manifest = args.packageInfo.manifest;
    const tmpFile = args.tmpFile;
    return new Promise((resolve, reject) => {
      stream.on('data', data => {
        hash.update(data, 'utf8');
      });
      stream.on('end', () => {
        var checksum = hash.digest('hex');
        if (checksum !== manifest.resources[manifest.version].sha256) {
          return reject('Couldn\'t verify package');
        }
        log.info('Verification passed.');
        log.info('SHA256: %s', checksum);
        resolve(args);
      });
    });
  },


};
