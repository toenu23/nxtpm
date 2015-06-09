var fs = require('fs');
var url = require('url');
var prompt = require('prompt');
var Log = require('log');
var log = new Log();

var NXTPM_ACCOUNT = 'NXT-PACK-JWE9-VGPZ-CZN9D';

var homeDir = process.env.HOME
  || process.env.HOMEPATH
  || process.env.USERPROFILE;
var confDir = homeDir + '/.nxtpm';
var confPath = confDir + '/nxtpm.json';

module.exports = {

  load: function() {
    var configObj = require(confPath);
    return configObj;
  },

  createConfig: function() {
    var nxtUrl;
    var confDirExists = fs.existsSync(confDir);

    var createConfDir = function() {
      fs.mkdir(confDir, function(err) {
        if (err) {
          return log.error(err);
        }
        writeConfFile();
      });
    };

    var writeConfFile = function() {
      var confObj = {
        publish: {
          address: NXTPM_ACCOUNT,
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
          return log.error(err);
        }
        log.info('Config written to %s', confPath);
      });
    };

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

