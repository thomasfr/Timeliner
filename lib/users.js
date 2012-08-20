var async = require('async');
var redisClient = require('./redis-client.js').store;
var crypto = require('crypto');
var commonConfig = require('../conf/common');
var uuid = require('node-uuid');
var authBackend = commonConfig.authBackend || "internal";
var _ = require("underscore");

exports = module.exports;


/**
 * Returns a user by name
 * @return Object user
 */
var getByName = exports.getByName = function (username, callback) {
    redisClient.get('username_' + username + '_id', function (err, uuid) {
        console.log("getByName", arguments);
        if (err) return callback(err, null);
        if (!uuid) return callback(null, null);
        getById(uuid, callback);
    });
}

/**
 * Returns a user by id
 * @return Object user
 */
var getById = exports.getById = function (uuid, callback) {
    redisClient.hgetall('user_' + uuid, function (err, user) {
        if (err) return callback(err, null);
        if (!user) return callback(null, null);
        user.id = uuid;
        callback(null, user);
    });
}

var hashPassword = exports.hashPassword = function (password) {
    var hash = crypto.createHash('sha256');
    hash.update(password, "utf8");
    return hash.digest('hex');
}

var addUser = exports.addUser = function (user, callback) {
    if (!user.username || !user.password) {
        return callback(new Error("At least username and password has to be set"), null);
    }
    var nextUID = uuid.v4();
    var userObj = _.extend(user, {
        username:user.username,
        password:hashPassword(user.password),
        avatar:'avatar-blank'
    });
    console.log("Adding user ", userObj);
    redisClient.hmset('user_' + nextUID, user, function (err) {
        if (err) {
            return callback(err, null);
        }
        else {
            redisClient.set('username_' + userObj.username + '_id', nextUID, function (err) {
                if (err) {
                    return callback(err, null);
                }
                else {
                    redisClient.lpush("users", nextUID, function (err) {
                        if (err) {
                            callback(err, null);
                        }
                        else {
                            user.id = nextUID;
                            callback(null, user);
                        }
                    })

                }
            });
        }
    });
}

/**
 * Authenticates the given user and password
 * returns the user object when authenticated
 * successfully
 */
console.log("Using '" + authBackend + "' as Auth Backend.");
var authenticate = exports.authenticate = require('./auth-backends/' + authBackend).authenticate;


/**
 * Returns all online users
 * @return Array user
 */
var getOnline = exports.getOnline = function (callback) {
    redisClient.smembers('users_online', function (err, uuids) {
        if (err) return callback(err, null);
        if (!uuids) return callback(null, null);
        var users = [];
        async.forEach(
            uuids
            , function (uuid, fn) {
                getById(uuid, function (err, user) {
                    if (err) return callback(err, null);
                    users.push(user);
                    fn();
                });
            }
            , function (err) {
                if (err) return callback(err, null);
                callback(null, users);
            }
        );
    });
}

var getAllUsers = exports.getAllUsers = function (callback) {
    redisClient.lrange("users", 0, 100, function (err, uuids) {
        if (err) {
            return callback(err, null);
        }
        var users = [];
        async.forEach(
            uuids,
            function (uuid, next) {
                getById(uuid, function (err, user) {
                    if (err) {
                        return callback(err, null);
                    }
                    users.push(user);
                    next();
                });
            },
            function (err) {
                if (err) {
                    return callback(err, null);
                }
                callback(null, users);
            });
    });
}

/**
 * Returns online follower users of the given user object
 * @return Array user
 */
var getOnlineFollower = exports.getOnlineFollower = function (user, callback) {
}
