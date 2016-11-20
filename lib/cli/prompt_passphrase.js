const prompt = require('prompt');

module.exports = () => {
  const schema = {
    properties: {
      passphrase: {
        description: 'Nxt secret phrase',
        type: 'string',
        hidden: true,
        required: true,
      },
    },
  };
  return new Promise((resolve, reject) => {
    prompt.start();
    prompt.get(schema, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result.passphrase);
    });
  });
};
