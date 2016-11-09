(function() {


  const nxtjs = require('nxtjs');
  const DoubleChecker = require('doublechecker');
  const config = require('./config');


  class Nxt {

    constructor() {
      this.client = new DoubleChecker({
        numUseSources: config.get('nxt:numSources'),
        dataType: 'json',
        ignoreJSONKeys: config.get('nxt:ignoreJSONKeys'),
        sources: config.get('nxt:serverList'),
      });
    };


    request(options, callback) {
      const parent = this;
      return new Promise(function(resolve, reject) {
        parent.client.request(options, function(err, data) {
          if (err) {
            return reject(err);
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
