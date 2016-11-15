(function() {


  const Package = require('./lib/package');
  const PackageBuilder = require('./lib/packageBuilder');
  const NxtpmCli = require('./lib/cli/cli');
  const config = require('./lib/config');


  module.exports = {
    Package: Package,
    PackageBuilder: PackageBuilder,
    NxtpmCli: NxtpmCli,
    setConfig: function(key, value) {
      config.set(key, value);
      Package.applyConfig();
    },
  };


})();
