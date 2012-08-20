define(["jquery", "Underscore", "Backbone", "moment", "key"], function ($, _, Backbone, moment, key) {

    var App = function () {
        return {
            initialize:function () {
                var pings = $('#pings');
                var profile = $('#profile');
                var newPings = $('#unread-pings');
                var onlineUsers = $('#users .value');
                var container = $('#container');
                var loginForm = $('#login');
                var topMenu = $('#topmenu');
                var newPingButton = $("#newpingbutton");
                var unreadPings = [];
                var sio = io.connect();

                // This is the user object when authenticated
                var ME = null;

                var avatarSrc = "/img/avatar-blank-64.jpg";
                var avatarSrc48 = "/img/avatar-blank-48.jpg";
                var avatarSrc24 = "/img/avatar-blank-24.jpg";

                $(window).keypress(function (e) {
                    if (e.keyCode == 27) {
                        return false;
                    }
                });

                sio.socket.on('error', function (reason) {
                    console.log("ERROR", reason);
                });

                $(".item.like[rel=twipsy]").tooltip({
                    live:true,
                    title:function () {
                        var uids = $(this).attr('data-uid');
                        var likes = 0;
                        var s = "";
                        uids = uids.split(",");
                        if (uids[0] && uids[0].length > 0) {
                            likes = uids.length;
                        }
                        if (likes === 0 || likes > 1) {
                            s = "s";
                        }
                        return "" + likes + " like" + s;
                    }
                });
                $(".item.dislike[rel=twipsy]").tooltip({
                    live:true,
                    title:function () {
                        var uids = $(this).attr('data-uid');
                        var dislikes = 0;
                        var s = "";
                        uids = uids.split(",");
                        if (uids[0] && uids[0].length > 0) {
                            dislikes = uids.length;
                        }
                        if (dislikes === 0 || dislikes > 1) {
                            s = "s";
                        }
                        return "" + dislikes + " dislike" + s;
                    }
                });

                $('.item.date[rel=twipsy]').tooltip({
                    live:true,
                    title:function () {
                        var pingTimestamp = $(this).attr('data-original-title');
                        var origDate = moment(parseInt(pingTimestamp));
                        return origDate.format('LLLL');
                    }
                });

                key('p', function () {
                    $('#newping').focus();
                    return false;
                });

                $('#search-field').on('blur', function () {
                    $(this).val("");
                });


                $(topMenu).find('ul li a').on("click", function (e) {
                    var link = $(this);
                    var matches = link.attr('href').match(/^#(.*)+$/);
                    console.log(matches);
                    if (matches && matches[1]) {
                        e.preventDefault();
                    }
                });


                newPingButton.click(function () {
                    var textarea = $('#newping');
                    var message = textarea.val();
                    if (message && message.length > 0) {
                        showUnreadPings();
                        sio.emit('ping:add', message, function (err, ping) {
                            if (err) return console.error(err);
                            renderPing(ping);
                            textarea.val("");
                        });
                    }
                    else {
                        console.log("no message");
                    }
                    return false;
                });

                sio.on('ready', function (data) {
                    if (!data.authenticated) {
                        container.hide();
                        topMenu.hide();
                        loginForm.show();
                        $('#login button').click(function (event) {
                            event.preventDefault();
                            var username = $('#login input[name=username]').val();
                            var password = $('#login input[name=password]').val();
                            sio.emit("authenticate", {username:username, password:password}, function (err, data) {
                                if (err) return console.log(err);
                                if (data) {
                                    loginForm.hide()
                                    topMenu.show();
                                    container.show();
                                    ME = data.user;
                                    renderOnlineUsers(data.onlineUsers);
                                    sio.emit('timeline:public:get', {}, function (err, result) {
                                        if (err) return console.error(err);
                                        var i = result.length - 1, l = 0;
                                        for (i; i >= l; i--) {
                                            renderPing(result[i]);
                                        }
                                    });
                                }
                            });
                        });
                    }
                    else {
                        loginForm.hide();
                        topMenu.show();
                        container.show();
                        ME = data.user;
                        renderOnlineUsers(data.onlineUsers);
                        sio.emit('timeline:public:get', {}, function (err, result) {
                            if (err) return console.error(err);
                            var i = result.length - 1, l = 0;
                            for (i; i >= l; i--) {
                                renderPing(result[i]);
                            }
                        });
                    }
                });

                sio.on('timeline:public:new', function (data) {
                    console.log("timline:public:new", data);
                    var newPingCount = parseInt(newPings.find('span').html()) || 0;
                    newPingCount++;
                    newPings.find('span').html("" + newPingCount);
                    newPings.show();
                    unreadPings.push(data);
                });

                sio.on('user:online', function (user) {
                    console.log("user:online", user);
                    addOnlineUser(user);
                });

                sio.on('user:offline', function (user) {
                    console.log("user:offline", user);
                    var userEl = $('#user_' + user.id);
                    userEl.addClass('animated bounceOut');
                    setTimeout(function () {
                        userEl.remove();
                    }, 1000);
                });

                sio.on('ping:like:change', function (data) {
                    console.log('like:change', arguments);
                    updateLikes('ping', data.id, data.uids);
                });

                sio.on('ping:dislike:change', function (data) {
                    console.log('dislike:change', arguments);
                    updateDislikes('ping', data.id, data.uids);
                });

                sio.on('comment:like:change', function (data) {
                    console.log('comment:like:change', arguments);
                    updateLikes('comment', data.id, data.uids);
                });

                sio.on('comment:dislike:change', function (data) {
                    console.log('comment:like:change', arguments);
                    updateDislikes('comment', data.id, data.uids);
                });

                sio.on('comment:add', function (comment) {
                    console.log("comment:add", comment);
                    addComment(comment);
                });

                if (newPings) {
                    newPings.on("click", function () {
                        showUnreadPings();
                    });
                }

                var handleItemClick = function (event) {
                    var actionItem = $(event.target).closest('.item');
                    if (!actionItem) return;
                    var action = "add";
                    var uidsString = $(actionItem).attr('data-uid');
                    var uids = [];
                    if (uidsString && uidsString.length > 0) {
                        uids = uidsString.split(',');
                        action = ($.inArray(ME.id, uids) >= 0) ? "remove" : "add";
                    }
                    var itemType = $(actionItem).attr('data-action');
                    var article = $(actionItem).closest('article');
                    var articleId = $(article).attr('data-id');
                    var articleType = $(article).attr('data-type');
                    var event = articleType + ':' + itemType + ':' + action;
                    sio.emit(event, articleId, function (err, uids) {
                        if (err) console.error(err);
                        else updateMetadata(articleType, articleId, itemType, uids);
                    });
                }

                pings.on('click', 'article footer .item .action', handleItemClick);

                pings.on('keypress', 'article.ping .commentfield input', function (event) {
                    if (event.keyCode === 13) {
                        var input = $(this);
                        var message = $(input).val();
                        var dataEl = $(event.target).closest('article');
                        var dataId = $(dataEl).attr('data-id');
                        var dataType = $(dataEl).attr('data-type');
                        sio.emit('comment:add', dataType, dataId, message, function (err, comment) {
                            if (err) return console.log(err);
                            else {
                                $(input).val("");
                                addComment(comment);
                            }
                        });
                    }
                });

                var addComment = function (comment) {
                    if (!comment || !comment.of) return;
                    var dataEl = $('#' + comment.of_type + "_" + comment.of);
                    if (dataEl) {
                        var comments = dataEl.find('.content section.comments').first();
                        comments.append('<article data-type="comment" class="comment clearfix" data-id="' + comment.id + '" id="comment_' + comment.id + '"><div class="avatar"><img src="' + avatarSrc48 + '"/><div class="details">' + comment.user.username + '</div></div><div class="content"><p>' + comment.message + '</p><footer class="comment meta"><span class="item date" rel="twipsy" title="' + comment.date + '" data-date="' + comment.date + '">' + moment(parseInt(comment.date)).fromNow() + '</span><span class="item like" data-action="like" rel="twipsy"><span class="action">Like</span><span class="value">0</span></span><span class="item dislike"  rel="twipsy" data-action="dislike"><span class="action">Dislike</span><span class="value">0</span></span></footer><section class="comments"></section><div class="commentfield"><div class="avatar"><img src="' + avatarSrc24 + '"/></div><input type="text" name="comment" class="input-small" placeholder="Comment..."></div></div></article>');
                    }
                    updateLikes('comment', comment.id, comment.likes);
                    updateDislikes('comment', comment.id, comment.dislikes);
                }

                var showUnreadPings = function () {
                    var i = 0, l = unreadPings.length, ping;
                    for (i; i < l; i++) {
                        ping = unreadPings[i];
                        renderPing(ping);
                    }
                    newPings.find("span").html("0");
                    newPings.hide();
                    $('html').scrollTop(0);
                    unreadPings = [];
                }

                var addOnlineUser = function (user) {
                    $("#user_" + user.id).remove();
                    onlineUsers.prepend('<div class="user" data-type="user" style="display:none;" data-id="' + user.id + '" id="user_' + user.id + '"><div class="avatar"><img src="/img/avatar-blank-48.jpg"/></div><div class="details">' + user.username + '</div></div>');
                    var userEl = $('#user_' + user.id);
                    userEl.addClass('animated bounceIn').show();
                }

                var renderOnlineUsers = function (users) {
                    var i = 0, l = users.length, user;
                    onlineUsers.html("");
                    for (i; i < l; i++) {
                        user = users[i];
                        addOnlineUser(user);
                    }
                }

                var renderPing = function (ping) {
                    if ($('#ping_' + ping.id).length <= 0) {
                        var pingsEl = pings.prepend('<article data-type="ping" class="ping clearfix" data-id="' + ping.id + '" id="ping_' + ping.id + '"><div class="avatar"><img src="' + avatarSrc + '"/><div class="details">' + ping.user.username + '</div></div><div class="content"><p>' + ping.message + '</p><footer class="ping meta"><span class="item date" rel="twipsy" title="' + ping.date + '" data-date="' + ping.date + '">' + moment(parseInt(ping.date)).fromNow() + '</span><span class="item like" data-action="like" rel="twipsy"><span class="action">Like</span><span class="value">0</span></span><span class="item dislike" rel="twipsy" data-action="dislike"><span class="action">Dislike</span><span class="value">0</span></span></footer><section class="comments"></section><div class="commentfield"><div class="avatar"><img src="' + avatarSrc24 + '"/></div><input type="text" name="comment" class="input-small" placeholder="Comment..."></div></div></article>')
                        var pingEl = pingsEl.find('#ping_' + ping.id);
                        var comments = ping.comments || [], i = 0, ln = comments.length;
                        for (i; i < ln; i++) {
                            addComment(comments[i]);
                        }
                        pingEl.find('pre code').each(function (i, e) {
                            hljs.highlightBlock(e);
                        });
                    }
                    updateLikes('ping', ping.id, ping.likes);
                    updateDislikes('ping', ping.id, ping.dislikes);
                }

                var updateDate = function (index, articleEl) {
                    articleEl = $(articleEl);
                    var footerDateEl = articleEl.find('footer .item.date');
                    footerDateEl.html(moment(parseInt(footerDateEl.attr('data-date'))).fromNow());
                }
                var updateDates = function () {
                    $('article[data-type]').each(updateDate);
                }
                setInterval(updateDates, 80000);

                var updateLikes = function (dataType, dataId, uids) {
                    updateMetadata(dataType, dataId, "like", uids);
                }

                var updateDislikes = function (dataType, dataId, uids) {
                    updateMetadata(dataType, dataId, "dislike", uids);
                }

                var updateMetadata = function (dataType, dataId, itemType, uids) {
                    uids = uids || [];
                    var article = $('#' + dataType + "_" + dataId);
                    var footer = article.find('.content footer').first();
                    var item = footer.find('.item[data-action=' + itemType + ']');
                    item.find('.value').html(uids.length);
                    item.attr('data-uid', uids.join(','));
                }
            }
        }
    }
    _.extend(App, Backbone.Events);
    return new App;
});
