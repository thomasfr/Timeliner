var EventEmitter = require('events').EventEmitter;
var connect = require('connect');
var SessionClass = connect.middleware.session.Session;
var connectUtils = connect.utils;
var util = require('util');
var users = require('./users');
var commonConfig = require('../conf/common');

var store = require('./redis-client').store;
var pub = require('./redis-client').pub;
var sub = require('./redis-client').sub;

var WebSocketServer = function (socketio, sessionStore) {
    EventEmitter.call(this);


    socketio.configure(function () {
        socketio.set('authorization', function (data, callback) {
            if (data.headers.cookie) {
                data.cookie = connectUtils.parseCookie(data.headers.cookie);
                data.sessionID = data.cookie[commonConfig.sessionKey];
                if (!data.sessionID) return callback("No Session ID", false);
                data.sessionStore = sessionStore;
                sessionStore.get(data.sessionID, function (err, sess) {
                    if (err) {
                        callback(null, false);
                    }
                    else {
                        data.session = new SessionClass(data, sess);
                        callback(null, true);
                    }
                });
            }
            else {
                return callback('No cookie transmitted.', false);
            }
        });
    });

    var that = this;

    socketio.sockets.on('connection', function (socket) {
        console.log("socketio connect");
        var session = socket.handshake.session;
        if (!session) {
            console.error("No session in the socket handshake object");
            return false;
        }

        if (session.user) {
            users.getOnline(function (err, onlineUsers) {
                //socket.broadcast.emit('user:online', session.user);
                pub.publish("user:online", JSON.stringify({session:session, data:session.user}));
                socket.emit("ready", {authenticated:true, user:session.user, onlineUsers:onlineUsers});
                store.sadd("users_online", session.user.id, function (err) {
                    if (err) console.log(err);
                });
            });
        }
        else {
            socket.emit("ready", {authenticated:false});
        }

        socket.on('authenticate', function (data, callback) {
            console.log("auth", data.username);
            users.authenticate(data.username, data.password, function (err, user) {
                if (user) {
                    session.user = user;
                    session.save();
                    users.getOnline(function (err, onlineUsers) {
                        //socket.broadcast.emit('user:online', session.user);
                        pub.publish("user:online", JSON.stringify({session:session, data:session.user}));
                        callback(null, {authenticated:true, user:session.user, onlineUsers:onlineUsers});
                        store.sadd("users_online", session.user.id, function (err) {
                            if (err) console.log(err);
                        });
                    });
                }
                else {
                    callback("Authentication failure", false);
                }
            });
        });

        socket.on('disconnect', function (data) {
            if (session.user) {
                //socket.broadcast.emit('user:offline', session.user);
                pub.publish("user:offline", JSON.stringify({session:session, data:session.user}));
                store.srem("users_online", session.user.id, function (err) {
                    if (err) console.log(err);
                });
            }
            that.emit('disconnect', session);
        });

        that.emit("connect", socket, session);

    });
}
WebSocketServer.create = function (socketio, sessionStore) {
    store.del("users_online", function () {
        console.log("Flushed users_online");
    });
    return new WebSocketServer(socketio, sessionStore);
}
util.inherits(WebSocketServer, EventEmitter);

module.exports = WebSocketServer;
