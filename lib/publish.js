var fs = require('fs');
var prompt = require('prompt');
var Log = require('log');
var log = new Log();
var nxt = require('./nxt.js');

var config = require('./config.js');
var nxtConfig = config.load();

var requiredBalanceNQT = 200000000;

module.exports = function publishPackage(dir, secretPhrase, callback) {

  var packageInfo;
  var accountRS;
  var publicKey;
  var messageTxBytes;
  var aliasTxBytes;
  var messageTxId;

  var validatePackageInfo = function(data) {

    var required = ['alias', 'url'];

    for (var i = 0; i < required.length; i++) {
      var key = required[i];
      if (!data[key]) {
        log.error('Package is missing field "%s"', key);
        return false;
      }
    }

    for (var k in data) {
      if (typeof data[k] !== 'string') {
        log.error('Field %s is not of type "string"', k);
        return false;
      }
    }
    return true;
  };

  var checkUserAccount = function() {

    publicKey = nxt.jay.secretPhraseToPublicKey(secretPhrase);
    publicKey = nxt.converters.byteArrayToHexString(publicKey);
    accountRS = nxt.jay.publicKeyToAccountId(publicKey, true);

    var query = {
      requestType: 'getAccount',
      account: accountRS,
    };
    nxt.request(query, function(err, resp) {
      if (err) {
        if (callback) {
          callback(err);
        }
        return log.error(err);
      }

      if (resp.balanceNQT < requiredBalanceNQT) {
        err = new Error('Insufficient balance');
        if (callback) {
          callback(err);
        }
        return log.error(err);
      }
      checkAlias();
    });
  };

  var checkAlias = function() {
    var query = {
      requestType: 'getAlias',
      aliasName: packageInfo.alias,
    };
    nxt.request(query, function(err, resp) {
      if (err && err.errorCode !== 5) {
        if (callback) {
          callback(err);
        }
        return log.error(err);
      }
      if (err && err.errorCode === 5) {
        log.info(
          'Available alias %s will be registered',
          packageInfo.alias
        );
      } else if (resp.accountRS !== accountRS) {
        err = new Error('Alias doesn\'t belong to you');
        if (callback) {
          callback(err);
        }
        return log.error(err);
      }
      createMessageTransaction();
    });
  };

  var createMessageTransaction = function() {
    var query = {
      requestType: 'sendMessage',
      recipient: nxtConfig.publish.address,
      publicKey: publicKey,
      message: packageJson,
      messageIsText: true,
      messageIsPrunable: false,
      feeNQT: 100000000,
      deadline: 1440,
    };
    nxt.request(query, function(err, resp) {
      if (err) {
        if (callback) {
          callback(err);
        }
        return log.error(err);
      }
      messageTxBytes = nxt.signTransaction(
        resp.unsignedTransactionBytes,
        secretPhrase
      );
      getMessageTransactionId();
    });
  };

  var getMessageTransactionId = function() {
    var query = {
      requestType: 'parseTransaction',
      transactionBytes: messageTxBytes,
    };
    nxt.request(query, function(err, resp) {
      if (err) {
        if (callback) {
          callback(err);
        }
        return log.error(err);
      }
      messageTxId = resp.transaction;
      createAliasTransaction();
    });
  };

  var createAliasTransaction = function() {
    var query = {
      requestType: 'setAlias',
      aliasName: packageInfo.alias,
      aliasURI: messageTxId,
      publicKey: publicKey,
      feeNQT: 100000000,
      deadline: 1440,
    };
    nxt.request(query, function(err, resp) {
      if (err) {
        if (callback) {
          callback(err);
        }
        return log.error(err);
      }
      aliasTxBytes = nxt.signTransaction(
        resp.unsignedTransactionBytes,
        secretPhrase
      );
      broadcastTransactions();
    });
  };

  var broadcastTransactions = function() {
    var query = {
      requestType: 'broadcastTransaction',
      transactionBytes: messageTxBytes,
    };
    var processResponse = function(err, resp) {
      if (err) {
        if (callback) {
          callback(err);
        }
        return log.error(err);
      }
      log.info('Broadcasted transaction %s', resp.transaction);
    };
    nxt.request(query, processResponse);
    query.transactionBytes = aliasTxBytes;
    nxt.request(query, processResponse);
    if (callback) {
      callback();
    }
  };

  var err;
  var dirExists = fs.existsSync(dir);
  if (!dirExists) {
    err = new Error('Directory doesn\'t exist.');
    if (callback) {
      callback(err)
    }
    return log.error(err);
  }

  var file = dir + '/package.json';
  var fileExists = fs.existsSync(file);
  if (!fileExists) {
    err = new Error('File doesn\'t exist.');
    if (callback) {
      callback(err)
    }
    return log.error(err);
  }

  packageInfo = require(file);
  if (!validatePackageInfo(packageInfo)) {
    err = new Error('Invalid package.');
    if (callback) {
      callback(err)
    }
    return log.error(err);
  }

  var packageJson = JSON.stringify(packageInfo);

  if (!NXTPM.cli) {
    checkUserAccount();
    return;
  }

  var schema = {
    properties: {
      secretPhrase: {
        description: 'Nxt passphrase',
        type: 'string',
        required: true,
        hidden: true,
      },
    },
  };

  prompt.start();
  prompt.get(schema, function(err, result) {
    if (err) {
      if (callback) {
        callback(err);
      }
      return log.error(err);
    }
    secretPhrase = result.secretPhrase;
    checkUserAccount();
  });
};

