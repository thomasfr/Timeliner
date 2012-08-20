var commonConfig = require('../../conf/common');
var crypto = require('crypto');
var users = require('../users');

exports.authenticate = function (username, password, callback) {
    var hashedPassword = users.hashPassword(password);
    users.getByName(username, function (err, user) {
        if (err) return callback(err, null);
        if (!user) return callback(new Error('cannot find user'), null);
        if (user.password === hashedPassword) {
            delete user.password;
            return callback(null, user);
        }
        callback(new Error('invalid password'), null);
    });
}