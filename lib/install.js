var fs = require('fs');
var crypto = require('crypto');
var Targz = require('tar.gz');
var Log = require('log');
var log = new Log();
var url = require('url');
var request = require('request');
var tmp = require('tmp');

var nxt = require('./nxt.js');
var config = require('./config.js');
var nxtConfig = config.load();

module.exports = function installPackage(alias, target) {

  var aliasData;
  var packageInfo;
  var tmpFile;

  var checkAlias = function() {
    var query = {
      requestType: 'getAlias',
      aliasName: alias,
    };
    nxt.request(query, function(err, resp) {
      if (err) {
        return log.error(err);
      }
      if (isNaN(resp.aliasURI)) {
        return log.error(
          'Invalid alias data %s',
          resp.aliasURI
        );
      }
      aliasData = resp.aliasURI;
      checkMessage();
    });
  };

  var checkMessage = function() {
    var query = {
      requestType: 'getTransaction',
      transaction: aliasData,
    };
    nxt.request(query, function(err, resp) {
      if (err) {
        return log.error(err);
      }
      if (resp.recipientRS !== nxtConfig.publish.address) {
        return log.error(
          'Transaction doesn\'t belong to publishing account'
        );
      }
      if (!resp.attachment || !resp.attachment.message) {
        return log.error(
          'Transaction has no message'
        );
      }
      try {
        packageInfo = JSON.parse(resp.attachment.message);
      } catch (e) {
        log.error(e);
        return log.error(
          'Message is not valid JSON'
        );
      }
      checkPackage();
    });
  };

  var checkPackage = function() {
    if (!packageInfo.alias || packageInfo.alias != alias) {
      return log.error(
        'Alias mismatch: %s / %s',
        packageInfo.alias, alias
      );
    }
    if (!packageInfo.url) {
      return log.error(
        'Package missing required field "url"'
      );
    }
    var packageUrl = url.parse(packageInfo.url);
    if (!packageUrl) {
      return log.error(
        'Invalid URL %s',
        packageUrl
      );
    }
    downloadPackage();
  };

  var downloadPackage = function() {

    tmpFile = tmp.fileSync();
    var stream = fs.createWriteStream(tmpFile.name);

    request
      .get(packageInfo.url)
      .on('response', function(resp) {
        log.info(
          'GET %s %s',
          packageInfo.url,
          resp.statusCode
        );
        if (resp.statusCode !== 200) {
          log.error(
            'Received invalid response code %d',
            resp.statusCode
          );
        }
      })
      .on('error', function(err) {
        log.error(err);
      })
      .on('end', function() {
        verifyPackage();
      })
      .pipe(stream);
  };

  var verifyPackage = function() {
    var hash = crypto.createHash('sha256');
    var stream = fs.createReadStream(tmpFile.name);
    stream.on('data', function(data) {
      hash.update(data, 'utf8');
    });
    stream.on('end', function() {
      var checksum = hash.digest('hex');
      if (checksum !== packageInfo.sha256) {
        return log.error(
          'Couldn\'t verify package'
        );
      }
      log.info(
        'Verification passed. SHA256 checksum: %s',
        checksum
      );
      extractPackage();
    });
  };

  var extractPackage = function() {
    var compress = new Targz().extract(tmpFile.name, target, function(err) {
      if (err) {
        return log.error(err);
      }
      log.info(
        'Package extracted to %s',
        target
      );
    });
  };

  if (!target) {
    target = '.';
  }

  var dirExists = fs.existsSync(target);
  if (!dirExists) {
    return log.error(
      'Path %s doesn\'t exist',
      target
    );
  }
  checkAlias();
};

