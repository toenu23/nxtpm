const semver = require('semver');
const validUrl = require('valid-url');
const config = require('./util/config');


module.exports = {


  compact: manifest => {
    let mft = JSON.parse(JSON.stringify(manifest));
    ['name', 'description', 'tags', 'channel'].forEach(e => {
      delete mft[e];
    });
    return mft;
  },


  expand: packageInfo => {
    let manifest = packageInfo.manifest;
    ['name', 'description', 'tags', 'channel'].forEach(e => {
      manifest[e] = packageInfo.transaction[e];
    });
    return manifest;
  },


  validate: manifest => {
    const fields = config.get('package:requiredFields');
    if (typeof manifest !== 'object') {
      throw new Error('Manifest is not an object');
    }
    for (let key in fields) {
      if (!manifest[key]) {
        throw new Error('Missing field ' + key);
      }
      const type = fields[key].type;
      if (typeof manifest[key] !== type) {
        throw new Error(
          'Field ' + key + ' is not of type ' + type
        );
      }
    }
    const version = manifest.version;
    if (!semver.valid(version)) {
      throw new Error('Invalid version ' + version);
    }
    if (!manifest.resources[version]) {
      throw new Error('Unknown version ' + version);
    }
    for (let key in manifest.resources) {
      if (!semver.valid(key)) {
        throw new Error('Invalid version ' + version);
      }
      const resource = manifest.resources[key];
      if (!resource.url) {
        throw new Error('Missing resource URL');
      }
      if (!validUrl.isUri(resource.url)) {
        throw new Error('Invalid resource URL');
      }
      if (!resource.sha256) {
        throw new Error('Missing resource SHA256 hash');
      }
    }
    return true;
  },

};
