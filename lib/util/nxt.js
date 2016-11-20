const nxtjs = require('nxtjs');
const DoubleChecker = require('doublechecker');
const config = require('./config');
const log = require('./log');


let client;
function createClient() {
  client = new DoubleChecker({
    numUseSources: config.get('nxt:numSources'),
    dataType: 'json',
    ignoreJSONKeys: config.get('nxt:ignoreJSONKeys'),
    sources: config.get('nxt:serverList'),
  });
};
createClient();


module.exports = {


  applyConfig: () => createClient(),


  request: options => {
    return new Promise((resolve, reject) => {
      client.request(options, (err, data) => {
        if (err) {
          return reject(err);
        }
        if (data.score < 1) {
          const numNodes = Math.round(data.frequency / data.score);
          const msg = `Inconsistent data from Nxt (N:${numNodes}, F:${data.frequency}, S:${data.score})`;
          return reject(msg);
        }
        resolve(data);
      });
    });
  },


};
