Timeliner
=====================

* nodejs and redis is already bundled with Timeliner.

* Download Dependencies.

		npm install

* start Timeliner

		bin/timeliner start
		or
		npm start

* stop timeliner

		bin/timeliner stop
		or
		npm stop

* clean dirty shutdown (removes pid files)

		bin/timeliner clean

* start redis-cli

		bin/timeliner redis-cli

* watch log files

		bin/timliner log timeliner
		bin/timeliner log redis




Platform and Architecture dependent binaries
--------------------------------------------
Timeliner comes with all necessary dependencies.
All binaries are in a directory related to the architecture.
So the 64bit binaries are in bin/x86_64 and 32bit are in bin/x86_32.
At the moment there are only binaries for 64bit, so please copy the right binaries for 32bit
into that folder and commit them.


Timeliner Startscript
----------------

The new timeliner startscript in 'bin/timeliner' will setup the environment for starting and stopping timeliner. It
will
choose
the right binaries for the current running architecture (64b or 32b)
It will also ensure that all processes are started in the right order and stopped cleanly.
So the script will start the redis-server and waits until it is really ready for connections and then starts the
Timeliner HTTP server.


Goals
-----
Timeliner should be.

* Fast. Especially at runtime. "Cold cache" performance is not that important, when in return a better runtime performance is the benefit.
* Easy to use
* Timeliner should be trustfully for the users
  * This has to be achieved with secure transports, cryptographical approaches, and opennes

Dependencies
------------

* Node.js
* Redis - Backend Store
* Backbone - MVC
* Mustache - Template engine
* Keymaster https://github.com/madrobby/keymaster - Keyboard navigation lib
* jQuery --> convert to Zepto - DOM
* Twittters Bootstrap - UI - This is the only jquery dependency since twipsys does not work with zepto out of the box
* Store.js https://github.com/marcuswestin/store.js#readme - LocalStorage Caching API
* Animate.css https://github.com/daneden/animate.css - CSS3 driven animations

Future Goals
------------

WebID
* Create Cert: http://webid.myxwiki.org/xwiki/bin/view/WebId/CreateCert
* Debug Cert: https://webid.turnguard.com:8443/WebIDTestServer/debug

Tooltips without JavaScript
* http://t3n.de/news/css3-individuelle-tooltips-ohne-356353/
