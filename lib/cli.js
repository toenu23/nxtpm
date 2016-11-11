(function() {


  const path = require('path');
  const jetpack = require('fs-jetpack');
  const prompt = require('prompt');
  const config = require('./config');
  const log = require('./log');
  const Package = require('./package');
  const PackageBuilder = require('./packageBuilder');


  class NxtpmCli {


    constructor() {
      // Remove default prompt text
      prompt.message = '';
      prompt.delimiter = '';
    };


    getSecretPhrase() {
      const schema = {
        properties: {
          passphrase: {
            description: 'Nxt secret phrase:',
            type: 'string',
            hidden: true,
            required: true,
          },
        },
      };
      return new Promise(function(resolve, reject) {
        prompt.start();
        prompt.get(schema, function(err, result) {
          if (err) {
            return reject(err);
          }
          resolve(result.passphrase);
        });
      });
    };


    run() {
      const command = process.argv[2];
      switch (command) {
        case 'info': {
          this.info(process.argv[3]);
          break;
        }
        case 'install': {
          this.install(process.argv[3], process.argv[4]);
          break;
        }
        case 'publish': {
          this.publish(process.argv[3]);
          break;
        }
        case 'extend': {
          this.extend(process.argv[3]);
          break;
        }
        case 'package': {
          this.package(process.argv[3], process.argv[4]);
          break;
        }
        case 'help': {
          this.showHelp();
          break;
        }
        default: {
          this.showHelp();
        }
      }
    };


    info(packageName) {
      Package.getPackageInfo(packageName).then(function(data) {
        for (var key in data) {
          log.info('[' + key + ']', data[key]);
        }
      },
        // Error handler
        log.error
      );
    };


    install(packageName, targetDir) {
      if (!targetDir) {
        targetDir = path.join(__dirname, '..');
      }
      Package.install(packageName, targetDir);
    }


    extend(packageName) {
      this.getSecretPhrase()
      .then(function(secretPhrase) {
        Package.extend(packageName, secretPhrase);
      },
        log.error
      );
    };


    publish(manifestPath) {
      let packageFile = manifestPath
        ? manifestPath
        : path.join(process.cwd(), config.get('filename'));
      if (!jetpack.exists(packageFile)) {
        return log.error('Missing ' + config.get('filename'));
      }
      const manifest = jetpack.read(packageFile, 'json');
      const pkg = new Package(manifest);
      if (pkg instanceof Error) {
        return log.error(pkg.message);
      }
      this.getSecretPhrase()
      .then(function(passphrase) {
        pkg.publish(passphrase)
      },
        log.error
      );
    }


    package(dir, outfile) {
      if (!dir) {
        dir = '.';
      }
      if (!outfile) {
        outfile = './package.tgz';
      }
      const packageFile = path.join(dir, config.get('filename'));
      if (!jetpack.exists(packageFile)) {
        return log.error('Manifest not found at', path.resolve(packageFile));
      }
      let manifest = jetpack.read(packageFile, 'json');
      const result = PackageBuilder.validate(manifest);
      if (result instanceof Error) {
        return log.error(result);
      }
      if (jetpack.exists(outfile)) {
        return log.error('File already exists at', path.resolve(outfile));
      }
      Package.compressDir(dir, outfile)
      .then(function(checksum) {
        const schema = {
          properties: {
            update: {
              description: 'Update ' + config.get('filename') + '? [Y/N]',
              type: 'string',
              default: 'Y',
              required: true,
            },
            version: {
              description: 'Version',
              type: 'string',
              required: true,
            },
            url: {
              description: 'Package URL',
              type: 'string',
              required: true,
            },
          },
        };
        prompt.start();
        prompt.get(schema, function(err, result) {
          if (result.update !== 'Y') {
            return;
          }
          manifest.version = result.version;
          manifest.resources[result.version] = {
            url: result.url,
            sha256: checksum,
          };
          const valid = PackageBuilder.validate(manifest);
          if (valid instanceof Error) {
            return log.error(valid);
          }
          jetpack.write(packageFile, JSON.stringify(manifest));
        });
      });
    };


    showHelp() {
      log.info('Usage: nxtpm <install|publish|package|help>');
    };

  };


  module.exports = NxtpmCli;


})();
