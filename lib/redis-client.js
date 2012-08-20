var hiredis = require('hiredis');
module.exports.store = require('redis').createClient('tmp/redis.sock');
module.exports.pub = require('redis').createClient('tmp/redis.sock');
module.exports.sub = require('redis').createClient('tmp/redis.sock');
