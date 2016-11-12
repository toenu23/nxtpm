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
        if (!result.data || !result.data.transaction) {
          return reject('Package not found');
        }
        let manifest = {};
        let data = result.data.data;
        if (!data) {
          return reject('Transaction has expired');
        }
        if (!result.data.isText) {
          data = Buffer.from(data, 'hex').toString();
        }
        try {
          manifest = JSON.parse(data);
        } catch (e) {
          return reject('Non-JSON data');
        }
        delete result.data.data;
        Object.assign(result.data, manifest);
        const valid = PackageBuilder.validate(result.data);
        if (valid instanceof Error) {
          return reject(valid.message);
        }
        resolve(result.data);
      });
    };


    static install(packageName, targetDir) {
      const parent = this;
      return this.getPackageInfo(packageName)
      .then(this.downloadPackage)
      .then(this.verifyPackage)
      .then(function(tmpFile) {
        return parent.extractPackage(tmpFile, targetDir);
      },
        log.error
      );
    };


    static downloadPackage(packageInfo) {
      const url = packageInfo.resources[packageInfo.version].url;
      const tmpFile = tmp.fileSync();
      const stream = fs.createWriteStream(tmpFile.name);
      return new Promise(function(resolve, reject) {
        request
        .get(url, reject)
        .on('response', function(resp) {
          log.info('GET %s %s', url, resp.statusCode);
          if (resp.statusCode !== 200) {
            return reject('Invalid status code ' + resp.statusCode);
          }
        })
        .on('end', function() {
          resolve({
            manifest: packageInfo,
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
      const manifest = args.manifest;
      const tmpFile = args.tmpFile;
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
          const fullPath = path.resolve(targetDir);
          log.info('Package extracted to %s', fullPath);
          resolve();
        });
      });
    };


    static compressDir(dir, outfile) {
      return new Promise(function(resolve, reject) {
        const compress = new Targz()
        compress.compress(dir, outfile, function(err) {
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


    static extend(packageName, nxtPassphrase) {
      const nxtAcc = nxtjs.secretPhraseToAccountId(nxtPassphrase);
      const publicKey = nxtjs.secretPhraseToPublicKey(nxtPassphrase);
      let signedTx;
      let txId;
      return this.getPackageInfo(packageName)
      .then(function(result) {
        txId = result.transaction;
        return nxt.request({
          requestType: 'extendTaggedData',
          transaction: txId,
          publicKey: publicKey,
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
        signedTx = nxt.sign(
          result.data.unsignedTransactionBytes,
          nxtPassphrase
        );
        return nxt.request({
          requestType: 'broadcastTransaction',
          transactionBytes: signedTx,
        });
      })
      .then(function(result) {
        if (result.data.err) {
          throw new Error(result.data.err);
        }
        log.info('Extended transaction %s', txId);
      },
        // Error handler
        log.error
      );
    };


    publish(nxtPassphrase) {
      const parent = this;
      const manifest = this.manifest;
      const nxtAcc = nxtjs.secretPhraseToAccountId(nxtPassphrase);
      const publicKey = nxtjs.secretPhraseToPublicKey(nxtPassphrase);
      let signedDataTx;
      let signedAliasTx;
      let dataTxId;
      let aliasTxId;
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
        dataTxId = result.data.transaction;
        return nxt.request({
          requestType: 'broadcastTransaction',
          transactionBytes: signedAliasTx,
        });
      })

      .then(function(result) {
        if (result.data.err) {
          throw new Error(result.data.err);
        }
        aliasTxId = result.data.transaction;
        log.info('Transaction setAlias: %s', aliasTxId);
        log.info('Transaction uploadTaggedData: %s', dataTxId);
        log.info('Pubished package %s', parent.manifest.name);
      },
        // Error handler
        log.error
      );
    };


  };


  module.exports = Package;


})();
