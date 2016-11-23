const nxtjs = require('nxtjs');
const info = require('./info');
const config = require('./util/config');
const log = require('./util/log');
const nxt = require('./util/nxt');


module.exports = (packageName, passphrase, dryRun) => {


  const nxtAcc = nxtjs.secretPhraseToAccountId(passphrase);
  const publicKey = nxtjs.secretPhraseToPublicKey(passphrase);
  let signedTx;
  let txId;
  return info(packageName).then(result => {
    txId = result.transaction.transaction;
    return nxt.request({
      requestType: 'extendTaggedData',
      transaction: txId,
      publicKey: publicKey,
      feeNQT: config.get('nxt:extendFee'),
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
    signedTx = nxtjs.signTransactionBytes(
      result.data.unsignedTransactionBytes,
      passphrase
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
