const { assert, expect } = require('chai');
const path = require('path');
const tmp = require('tmp');
const jetpack = require('fs-jetpack');
const nxtpm = require('../index.js');
const config = require('../lib/util/config.js');
const nxt = require('../lib/util/nxt.js');


let passphrase = jetpack.read(__dirname + '/secret.json', 'json').pw;


describe('Validation', () => {

  it('Accepts valid manifests', done => {
    const data = require('./data/manifests_valid.js');
    for (manifest of data) {
      assert.ok(nxtpm.manifest.validate(manifest));
    }
    done();
  });

  it('Rejects invalid manifests', done => {
    const data = require('./data/manifests_invalid.js');
    for (manifest of data) {
      expect(() => nxtpm.manifest.validate(manifest)).to.throw(Error);
    }
    done();
  });

});


describe('Nxt', () => {

  it('Does an API request', done => {
    nxt.request({ requestType: 'getAlias', aliasName: 'test' })
    .then(data => {
      assert.equal(data.data.aliasName, 'test');
      done();
    }, err => {
      console.log(err.stack || err);
    });
  });

});


describe('Config', () => {

  it('Can set custom config', done => {
    nxtpm.setConfig('nxt:numSources', 1);
    const numSources = config.get('nxt:numSources');
    assert.equal(numSources, 1);
    nxt.request({ requestType: 'getConstants' })
    .then(data => {
      assert.equal(data.frequency, 1);
      assert.equal(data.score, 1);
      nxtpm.setConfig('nxt:numSources', 3);
      done();
    }, err => {
      console.log(err.stack || err);
    });
  });

});


describe('Info', () => {

  it('Retrieve package info', done => {
    nxtpm.info('test6').then(data => {
      expect(data.manifest).not.empty;
      expect(data.transaction).not.empty;
      done();
    }, err => {
      console.log(err.stack || err);
    })
  });

});


describe('Install', () => {

  it('Installs package to current working dir', done => {
    nxtpm.install('test6').then(() => {
      assert.equal(jetpack.exists('test6'), 'dir');
      jetpack.remove('test6');
      done();
    }, err => {
      console.log(err.stack || err);
    })
  });

  it('Installs package to specified dir', done => {
    const dir = tmp.dirSync().name;
    nxtpm.install('test6', dir).then(() => {
      assert.equal(
        jetpack.exists(path.join(dir, 'test6')),
        'dir'
      );
      done();
    });
  });

  it('Refuses to install to non-empty directory', done => {
    const dir = tmp.dirSync().name;
    const file = path.join(dir, 'test6', 'file.txt');
    jetpack.file(file);
    expect(() => nxtpm.install('test6', dir)).to.throw(Error);
    done();
  });

});


describe('Archive', () => {

  it('Create tar.gz archive', done => {
    const file = tmp.fileSync().name;
    nxtpm.archive.create(
      path.join(__dirname, 'package'),
      file
    )
    .then(checksum => {
      assert.equal(checksum.length, 64);
      done();
    }, err => {
      console.log(err.stack || err);
    });
  });

});


describe('Publish', () => {

  it('Creates publish transactions', done => {
    const file = path.join(__dirname, 'package', 'nxtpm.json');
    const mft = jetpack.read(file, 'json');
    nxtpm.publish(mft, passphrase, true).then(() => {
      done();
    }, err => {
      console.log(err.stack || err);
    })
  });

});


describe('Extend', () => {

  it('Creates extend transaction', done => {
    nxtpm.extend('test6', passphrase, true).then(() => {
      done();
    }, err => {
      console.log(err.stack || err);
    });
  });

});
