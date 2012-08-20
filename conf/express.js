module.exports = function (app) {
    var express = require('express');
    var commonConfig = require('./common');
    var hogan = require('../lib/express-hogan');

    app.configure(function () {
        app.use(express.favicon());
        app.use(express.methodOverride());
        app.use(express.bodyParser());
        app.set('views', 'views');
        app.set('view engine', 'html');
        app.register(".html", hogan);
        app.set('view options', {
            "layout":false
        });
        app.use(express.cookieParser());
        app.use(express.session({
            store:require('../lib/session-store.js'),
            secret:'.z-@)bk)*0KSPM%D=c}O',
            key:commonConfig.sessionKey
        }));
        app.use(express.compiler({
            src:'public',
            enable:['less']
        }));
        var oneYear = 31557600000;
        app.use(express.static('public', { maxAge:oneYear }));
        app.use(app.router);
    });

    app.configure('development', function () {
        app.use(express.errorHandler({
            dumpExceptions:true, showStack:true
        }))
    });
}
