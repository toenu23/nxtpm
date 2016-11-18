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
      if (this.args.install) { return this.install(); }
      if (this.args.init)    { return this.init();    }
      if (this.args.package) { return this.package(); }
      if (this.args.publish) { return this.publish(); }
      if (this.args.extend)  { return this.extend();  }
      if (this.args.info)    { return this.info();    }
    };


    info() {
      const packageName = this.args['<package>'];
      return Package.getPackageInfo(packageName)
      .then(data => {
        log.info(
          JSON.stringify(data, null, 2)
        );
      });
    };


    install() {
      const packageName = this.args['<package>'];
      let targetDir = this.args['<dir>'];
      if (!targetDir) {
        targetDir = path.join(__dirname, '..');
      }
      return Package.install(packageName, targetDir);
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
        throw new Error('File already exists at ' + path.resolve(file));
      }
      return promptInit()
      .then(result => {
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
      return promptPassphrase()
      .then(passphrase => {
        return Package.extend(packageName, passphrase, dryRun);
      });
    };


    publish() {
      let dir = this.args['<dir>'];
      const secret = this.args['--secret'];
      const dryRun = this.args['--dry-run'];

      dir = dir || process.cwd();
      let packageFile = path.join(
        dir,
        config.get('filename')
      );
      if (!jetpack.exists(packageFile)) {
        throw new Error('Missing ' + config.get('filename'));
      }

      const manifest = jetpack.read(packageFile, 'json');
      const pkg = new Package(manifest);
      if (pkg instanceof Error) {
        throw pkg;
      }

      log.info('Publishing', manifest.name, manifest.version);

      if (secret) {
        return pkg.publish(secret, dryRun);
      }

      return promptPassphrase()
      .then(passphrase => {
        pkg.publish(passphrase, dryRun)
      });
    }


    package() {
      let dir = this.args['<dir>'];
      let outfile = this.args['<outfile>'];
      const update = this.args['--update'];
      const version = this.args['--set-version'];
      const url = this.args['--set-url'];

      dir = dir || process.cwd();
      outfile = outfile || path.join(dir, 'package.tgz');

      log.info('Packaging', path.resolve(dir));
      log.info('Target', path.resolve(outfile));

      const packageFile = path.join(
        dir,
        config.get('filename')
      );

      if (!jetpack.exists(packageFile)) {
        throw new Error('Manifest not found at ' + path.resolve(packageFile));
      }

      let manifest = jetpack.read(packageFile, 'json');
      const result = PackageBuilder.validate(manifest);
      if (result instanceof Error) {
        throw result;
      }

      if (jetpack.exists(outfile)) {
        throw new Error('File already exists at ' + path.resolve(outfile));
      }

      let sha256sum;
      return Package.compressDir(dir, outfile)
      .then(checksum => {
        sha256sum = checksum;
        if (!update) {
          return;
        }
        return promptUpdate({
          version: version,
          url: url,
        });
      })
      .then(result => {
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
          throw valid;
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
