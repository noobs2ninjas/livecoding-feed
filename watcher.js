
/*
 *
 * watcher.coffee
 *
 * Author:@nikezono
 *
 */
 
(function() {
  var EventEmitter, Watcher, parser, request,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };
 
  EventEmitter = require('events').EventEmitter;
 
  parser = require('parse-rss');
 
  Watcher = (function(_super) {
    __extends(Watcher, _super);
 
    function Watcher(feedUrl) {
      this.stop = __bind(this.stop, this);
      this.run = __bind(this.run, this);
      if (!feedUrl || feedUrl === void 0) {
        throw new Error("arguments error.");
      }
      this.feedUrl = feedUrl;
      this.interval = null;
      this.lastPubDate = null;
      this.lastPubTitle = null;
      this.lastArticles = null;
      this.timer = null;
      this.watch = (function(_this) {
        return function() {
          var fetch;
          fetch = function() {
            return request(_this.feedUrl, function(err, articles) {
              var article, _i, _len, _results;
              if (err) {
                return _this.emit('error', err);
              }
              _results = [];
 
              var articleTitles = [];
              articles.forEach(function(article) {
                articleTitles.push(article.title);
              });
 
              if(_this.lastArticles === null) {
                _this.lastArticles = articleTitles;
               
                return articleTitles;
              }
 
              var newFollows = articleTitles.filter(function(title) {
                  return !_this.lastArticles.some(function(lastTitle) {
                      return lastTitle === title;
                  });
              });
 
              newFollows.forEach(function(follow) {
                _this.emit('new article', follow);
              });
 
              newFollows.forEach(function(title) {
                _this.lastArticles.push(title);
              });
             
              return newFollows;
            });
          };
          return setInterval(function() {
            return fetch(this.feedUrl);
          }, _this.interval * 1000);
        };
      })(this);
    }
 
    Watcher.prototype.set = function(obj) {
      var flag;
      flag = false;
      if (obj.feedUrl != null) {
        if (obj.feedUrl != null) {
          this.feedUrl = obj.feedUrl;
        }
        flag = true;
      }
      if (obj.interval != null) {
        if (obj.interval != null) {
          this.interval = obj.interval;
        }
        flag = true;
      }
      return flag;
    };
 
    Watcher.prototype.run = function(callback) {
      var frequency, initialize;
      initialize = (function(_this) {
        return function(callback) {
          return request(_this.feedUrl, function(err, articles) {
            if ((err != null) && (callback != null)) {
              return callback(new Error(err), null);
            }
            _this.lastPubDate = articles[articles.length - 1].pubDate / 1000;
            _this.timer = _this.watch();
            if (callback != null) {
              return callback(null, articles);
            }
          });
        };
      })(this);
      if (!this.interval || typeof this.interval === 'function') {
        frequency = require('rss-frequency');
        return frequency(this.feedUrl, (function(_this) {
          return function(error, interval) {
            if (error != null) {
              if (callback != null) {
                return callback(new Error(error), null);
              }
            }
            if (typeof _this.interval === 'function') {
              _this.interval = _this.interval(interval);
            } else {
              _this.interval = interval;
            }
            if (isNaN(_this.interval / 1)) {
              if (callback != null) {
                return callback(new Error("interval object isnt instanceof Number"), null);
              }
            }
            if (_this.interval / 1 < 0) {
              if (callback != null) {
                return callback(new Error("interval has given negative value"), null);
              }
            }
            return initialize(callback);
          };
        })(this));
      } else {
        return initialize(callback);
      }
    };
 
    Watcher.prototype.stop = function() {
      if (!this.timer) {
        throw new Error("RSS-Watcher isnt running now");
      }
      clearInterval(this.timer);
      return this.emit('stop');
    };
 
    return Watcher;
 
  })(EventEmitter);
 
  request = (function(_this) {
    return function(feedUrl, callback) {
      return parser(feedUrl, function(err, articles) {
        if (err != null) {
          return callback(err, null);
        }
        articles.sort(function(a, b) {
          return a.pubDate / 1000 - b.pubDate / 1000;
        });
        return callback(null, articles);
      });
    };
  })(this);
 
  module.exports = Watcher;
 
}).call(this);