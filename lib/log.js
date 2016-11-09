(function() {


  const winston = require('winston');


  const logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
        colorize: true,
      }),
    ],
  });


  module.exports = logger;


})();
