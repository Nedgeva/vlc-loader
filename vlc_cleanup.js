var fs = require('fs');
var path = require('path');

module.exports = {
	
	files: function(path) {
		rmfilesAsync(path);
	},
	
	folders: function(path) {
		rmdirAsync(path);
	}
	
}

var rmfilesAsync = function(targetDir) {
	fs.readdir(targetDir, function(err, files) {
		files.forEach(function(val, idx, arr) {
			var fullpath = path.join(__dirname + '//' + targetDir + '//' + val);
			fs.unlink(fullpath);	
		});
	});
};

var rmdirAsync = function(path, callback) {
	if(typeof rmdirAsync.attempts === 'undefined') {
		rmdirAsync.attempts = 10000;
	}
	fs.readdir(path, function(err, files) {
		if(err) {
			// Pass the error on to callback
			if(callback) {
				callback(err, []);
			}
			return;
		}
		var wait = files.length,
			count = 0,
			folderDone = function(err) {
				count++;
				// If we cleaned out all the files, continue
				if( count >= wait || err) {
					fs.rmdir(path, function(err) {
						if(err && rmdirAsync.attempts > 0) {
							rmdirAsync.attempts--;
							rmdirAsync(path, callback);
						}
					});
				} else {
					rmdirAsync.attempts = 10000;
				}
		};
		// Empty directory to bail early
		if(!wait) {
			folderDone();
			return;
		}
		
		// Remove one or more trailing slash to keep from doubling up
		path = path.replace(/\/+$/,"");
		files.forEach(function(file) {
			var curPath = path + "/" + file;
			fs.lstat(curPath, function(err, stats) {
				if( err ) {
					callback(err, []);
					return;
				}
				if( stats.isDirectory() ) {
					rmdirAsync(curPath, folderDone);
				} else {
					fs.unlink(curPath, folderDone);
				}
			});
		});
	});
};