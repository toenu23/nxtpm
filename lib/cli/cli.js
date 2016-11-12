(function() {


  const path = require('path');
  const jetpack = require('fs-jetpack');
  const prompt = require('prompt');
  const config = require('../config');
  const log = require('../log');
  const Package = require('../package');
  const PackageBuilder = require('../packageBuilder');

  const promptPassphrase = require('./prompt_passphrase');
  const promptUpdate = require('./prompt_update');
  const promptInit = require('./prompt_init');

  class NxtpmCli {


    constructor(args) {
      this.args = args;
      prompt.message = '';
    };


    run() {
      if (this.args.install) return this.install();
      if (this.args.init)    return this.init();
      if (this.args.package) return this.package();
      if (this.args.publish) return this.publish();
      if (this.args.extend)  return this.extend();
      if (this.args.info)    return this.info();
    };


    info() {
      const packageName = this.args['<package>'];
      Package.getPackageInfo(packageName)
      .then(function(data) {
        log.info(
          JSON.stringify(data, null, 2)
        );
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
    };


    init() {
      const dir = process.cwd();
      const file = path.join(dir, config.get('filename'));
      log.info(
        'Initalizing new %s in',
        config.get('filename'),
        path.resolve(dir)
      );
      if (jetpack.exists(file)) {
        return log.error(
          'File already exists at',
          path.resolve(file)
        );
      }
      promptInit()
      .then(function(result) {
        result.resources = {
          url: '',
          sha256: '',
        };
        const data = JSON.stringify(result, null, 2);
        jetpack.write(file, data);
        log.info('Created', path.resolve(file));
      });
    };


    extend() {
      const packageName = this.args['<package>'];
      const secret = this.args['--secret'];
      const dryRun = this.args['--dry-run'];
      if (secret) {
        return Package.extend(packageName, secret, dryRun);
      }
      promptPassphrase()
      .then(function(passphrase) {
        return Package.extend(packageName, passphrase, dryRun);
      },
        log.error
      );
    };


    publish() {
      let dir = this.args['<dir>'];
      const secret = this.args['--secret'];
      const dryRun = this.args['--dry-run'];

      if (!dir) dir = process.cwd();
      let packageFile = path.join(
        dir,
        config.get('filename')
      );
      if (!jetpack.exists(packageFile)) {
        return log.error(
          'Missing', config.get('filename')
        );
      }

      const manifest = jetpack.read(packageFile, 'json');
      const pkg = new Package(manifest);
      if (pkg instanceof Error) {
        return log.error(pkg.message);
      }

      log.info('Publishing', manifest.name, manifest.version);

      if (secret) {
        return pkg.publish(secret, dryRun);
      }

      promptPassphrase()
      .then(function(passphrase) {
        pkg.publish(passphrase, dryRun)
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

      if (!dir) dir = process.cwd();
      if (!outfile) outfile = path.join(
        process.cwd(), 'package.tgz'
      );

      log.info('Packaging', path.resolve(dir));
      log.info('Target', path.resolve(outfile));

      const packageFile = path.join(
        dir,
        config.get('filename')
      );

      if (!jetpack.exists(packageFile)) {
        return log.error(
          'Manifest not found at',
          path.resolve(packageFile)
        );
      }

      let manifest = jetpack.read(packageFile, 'json');
      const result = PackageBuilder.validate(manifest);
      if (result instanceof Error) {
        return log.error(result);
      }

      if (jetpack.exists(outfile)) {
        return log.error(
          'File already exists at',
          path.resolve(outfile)
        );
      }

      let sha256sum;
      Package.compressDir(dir, outfile)
      .then(function(checksum) {
        sha256sum = checksum;
        if (!update) {
          return;
        }
        return promptUpdate({
          version: version,
          url: url,
        });
      })
      .then(function(result) {
        if (!result) {
          return;
        }
        manifest.version = result.version;
        manifest.resources[result.version] = {
          url: result.url,
          sha256: sha256sum,
        };
        const valid = PackageBuilder.validate(manifest);
        if (valid instanceof Error) {
          return log.error(valid);
        }
        jetpack.write(
          packageFile,
          JSON.stringify(manifest, null, 2)
        );
        log.info('Updated', path.resolve(packageFile));
      });
    };

  };


  module.exports = NxtpmCli;


})();
