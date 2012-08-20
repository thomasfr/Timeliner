var commonConfig = require('./conf/common');
var app = require('./lib/app.js').app;
var childProcess = require("child_process");

app.listen(commonConfig.port || 3000);
console.log("Express server listening on %s in %s mode.", app.address().port, app.settings.env);

forkXMPPClient();

function forkXMPPClient() {
    var xmpp = childProcess.fork(__dirname + '/lib/xmpp');
    xmpp.on("exit", function () {
        console.log("XMPP exit");
        xmpp = forkXMPPClient();
    });
    return xmpp;
}
