(function() {


  const path = require('path');
  const nconf = require('nconf');
  const jetpack = require('fs-jetpack');


  const fileName = 'config.json';
  const rootDir = path.join(__dirname, '..');
  const dataDir = path.join(rootDir, 'data');
  const homeDir = process.env.HOME
    || process.env.HOMEPATH
    || process.env.USERPROFILE;
  const confDir = path.join(homeDir, '.nxtpm');
  const rootConf = path.join(rootDir, fileName);
  const homeConf = path.join(confDir, fileName);
  const servFile = path.join(dataDir, 'servers_nxt_testnet.json');


  nconf.env();
  //Nconf.file({ file: rootConf });
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
