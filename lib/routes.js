var platform = require("platform");
var commonConfig = require("../conf/common");
var hogan = require('hogan.js');
var fs = require('fs');

module.exports = function (app) {

    app.get('/', function (request, response) {
        var client = platform.parse(request.headers["user-agent"]);
        var clientName = client.name.toLowerCase() || null;
        var clientVersion = client.version.toLowerCase() || null;
        var clientVersionMatches = clientVersion.match(/^([0-9]+)\./) || null;
        var clientMajorVersion = parseInt(clientVersionMatches[1]) || null;
        var template = "";
        if ((clientName === "firefox" && clientMajorVersion >= commonConfig.supported.firefox) || (clientName === "chrome" && clientMajorVersion >= commonConfig.supported.chrome)) {
            template = "index";
        }
        else if (clientName === "ie") {
            template = "unsupported/ie";
        }
        else {
            template = "unsupported/oldversion";
        }
        response.render(template);
    });

    app.get('/profile', function (request, response) {
        fs.readFile('views/profile.html', 'utf8', function (err, data) {
            var template = hogan.compile(data, {asString:true});
            response.send(template.toString(), {"Content-Type":"application/javascript"});
        });
    });

}
