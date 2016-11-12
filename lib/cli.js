(function() {


  const path = require('path');
  const jetpack = require('fs-jetpack');
  const prompt = require('prompt');
  const config = require('./config');
  const log = require('./log');
  const Package = require('./package');
  const PackageBuilder = require('./packageBuilder');


  class NxtpmCli {


    constructor(args) {
      this.args = args;
      prompt.message = '';
      prompt.delimiter = '';
    };


    run() {
      if (this.args.install) return this.install();
      if (this.args.init)    return this.init();
      if (this.args.package) return this.package();
      if (this.args.publish) return this.publish();
      if (this.args.extend)  return this.extend();
      if (this.args.info)    return this.info();
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


    info() {
      const packageName = this.args['<package>'];
      Package.getPackageInfo(packageName).then(function(data) {
        for (var key in data) {
          log.info('[' + key + ']', data[key]);
        }
      },
        // Error handler
        log.error
      );
    };


    install() {
      const packageName = this.args['<package>'];
      let targetDir = this.args['<dir>'];
      if (!targetDir) {
        targetDir = path.join(__dirname, '..');
      }
      Package.install(packageName, targetDir);
    }


    extend() {
      const packageName = this.args['<package>'];
      const times = this.args['--times'];
      const sign = !this.args['--no-sign'];
      const secret = this.args['--secret'];
      // TODO no sign
      this.getSecretPhrase()
      .then(function(secretPhrase) {
        Package.extend(packageName, secretPhrase);
      },
        log.error
      );
    };


    publish() {
      let dir = this.args['<dir>'];
      const sign = !this.args['--no-sign'];
      const secret = this.args['--secret'];
      // TODO no sign
      if(!dir) {
        dir = process.cwd();
      }
      let packageFile = path.join(dir, config.get('filename'));
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


    package() {
      let dir = this.args['<dir>'];
      let outfile = this.args['<outfile>'];
      const update = this.args['--update'];
      const version = this.args['--set-version'];
      const url = this.args['--set-url'];
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
          jetpack.write(packageFile, JSON.stringify(manifest, null, 2));
        });
      });
    };

  };


  module.exports = NxtpmCli;


})();
