/*
 * Static utility methods for dumpper
 */

var fs   = require('fs');
var yaml = require('js-yaml');

var util = {};

// Load and parse config, or throw exception on error
util.loadAndParseConfig = function(argv) {
    try {
        var conf = yaml.safeLoad(fs.readFileSync(argv.c));
        Object.keys(conf.dump_wiki).forEach(function(arg){
            if (!argv[arg]) {
                argv[arg] = conf.dump_wiki[arg];
            }
        });
        return conf.global_opts;
    } catch (e) {
      console.log(e);
      process.exit(1);
    }
};

module.exports = util;