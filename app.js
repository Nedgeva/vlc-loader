var express = require('express');
var path = require('path');
var multer = require('multer');
var vlc = require('./vlc_loader');
var pf = require('./vlc_peerflix');
var cleanup = require('./vlc_cleanup');
var expressWs = require('express-ws');
var WatchJS = require('watchjs');


var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'vlctorrents');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

var upload = multer({ storage: storage });
var expressWs = expressWs(express());
var app = expressWs.app; 
var watch = WatchJS.watch;
var unwatch = WatchJS.unwatch;
var callWatchers = WatchJS.callWatchers;

var reportStatus = {
  status: 'idle',
  get getStatus() {return this.status;},
  set setStatus(val) {this.status = val;}
};

process.title = 'VLC Loader';

vlc.init(reportStatus);
pf.init(reportStatus);


app.use(express.static('vlcstatic'));
app.use(express.static('vlctorrents'));


/* app.get('/', function(req, res, next) {
	vlc.greet(req.ip + ' connected');
	res.sendFile(path.join(__dirname+'/index.html'));
}); */

app.get('/startvlc', function(req, res, next) {
	vlc.greet('Starting VLC...');
	vlc.operate('start');
	res.send('Caught command to start VLC');
});

app.get('/stopvlc', function(req, res, next) {
	vlc.greet('Stopping VLC...');
	res.send('Caught command to stop VLC');
	vlc.operate('stop');
	pf.operate('stop');
	cleanup.files('vlctorrents');
	cleanup.folders(process.env.TEMP + '\\torrent-stream');
});

app.get('/watch', function(req, res, next) {
	vlc.greet('Summonig Peerflix...');
	vlc.operate('watch');
	res.send('Caught command to start watching');
	console.log('Requested watch');
});

app.ws('/getstatus', function(ws, req) {
	ws.send(reportStatus.getStatus);
	var handleChange = function() {
		try {
			ws.send(reportStatus.getStatus);
		} catch(e) {
			console.log('Can\'t connect to socket: ' + e);
			unwatch(reportStatus, 'status', handleChange);
		}			
	}
	watch(reportStatus, 'status', handleChange);	
});

app.post('/upload', upload.single('torrent'), function(req, res, next) {
	console.log('Original name: ' + req.file.originalname + ' Path: ' + path.join(__dirname + '\\' + req.file.path) + ' Encoding: ' + req.file.encoding + ' Mime: ' + req.file.mimetype);
	vlc.greet('Uploaded!');
	pf.dataset.pfArg = '"http://localhost:1337/' + req.file.originalname + '" -a --on-listening "node ' + path.join(__dirname + '\\' + 'vlc_helper.js') + '"';
	console.log('Starting peerflix with args: ' + pf.dataset.pfArg);
	pf.operate('start');
	res.send('file uploaded');
});

app.listen(1337);