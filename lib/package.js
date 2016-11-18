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
  let nxt = new Nxt();


  class Package {


    constructor(manifest) {
      PackageBuilder.validate(manifest);
      this.manifest = manifest;
    };


    static applyConfig() {
      nxt = new Nxt();
    };


    static getPackageInfo(packageName) {
      return nxt.request({
        requestType: 'getAlias',
        aliasName: packageName,
      })
      .then(result => {
        return nxt.request({
          requestType: 'getTaggedData',
          transaction: result.data.aliasURI,
        });
      })
      .then(this.processPackageInfo);
    };


    static processPackageInfo(result) {
      return new Promise((resolve, reject) => {
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
        PackageBuilder.validate(manifest);
        resolve({
          transaction: result.data,
          manifest: manifest,
        });
      });
    };


    static install(packageName, targetDir) {
      return this.getPackageInfo(packageName)
      .then(this.downloadPackage)
      .then(this.verifyPackage)
      .then((tmpFile) => {
        return this.extractPackage(tmpFile, targetDir);
      });
    };


    static downloadPackage(packageInfo) {
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
    };


    static verifyPackage (args) {
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
          resolve(tmpFile);
        });
      });
    };


    static extractPackage(tmpFile, targetDir) {
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
    };


    static compressDir(dir, outfile) {
      return new Promise((resolve, reject) => {
        const compress = new Targz();
        compress.compress(dir, outfile, err => {
          if (err) {
            return reject(err);
          }
          log.info('Created', path.resolve(outfile));
          const hash = crypto.createHash('sha256');
          const stream = fs.createReadStream(outfile);
          stream.on('data', data => {
            hash.update(data, 'utf8');
          });
          stream.on('end', () => {
            const checksum = hash.digest('hex');
            log.info('Checksum %s (sha256)', checksum);
            resolve(checksum);
          });
        });
      });
    };


    static extend(packageName, nxtPassphrase, dryRun) {
      const nxtAcc = nxtjs.secretPhraseToAccountId(nxtPassphrase);
      const publicKey = nxtjs.secretPhraseToPublicKey(nxtPassphrase);
      let signedTx;
      let txId;
      this.getPackageInfo(packageName)
      .then(result => {
        txId = result.transaction.transaction;
        return nxt.request({
          requestType: 'extendTaggedData',
          transaction: txId,
          publicKey: publicKey,
          feeNQT: config.get('nxt:dataFee'),
          deadline: config.get('nxt:deadline'),
        });
      })
      .then(result => {
        if (result.data.errorDescription) {
          throw new Error(result.data.errorDescription);
        }
        if (!result.data.unsignedTransactionBytes) {
          throw new Error('Did not receive transaction bytes');
        }
        if (!nxtPassphrase) {
          return result;
        }
        signedTx = nxt.sign(
          result.data.unsignedTransactionBytes,
          nxtPassphrase
        );
        if (dryRun) {
          log.info('Not broadcasting transaction (dry run)');
          log.info('Printing raw transaction');
          log.info(signedTx);
          return;
        }
        return nxt.request({
          requestType: 'broadcastTransaction',
          transactionBytes: signedTx,
        });
      })
      .then(result => {
        if (!result && dryRun) {
          return log.info('Dry run complete');
        }
        if (result.data.errorDescription) {
          throw new Error(result.data.errorDescription);
        }
        log.info(
          'Extended transaction %s (Extend transaction: %s)',
          txId,
          result.data.transaction
        );
      });
    };


    publish(nxtPassphrase, dryRun) {
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

      .then(result => {
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

      .then(result => {
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

      .then(result => {
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

      .then(result => {
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
        if (dryRun) {
          log.info('Not broadcasting transaction (dry run)');
          log.info('Printing raw transaction (data)');
          log.info(signedDataTx);
          return;
        }
        return nxt.request({
          requestType: 'broadcastTransaction',
          transactionBytes: signedDataTx,
          prunableAttachmentJSON: prunableAttachmentJSON,
        });
      })

      .then(result => {
        if (dryRun) {
          log.info('Not broadcasting transaction (dry run)');
          log.info('Printing raw transaction (alias)');
          log.info(signedAliasTx);
          return;
        }
        if (result.data.err) {
          throw new Error(result.data.err);
        }
        dataTxId = result.data.transaction;
        return nxt.request({
          requestType: 'broadcastTransaction',
          transactionBytes: signedAliasTx,
        });
      })

      .then(result => {
        if (!result && dryRun) {
          return log.info('Dry run complete');
        }
        if (result.data.err) {
          throw new Error(result.data.err);
        }
        aliasTxId = result.data.transaction;
        log.info('Transaction setAlias: %s', aliasTxId);
        log.info('Transaction uploadTaggedData: %s', dataTxId);
        log.info('Pubished package %s', this.manifest.name);
      });
    };


  };


  module.exports = Package;


})();
