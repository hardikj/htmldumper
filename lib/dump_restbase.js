#!/usr/bin/env node
"use strict";
var P = require('bluebird');

var fs = P.promisifyAll(require('fs'));
var proc = P.promisifyAll(require('child_process'));
var preq = require('preq');
var makeDump = require('./htmldump');


//var dumpDir = '/srv/www/htmldumps';
//var workDir = '/srv/www/htmldumps';
var dumpDir = '/tmp';
var workDir = '/tmp';

function dumpDBName (domain) {
    return domain + '.articles.ns0.sqlite3';
}

function dumpWiki(argv) {
    var domain = argv.domain;
    var dumpName = dumpDBName(domain);
    var workDB = argv.workDir + '/' + dumpName;
    var dumpDB = argv.dumpDir + '/' + dumpName + '.xz';

    // If a dump exists, uncompress it & use it as a starting point
    var dumpPromise = P.resolve();
    if (fs.existsSync(dumpDB)) {
        dumpPromise = proc.execFileAsync('pixz', ['-d', dumpDB, workDB])
                        .catch(function() {
                            return fs.unlinkAsync(workDB);
                        });
    }

    return dumpPromise
    .then(function() {
        var dumpOptions = [
            __dirname + '/../bin/dump_wiki',
            '--dataBase', workDB,
            '--apiURL', 'http://' + domain + '/w/api.php',
            '--prefix', domain,
            '--ns', '0',
            '--host', 'http://rest.wikimedia.org'
        ];
        dumpOptions.push(argv.verbose ? '--verbose' : '--no-verbose');
        return proc.execFileAsync('node', dumpOptions);
    })
    .then(function(res) {
        if (res[0] || res[1]) {
            console.log('Output from ', domain + ':', res[0], res[1]);
        }
        //console.log('xz compressing');
        return proc.execFileAsync('pixz', ['-2', workDB, workDB + '.xz'])
        .then(function() {
            return fs.renameAsync(workDB + '.xz', dumpDB);
        });
    })
    .then(function() {
        return fs.unlinkAsync(workDB);
    })
    .catch(function(e) {
        console.error(domain, e);
    });
}


function dumpAllWikis (args) {
    return preq.get({
        uri: 'http://rest.wikimedia.org/',
        headers: {
            accept: 'application/json'
        }
    })
    .then(function(res) {
        var argv = args.argv;
        var options = args.options;
        return P.map(res.body.items, function(domain) {
            console.log(domain);
            argv.domain = domain;
            return dumpWiki(argv)
            .catch(function(res) {
                console.log(domain, res);
            });
        }, { concurrency: options.concurrency });
    })
    .then(function() {
        console.log('All dumps done.');
    });
}

module.exports = dumpAllWikis;
