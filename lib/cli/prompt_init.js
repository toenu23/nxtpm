(function() {

  const prompt = require('prompt');

  module.exports = () => {
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
        version: {
          description: 'Version',
          type: 'string',
          required: true,
          default: '0.0.0',
        },
      },
    };
    return new Promise((resolve, reject) => {
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
