(function() {

  const prompt = require('prompt');

  module.exports = function() {
    const schema = {
      properties: {
        passphrase: {
          description: 'Nxt secret phrase:',
          type: 'string',
          hidden: true,
          required: true,
        },
      },
    };
    return new Promise(function(resolve, reject) {
      prompt.start();
      prompt.get(schema, function(err, result) {
        if (err) {
          return reject(err);
        }
        resolve(result.passphrase);
      });
    });
  };

})();
