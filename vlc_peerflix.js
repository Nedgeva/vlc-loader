var cp = require('child_process');

module.exports = {
	
	dataset: {
		pfCmd: 'stop',
		pfStatus: 'stopped',
		pfArg: '',
		status: null,
	},
	
	init: function(obj) {
		this.dataset.status = obj;
	},
	
	operate: function(command) {
		this.dataset.pfCmd = command;
		pf(this.dataset);
	}
	
}

var pf = function(dataset) {
	
	var startPeerflix = function() {
		console.log('Peerflix starting...');
		dataset.pfStatus = 'started';
		dataset.status.setStatus = '(RE)Starting peerflix...';
		var proc = cp.exec('start peerflix ' + dataset.pfArg);
		console.log('peerflix ' + dataset.pfStatus);
		//handle on error
	};
	
	var stopPeerflix = function() {	
		console.log('Killing peerflix');
		dataset.pfStatus = 'stopped';
		dataset.status.setStatus = 'Stopping peerflix...';
		var proc = cp.exec('taskkill /FI "WINDOWTITLE eq peerflix" /F /T');
		console.log('peerflix ' + dataset.pfStatus);
	}
	
	if(dataset.pfCmd === 'start' && dataset.pfStatus === 'stopped') {		
		startPeerflix();
	} else if(dataset.pfCmd === 'stop' && dataset.pfStatus === 'started') {
		stopPeerflix();
	} else if(dataset.pfCmd === 'start' && dataset.pfStatus === 'started') {
		stopPeerflix();
		setTimeout(function() {
			startPeerflix();
		}, 5000);
	}
	
}