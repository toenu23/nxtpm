module.exports = [
  {
    name: 'test',
    description: 'This is a test.',
    version: '0.0.1abc',
    channel: 'nxtpm',
    resources: {
      '0.0.1abc': {
        url: 'http://myfile.tar.gz',
        sha256: '29348un2938u42983',
      },
    },
  },
  'this is not valid JSON',
  {
    description: 'This is a test.',
    version: '0.0.1',
    channel: 'nxtpm',
    resources: {
      '0.0.1': {
        url: 'http://myfile.tar.gz',
        sha256: '29348un2938u42983',
      },
    },
  },
 {
    name: 'test',
    version: '0.0.1',
    channel: 'nxtpm',
    resources: {
      '0.0.1': {
        url: 'http://myfile.tar.gz',
        sha256: '29348un2938u42983',
      },
    },
  },
 {
    name: 'test',
    description: 'This is a test.',
    version: '0.0.2',
    channel: 'nxtpm',
    resources: {
      '0.0.1': {
        url: 'http://myfile.tar.gz',
        sha256: '29348un2938u42983',
      },
    },
  },
 {
    name: 'test',
    description: 'This is a test.',
    version: '0.0.1',
    channel: 'nxtpm',
    resources: {
      '0.0.1': {
        url: 'invalid',
        sha256: '29348un2938u42983',
      },
    },
  },
 {
    name: 'test',
    description: 'This is a test.',
    version: '0.0.1',
    channel: 'nxtpm',
    resources: {
      '0.0.1': {
        url: 'http://myfile.tar.gz',
      },
    },
  },
  {
    name: 'test',
    description: 'This is a test.',
    version: '0.0.1',
    channel: 'nxtpm',
    resources: 'not an object',
  },
  {
    name: 'test',
    description: 'This is a test.',
    version: '0.0.1',
    resources: {
      '0.0.1': {
        url: 'http://myfile.tar.gz',
        sha256: '29348un2938u42983',
      },
    },
  },
];
