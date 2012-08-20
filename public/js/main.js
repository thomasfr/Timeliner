// Require.js allows us to configure shortcut alias
// There usage will become more apparent futher along in the tutorial.
require.config({
    paths:{
        "Underscore":'libs/underscore',
        "Backbone":'libs/backbone',
        "moment":"libs/moment",
        "key":"libs/keymaster"
    }

});

require([
    // Load our app module and pass it to our definition function
    'App'
], function (App) {
    // The "app" dependency is passed in as "App"
    // Again, the other dependencies passed in are not "AMD" therefore don't pass a parameter to this function
    App.initialize();
});