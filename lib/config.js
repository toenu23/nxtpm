var fs = require('fs');
var url = require('url');
var prompt = require('prompt');
var Log = require('log');
var log = new Log();

var homeDir = process.env.HOME
  || process.env.HOMEPATH
  || process.env.USERPROFILE;
var confDir = homeDir + '/.' + NXTPM.appName;
var confPath = confDir + '/' + NXTPM.appName + '.json';

module.exports = {

  load: function() {
    var configObj = require(confPath);
    return configObj;
  },

  createConfig: function(args, callback) {
    var nxtUrl;
    var confDirExists = fs.existsSync(confDir);

    var createConfDir = function(callback) {
      fs.mkdir(confDir, function(err) {
        if (err) {
          if (callback) {
            callback(err);
          }
          return log.error(err);
        }
        writeConfFile(callback);
      });
    };

    var writeConfFile = function(callback) {
      var confObj = {
        publish: {
          address: NXTPM.account,
        },
        api: nxtUrl,
      };
      var confJson = JSON.stringify(confObj, null, 2);
      var confFileExists = fs.existsSync(confPath);
      if (confFileExists) {
        fs.unlinkSync(confPath);
      }
      fs.writeFile(confPath, confJson, function(err) {
        if (err) {
          if (callback) {
            callback(err);
          }
          return log.error(err);
        }
        log.info('Config written to %s', confPath);
        if (callback) {
          callback();
        }
      });
    };

    if (!NXTPM.cli) {
      nxtUrl = args;
      if (!confDirExists) {
        createConfDir(callback);
      } else {
        writeConfFile(callback);
      }
      return;
    }

    var schema = {
      properties: {
        configure: {
          description: 'Configure nxtpm? [Y/N]',
          type: 'string',
          required: true,
          default: 'Y',
        },
      },
    };
    prompt.start();
    prompt.get(schema, function(err, result) {
      if (err) {
        return log.error(err);
      }
      var configure = result.configure.toUpperCase();
      if (configure !== 'Y') {
        return;
      }

      var schema = {
        properties: {
          nxtHost: {
            description: 'Nxt host address',
            type: 'string',
            required: true,
            default: 'http://127.0.0.1:7876',
          },
        },
      };

      prompt.start();
      prompt.get(schema, function(err, result) {
        if (err) {
          return log.error(err);
        }
        nxtHost = result.nxtHost;
        nxtUrl = url.parse(nxtHost);
        if (!nxtUrl.protocol || !nxtUrl.hostname || !nxtUrl.port) {
          return log.error('Invalid URL');
        }
        nxtUrl.pathname = '/nxt';
        for (var k in nxtUrl) {
          if (
            k !== 'protocol' &&
            k !== 'hostname' &&
            k !== 'port' &&
            k !== 'pathname'
          ) {
            delete(nxtUrl[k]);
          }
        }
        if (!confDirExists) {
          createConfDir();
        } else {
          writeConfFile();
        }
      });
    });
  },
};

