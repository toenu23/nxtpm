const path = require('path');
const winston = require('winston');


const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: 'info',
      silent: process.env.NXTPM_CLI ? false : true,
      colorize: true,
    }),
    new (winston.transports.File)({
      level: 'debug',
      silent: process.env.NODE_ENV !== 'test',
      filename: path.join(__dirname, '..', '..', 'test', 'test.log'),
      json: false,
    }),
  ],
});


module.exports = logger;
