var url = require('url');
var request = require('request');
var Jay = require('node-jay');
var jay = new Jay();
var converters = jay.converters;

var config = require('./config.js');
var nxtConfig = config.load();
var nxtApi = url.format(nxtConfig.api);

module.exports = {

  request: function(query, callback) {
    request.post(nxtApi, { form: query }, function(err, resp, body) {
      var error;
      if (err) {
        error = err;
      }
      try {
        body = JSON.parse(body);
      } catch (e) {
        error = e.message;
      }
      if (body && body.errorCode) {
        error = body;
      }
      callback(error, body);
    });
  },

  signTransaction: function(data, secretPhrase) {
    var unsignedBytes = converters.hexStringToByteArray(data);
    var sig = jay.signBytes(unsignedBytes, secretPhrase);
    var signed = unsignedBytes.slice(0, 96);

    signed = signed.concat(sig);
    signed = signed.concat(unsignedBytes.slice(96 + 64));

    return converters.byteArrayToHexString(signed);
  },

  jay: jay,
  converters: converters,
};

