(function() {


  const path = require('path');
  const jetpack = require('fs-jetpack');
  const prompt = require('prompt');
  const semver = require('semver');
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
          this.publish();
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
        log.info('[transaction]', data.id);
        for (var key in data.manifest) {
          log.info('[' + key + ']', data.manifest[key]);
        }
      },
        // Error handler
        log.error
      );
    };


    install(packageName, targetDir) {
      if (!targetDir) {
        targetDir = path.join(__dirname, '..')
      }
      Package.install(packageName, targetDir);
    }


    publish() {
      const packageFile = path.join(process.cwd(), config.get('filename'));
      if (!jetpack.exists(packageFile)) {
        return log.error('Missing ' + config.get('filename'));
      }
      const manifest = jetpack.read(packageFile, 'json');
      const pkg = new Package(manifest);
      if (pkg instanceof Error) {
        return log.error(pkg.message);
      }
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
      prompt.start();
      prompt.get(schema, function(err, result) {
        pkg.publish(result.passphrase);
      });
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
      log.info('Usage: nxtpm <install|publish|package|help>')
    };


  };


  module.exports = NxtpmCli;


})();
