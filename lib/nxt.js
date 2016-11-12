(function() {


  const nxtjs = require('nxtjs');
  const DoubleChecker = require('doublechecker');
  const config = require('./config');
  const log = require('./log');


  class Nxt {

    constructor() {
      this.client = new DoubleChecker({
        numUseSources: config.get('nxt:numSources'),
        dataType: 'json',
        ignoreJSONKeys: config.get('nxt:ignoreJSONKeys'),
        sources: config.get('nxt:serverList'),
      });
    };


    request(options) {
      const parent = this;
      return new Promise(function(resolve, reject) {
        parent.client.request(options, function(err, data) {
          if (err) {
            return reject(err);
          }
          if (data.score < 1) {
            console.log(data.data)
            const numNodes = Math.round(data.frequency / data.score);
            log.error(
              'Inconsistent data from Nxt (Nodes: %d, Frequency: %d, Score: %d)',
              numNodes, data.frequency, data.score
            );
            return reject('Aborting request.');
          }
          resolve(data);
        });
      });
    };


    sign(data, secretPhrase) {
      return nxtjs.signTransactionBytes(data, secretPhrase);
    };

  }


  module.exports = Nxt;


})();
