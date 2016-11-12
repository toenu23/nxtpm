(function() {

  const prompt = require('prompt');

  module.exports = function() {
    const schema = {
      properties: {
        name: {
          description: 'Project name (Nxt alias)',
          type: 'string',
          required: true,
        },
        description: {
          description: 'Project description',
          type: 'string',
          required: false,
        },
        author: {
          description: 'Project author',
          type: 'string',
          required: false,
        },
        tags: {
          description: 'Keywords (separated by comma)',
          type: 'string',
          required: false,
        },
        main: {
          description: 'Entry file',
          type: 'string',
          required: true,
          default: 'index.html',
        },
      },
    };
    return new Promise(function(resolve, reject) {
      prompt.start();
      prompt.get(schema, function(err, result) {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  };

})();
