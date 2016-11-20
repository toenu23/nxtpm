const manifest = require('./manifest');
const nxt = require('./util/nxt');


module.exports = packageName => {

  return nxt.request({
    requestType: 'getAlias',
    aliasName: packageName,
  })

  .then(result => {
    return nxt.request({
      requestType: 'getTaggedData',
      transaction: result.data.aliasURI,
    });
  })

  .then(result => {
    if (!result.data || !result.data.transaction) {
      throw new Error('Package not found');
    }
    let mft = {};
    let data = result.data.data;
    if (!data) {
      throw new Error('Transaction has expired');
    }
    if (!result.data.isText) {
      data = Buffer.from(data, 'hex').toString();
    }
    try {
      mft = JSON.parse(data);
    } catch (e) {
      throw new Error('Non-JSON data');
    }
    manifest.validate(mft);
    return {
      transaction: result.data,
      manifest: mft,
    };
  });


};
