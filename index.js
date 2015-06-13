module.exports = function run(command, args, callback) {

  global.NXTPM = {
    appName: 'nxtpm',
    version: '0.0.4',
    account: 'NXT-PACK-JWE9-VGPZ-CZN9D',
  };

  var fs = require('fs');
  var path = require('path');
  var prompt = require('prompt');
  var config = require('./lib/config.js');

  // Remove default prompt text
  prompt.message = '';
  prompt.delimiter = '';

  if (!command) {
    NXTPM.cli = true;
    command = process.argv[2];
  }
  if (command) {
    command = command.toLowerCase();
  }

  var homeDir = process.env.HOME
    || process.env.HOMEPATH
    || process.env.USERPROFILE;

  var confDir = homeDir + '/.' + NXTPM.appName;
  var configDirExists = fs.existsSync(confDir);
  var configFileExists = fs.existsSync(confDir + '/' + NXTPM.appName + '.json');
  if (!configDirExists || !configFileExists) {
    config.createConfig(args);
    return;
  }

  switch (command) {
    case 'init': {
      var init = require('./lib/init.js');
      init.initPackage(args, callback);
      break;
    }
    case 'config': {
      config.createConfig(args, callback);
      break;
    }
    case 'install': {
      var alias = NXTPM.cli
        ? process.argv[3]
        : args.alias;
      var target = NXTPM.cli
        ? process.argv[4]
        : args.target;
      if (!alias) {
        return console.log(
          'Usage: %s install <package> <targetdir>',
          NXTPM.appName
        );
      }
      var installPackage = require('./lib/install.js');
      installPackage(alias, target, callback);
      break;
    }
    case 'package': {
      var dir = NXTPM.cli
        ? process.argv[3]
        : args.dir;
      var outfile = NXTPM.cli
        ? process.argv[4]
        : args.outfile;
      if (!dir) {
        return console.log(
          'Usage: %s package <dir> <outfile>',
          NXTPM.appName
        );
      }
      var package = require('./lib/package.js');
      package.createPackage(dir, outfile, callback);
      break;
    }
    case 'publish': {
      var dir = NXTPM.cli
        ? process.argv[3]
        : args.dir;
      var secretPhrase = NXTPM.cli
        ? null
        : args.secretPhrase;
      if (!dir) {
        return console.log(
          'Usage: %s publish <dir>',
          NXTPM.appName
        );
      }
      var publishPackage = require('./lib/publish.js');
      dir = path.resolve(dir);
      publishPackage(dir, secretPhrase, callback);
      break;
    }
    default: {
      if (command !== undefined) {
        console.log(
          'Unrecognized command %s',
          command
        );
      }
      console.log(NXTPM.appName + ' ' + NXTPM.version);
      console.log(
        'Usage: %s <config|install|init|package|publish> <args>',
        NXTPM.appName
      );
    }
  }
};

