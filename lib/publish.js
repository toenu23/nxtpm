const nxtjs = require('nxtjs');
const manifest = require('./manifest');
const config = require('./util/config');
const log = require('./util/log');
const nxt = require('./util/nxt');


module.exports = (mft, passphrase, dryRun) => {


  const nxtAcc = nxtjs.secretPhraseToAccountId(passphrase);
  const publicKey = nxtjs.secretPhraseToPublicKey(passphrase);
  let signedDataTx;
  let signedAliasTx;
  let dataTxId;
  let aliasTxId;
  let prunableAttachmentJSON;

  return nxt.request({
    requestType: 'getAlias',
    aliasName: mft.name,
  })

  .then(result => {
    if (result.data.errorCode && result.data.errorCode !== 5) {
      throw new Error(result.data.errorDescription);
    }
    if (result.data.accountRS && (result.data.accountRS !== nxtAcc)) {
      throw new Error('Alias doesn\'t belong to you');
    }
    const data = JSON.stringify(
      manifest.compact(mft)
    );
    const feeNXT = (1 + (Math.ceil((data.length - 1024)  / 1024) * 0.1));
    return nxt.request({
      requestType: 'uploadTaggedData',
      name: mft.name,
      description: mft.description,
      tags: mft.tags,
      channel: mft.channel,
      publicKey: publicKey,
      data: Buffer.from(data).toString('hex'),
      filename: config.get('filename'),
      type: 'application/json',
      isText: false,
      feeNQT: Math.round(feeNXT * 100000000),
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
    prunableAttachmentJSON = JSON.stringify(
      result.data.transactionJSON.attachment
    );
    signedDataTx = nxtjs.signTransactionBytes(
      result.data.unsignedTransactionBytes,
      passphrase
    );
    return nxt.request({
      requestType: 'parseTransaction',
      transactionBytes: signedDataTx,
      prunableAttachmentJSON: prunableAttachmentJSON,
    });
  })

  .then(result => {
    if (result.data.errorDescription) {
      throw new Error(result.data.errorDescription);
    }
    if (!result.data.transaction) {
      throw new Error('Did not receive transaction id');
    }
    return nxt.request({
      requestType: 'setAlias',
      aliasName: mft.name,
      aliasURI: result.data.transaction,
      publicKey: publicKey,
      feeNQT: config.get('nxt:aliasFee'),
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
    signedAliasTx = nxtjs.signTransactionBytes(
      result.data.unsignedTransactionBytes,
      passphrase
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
    if (result.data.errorDescription) {
      throw new Error(result.data.errorDescription);
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
    if (result.data.errorDescription) {
      throw new Error(result.data.errorDescription);
    }
    aliasTxId = result.data.transaction;
    log.info('Transaction setAlias: %s', aliasTxId);
    log.info('Transaction uploadTaggedData: %s', dataTxId);
    log.info('Pubished package %s', mft.name);
  });


};
