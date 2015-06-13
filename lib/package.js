var fs = require('fs');
var crypto = require('crypto');
var path = require('path');
var prompt = require('prompt');
var Targz = require('tar.gz');
var Log = require('log');
var log = new Log();

var checksum;

var compressDir = function(dir, outfile, callback) {
  log.info('Packaging %s to %s', dir, outfile);
  var compress = new Targz().compress(dir, outfile, function(err) {
    if (err) {
      return log.error(err);
    }
    log.info('Packaging successful.');
    var hash = crypto.createHash('sha256');
    var stream = fs.createReadStream(outfile);
    stream.on('data', function(data) {
      hash.update(data, 'utf8');
    });
    stream.on('end', function() {
      checksum = hash.digest('hex');
      log.info('SHA256 checksum: %s', checksum);
      if (NXTPM.cli) {
        updatePackagePrompt(dir);
      } else {
        updatePackage(dir, callback);
      }
    });
  });
};

var updatePackagePrompt = function(dir) {
  var schema = {
    properties: {
      update: {
        description: 'Update package.json with new checksum? [Y/N]',
        type: 'string',
        default: 'Y',
        required: true,
      },
    },
  };
  prompt.start();
  prompt.get(schema, function(err, result) {
    if (err) {
      return log.error(err);
    }
    var update = result.update.toUpperCase();
    if (update === 'Y') {
      updatePackage(dir);
    }
  });
};

var updatePackage = function(dir, callback) {
  var absDir = path.resolve(dir);
  var packageFile = absDir + '/package.json';
  var fileExists = fs.existsSync(packageFile);
  var packageObj = {};
  if (fileExists) {
    packageObj = require(packageFile);
  }
  packageObj.sha256 = checksum;
  packageJson = JSON.stringify(packageObj, null, 2);
  fs.writeFile(packageFile, packageJson, function(err) {
    if (err) {
      return log.error(err);
    }
    log.info('Updated file %s', packageFile);
    if (callback) {
      callback();
    }
  });
};

var createPackage = function(dir, outfile, callback) {
  var dirExists = fs.existsSync(dir);
  if (!dirExists) {
    return log.error('Path %s doesn\'t exist', dir);
  }

  var stats = fs.statSync(dir);
  if (!stats.isDirectory()) {
    return log.error('%s is not a directory', dir);
  }

  var outfileExists = fs.existsSync(outfile);
  if (!outfileExists) {
    compressDir(dir, outfile, callback);
    return;
  }

  var schema = {
    properties: {
      replace: {
        description: 'File already exists. Overwrite? [Y/N]',
        type: 'string',
        default: 'N',
        required: true,
      },
    },
  };

  prompt.start();
  prompt.get(schema, function(err, result) {
    if (err) {
      return log.error(err);
    }
    var replace = result.replace.toUpperCase();
    if (replace === 'Y') {
      log.info('Deleting %s', outfile);
      fs.unlink(outfile, function(err) {
        if (err) {
          return log.error(err);
        }
        compressDir(dir, outfile);
      });
      return;
    }
    log.info('Aborted.');
  });
};

module.exports = {
  compressDir: compressDir,
  updatePackagePrompt: updatePackagePrompt,
  updatePackage: updatePackage,
  createPackage: createPackage,
};

