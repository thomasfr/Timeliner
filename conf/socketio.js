module.exports = function (socketio) {

    socketio.configure(function () {
        socketio.enable('browser client minification');
        //socketio.set('origins', [ 'domain.com' ]);
        socketio.enable('browser client gzip');
        socketio.enable('browser client etag');
        socketio.set('transports', [
            'websocket'
        ]);
    });

    socketio.configure('development', function () {
        socketio.set('log level', 2);
    });

    socketio.configure('production', function () {
        socketio.set('log level', 1);
    });
}
