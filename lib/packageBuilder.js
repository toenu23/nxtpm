(function() {


  const semver = require('semver');
  const validUrl = require('valid-url');
  const Package = require('./package');
  const config = require('./config');


  class PackageBuilder {


    constructor() {
      this.manifest = {};
    };


    static validate(manifest) {
      const fields = config.get('package:requiredFields');
      if (typeof manifest !== 'object') {
        return new Error('Manifest is not an object');
      }
      for (let key in fields) {
        if (!manifest[key]) {
          return new Error('Missing field ' + key);
        }
        const type = fields[key].type;
        if (typeof manifest[key] !== type) {
          return new Error(
            'Field ' + key + ' is not of type ' + type
          );
        }
      }
      const version = manifest.version;
      if (!semver.valid(version)) {
        return new Error('Invalid version ' + version);
      }
      if (!manifest.resources[version]) {
        return new Error('Unknown version ' + key);
      }
      for (let key in manifest.resources) {
        if (!semver.valid(key)) {
          return new Error('Invalid version ' + version);
        }
        const resource = manifest.resources[key];
        if (!resource.url) {
          return new Error('Missing resource URL');
        }
        if (!validUrl.isUri(resource.url)) {
          return new Error('Invalid resource URL');
        }
        if (!resource.sha256) {
          return new Error('Missing resource SHA256 hash');
        }
      }
      return true;
    };


    setValue(key, value) {
      this.manifest[key] = value;
    };


    getManifest() {
      return this.manifest;
    };


    build() {
      return new Package(this.manifest);
    };

  };


  module.exports = PackageBuilder;


})();
