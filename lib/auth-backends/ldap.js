var commonConfig = require('../../conf/common');
var ldapjs = require('ldapjs');

var users = require('../users');
var client = ldapjs.createClient(commonConfig.ldap.server);

function getDN(username) {
    return commonConfig.ldap.DNTemplate.replace(/\{\{username\}\}/gi, username);
}

exports.authenticate = function (username, password, callback) {
    if (!username || !username.match(/[a-zA-Z0-9]+/i)) {
        return callback(new Error('not a valid username'), null);
    } else {
        client.bind(getDN(username), password, function (err) {
            if (err) {
                console.log("LDAP Auth unsuccessful", err);
                return callback(err, null);
            }
            else {
                console.log("LDAP Auth successful");
                users.getByName(username, function (err, user) {
                    if (err) {
                        return callback(err, null);
                    }
                    else if (err === null && user === null) {
                        console.log("user not found. Creating it.");
												// TODO: CHANGE Hardcoded host
                        users.addUser({username:username, password:password, jid:username + "@host"}, function (err, user) {
                            if (err) {
                                return callback(err, null);
                            }
                            else {
                                return callback(null, user);
                            }
                        });
                    }
                    else {
                        return callback(null, user);
                    }
                });
            }
        });
    }
}
