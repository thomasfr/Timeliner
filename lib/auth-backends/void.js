var commonConfig = require('../../conf/common');

var users = require('../users');

exports.authenticate = function (username, password, callback) {
    if (!username || !username.match(/[a-zA-Z0-9]+/i)) {
        return callback(new Error('not a valid username'), null);
    } else {
        users.getByName(username, function (err, user) {
            if (err) {
                return callback(err, null);
            }
            else if (err === null && user === null) {
                console.log("user not found. Creating it.");
								// TODO: Remove Hardcoded host value
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
}
