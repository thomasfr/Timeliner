var express = require('express');
var redisClient = require('./redis-client.js').store;
var RedisStore = require('connect-redis')(express);

var sessionStore = new RedisStore({
    client:redisClient
});

module.exports = sessionStore;
