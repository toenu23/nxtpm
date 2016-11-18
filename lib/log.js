(function() {


const winston = require('winston');


const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      silent: process.env.NXTPM_CLI ? false : true,
      colorize: true,
    }),
  ],
});


module.exports = logger;


})();
