var notifier = require('node-notifier');
var cp = require('child_process');
var ffi = require('ffi');
var ref = require('ref');
var regedit = require('regedit');
var path = require('path');

module.exports = {
	
	dataset: {
		exeName: 'vlc.exe',
		wMoved: false,
		hwnd: null,
		cmd: 'start',
		busy: false,
		status: null,
		regKeys: ['HKLM\\SOFTWARE\\Wow6432Node\\VideoLAN\\VLC', 'HKLM\\SOFTWARE\\VideoLAN\\VLC'],
		valName: 'InstallDir',
		maxMs: 100
	},
	
	init: function(obj) {
		this.dataset.status = obj;
	},
	
	greet: function(message) {
		notify(message);
	},
	
	operate: function(command) {
		this.dataset.cmd = command;
		vlc(this.dataset);
	}
	
}

var notify = function(message) {
	notifier.notify({
	  title: 'VLC Loader',
	  message: message,
	  icon: __dirname + '\\vlcicon.ico'
	});		
}

var vlc = function(dataset) {
	
	var voidPtr = ref.refType(ref.types.void);
	var stringPtr = ref.refType(ref.types.CString);
	var dwordPtr = ref.refType(ref.types.ulong);

	var bindings = {
		EnumWindows: ['bool', [voidPtr, 'int32']],
		//GetWindowTextA: ['long', ['long', stringPtr, 'int32']],
		//GetClassNameA: ['long', ['long', stringPtr, 'int32']],
		GetWindowThreadProcessId: ['long', ['long', dwordPtr]],
		SetWindowPos: ['bool', ['long', 'long', 'int32', 'int32', 'int32', 'int32', 'uint']],
		SendMessageA: ['int32', ['long', 'uint', 'int32', 'int32']],
		IsWindowVisible: ['bool', ['long']]
	};

	var user32 = ffi.Library('user32', bindings);

	/**
	 * Callback for waitForWindow 
	 * Find windows by PID and changes their position/size
	 * @param {long} hwnd - window's handle passed by waitForWindow
	 * @param {int32} lParam - PID
	 * @return {bool} - return 'true' to proceed, 'false' to stop
	 */	
	var cbMoveWindow = ffi.Callback('bool', ['long', 'int32'], function(hwnd, lParam) {
		//var buf = new Buffer(255);
		//var buf2 = new Buffer(255);
		//var resWindText = user32.GetWindowTextA(hwnd, buf, 255);
		//var resClassName = user32.GetClassNameA(hwnd, buf2, 255);

		var pid = ref.alloc(ref.types.ulong);
		var tid = user32.GetWindowThreadProcessId(hwnd, pid);
		var visible = user32.IsWindowVisible(hwnd);
		
		//var windText = ref.readCString(buf, 0);
		//var className = ref.readCString(buf2, 0);

		//console.log('lParam ' + lParam, 'PID: ' + ref.get(pid));
		//console.log('Title: ' + windText, 'Class: ' + className, 'wHandle: ' + hwnd, 'TID: ' + tid, 'PID: ' + ref.get(pid));
		if (lParam === ref.get(pid) && visible) {
			var bool = user32.SetWindowPos(hwnd, 0, 1366+50, 0, 100, 100, 0x0010);
			dataset.status.setStatus = 'VLC running';
			dataset.wMoved = true;
			dataset.hwnd = hwnd;
			return false;
		}
		return true;
	})
	
	/**
	 * Sends messages to window close 
	 * @param {long} hwnd - window's handle passed by waitForWindow
	 * @return {bool} - return 'true' to proceed, 'false' to stop
	 */
	var closeWindow = function(dataset) {
		
		return new Promise(function(resolve, reject) {
			var result = user32.SendMessageA(dataset.hwnd, 0x0010, 0, 0);
			dataset.status.setStatus = 'VLC stopped';
			dataset.wMoved = false;
			resolve(dataset);
		})
		
	};


	/** 
	 * 
	 */
	var waitForWindow = function(dataset) {

		return new Promise(function(resolve, reject) {
			
			dataset.status.setStatus = 'Looking for VLC main window...';
			var i = 0;
			var prevWindowStat = dataset.wMoved;
			var interval = setInterval(function() {
				i++;
				
				/* if(i >= dataset.maxMs) {
					clearInterval(interval);
					reject('Waiting for window timeout exceeded!');
				} */
				
				var bool = user32.EnumWindows(dataset.cbWaitForWindow, dataset.proc.pid);
				if(bool === false || dataset.wMoved !== prevWindowStat) {
					console.log('Target Window Found!');
					clearInterval(interval);
					resolve(dataset);
				}
			}, 0);
		
		})
	};

	/**
	 * 
	 */
	var runTargetExe = function(dataset) {
		return new Promise(function(resolve, reject) {
			var args = [];
			
			if(dataset.cmd === 'watch') {
				args.push('http://localhost:8888/.m3u');
			}
			
			dataset.status.setStatus = 'Trying to spawn VLC executable...';
			var targetExe = path.join(dataset.installDir, dataset.exeName);
			//dataset.proc = cp.spawn(targetExe, args, {detached: true});
			dataset.proc = cp.spawn(targetExe, args, {stdio: ['ignore', 'ignore', 'ignore'], detached: true});
			//dataset.proc = cp.execFile(targetExe, args);
			dataset.proc.on('exit', function(code, signal) {
				if(dataset.cmd !== 'watch') {
					dataset.wMoved = false;
					dataset.status.setStatus = 'VLC stopped';
					console.log('VLC EXITED!!!');	
				}
			});
			dataset.proc.unref();
			//waitForWindow(proc.pid, 1000, cbWindowProc);
			resolve(dataset);
			
		})
	}

	/**
	 * 
	 */
	var getInstallDir = function(dataset) {
		return new Promise(function(resolve, reject) {
			
			var index = 0;
			var regSearch = function(dataset) {
				var registryKey = dataset.regKeys[index];
				var valueName = dataset.valName;
				regedit.list(registryKey, function(err, result) {
					if(result && result[registryKey].values[valueName] !== undefined) {
						dataset.installDir = result[registryKey].values[valueName].value;
						resolve(dataset);
					} else if (err && dataset.regKeys.length > index+1) {
						index++;
						regSearch(dataset);
					} else {
						reject('No keys found!');
					}			
				})
			}
			// Run code inside Promise!
			if(!dataset.installDir) {
				dataset.status.setStatus = 'Looking for VLC path...';
				regSearch(dataset);
			} else {
				// skip if path is cached
				resolve(dataset);
			}
			
		})
	}
	
	
	/* 
	* NOTHING TODO ?
	*/
	var appStart = function(dataset) {		
		var p = Promise.resolve(dataset);
		
		// Start app / Start watching if player been closed
		if((dataset.cmd === 'start' || dataset.cmd === 'watch') && dataset.wMoved === false && dataset.busy === false) {
			return p.then(function(dataset) {
				dataset.status.setStatus = 'Handling command to start VLC';
				dataset.busy = true;
				dataset.cbWaitForWindow = cbMoveWindow;
				return dataset;
			})
			.then(getInstallDir)
			.then(runTargetExe)
			.then(waitForWindow)
			
		// Stop app / Stop and Restart if watch cmd has been send
		} else if((dataset.cmd === 'stop' || dataset.cmd === 'watch') && dataset.wMoved === true && dataset.busy === false) {
			return p.then(function(dataset) {
				dataset.status.setStatus = 'Handling command to stop VLC';
				dataset.busy = true;
				return dataset;
			})
			.then(closeWindow)
			
		// Exception: already stopped app
		} else if(dataset.cmd === 'stop' && dataset.wMoved === false) {
			return p.then(function(dataset) {
				return Promise.reject('Cant stop already stopped app!');
			})
			
		// Exception: already started app
		} else if(dataset.cmd === 'start' && dataset.wMoved === true) {
			return p.then(function(dataset) {
				return Promise.reject('Cant start already started app!');
			})
			
		// Exception: anything, like process busy etc...
		} else {
			return p.then(function(dataset) {
				return Promise.reject('Something bad has happened :\(');
			})
		}
		
	}

	appStart(dataset)
		// last step
		.then(function(dataset){
			dataset.busy = false;
			if(dataset.cmd === 'watch' && dataset.wMoved === false) {
				console.log('restarting VLC');
				vlc(dataset);
			} else {
				console.log('FINALE');
			}		
		})
		.catch(function(reason) {
			dataset.busy = false;
			dataset.status.setStatus = reason;
			console.log(reason);
		})
}

/* 
* TODO
* Get Desktop Resolution with WinApi
* http://opendirective.net/blog/2015/10/working-with-windows-native-code-from-node-js/
*/