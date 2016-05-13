var http = require('http');
var req = http.get('http://localhost:1337/watch').on('response', function(res) {
	process.exit(0);
});