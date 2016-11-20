const path = require('path');
const jetpack = require('fs-jetpack');
const prompt = require('prompt');
const config = require('../util/config');
const log = require('../util/log');

const archive = require('../archive');
const publish = require('../publish');
const extend = require('../extend');
const install = require('../install');
const info = require('../info');
const manifest = require('../manifest');

const promptPassphrase = require('./prompt_passphrase');
const promptUpdate = require('./prompt_update');
const promptInit = require('./prompt_init');


class Cli {


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
    return info(packageName)
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
    return install(packageName, targetDir);
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
      result.resources = {};
      result.resources[result.version] = {
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
      return extend(packageName, secret, dryRun);
    }
    return promptPassphrase()
    .then(passphrase => {
      return extend(packageName, passphrase, dryRun);
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

    const mft = jetpack.read(packageFile, 'json');
    manifest.validate(mft);
    log.info('Publishing', mft.name, mft.version);

    if (secret) {
      return publish(mft, secret, dryRun);
    }

    return promptPassphrase()
    .then(passphrase => {
      publish(mft, passphrase, dryRun)
    });
  }


  package() {
    let dir = this.args['<dir>'];
    let outfile = this.args['<outfile>'];
    const update = this.args['--update'];
    const version = this.args['--set-version'];
    const url = this.args['--set-url'];

    dir = dir || process.cwd();
    outfile = outfile || path.join(dir, 'package.tgz'); // TODO

    log.info('Packaging', path.resolve(dir));
    log.info('Target', path.resolve(outfile));

    const packageFile = path.join(
      dir,
      config.get('filename')
    );

    if (!jetpack.exists(packageFile)) {
      throw new Error('Manifest not found at ' + path.resolve(packageFile));
    }

    let mft = jetpack.read(packageFile, 'json');
    manifest.validate(mft);

    if (jetpack.exists(outfile)) {
      throw new Error('File already exists at ' + path.resolve(outfile));
    }

    let sha256sum;
    return archive.create(dir, outfile)
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
      mft.version = result.version;
      mft.resources[result.version] = {
        url: result.url,
        sha256: sha256sum,
      };
      manifest.validate(mft);
      jetpack.write(
        packageFile,
        JSON.stringify(mft, null, 2)
      );
      log.info('Updated', path.resolve(packageFile));
    });
  };

};


module.exports = Cli;
