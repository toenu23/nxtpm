module.exports = function run() {

  var APP_NAME = 'nxtpm';
  var VERSION = '0.0.3';

  var fs = require('fs');
  var path = require('path');
  var prompt = require('prompt');
  var config = require('./lib/config.js');

  // Remove default prompt text
  prompt.message = '';
  prompt.delimiter = '';

  var homeDir = process.env.HOME
    || process.env.HOMEPATH
    || process.env.USERPROFILE;

  var confDir = homeDir + '/.nxtpm';
  var configDirExists = fs.existsSync(confDir);
  var configFileExists = fs.existsSync(confDir + '/nxtpm.json');
  if (!configDirExists || !configFileExists) {
    config.createConfig();
    return;
  }

  var command = process.argv[2];
  if (command) {
    command = command.toLowerCase();
  }

  switch (command) {
    case 'init': {
      var init = require('./lib/init.js');
      init.initPackage();
      break;
    }
    case 'config': {
      config.createConfig();
      break;
    }
    case 'install': {
      var alias = process.argv[3];
      var target = process.argv[4];
      if (!alias) {
        return console.log(
          'Usage: nxtpm install <package> <targetdir>'
        );
      }
      var installPackage = require('./lib/install.js');
      installPackage(alias, target);
      break;
    }
    case 'package': {
      var dir = process.argv[3];
      var outfile = process.argv[4];
      if (!dir) {
        return console.log(
          'Usage: nxtpm package <dir> <outfile>'
        );
      }
      var package = require('./lib/package.js');
      package.createPackage(dir, outfile);
      break;
    }
    case 'publish': {
      var dir = process.argv[3];
      if (!dir) {
        return console.log(
          'Usage: nxtpm publish <dir>'
        );
      }
      var publishPackage = require('./lib/publish.js');
      dir = path.resolve(dir);
      publishPackage(dir);
      break;
    }
    default: {
      if (command !== undefined) {
        console.log(
          'Unrecognized command %s',
          command
        );
      }
      console.log(APP_NAME + ' ' + VERSION);
      console.log(
        'Usage: nxtpm <config|install|package|publish> <args>'
      );
    }
  }
};
