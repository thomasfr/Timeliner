var users = require('./users');
var redisClient = require('./redis-client').store;
var async = require('async');
var sanitize = require('validator').sanitize;
var markdown = require('discount');
var moment = require('moment');
var uuid = require('node-uuid');

var getPublicTimeline = exports.getPublicTimeline = function (limit, offset, callback) {
    getTimeline('public', limit, offset, callback);
}

/**
 * Gets all pings, with comments and users, etc.
 */
var getTimeline = exports.getTimeline = function (timeline, limit, offset, callback) {
    var limit = limit || 50;
    var offset = offset || 0;
    var pings = [];
    redisClient.lrange("timeline_" + timeline, offset, limit - 1, function (err, pids) {
        if (err) return console.error(err);
        async.forEach(
            pids,
            function (pid, nextPid) {
                get(pid, function (err, ping) {
                    if (err) return callback(err, null);
                    pings.push(ping);
                    getComments(ping.cids, function (err, comments) {
                        ping.comments = comments;
                        nextPid();
                    });
                });
            },
            function (err) {
                callback(err, pings);
            }
        );
    });
}

var getComments = function (cids, callback) {
    var comments = [];
    async.forEach(
        cids,
        function (cid, nextCid) {
            getComment(cid, function (err, comment) {
                comments.push(comment);
                if (comment.cids && comment.cids.length > 0) {
                    getComments(comment.cids, function (err, subComments) {
                        comments = comments.concat(subComments);
                        nextCid();
                    });
                }
                else {
                    nextCid();
                }
            });
        },
        function (err) {
            callback(err, comments);
        }
    );
}

var sanitizeMessage = function (message) {
    return sanitize(sanitize(message).xss()).trim();
}

var add = exports.add = function (user, message, callback) {
    var message = sanitizeMessage(message);
    var rawMessage = message;
    var nextPid = uuid.v4();
    var pingBaseKey = "ping_" + nextPid;
    var uid = user.id;
    var ping = {
        date:moment().valueOf(),
        message:message,
        uid:uid
    };
    redisClient.hmset(pingBaseKey, ping, function (err) {
        if (err) return callback(err, null);
        redisClient.lpush("timeline_public", nextPid, function (err) {
            if (err) return callback(err, null);
            ping.user = user;
            ping.id = nextPid;
            ping.comments = [];
            ping.message = markdown.parse(ping.message, markdown.flags.safelink | markdown.flags.autolink | markdown.flags.noHeader | markdown.flags.noDivQuote | markdown.flags.noExt | markdown.flags.noTables | markdown.flags.noHTML);
            ping.rawMessage = rawMessage;
            callback(null, ping);
        });
    });
}


var getComment = exports.getComment = function (cid, callback) {
    redisClient.hgetall('comment_' + cid, function (err, comment) {
        if (err) return callback(err, null);
        var uid = comment.uid;
        async.parallel(
            {
                'user':function (callback) {
                    users.getById(uid, callback);
                },
                'likes':function (callback) {
                    redisClient.smembers('comment_' + cid + '_like', callback);
                },
                'dislikes':function (callback) {
                    redisClient.smembers('comment_' + cid + '_dislike', callback);
                },
                'cids':function (callback) {
                    redisClient.lrange('comment_' + cid + '_comment', 0, -1, callback);
                }
            },
            function (err, results) {
                if (err) return callback(err, null);
                if (results.user.password) delete results.user.password;
                if (results.user.salt) delete results.user.salt;
                comment.user = results.user;
                comment.id = cid;
                comment.likes = results.likes || [];
                comment.dislikes = results.dislikes || [];
                comment.cids = results.cids || [];
                callback(null, comment);
            }
        );
    });
}

var get = exports.get = function (pid, callback) {
    redisClient.hgetall('ping_' + pid, function (err, ping) {
        if (err) return callback(err, null);
        async.parallel(
            {
                'user':function (callback) {
                    users.getById(ping.uid, callback);
                },
                'likes':function (callback) {
                    redisClient.smembers('ping_' + pid + '_like', callback);
                },
                'dislikes':function (callback) {
                    redisClient.smembers('ping_' + pid + '_dislike', callback);
                },
                'cids':function (callback) {
                    redisClient.lrange('ping_' + pid + '_comment', 0, -1, callback);
                }
            },
            function (err, results) {
                if (err) return callback(err, null);
                if (results.user.password) delete results.user.password;
                if (results.user.salt) delete results.user.salt;
                ping.user = results.user;
                ping.id = pid;
                ping.likes = results.likes || [];
                ping.dislikes = results.dislikes || [];
                ping.cids = results.cids || [];
                ping.message = markdown.parse(ping.message, markdown.flags.safelink | markdown.flags.autolink | markdown.flags.noHeader | markdown.flags.noDivQuote | markdown.flags.noExt | markdown.flags.noTables | markdown.flags.noHTML);
                ping.rawMessage = ping.message;
                callback(null, ping);
            }
        );
    });
}

var addComment = exports.addComment = function (dataType, dataId, user, message, callback) {
    var message = sanitizeMessage(message);
    var uid = user.id;
    var nextCid = uuid.v4();
    var comment = {
        message:message,
        uid:uid,
        date:moment().valueOf(),
        of:dataId,
        of_type:dataType
    };
    var commentKey = "comment_" + nextCid;
    redisClient.hmset(commentKey, comment, function (err) {
        if (err) return callback(err, null);
        redisClient.rpush(dataType + "_" + dataId + "_comment", nextCid, function (err) {
            if (err) return callback(err, null);
            comment.user = user;
            comment.id = nextCid;
            callback(null, comment);
        });
    });
}

/**
 * Private helper function
 * @private
 */
var removeLikeDislike = function (dataType, dataId, itemType, uid, callback) {
    var key = dataType + '_' + dataId + '_' + itemType;
    redisClient.srem(key, uid, function (err) {
        if (err) return callback(err, null);
        redisClient.smembers(key, callback);
    });
}

/**
 * Private helper function
 * @private
 */
var addLikeDislike = function (dataType, dataId, itemType, uid, callback) {
    var key = dataType + '_' + dataId + '_' + itemType;
    redisClient.sadd(key, uid, function (err) {
        if (err) return callback(err, null);
        redisClient.smembers(key, callback);
    });
}

var addLike = exports.addLike = function (dataType, dataId, uid, callback) {
    addLikeDislike(dataType, dataId, 'like', uid, callback);
}

var removeLike = exports.removeLike = function (dataType, dataId, uid, callback) {
    removeLikeDislike(dataType, dataId, 'like', uid, callback);
}

var addDislike = exports.addDislike = function (dataType, dataId, uid, callback) {
    addLikeDislike(dataType, dataId, 'dislike', uid, callback);
}

var removeDislike = exports.removeDislike = function (dataType, dataId, uid, callback) {
    removeLikeDislike(dataType, dataId, 'dislike', uid, callback);
}
