var fs = require('fs');
var prompt = require('prompt');
var Log = require('log');
var log = new Log();

var packageMeta = require('../data/package_meta.json');
packageMeta.alias.pattern = /^[a-z0-9]+$/i;

var writePackageFile = function(path, packageInfo, callback) {
  var json = JSON.stringify(packageInfo, null, 2);
  fs.writeFile(path, json, function(err) {
    if (err) {
      log.error(err);
    }
    if (callback) {
      callback();
    }
  });
};

var initPackage = function(args) {
  var promptUserInfo = function(packageInfo) {
    for (var k in packageInfo) {
      if (packageMeta[k]) {
        packageMeta[k].default = packageInfo[k];
      }
    }
    var schema = {
      properties: packageMeta,
    };
    prompt.start();
    prompt.get(schema, function(err, result) {
      if (err) {
        return log.error(err);
      }
      writePackageFile('./package.json', result);
    });
  };

  if (!NXTPM.cli) {
    var path = args.path + '/package.json';
    writePackageFile(path, args.packageInfo);
    return;
  }

  var cwd = process.cwd();
  var path = cwd + '/package.json';
  fs.exists(path, function(exists) {
    var packageInfo = {};
    if (exists) {
      packageInfo = require(path);
    }
    promptUserInfo(packageInfo);
  });
};

module.exports = {
  writePackageFile: writePackageFile,
  initPackage: initPackage,
};

