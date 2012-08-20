var express = require('express');
var app = exports.app = express.createServer();
var socketio = require('socket.io').listen(app);
var sessionStore = require('./session-store');
var websocket = require('./websocketserver').create(socketio, sessionStore);
var pings = require('./pings');

var pub = require('./redis-client').pub;
var sub = require('./redis-client').sub;

require('../conf/express')(app);
require('../conf/socketio')(socketio);
require('./routes')(app);

(function subscribeChannels() {
    console.log("subscribe to redis pub channels");
    //sub.subscribe("timeline:public:new");
    sub.subscribe("comment:add");
    //sub.subscribe("comment:like:change");
    //sub.subscribe("comment:dislike:change");
    sub.subscribe("ping:like:change");
    sub.subscribe("ping:dislike:change");
    //sub.subscribe("user:online");
    //sub.subscribe("user:offline");
}());


websocket.on('connect', function (socket, session) {

    sub.on('message', function (channel, message) {
        try {
            console.log(channel, session.user.id);
            var data = JSON.parse(message);
            console.log("DATA ", data);
            switch (channel) {
                case 'comment:add':
                    socket.emit('comment:add', data.data);
                    break;
                case 'ping:like:change':
                    socket.emit('ping:like:change', data.data);
                    break;
                case 'pink:dislike:change':
                    socket.emit('ping:dislike:change', data.data);
                    break;
            }
        } catch (error) {
            console.warn(error);
        }
    });

    socket.on('ping:add', function (message, callback) {
        if (!session.user) return callback("Not authenticated", null);
        if (message && message.length > 0) {
            pings.add(session.user, message, function (err, ping) {
                if (err) return callback(err, null);
                else {
                    socket.broadcast.emit("timeline:public:new", ping);
                    pub.publish('timeline:public:new', JSON.stringify({data: ping, user: session.user}));
                    callback(null, ping);
                }
            });
        }
        else {
            callback("no message", null);
        }
    });

    socket.on('comment:add', function (dataType, dataId, message, callback) {
        console.log('comment:add', dataType, dataId, message);
        if (!session.user) return callback("Not authenticated", null);
        if (message && message.length > 0) {
            pings.addComment(dataType, dataId, session.user, message, function (err, comment) {
                if (err) return callback(err, null);
                else {
                    socket.broadcast.emit("comment:add", comment);
                    callback(null, comment);
                }
            });
        }
        else {
            callback("no message", null);
        }
    });

    socket.on('comment:like:add', function (cid, callback) {
        console.log('comment:like:add', cid);
        if (!session.user) return callback("Not authenticated", null);
        pings.addLike('comment', cid, session.user.id, function (err, uids) {
            if (err) return callback(err, null);
            else {
                socket.broadcast.emit("comment:like:change", {id: cid, uids: uids});
                callback(null, uids);
            }
        });
    });

    socket.on('comment:like:remove', function (cid, callback) {
        console.log('comment:like:remove', cid);
        if (!session.user) return callback("Not authenticated", null);
        pings.removeLike('comment', cid, session.user.id, function (err, uids) {
            if (err) return callback(err, null);
            else {
                socket.broadcast.emit("comment:like:change", {id: cid, uids: uids});
                callback(null, uids);
            }
        });
    });

    socket.on('comment:dislike:add', function (cid, callback) {
        console.log('comment:dislike:add', cid);
        if (!session.user) return callback("Not authenticated", null);
        pings.addDislike('comment', cid, session.user.id, function (err, uids) {
            if (err) return callback(err, null);
            else {
                socket.broadcast.emit("comment:dislike:change", {id: cid, uids: uids});
                callback(null, uids);
            }
        });
    });

    socket.on('comment:dislike:remove', function (cid, callback) {
        console.log('comment:dislike:remove', cid);
        if (!session.user) return callback("Not authenticated", null);
        pings.removeDislike('comment', cid, session.user.id, function (err, uids) {
            if (err) return callback(err, null);
            else {
                socket.broadcast.emit("comment:dislike:change", {id: cid, uids: uids});
                callback(null, uids);
            }
        });
    });


    socket.on('ping:like:add', function (pid, callback) {
        console.log("ping:like:add");
        if (!session.user) return callback("Not authenticated", null);
        pings.addLike('ping', pid, session.user.id, function (err, uids) {
            if (err) return callback(err, null);
            else {
                socket.broadcast.emit("ping:like:change", {id: pid, uids: uids});
                callback(null, uids);
            }
        });
    });

    socket.on('ping:dislike:add', function (pid, callback) {
        console.log("ping:dislike:add");
        if (!session.user) return callback("Not authenticated", null);
        pings.addDislike('ping', pid, session.user.id, function (err, uids) {
            if (err) return callback(err, null);
            else {
                //socket.broadcast.emit('ping:dislike:change', {id:pid, uids:uids});
                socket.broadcast.emit("ping:dislike:change", {id: pid, uids: uids});
                callback(null, uids);
            }
        });
    });

    socket.on('ping:like:remove', function (pid, callback) {
        console.log("like:remove");
        if (!session.user) return callback("Not authenticated", null);
        pings.removeLike('ping', pid, session.user.id, function (err, uids) {
            if (err) return callback(err, null);
            else {
                socket.broadcast.emit("ping:like:change", {id: pid, uids: uids});
                callback(null, uids);
            }
        });
    });

    socket.on('ping:dislike:remove', function (pid, callback) {
        console.log("dislike:remove");
        if (!session.user) return callback("Not authenticated", null);
        pings.removeDislike('ping', pid, session.user.id, function (err, uids) {
            if (err) return callback(err, null);
            else {
                socket.broadcast.emit("ping:dislike:change", {id: pid, uids: uids});
                callback(null, uids);
            }
        });
    });

    socket.on('timeline:public:get', function (data, callback) {
        if (!session.user) return callback("Not authenticated", null);
        if (!data.offset || data.offset <= 0) data.offset = 0;
        if (!data.limit || data.limit <= 0) data.limit = 20;
        if (data.limit > 50) data.limit = 50;
        pings.getPublicTimeline(data.limit, data.offset, function (err, pings) {
            if (err) return callback(err, null);
            else callback(null, pings);
        });
    });

});
