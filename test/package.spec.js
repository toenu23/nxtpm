const assert = require('assert');
const PackageBuilder = require('../lib/packageBuilder');

describe('Validation', function() {
  it('validates', function(done) {
    const result = PackageBuilder.validate({
      name: 'test',
      description: 'This is a test.',
      version: '0.0.1',
      channel: 'nxtpm',
      resources: {
        '0.0.1': {
          url: 'http://myfile.tar.gz',
          sha256: '29348un2938u42983',
        },
      },
    });
    assert.equal((result instanceof Error), false);
    done();
  });
});
