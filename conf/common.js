var port = 3000;
module.exports = {
    sessionKey:  "timeliner.id",
    port:        port,
    baseUrl:     "http://localhost:" + port,
    //authBackend:"internal",
    authBackend: "ldap",
    //authBackend: "void",
    supported:   {
        "firefox": 8,
        "chrome":  15
    },

    xmpp: {
        jid:      "user@host",
        password: "password"
    },


    ldap: {
        server:     {
            url: 'ldaps://host:636'
        },
        DNTemplate: 'uid={{username}},dc=host'
    }
};
