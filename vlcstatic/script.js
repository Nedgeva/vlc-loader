var inp = document.getElementById('file');
var hidinp = document.getElementById('hidden-file');
var form = document.getElementById('upload');
var open = document.getElementById('open');
var close = document.getElementById('close');
var log = document.getElementById('log');
var openUrl = 'startvlc';
var closeUrl = 'stopvlc';

var upload = function() {
  var button = form.ownerDocument.createElement('input');
  //make sure it can't be seen/disrupts layout (even momentarily)
  button.style.display = 'none';
  //make it such that it will invoke submit if clicked
  button.type = 'submit';
  //append it and click it
  console.log('button attached');
  form.appendChild(button).click();
  //if it was prevented, make sure we don't get a build up of buttons
  form.removeChild(button);  
};

/* -- DOM Event Listeners -- */

form.addEventListener('submit', function(e){
    e.preventDefault();

	var data = new FormData(form);
	
	form.action = 'upload';
	form.method = 'post';
	form.enctype = 'multipart/form-data';
	var req = new XMLHttpRequest();
	req.onreadystatechange = function(){
		console.log(req.responseText);
    }
	req.open(form.method, form.action);
	req.send(data);
	return true;
})

inp.addEventListener('click', function(e){
	hidinp.click(e);
});

hidinp.addEventListener('change', function(){
	upload();
});

open.addEventListener('click', function() {
	var req = new XMLHttpRequest();
	req.open('get', openUrl);
	req.send();
});

close.addEventListener('click', function() {
	var req = new XMLHttpRequest();
	req.open('get', closeUrl);
	req.send();
});

/* -- WebSocket Event Listeners -- */

var ws = new WebSocket('ws://' + window.location.hostname + ':1337/getstatus');

ws.addEventListener('open', function() {
	var message = document.createElement('p');
	message.textContent = 'Successfully connected to websocket!';
	log.appendChild(message);
});

ws.addEventListener('close', function(event) {
	alert('Connection closed');
});

ws.addEventListener('message', function(event) {
	var message = document.createElement('p');
	message.textContent = event.data;
	log.appendChild(message);
});