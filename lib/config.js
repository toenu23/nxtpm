(function() {


  const path = require('path');
  const nconf = require('nconf');
  const jetpack = require('fs-jetpack');
  const log = require('./log');


  const fileName = 'config.json';
  const rootDir = path.join(__dirname, '..');
  const dataDir = path.join(rootDir, 'data');
  const homeDir = process.env.HOME
    || process.env.HOMEPATH
    || process.env.USERPROFILE;
  const confDir = path.join(homeDir, '.nxtpm');
  const homeConf = path.join(confDir, fileName);


  let servFile;
  if (process.env.NODE_ENV === 'development') {
    log.info('Development mode; Using Nxt testnet');
    servFile = path.join(dataDir, 'servers_nxt_testnet.json');
  } else {
    servFile = path.join(dataDir, 'servers_nxt.json');
  }


  nconf.env();
  nconf.file({ file: homeConf });
  nconf.defaults({
    env: 'development',
    channel: 'nxtpm',
    filename: 'nxtpm.json',
    package: {
      requiredFields: {
        name: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        version: {
          type: 'string',
        },
        channel: {
          type: 'string',
        },
        resources: {
          type: 'object',
        },
      },
    },
    nxt: {
      aliasFee: 200000000,
      dataFee: 100000000,
      deadline: 1440,
      numSources: 3,
      ignoreJSONKeys: ['requestProcessingTime'],
      serverList: jetpack.read(servFile, 'json'),
    },
  });


  module.exports = nconf;


})();
