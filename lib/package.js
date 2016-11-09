(function() {


  const fs = require('fs');
  const crypto = require('crypto');
  const path = require('path');
  const request = require('request');
  const tmp = require('tmp');
  const Targz = require('tar.gz');
  const nxtjs = require('nxtjs');
  const config = require('./config');
  const log = require('./log');
  const PackageBuilder = require('./packageBuilder');
  const Nxt = require('./nxt');
  const nxt = new Nxt();


  class Package {


    constructor(manifest) {
      const result = PackageBuilder.validate(manifest);
      if (result instanceof Error) {
        return result;
      }
      this.manifest = manifest;
    };


    static getPackageInfo(packageName) {
      return nxt.request({
        requestType: 'getAlias',
        aliasName: packageName,
      })
      .then(function(result) {
        return nxt.request({
          requestType: 'getTaggedData',
          transaction: result.data.aliasURI,
        });
      })
      .then(this.processPackageInfo, log.error);
    };


    static processPackageInfo(result) {
      return new Promise(function(resolve, reject) {
        if (!result.data.transaction) {
          return reject('Package not found');
        }
        let manifest = {};
        let data = result.data.data;
        if (!result.data.isText) {
          data = Buffer.from(data, 'hex').toString();
        }
        try {
          manifest = JSON.parse(data);
        } catch (e) {
          return reject('Non-JSON data');
        }
        manifest.name = result.data.name;
        manifest.description = result.data.description;
        manifest.channel = result.data.channel;
        const valid = PackageBuilder.validate(manifest);
        if (valid instanceof Error) {
          return reject(valid.message);
        }
        resolve({
          id: result.data.transaction,
          manifest: manifest,
        });
      });
    };


    static install(packageName, targetDir) {
      return this.getPackageInfo(packageName)
      .then(this.downloadPackage)
      .then(this.verifyPackage)
      .then(function(tmpFile) {
        return this.extractPackage(tmpFile, targetDir);
      },
        log.error
      );
    };


    static downloadPackage(packageInfo) {
      const manifest = packageInfo.manifest;
      const url = manifest.resources[manifest.version].url;
      const tmpFile = tmp.fileSync();
      const stream = fs.createWriteStream(tmpFile.name);
      return new Promise(function(resolve, reject) {
        request
        .get(url)
        .on('response', function(resp) {
          log.info('GET %s %s', url, resp.statusCode);
          if (resp.statusCode !== 200) {
            reject('Invalid status code ' + resp.statusCode);
          }
        })
        .on('end', function() {
          resolve({
            manifest: manifest,
            tmpFile: tmpFile,
          });
        })
        .on('error', reject)
        .pipe(stream);
      });
    };


    static verifyPackage (args) {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(args.tmpFile.name);
      return new Promise(function(resolve, reject) {
        stream.on('data', function(data) {
          hash.update(data, 'utf8');
        });
        stream.on('end', function() {
          var checksum = hash.digest('hex');
          if (checksum !== manifest.resources[manifest.version].sha256) {
            return reject('Couldn\'t verify package');
          }
          log.info('Verification passed.');
          log.info('SHA256: %s', checksum);
          resolve(tmpFile);
        });
      });
    };


    static extractPackage(tmpFile, targetDir) {
      return new Promise(function(resolve, reject) {
        const compress = new Targz();
        compress.extract(tmpFile.name, targetDir, function(err) {
          if (err) {
            return reject(err);
          }
          const fullPath = path.resolve(target);
          log.info('Package extracted to %s', fullPath);
          resolve();
        });
      });
    };


    static compressDir(dir, outfile) {
      return new Promise(function(resolve, reject) {
        const compress = new Targz().compress(dir, outfile, function(err) {
          if (err) {
            return reject(err);
          }
          log.info('Packaging successful.');
          const hash = crypto.createHash('sha256');
          const stream = fs.createReadStream(outfile);
          stream.on('data', function(data) {
            hash.update(data, 'utf8');
          });
          stream.on('end', function() {
            const checksum = hash.digest('hex');
            log.info('SHA256 checksum: %s', checksum);
            resolve(checksum);
          });
        });
      });
    };


    publish(nxtPassphrase) {
      const manifest = this.manifest;
      const nxtAcc = nxtjs.secretPhraseToAccountId(nxtPassphrase);
      const publicKey = nxtjs.secretPhraseToPublicKey(nxtPassphrase);
      let signedDataTx;
      let signedAliasTx;
      let prunableAttachmentJSON;

      nxt.request({
        requestType: 'getAlias',
        aliasName: manifest.name,
      })

      .then(function(result) {
        if (result.data.err && result.data.err.errorCode !== 5) {
          throw new Error(result.data.err);
        }
        if (result.data.accountRS && (result.data.accountRS !== nxtAcc)) {
          throw new Error('Alias doesn\'t belong to you');
        }
        return nxt.request({
          requestType: 'uploadTaggedData',
          name: manifest.name,
          description: manifest.description,
          tags: manifest.tags,
          channel: manifest.channel,
          publicKey: publicKey,
          data: Buffer.from(JSON.stringify(manifest)).toString('hex'),
          filename: config.get('filename'),
          type: 'application/json',
          isText: false,
          feeNQT: config.get('nxt:dataFee'),
          deadline: config.get('nxt:deadline'),
        });
      })

      .then(function(result) {
          if (result.data.err) {
            throw new Error(result.data.err);
          }
          if (!result.data.unsignedTransactionBytes) {
            throw new Error('Did not receive transaction bytes');
          }
          prunableAttachmentJSON = JSON.stringify(
            result.data.transactionJSON.attachment
          );
          signedDataTx = nxt.sign(
            result.data.unsignedTransactionBytes,
            nxtPassphrase
          );
          return nxt.request({
            requestType: 'parseTransaction',
            transactionBytes: signedDataTx,
          });
        })

      .then(function(result) {
        if (result.data.err) {
          throw new Error(result.data.err);
        }
        if (!result.data.transaction) {
          throw new Error('Did not receive transaction id');
        }
        return nxt.request({
          requestType: 'setAlias',
          aliasName: manifest.name,
          aliasURI: result.data.transaction,
          publicKey: publicKey,
          feeNQT: config.get('nxt:aliasFee'),
          deadline: config.get('nxt:deadline'),
        });
      })

      .then(function(result) {
        if (result.data.err) {
          throw new Error(result.data.err);
        }
        if (!result.data.unsignedTransactionBytes) {
          throw new Error('Did not receive transaction bytes');
        }
        signedAliasTx = nxt.sign(
          result.data.unsignedTransactionBytes,
          nxtPassphrase
        );
        return nxt.request({
          requestType: 'broadcastTransaction',
          transactionBytes: signedDataTx,
          prunableAttachmentJSON: prunableAttachmentJSON,
        });
      })

      .then(function(result) {
        if (result.data.err) {
          throw new Error(result.data.err);
        }
        return nxt.request({
          requestType: 'broadcastTransaction',
          transactionBytes: signedAliasTx,
        });
      })

      .then(function(result) {
        if (result.data.err) {
          throw new Error(result.data.err);
        }
      },
        // Error handler
        log.error
      );
    };


  };


  module.exports = Package;


})();
