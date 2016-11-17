(function() {

  const prompt = require('prompt');
  const config = require('../config');

  module.exports = overrides => {
    return new Promise((resolve, reject) => {
      if (overrides.version && overrides.url) {
        overrides.update = 'Y';
        return resolve(overrides);
      }
      prompt.override = overrides;
      const schema = {
        properties: {
          version: {
            description: 'Version',
            type: 'string',
            required: true,
          },
          url: {
            description: 'Package URL',
            type: 'string',
            required: true,
          },
        },
      };
      prompt.start();
      prompt.get(schema, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  };


})();
