var express = require('express');
var io = require('socket.io')();
var http = require('http');
var Watcher = require('rss-watcher');
var key = 'S5B3342315z340lhuPxQM3';
var feed = 'https://www.livecoding.tv/rss/noobs2ninjas/followers/?key='+key;
var tempfeed = 'http://localhost:3000/rss/Followers.xml';
var rss = require('node-rss');
var app = express();
app.use(express.static(__dirname + "/public"));
app.set('view engine', 'jade');
//index page for creating new followers
app.get('/', function(req, res){
  res.render('index');
});

//page for OBS to display new followers
app.get('/followers', function(req, res){
	res.render('followers');
});
//setting up temp feed
var feed = rss.createNewFeed('Most Recent Followers', 'http://localhost:3000/',
                                'Follower shit',
                                'Nathan Kellert',
                                'http://localhost:3000/rss/Followers.xml', {'lastBuildDate': 'Fri, 16 Oct 2015 23:04:03 -0000'});
var followers = [{title: "noobs2ninjas", }];

//adding current followers to feed
followers.forEach(function(follower){
	feed.addNewItem(follower.title,{});
});

//temp xml page for watcher to read
app.get('/rss/Followers.xml', function(req, res){
	var xmlString = rss.getFeedXML(feed);
	res.set('Content-Type', 'application/rss+xml');
	res.send(xmlString);
});

//
io.on('connection', function(socket){
  	console.log('a user connected');
  	//getting emit from index page of new follower to add
  	socket.on('newfollower', function(data){
  		console.log('newdata:'+data.follower);
  		//add new follower to xml
  		feed.addNewItem(data.follower,{});
  	});
});



//setting up watcher
watcher = new Watcher(tempfeed);
watcher.run(function(error, currentFollowers){
	currentFollowers.forEach(function(follower){
		console.log(follower.title);
	});
});

watcher.on('new article', function(follower){
console.log('got new item');
//emit new follower when item is added to feed
io.emit('new', {'name':follower});
console.log('username:'+follower)

});

var server = http.createServer(app).listen(3000);
io.listen(server);
