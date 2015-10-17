! function t(e, n, o) {
    function s(a, r) {
        if (!n[a]) {
            if (!e[a]) {
                var l = "function" == typeof require && require;
                if (!r && l) return l(a, !0);
                if (i) return i(a, !0);
                var u = new Error("Cannot find module '" + a + "'");
                throw u.code = "MODULE_NOT_FOUND", u
            }
            var c = n[a] = {
                exports: {}
            };
            e[a][0].call(c.exports, function(t) {
                var n = e[a][1][t];
                return s(n ? n : t)
            }, c, c.exports, t, e, n, o)
        }
        return n[a].exports
    }
    for (var i = "function" == typeof require && require, a = 0; a < o.length; a++) s(o[a]);
    return s
}({
    1: [function(require, module, exports) {
        var IrcClient = require("../ircclient.js"),
            emoticons = require("../emoticons/emoticons.js"),
            emotify = emoticons.emotify,
            escape = emoticons.escape,
            splitText = function(t, e, n) {
                var o = [],
                    s = function(t, i) {
                        if (e[i] && t.trim().length)
                            if (t.indexOf(e[i]) > -1) {
                                var a = 1,
                                    r = t.split(e[i]);
                                r.forEach(function(t) {
                                    if (t.length) {
                                        var l = "";
                                        a != r.length && (l = e[i]), t = (t + l).trim()
                                    }
                                    t.length && t.length <= n ? o.push(t) : s(t, i + 1), a++
                                })
                            } else s(t, i + 1);
                        else if (t.length)
                            for (var l = new RegExp(".{1," + n + "}", "g"), u = t.match(l); u.length > 0;) o.push(u.shift().trim())
                    };
                s(t, 0);
                var i = [];
                return o.forEach(function(t) {
                    i.length && i[i.length - 1].length + t.length + 1 <= n ? i[i.length - 1] += " " + t : i.push(t)
                }), i
            },
            parseBoolean = function(t) {
                return !!$.parseJSON(String(t).toLowerCase())
            },
            flashSupport = navigator.mimeTypes && navigator.mimeTypes.length ? Array.prototype.slice.call(navigator.mimeTypes).some(function(t) {
                return "application/x-shockwave-flash" == t.type
            }) : /MSIE/.test(navigator.userAgent) ? eval("try { new ActiveXObject('ShockwaveFlash.ShockwaveFlash') && !0 } catch(e) { !1 };") : !1,
            html5AudioSupport = function() {
                var t = document.createElement("audio");
                return !(!t.canPlayType || !t.canPlayType("audio/mpeg;").replace(/no/, ""))
            }();
        window.playSounds = function(t) {};
        var soundManagerSettings = {
            url: "/vendor/scottschiller/SoundManager2/swf/",
            onready: function() {
                window.playSounds = function(t) {
                    soundManager.stopAll(),
                        function e(t) {
                            var n = t.shift();
                            if (n) {
                                soundManager.createSound({
                                    volume: n.volume,
                                    url: n.url,
                                    autoLoad: !0,
                                    autoPlay: !1,
                                    onfinish: function() {
                                        t.length && e(t)
                                    },
                                    onload: function(o) {
                                        o ? n.maxDuration && this.durationEstimate > n.maxDuration ? t.length && e(t) : this.play() : (window.onerror("audio failed to load: " + n.url), t.length && e(t))
                                    }
                                })
                            }
                        }(t)
                }
            }
        };
        html5AudioSupport || (soundManagerSettings.flashVersion = 9, soundManagerSettings.preferFlash = !0), soundManager.setup(soundManagerSettings);
        var totals = {
                subscriptions: null,
                follows: null
            },
            streamStartedAt = null,
            largestDonationThisStream = null;
        localforage.getItem("streamStartedAt", function(t, e) {
            streamStartedAt = e
        }), localforage.getItem("largestDonationThisStream", function(t, e) {
            largestDonationThisStream = e
        });
        var seen = {
                follows: [],
                subscriptions: [],
                hosts: {}
            },
            chat = function() {
                var t = null,
                    e = /([a-zA-Z0-9-_]+) (?:is now hosting you)(?: for ([0-9]+) viewers?)?\./;
                return {
                    start: function(n, o) {
                        if (!t) {
                            n = n.toLowerCase();
                            var s = n;
                            $.ajax("https://api.twitch.tv/api/channels/" + s + "/chat_properties", {
                                dataType: "jsonp"
                            }).done(function(i) {
                                var a = "ws://" + _.sample(i.web_socket_servers),
                                    r = n,
                                    l = "oauth:" + o;
                                t = new IrcClient(a), t.on("connected", function() {
                                    this.send("CAP REQ :twitch.tv/tags twitch.tv/commands"), this.send("PASS " + l), this.send("NICK " + r), this.send("JOIN #" + s)
                                }).on("message", function(t) {
                                    if ("PING" == t.command) this.send("PONG " + t.crlf);
                                    else if ("PRIVMSG" == t.command) {
                                        var n = t.crlf.match(e);
                                        if (n) {
                                            var o = n[2] || 0,
                                                s = n[1] || null;
                                            if (s) {
                                                var i = [{
                                                    name: s,
                                                    viewers: o
                                                }];
                                                console.log("emitting %s hosts", i.length), socket.emit("hosts", i)
                                            }
                                        }
                                    }
                                }), t.connect()
                            })
                        }
                    }
                }
            }(),
            statsPoll = function() {
                var t = null,
                    e = 3e5,
                    n = !0,
                    o = function() {
                        $.ajax("https://api.twitch.tv/kraken/streams/" + username, {
                            dataType: "jsonp"
                        }).done(function(t) {
                            if (t.stream) {
                                streamStartedAt != t.stream.created_at && (null != streamStartedAt && (largestDonationThisStream = null), streamStartedAt = t.stream.created_at, localforage.setItem("streamStartedAt", streamStartedAt));
                                var e = {
                                    viewers: t.stream.viewers,
                                    game: t.stream.game,
                                    started_at: moment(t.stream.created_at).utc().format("YYYY-MM-DD HH:mm:ss")
                                };
                                totals.follows && (e.follows = totals.follows), totals.subscriptions && (e.subscriptions = totals.subscriptions), streamStats = e, totals.subscriptions && socket.emit("streamStats", e)
                            }
                            n = !1
                        }).always(function() {
                            t = setTimeout(o, e)
                        })
                    },
                    s = function() {
                        n = !0, i(), t = setTimeout(o, 5e3)
                    },
                    i = function() {
                        n = !0, t && clearTimeout(t)
                    };
                return {
                    start: s,
                    stop: i
                }
            }(),
            fp = function() {
                var t = null,
                    e = 2e4,
                    n = !0,
                    o = function() {
                        $.ajax("https://api.twitch.tv/kraken/channels/" + username + "/follows?limit=25&direction=desc", {
                            dataType: "jsonp"
                        }).done(function(t) {
                            if (t.follows && t.follows.length) {
                                for (var e = [], o = 0; o < t.follows.length; o++) {
                                    var s = t.follows[o]; - 1 == seen.follows.indexOf(s.user._id) && (e.push({
                                        created_at: moment(s.created_at).utc().format("YYYY-MM-DD HH:mm:ss"),
                                        id: s.user._id,
                                        name: s.user.display_name
                                    }), seen.follows.push(s.user._id))
                                }
                                e.length && (n || (socket.emit("follows", e), console.log("emitting %s follows", e.length))), totals.follows = t._total
                            }
                            n = !1
                        }).always(function() {
                            t = setTimeout(o, e)
                        })
                    },
                    s = function() {
                        n = !0, i(), t = setTimeout(o, 5e3)
                    },
                    i = function() {
                        n = !0, t && clearTimeout(t)
                    };
                return {
                    start: s,
                    stop: i
                }
            }(),
            sp = function() {
                var t = null,
                    e = 2e4,
                    n = !0,
                    o = function() {
                        $.ajax("https://api.twitch.tv/kraken/channels/" + username + "/subscriptions?oauth_token=" + twitchToken + "&limit=25&direction=desc", {
                            dataType: "jsonp"
                        }).done(function(t) {
                            if (t.subscriptions) {
                                if (t.subscriptions.length) {
                                    for (var o = [], s = 0; s < t.subscriptions.length; s++) {
                                        var i = t.subscriptions[s]; - 1 == seen.subscriptions.indexOf(i.user._id) && (o.push({
                                            created_at: moment(i.created_at).utc().format("YYYY-MM-DD HH:mm:ss"),
                                            id: i.user._id,
                                            name: i.user.display_name
                                        }), seen.subscriptions.push(i.user._id))
                                    }
                                    o.length && (n || (socket.emit("subscriptions", o), console.log("emitting %s subscriptions", o.length))), totals.subscriptions = t._total
                                }
                                e = 3e4
                            } else e = 3e5;
                            n = !1
                        }).always(function() {
                            t = setTimeout(o, e)
                        })
                    },
                    s = function() {
                        n = !0, i(), t = setTimeout(o, 5e3)
                    },
                    i = function() {
                        n = !0, t && clearTimeout(t)
                    };
                return {
                    start: s,
                    stop: i
                }
            }(),
            followAlertQueue = [],
            subscriptionAlertQueue = [],
            donationAlertQueue = [],
            hostAlertQueue = [],
            customAlertQueue = [],
            queueAlert = function(t, e) {
                "follow" == t ? enabled.follows && followAlertQueue.push(e) : "subscription" == t ? enabled.subscriptions && subscriptionAlertQueue.push(e) : "donation" == t ? enabled.donations && donationAlertQueue.push(e) : "host" == t ? enabled.hosts && hostAlertQueue.push(e) : "custom" == t ? customAlertQueue.push(e) : console.log("invalid alert type")
            },
            delay, globalLayout, types, setSettings = function(t) {
                window.name && $(function() {
                    $("body").css({
                        background: t.background_color
                    })
                }), globalLayout = t.layout, delay = parseInt(t.alert_delay), types = {
                    follow: {
                        settings: {
                            layout: t.follow_layout || globalLayout,
                            imageHref: t.follow_image_href,
                            soundHref: t.follow_sound_href,
                            soundVolume: t.follow_sound_volume,
                            textSize: t.follow_font_size,
                            textColor: t.follow_font_color,
                            specialTextColor: t.follow_font_color2,
                            textAnimation: t.follow_text_animation,
                            font: t.follow_font,
                            textThickness: t.follow_font_weight,
                            messageTemplate: t.follow_message_template,
                            showAnimation: t.follow_show_animation,
                            hideAnimation: t.follow_hide_animation
                        },
                        variations: t.follow_variations,
                        duration: parseInt(t.follow_alert_duration),
                        enabled: parseBoolean(t.follow_enabled)
                    },
                    host: {
                        settings: {
                            layout: t.host_layout || globalLayout,
                            imageHref: t.host_image_href,
                            soundHref: t.host_sound_href,
                            soundVolume: t.host_sound_volume,
                            textSize: t.host_font_size,
                            textColor: t.host_font_color,
                            specialTextColor: t.host_font_color2,
                            textAnimation: t.host_text_animation,
                            font: t.host_font,
                            textThickness: t.host_font_weight,
                            messageTemplate: t.host_message_template,
                            showAnimation: t.host_show_animation,
                            hideAnimation: t.host_hide_animation
                        },
                        variations: t.host_variations,
                        duration: parseInt(t.host_alert_duration),
                        enabled: parseBoolean(t.host_enabled),
                        viewerMinimum: parseInt(t.host_viewer_minimum || 0)
                    },
                    donation: {
                        settings: {
                            layout: t.donation_layout || globalLayout,
                            imageHref: t.donation_image_href,
                            soundHref: t.donation_sound_href,
                            soundVolume: t.donation_sound_volume,
                            textSize: t.donation_font_size,
                            textColor: t.donation_font_color,
                            specialTextColor: t.donation_font_color2,
                            textAnimation: t.donation_text_animation,
                            font: t.donation_font,
                            textThickness: t.donation_font_weight,
                            messageTemplate: t.donation_message_template,
                            userMessageTextThickness: t.donation_message_font_weight,
                            userMessageTextSize: t.donation_message_font_size,
                            userMessageTextColor: t.donation_message_font_color,
                            userMessageFont: t.donation_message_font,
                            userMessageEnabled: parseBoolean(t.show_donation_message),
                            userMessageAllowEmotes: parseBoolean(t.donation_message_allow_emotes),
                            ttsLanguage: t.donation_tts_language,
                            ttsEnabled: parseBoolean(t.donation_tts_enabled),
                            ttsSecurity: parseInt(t.donation_tts_security || 0),
                            ttsVolume: parseInt(t.donation_tts_volume || 75),
                            minAmount: parseFloat(t.donation_alert_min_amount),
                            messageMinAmount: parseFloat(t.donation_alert_message_min_amount),
                            ttsMinAmount: parseFloat(t.donation_tts_min_amount),
                            showAnimation: t.donation_show_animation,
                            hideAnimation: t.donation_hide_animation
                        },
                        variations: t.donation_variations,
                        duration: parseInt(t.donation_alert_duration),
                        enabled: parseBoolean(t.donation_enabled)
                    },
                    subscription: {
                        settings: {
                            layout: t.sub_layout || globalLayout,
                            imageHref: t.sub_image_href,
                            soundHref: t.sub_sound_href,
                            soundVolume: t.sub_sound_volume,
                            textSize: t.sub_font_size,
                            textColor: t.sub_font_color,
                            specialTextColor: t.sub_font_color2,
                            textAnimation: t.sub_text_animation,
                            font: t.sub_font,
                            textThickness: t.sub_font_weight,
                            messageTemplate: t.sub_message_template,
                            showAnimation: t.sub_show_animation,
                            hideAnimation: t.sub_hide_animation
                        },
                        variations: t.sub_variations,
                        duration: parseInt(t.sub_alert_duration),
                        enabled: parseBoolean(t.sub_enabled)
                    }
                }
            };
        setSettings(settings);
        var profanitize = function(t, e) {
                var n = donationPageSettings.profanity_custom_words.trim(),
                    o = n.length ? n.replace(/\s\s+/g, " ").split(" ") : [],
                    s = o.length ? Profanity.getListRegex(o) : null,
                    i = !1;
                if (donationPageSettings.profanity_names && Profanity.testString(e, {
                        extraRegex: s,
                        useDefaultRegex: donationPageSettings.profanity_default_words
                    }) && (e = "Anonymous"), 1 == donationPageSettings.profanity_mode) {
                    var a = Profanity.purifyString(t, {
                        extraRegex: s,
                        useDefaultRegex: donationPageSettings.profanity_default_words,
                        replace: !1
                    });
                    t = a[0], i = a[1].length > 0
                } else if (2 == donationPageSettings.profanity_mode) {
                    var a = Profanity.purifyString(t, {
                        extraRegex: s,
                        useDefaultRegex: donationPageSettings.profanity_default_words,
                        replace: !0
                    });
                    t = a[0], i = a[1].length > 0
                } else if (3 == donationPageSettings.profanity_mode || 4 == donationPageSettings.profanity_mode) {
                    var a = Profanity.purifyString(t, {
                        extraRegex: s,
                        useDefaultRegex: donationPageSettings.profanity_default_words,
                        replace: !1
                    });
                    a[1].length && (t = "", i = !0)
                }
                return {
                    profanity: i,
                    message: t,
                    name: e
                }
            },
            showFollowAlert = function(t) {
                var e = t,
                    n = _.cloneDeep(types.follow),
                    o = n.settings.layout || globalLayout;
                if (n.enabled) {
                    if (n.variations && n.variations.length) {
                        var s = [];
                        if (_.isUndefined(e.variation) || _.isNull(e.variation) ? _.forEach(n.variations, function(t, e) {
                                "RANDOM" == t.condition && s.push(t)
                            }) : n.variations[e.variation] && s.push(n.variations[e.variation]), s.length) {
                            var i = _.sample(s);
                            n.settings.imageHref = i.settings.image.href, n.settings.soundHref = i.settings.sound.href, n.settings.messageTemplate = i.settings.text.format, n.settings.soundVolume = i.settings.sound.volume || n.settings.soundVolume, n.settings.textSize = i.settings.text.size || n.settings.textSize, n.settings.textColor = i.settings.text.color || n.settings.textColor, n.settings.specialTextColor = i.settings.text.color2 || n.settings.specialTextColor, n.settings.textAnimation = _.isUndefined(i.settings.text.animation) ? n.settings.textAnimation : i.settings.text.animation, n.settings.font = i.settings.text.font || n.settings.font, n.settings.textThickness = i.settings.text.thickness || n.settings.textThickness, n.duration = i.settings.duration || n.duration, n.settings.showAnimation = i.settings.showAnimation || n.settings.showAnimation, n.settings.hideAnimation = i.settings.hideAnimation || n.settings.hideAnimation, o = i.settings.layout || o
                        }
                    }
                    return ab.showAlert(n.settings, e, n.duration, o), delay + n.duration
                }
            },
            showSubscriptionAlert = function(t) {
                var e = t,
                    n = _.cloneDeep(types.subscription),
                    o = n.settings.layout || globalLayout;
                if (n.enabled) {
                    if (n.variations && n.variations.length) {
                        var s = [];
                        if (_.isUndefined(e.variation) || _.isNull(e.variation)) {
                            var i = 0;
                            _.forEach(n.variations, function(t, n) {
                                "MIN_MONTHS_SUBSCRIBED" == t.condition ? (t.conditionData = parseInt(t.conditionData), e.count >= t.conditionData && t.conditionData >= i && (t.conditionData > i && (s = []), s.push(t), i = t.conditionData)) : "RANDOM" == t.condition && 0 == i && s.push(t)
                            })
                        } else n.variations[e.variation] && s.push(n.variations[e.variation]);
                        if (s.length) {
                            var a = _.sample(s);
                            n.settings.imageHref = a.settings.image.href, n.settings.soundHref = a.settings.sound.href, n.settings.messageTemplate = a.settings.text.format, n.settings.soundVolume = a.settings.sound.volume || n.settings.soundVolume, n.settings.textSize = a.settings.text.size || n.settings.textSize, n.settings.textColor = a.settings.text.color || n.settings.textColor, n.settings.specialTextColor = a.settings.text.color2 || n.settings.specialTextColor, n.settings.textAnimation = _.isUndefined(a.settings.text.animation) ? n.settings.textAnimation : a.settings.text.animation, n.settings.font = a.settings.text.font || n.settings.font, n.settings.textThickness = a.settings.text.thickness || n.settings.textThickness, n.duration = a.settings.duration || n.duration, n.settings.showAnimation = a.settings.showAnimation || n.settings.showAnimation, n.settings.hideAnimation = a.settings.hideAnimation || n.settings.hideAnimation, o = a.settings.layout || o
                        }
                    }
                    return ab.showAlert(n.settings, e, n.duration, o), delay + n.duration
                }
            },
            showDonationAlert = function(t) {
                var e = t,
                    n = _.cloneDeep(types.donation),
                    o = n.settings.layout || globalLayout;
                if (e.amount = parseFloat(e.amount), n.enabled && n.settings.minAmount <= parseFloat(e.amount)) {
                    n.settings.messageMinAmount > parseFloat(e.amount) && (e.message = ""), n.settings.ttsMinAmount > parseFloat(e.amount) && (n.settings.ttsEnabled = !1);
                    var s = profanitize(e.message, e.name);
                    if (e.message = s.message, e.name = s.name, 4 != donationPageSettings.profanity_mode || !s.profanity) {
                        var i = n.settings;
                        if (i.emotes = t.emotes, s.profanity && 1 == donationPageSettings.profanity_mode && (i.ttsEnabled = !1), e.rawAmount = e.amount, e.amount = e.formattedAmount, delete e.formattedAmount, n.variations && n.variations.length) {
                            var a = [];
                            if (_.isUndefined(e.variation) || _.isNull(e.variation)) {
                                var r = 0,
                                    l = 0,
                                    s = {
                                        LARGEST_OF_STREAM: 10,
                                        EXACT_DONATION_AMOUNT: 20,
                                        MIN_DONATION_AMOUNT: 5
                                    };
                                _.forEach(n.variations, function(t, n) {
                                    "LARGEST_OF_STREAM" == t.condition && l <= s.LARGEST_OF_STREAM ? (!largestDonationThisStream || e.rawAmount > largestDonationThisStream) && (l < s.LARGEST_OF_STREAM && (l = s.LARGEST_OF_STREAM, a = []), a.push(t)) : "EXACT_DONATION_AMOUNT" == t.condition && l <= s.EXACT_DONATION_AMOUNT ? (t.conditionData = parseFloat(t.conditionData), e.rawAmount == t.conditionData && (l < s.EXACT_DONATION_AMOUNT && (l = s.EXACT_DONATION_AMOUNT, r = 0), t.conditionData >= r && (t.conditionData > r && (a = []), a.push(t), r = t.conditionData))) : "MIN_DONATION_AMOUNT" == t.condition && l <= s.MIN_DONATION_AMOUNT ? (t.conditionData = parseFloat(t.conditionData), e.rawAmount >= t.conditionData && t.conditionData >= r && (t.conditionData > r && (a = []), a.push(t), r = t.conditionData)) : "RANDOM" == t.condition && 0 == r && a.push(t)
                                }), (!largestDonationThisStream || e.rawAmount > largestDonationThisStream) && (largestDonationThisStream = e.rawAmount, localforage.setItem("largestDonationThisStream", largestDonationThisStream))
                            } else n.variations[e.variation] && a.push(n.variations[e.variation]);
                            if (a.length) {
                                var u = _.sample(a);
                                n.settings.imageHref = u.settings.image.href, n.settings.soundHref = u.settings.sound.href, n.settings.messageTemplate = u.settings.text.format, n.settings.soundVolume = u.settings.sound.volume || n.settings.soundVolume, n.settings.textSize = u.settings.text.size || n.settings.textSize, n.settings.textColor = u.settings.text.color || n.settings.textColor, n.settings.specialTextColor = u.settings.text.color2 || n.settings.specialTextColor, n.settings.textAnimation = _.isUndefined(u.settings.text.animation) ? n.settings.textAnimation : u.settings.text.animation, n.settings.font = u.settings.text.font || n.settings.font, n.settings.textThickness = u.settings.text.thickness || n.settings.textThickness, n.duration = u.settings.duration || n.duration, n.settings.showAnimation = u.settings.showAnimation || n.settings.showAnimation, n.settings.hideAnimation = u.settings.hideAnimation || n.settings.hideAnimation, o = u.settings.layout || o
                            }
                        }
                        return ab.showAlert(i, e, n.duration, o), delay + n.duration
                    }
                }
            },
            showHostAlert = function(t) {
                var e = t,
                    n = _.cloneDeep(types.host),
                    o = n.settings.layout || globalLayout;
                if (n.enabled && n.viewerMinimum < parseInt(e.viewers)) {
                    if (n.variations && n.variations.length) {
                        var s = [];
                        if (_.isUndefined(e.variation) || _.isNull(e.variation)) {
                            var i = 0;
                            _.forEach(n.variations, function(t, n) {
                                "MIN_VIEWERS_ACQUIRED" == t.condition ? (t.conditionData = parseInt(t.conditionData), e.viewers >= t.conditionData && t.conditionData >= i && (t.conditionData > i && (s = []), s.push(t), i = t.conditionData)) : "RANDOM" == t.condition && 0 == i && s.push(t)
                            })
                        } else n.variations[e.variation] && s.push(n.variations[e.variation]);
                        if (s.length) {
                            var a = _.sample(s);
                            n.settings.imageHref = a.settings.image.href, n.settings.soundHref = a.settings.sound.href, n.settings.messageTemplate = a.settings.text.format, n.settings.soundVolume = a.settings.sound.volume || n.settings.soundVolume, n.settings.textSize = a.settings.text.size || n.settings.textSize, n.settings.textColor = a.settings.text.color || n.settings.textColor, n.settings.specialTextColor = a.settings.text.color2 || n.settings.specialTextColor, n.settings.textAnimation = _.isUndefined(a.settings.text.animation) ? n.settings.textAnimation : a.settings.text.animation, n.settings.font = a.settings.text.font || n.settings.font, n.settings.textThickness = a.settings.text.thickness || n.settings.textThickness, n.duration = a.settings.duration || n.duration, n.settings.showAnimation = a.settings.showAnimation || n.settings.showAnimation, n.settings.hideAnimation = a.settings.hideAnimation || n.settings.hideAnimation, o = a.settings.layout || o
                        }
                    }
                    return e.count = parseInt(e.viewers), ab.showAlert(n.settings, e, n.duration, o), delay + n.duration
                }
            },
            showCustomAlert = function(t) {
                var e = _.cloneDeep(types[t.type]),
                    n = e.settings.layout || globalLayout,
                    o = t.duration || e.duration,
                    s = e.settings;
                _.has(t, "image_href") && (s.imageHref = t.image_href), _.has(t, "sound_href") && (s.soundHref = t.sound_href), _.has(t, "special_text_color") && (s.specialTextColor = t.special_text_color);
                var i = {},
                    a = t.message || "",
                    r = new RegExp("\\*(.*?)\\*", "g"),
                    l = a.match(r);
                if (l)
                    for (var u = 0; u < l.length; u++) a = a.replace(l[u], "{token" + u + "}"), i["token" + u] = l[u].slice(1, -1);
                return s.messageTemplate = a, ab.showAlert(s, i, o, n), delay + o
            };
        ! function() {
            var t = function() {
                var e = 100;
                customAlertQueue.length ? e = showCustomAlert(customAlertQueue.shift()) : donationAlertQueue.length ? e = showDonationAlert(donationAlertQueue.shift()) : subscriptionAlertQueue.length ? e = showSubscriptionAlert(subscriptionAlertQueue.shift()) : hostAlertQueue.length ? e = showHostAlert(hostAlertQueue.shift()) : followAlertQueue.length && (e = showFollowAlert(followAlertQueue.shift())), setTimeout(t, e)
            };
            t()
        }();
        var socket = io("io.twitchalerts.com:4567", {
            reconnectionDelay: 1e4,
            reconnectionDelayMax: 1e4,
            reconnectionAttempts: 10
        });
        socket.on("connect_error", function(t) {
            console.log("connect_error")
        }), socket.on("connect_timeout", function() {
            console.log("timeout")
        }), socket.on("reconnect", function(t) {
            console.log("reconnect %d", t)
        }), socket.on("reconnect_attempt", function() {
            console.log("reconnect_attempt")
        }), socket.on("reconnecting", function(t) {
            console.log("reconnecting %d", t)
        }), socket.on("reconnect_error", function(t) {
            console.log("reconnect_error")
        }), socket.on("reconnect_failed", function(t) {
            console.log("Connection failed, reloading in 60 seconds!"), setTimeout(function() {
                window.location.reload(!0)
            }, 6e4)
        }), socket.on("connect", function() {
            socket.emit("subscribe", token)
        }), socket.on("promote", function() {
            console.log("----- PROMOTED! -----"), fp.start(), sp.start(), statsPoll.start(), chat.start(username, twitchToken)
        });
        var DupCache = function() {
            var t = [],
                e = function() {
                    t = t.slice(0, 25e3)
                };
            return {
                contains: function(e) {
                    return -1 != t.indexOf(e)
                },
                add: function(n) {
                    t.unshift(n), e()
                }
            }
        }();
        socket.on("follows", function(t) {
            console.log("new follows: %s", t.map(function(t) {
                return t.name
            }).join(", "));
            for (var e = 0; e < t.length; e++) {
                var n = t[e];
                if (enabled.follows && !_.isUndefined(n.variation)) showFollowAlert({
                    name: n.name,
                    variation: n.variation
                });
                else {
                    var o = "follow-" + n.name;
                    DupCache.contains(o) || (queueAlert("follow", {
                        name: n.name,
                        variation: n.variation
                    }), DupCache.add(o))
                }
            }
        }), socket.on("subscriptions", function(t) {
            console.log("new subscriptions: %s", t.map(function(t) {
                return t.name
            }).join(", "));
            for (var e = 0; e < t.length; e++) {
                var n = t[e],
                    o = n.months || n.count || 1;
                if (enabled.subscriptions && !_.isUndefined(n.variation)) showSubscriptionAlert({
                    name: n.name,
                    months: o,
                    count: o,
                    variation: n.variation
                });
                else {
                    var s = "subscription-" + n.name;
                    DupCache.contains(s) || (queueAlert("subscription", {
                        name: n.name,
                        months: o,
                        count: o,
                        variation: n.variation
                    }), DupCache.add(s))
                }
            }
        }), socket.on("hosts", function(t) {
            console.log("new hosts: %s", t.map(function(t) {
                return t.name
            }).join(", "));
            for (var e = 0; e < t.length; e++) {
                var n = t[e],
                    o = n.viewers || n.count || 0;
                if (enabled.hosts && !_.isUndefined(n.variation)) showHostAlert({
                    name: n.name,
                    viewers: o,
                    count: o,
                    variation: n.variation
                });
                else {
                    var s = "host-" + n.name;
                    DupCache.contains(s) || (queueAlert("host", {
                        name: n.name,
                        viewers: o,
                        count: o,
                        variation: n.variation
                    }), DupCache.add(s))
                }
            }
        }), socket.on("alerts", function(t) {
            for (var e = 0; e < t.length; e++) {
                var n = t[e];
                queueAlert("custom", n)
            }
        }), socket.on("donations", function(t) {
            console.log("new donations: %s", t.map(function(t) {
                return t.name + " (" + t.formattedAmount + ")"
            }).join(", "));
            for (var e = 0; e < t.length; e++) {
                var n = t[e];
                ".00" == n.formattedAmount.slice(-3) && (n.formattedAmount = n.formattedAmount.slice(0, -3)), enabled.donations && !_.isUndefined(n.variation) ? showDonationAlert({
                    name: n.name,
                    amount: n.amount,
                    message: n.message,
                    formattedAmount: n.formattedAmount,
                    variation: n.variation,
                    emotes: n.emotes
                }) : queueAlert("donation", {
                    name: n.name,
                    amount: n.amount,
                    message: n.message,
                    formattedAmount: n.formattedAmount,
                    variation: n.variation,
                    emotes: n.emotes
                })
            }
        }), socket.on("alertBoxSettings", function(t) {
            setSettings(t)
        }), socket.on("donationPageSettings", function(t) {
            donationPageSettings = t
        }), socket.on("reload", function(t) {
            setTimeout(function() {
                window.location.reload(!0)
            }, 1e3 * (Math.floor(60 * Math.random()) + 1))
        }), $(function() {
            window.ab = new AlertBox2($("#alert-box"))
        });
        var AlertBox2 = function(t, e) {
            var n = {
                    messageTemplate: "{name} is now following!",
                    font: "Open Sans",
                    textSize: "64px",
                    textThickness: "800",
                    textColor: "#FFFFFF",
                    specialTextColor: "#32C3A6",
                    textAnimation: "wiggle"
                },
                o = function(t) {
                    this.settings = n, this.$el = t, t.addClass("hidden")
                },
                s = null;
            return o.prototype = {
                setImageHref: function(t) {
                    var e = t ? "url(" + encodeURI(t).replace(/\(/g, "%28").replace(/\)/g, "%29") + ")" : "none",
                        n = this.$el.find("#alert-image");
                    "none" != e && n.html('<img style="opacity: 0; height: 1px; width: 1px;" />').find("img").each(function() {
                        this.offsetHeight
                    }).prop("src", t), n.css("background-image", e)
                },
                setSoundHref: function(t) {
                    this.settings.soundHref = t
                },
                setSoundVolume: function(t) {
                    this.settings.soundVolume = t
                },
                setTextSize: function(t) {
                    this.$el.find("#alert-message").css({
                        fontSize: t
                    })
                },
                setTextColor: function(t) {
                    this.$el.find("#alert-message").css({
                        color: t
                    })
                },
                setSpecialTextColor: function(t) {
                    this.settings.specialTextColor = t, this.$el.find("#alert-message span").css({
                        color: t
                    })
                },
                setTextAnimation: function(e) {
                    this.settings.textAnimation = e, this.$el.find("#alert-message span span").each(function() {
                        t(this).removeClass().addClass("animated-letter " + e)
                    })
                },
                setTextThickness: function(t) {
                    this.$el.find("#alert-message").css({
                        fontWeight: t
                    })
                },
                setFont: function(t) {
                    e.load({
                        google: {
                            families: [t + ":300,400,600,700,800,900"]
                        }
                    }), this.$el.find("#alert-message").css({
                        fontFamily: '"' + t + '"'
                    })
                },
                setMessageTemplate: function(e, n) {
                    for (var o in n) {
                        var s = new RegExp("{" + o + "}", "g");
                        e = e.replace(s, "<span>" + n[o] + "</span>")
                    }
                    this.$el.find("#alert-message").html(e), this.$el.find("#alert-message > span").each(function() {
                        var e = t(this).text().split("");
                        t(this).html(t.map(e, function(t) {
                            return " " == t && (t = "&nbsp;"), "<span>" + t + "</span>"
                        }).join(""))
                    }), this.setTextAnimation(this.settings.textAnimation), this.setSpecialTextColor(this.settings.specialTextColor)
                },
                setUserMessage: function(t) {
                    this.$el.find("#alert-user-message").html(t)
                },
                setUserMessageTextThickness: function(t) {
                    this.$el.find("#alert-user-message").css({
                        fontWeight: t
                    })
                },
                setUserMessageFont: function(t) {
                    e.load({
                        google: {
                            families: [t + ":300,400,600,700,800,900"]
                        }
                    }), this.$el.find("#alert-user-message").css({
                        fontFamily: '"' + t + '"'
                    })
                },
                setUserMessageTextColor: function(t) {
                    this.$el.find("#alert-user-message").css({
                        color: t
                    })
                },
                setUserMessageTextSize: function(t) {
                    this.$el.find("#alert-user-message").css({
                        fontSize: t
                    })
                }
            }, o.prototype.showAlert = function(e, n, o, i) {
                i = i || globalLayout, t("body").attr("data-layout", i), s && clearTimeout(s);
                var a = Math.min(100, Math.max(0, e.soundVolume || 50)),
                    r = Math.min(100, Math.max(0, e.ttsVolume || 75)),
                    l = [];
                e.soundHref && l.push({
                    url: e.soundHref,
                    volume: a
                });
                var u = this.$el;
                if (this.setImageHref(e.imageHref), this.setSoundHref(e.soundHref), this.setSoundVolume(e.soundVolume), this.setTextSize(e.textSize), this.setTextColor(e.textColor), this.setSpecialTextColor(e.specialTextColor), this.setTextAnimation(e.textAnimation), this.setFont(e.font), this.setTextThickness(e.textThickness), this.setMessageTemplate(e.messageTemplate, n), n.message) {
                    var c = n.message,
                        m = n.message;
                    if (this.setUserMessageTextThickness(e.userMessageTextThickness), this.setUserMessageTextSize(e.userMessageTextSize), this.setUserMessageTextColor(e.userMessageTextColor), this.setUserMessageFont(e.userMessageFont), e.userMessageEnabled ? (m = e.emotes && e.userMessageAllowEmotes ? emotify(m, e.emotes, function(t) {
                            return ['<img src="', t.replace("1.0", "3.0"), '" />'].join("")
                        }) : escape(m), this.setUserMessage(m)) : this.setUserMessage(""), e.ttsEnabled) {
                        c = c.replace(/((https?:\/\/)?[\w-]+(\.[\w-]+)+\.?(\/\S*)?)/gi, "");
                        for (var g = e.ttsLanguage || "en", f = splitText(c, [".", "!", "?", ":", ";", ",", " "], 90), d = 0; d < f.length; d++) {
                            var h = f[d].length,
                                p = {
                                    url: "http://translate.google.com/translate_tts?ie=UTF-8&total=1&idx=0&textlen=" + h + "&client=tw-ob&q=" + encodeURIComponent(f[d]) + "&tl=" + g,
                                    volume: r
                                };
                            1 == e.ttsSecurity ? p.maxDuration = 11e3 : 2 == e.ttsSecurity ? p.maxDuration = 8500 : 3 == e.ttsSecurity && (p.maxDuration = 6250), l.push(p)
                        }
                    }
                } else this.setUserMessage("");
                u.removeClass("hidden").addClass("animated " + e.showAnimation).one("webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend", function() {
                    t(this).removeClass("animated " + e.showAnimation)
                }), l.length && a > 0 && window.playSounds(l), s = setTimeout(function() {
                    u.addClass("animated " + e.hideAnimation).one("webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend", function() {
                        t(this).addClass("hidden").removeClass("animated " + e.hideAnimation)
                    })
                }, o)
            }, o
        }(jQuery, WebFont)
    }, {
        "../emoticons/emoticons.js": 2,
        "../ircclient.js": 3
    }],
    2: [function(t, e, n) {
        var o = window.jQuery,
            s = window._,
            i = function() {
                function t(t, e) {
                    return ['<span class="emote" style="background-image: url(', t, ');"><img src="', t, '" /></span>'].join("")
                }

                function e(e, n, o) {
                    var o = o || t,
                        s = [],
                        i = [];
                    n = n.length ? n.split("/") : [];
                    var r, l, u = e.length;
                    return n.forEach(function(t) {
                        r = t.slice(0, t.indexOf(":")), l = t.substring(t.indexOf(":") + 1).split(","), l.forEach(function(t) {
                            t = t.split("-"), s.push({
                                start: parseInt(t[0]),
                                end: parseInt(t[1]),
                                id: r
                            })
                        })
                    }), s = s.sort(function(t, e) {
                        return e.start - t.start
                    }), s.forEach(function(t) {
                        i.push(a(e.slice(t.end + 1, u))), i.push(o(["//static-cdn.jtvnw.net/emoticons/v1/", t.id, "/1.0"].join(""), t.id)), u = t.start
                    }), i.push(a(e.slice(0, u))), i.reverse(), i.join("")
                }
                var n = null,
                    i = {},
                    a = function(t) {
                        return String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                    },
                    r = function(t) {
                        return t.replace(/([\\])?\((\?\:)?/, function(t, e, n) {
                            return e || n ? t : "(?:"
                        })
                    },
                    l = function(t) {
                        return decodeURI(t).replace("&gt\\;", ">").replace("&lt\\;", "<").replace(/\(\?![^)]*\)/g, "").replace(/\(([^|])*\|?[^)]*\)/g, "$1").replace(/\[([^|])*\|?[^\]]*\]/g, "$1").replace(/[^\\]\?/g, "").replace(/^\\b|\\b$/g, "").replace(/\\/g, "")
                    },
                    u = function() {
                        return new Promise(function(t, e) {
                            null != n && t(n), o.getJSON("https://api.twitch.tv/kraken/chat/emoticon_images").done(function(e) {
                                n = s.map(e.emoticons, function(t) {
                                    return -1 != t.code.indexOf("\\") && (t.regex = t.code, t.code = l(t.regex)), t.url = "//static-cdn.jtvnw.net/emoticons/v1/" + t.id + "/1.0", i[t.code] = t.id, t
                                }), t(n)
                            })
                        })
                    },
                    c = function() {
                        return new Promise(function(t, e) {
                            u().then(function(e) {
                                t(s.filter(e, function(t) {
                                    return null == t.emoticon_set
                                }))
                            })
                        })
                    },
                    m = function(t) {
                        return i[t]
                    },
                    g = function() {
                        return new Promise(function(t, e) {
                            u().then(function(e) {
                                t(s.filter(e, function(t) {
                                    return 457 == t.emoticon_set
                                }))
                            })
                        })
                    },
                    f = function(t, n, o) {
                        var s = {},
                            i = t,
                            a = i.length,
                            l = 0,
                            u = {};
                        return new Promise(function(c, m) {
                            var g = {},
                                f = [];
                            o.forEach(function(t) {
                                t.regex ? f.push(t) : g[t.code] = t
                            });
                            for (var d, h = "(" + f.map(function(t) {
                                    return r(t.regex)
                                }).join(")|(") + ")", p = new RegExp(h, "gi"), _ = t.split(" "), v = (t.split(" "), 0), x = 0, w = _.length; w > x; x++) "undefined" != typeof g[_[x]] ? (l++, n >= l && (d = g[_[x]], s[d.id] = s[d.id] || [], s[d.id].push(v + "-" + (v + _[x].length - 1)), a -= _[x].length - 1, u[d.id] = d.code)) : _[x].replace(p, function() {
                                for (var t = 1; t < arguments.length - 2; t++)
                                    if (arguments[t]) {
                                        l++, n >= l && (d = f[t - 1], s[d.id] = s[d.id] || [], s[d.id].push(v + "-" + (v + _[x].length - 1)), a -= _[x].length - 1, u[d.id] = d.code);
                                        break
                                    }
                            }), v += _[x].length + 1;
                            var A = [];
                            for (var T in s) A.push(T + ":" + s[T].join(","));
                            A = A.join("/"), c({
                                original: i,
                                translation: e(t, A, function(t, e) {
                                    return ['<img class="emoticon" title="', u[e], '" src="', t, '" />'].join("")
                                }),
                                characters: a,
                                count: l,
                                emotes: A
                            })
                        })
                    };
                return {
                    escape: a,
                    emotify: e,
                    translate: f,
                    getAllEmotes: u,
                    getBasicEmotes: c,
                    regexToCode: l,
                    getTurboEmotes: g,
                    getIdFromCode: m
                }
            }();
        e.exports = i
    }, {}],
    3: [function(t, e, n) {
        e.exports = function() {
            function t(t) {
                this.settings = {
                    reconnect: !0
                }, this.url = t, this._events = {}
            }
            var e = function(t) {
                    for (var e = {}, n = t.split(";"), o = 0; o < n.length; o++) {
                        var s = n[o].split("=");
                        e[s[0]] = s[1]
                    }
                    return e
                },
                n = function(t) {
                    return t.split(" ")
                };
            return t.prototype = {
                connect: function() {
                    var t = this;
                    this.disconnect(), this.connection = new WebSocket(this.url), this.connection.onmessage = function(o) {
                        var s = o.data.trim(),
                            i = /^(?:@(\S+) )?(?::(\S+) )?(\S+)(?: ([^:]+))?(?: :(.+))?$/,
                            a = s.match(i);
                        if (a) {
                            var r = {
                                raw: s,
                                tags: a[1] ? e(a[1]) : null,
                                prefix: a[2],
                                command: a[3],
                                params: a[4] ? n(a[4]) : null,
                                crlf: a[5]
                            };
                            t.emit("message", r)
                        }
                    }, this.connection.onerror = function() {
                        console.log("onerror"), console.dir(arguments), t.emit("error")
                    }, this.connection.onclose = function() {
                        console.log("onclose"), console.dir(arguments), t.emit("close")
                    }, this.connection.onopen = function() {
                        t.emit("connected")
                    }
                },
                disconnect: function() {
                    this.connection && (this.connection.close(), this.connection = null)
                },
                reconnect: function() {
                    this.connect()
                },
                send: function(t) {
                    this.connection.send(t)
                },
                on: function(t, e) {
                    return this._events[t] = this._events[t] || [], this._events[t].push(e), this
                },
                emit: function(t) {
                    if (t in this._events != !1)
                        for (var e = 0; e < this._events[t].length; e++) this._events[t][e].apply(this, Array.prototype.slice.call(arguments, 1))
                }
            }, t
        }()
    }, {}]
}, {}, [1]);