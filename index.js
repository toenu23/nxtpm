const config = require('./lib/util/config');
const nxt = require('./lib/util/nxt');


module.exports = {
  publish:   require('./lib/publish'),
  extend:    require('./lib/extend'),
  install:   require('./lib/install'),
  info:      require('./lib/info'),
  manifest:  require('./lib/manifest'),
  archive:   require('./lib/archive'),
  Cli:       require('./lib/cli/cli'),
  setConfig: function(key, value) {
    config.set(key, value);
    nxt.applyConfig();
  },
};
