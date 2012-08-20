var xmpp = require("node-xmpp");
var sub = require("../redis-client").sub;
var pub = require("../redis-client").pub;
var commonConfig = require("../../conf/common");
var pings = require('../pings');
var _ = require("underscore");
var util = require("util");
var users = require("../users");
var lastMessage;

var usersCacheByJid = {};

function sendMessage(to, message) {
    var messageElement = new xmpp.Element('message', {to: to, type: "chat"});
    messageElement.c('body').t(message);
    client.send(messageElement);
}

function sendUpdate(user, ping, timeline) {
    if (!user.jid) return;
    lastMessage = {user: user, ping: ping, timeline: timeline};
    var xmppMessage = "New ping in timeline '" + timeline + "' from '" + user.username + "':\n\n";
    xmppMessage += " -- ping start -- \n";
    xmppMessage += ping.rawMessage + "\n";
    xmppMessage += " -- ping end -- \n\n";
    xmppMessage += "Reply to me with '+1' or '-1' and i will add a like or a dislike in your name.\n";
    xmppMessage += "To add a comment, just send me a normal text message.\n";
    xmppMessage += commonConfig.baseUrl;
    var jid = sendMessage(user.jid, xmppMessage);
}

var client = new xmpp.Client(commonConfig.xmpp);

client.on('online', function () {
    client.send(new xmpp.Element('presence', { })
        .c('show')
        .t('chat')
        .up()
        .c('status')
        .t('I will update you on new pings on your watched timelines')
    );
});
client.on('error', function (error) {
    console.log("XMPP", error);
    process.exit(1);
});

client.on('stanza', function (stanza) {
    if (stanza.is('message') && stanza.attrs.type !== 'error') {
        var body = stanza.children.filter(function (el, i) {
            return (el.name && el.name === "body")
        });
        var from = stanza.attrs.from;
        if (!from) return;
        from = from.replace(/\/.*$/, "");
        console.log("from", from);
        var user = getUserByJID(from);
        if (!user) {
            console.log("no user ", user);
            return;
        }
        console.log("user ", user, usersCacheByJid);
        if (!users) {
            return;
        }
        if (body.length == 1) {
            body = body[0];
            var messageText = body.children.join("");
            if (messageText.match(/\+1?/) && lastMessage) {
                pings.addLike('ping', lastMessage.ping.id, user.id, function (err, likes) {
                    console.log("addLike", likes);
                    pub.publish("ping:like:change", JSON.stringify({session: {user: user}, data: {id: lastMessage.ping.id, uids: likes}}));
                });
            }
            else if (messageText.match(/\-1?/) && lastMessage) {
                pings.addDislike('ping', lastMessage.ping.id, user.id, function (err, dislikes) {
                    console.log("addDislike", dislikes);
                    pub.publish("ping:dislike:change", JSON.stringify({session: {user: user}, data: {id: lastMessage.ping.id, uids: dislikes}}));
                });
            }
            else if (lastMessage) {
                pings.addComment('ping', lastMessage.ping.id, user, messageText, function (err, comment) {
                    if (err) return callback(err, null);
                    else {
                        console.log("commented", comment);
                        pub.publish("comment:add", JSON.stringify({session: {user: user}, data: comment}));
                    }
                });
            }
            else {
                sendMessage(from, "Sorry, at the moment i do not understand you! I do not know what to do!");
            }
        }
    }
});

// Subscribe to all timelines new event.
sub.psubscribe("timeline:*:new");

sub.on("pmessage", function (pattern, channel, message) {
    if ("timeline:*:new" === pattern) {
        var matches = channel.match(/^timeline:([^:]*)+:new$/i);
        var timeline = matches[1];
        var message = JSON.parse(message);
        var ping = message.data;
        var user = ping.user;
        users.getAllUsers(function (err, users) {
            _.each(users, function (user) {
                updateUserCache(user);
                sendUpdate(user, ping, timeline);
            });
        })
    }
});

function updateUserCache(user) {
    if (!user || !user.jid) return false;
    usersCacheByJid[user.jid] = user;
    return true;
}

function getUserByJID(jid) {
    return usersCacheByJid[jid];
}
