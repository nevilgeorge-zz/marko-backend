// server.js

var express = require('express'),
	app = express(),
	request = require('request');

app.set('port', (process.env.PORT || 5000));

app.get('/', function(req, res) {
	res.send('Hello there Nevil');
});

app.get('/data', function(req, res) {
	res.json({
		'name': 'Nevil George',
		'age': 21,
		'occupation': 'student'
	});
});

app.listen(app.get('port'), function() {
	console.log('App listening on port ' + app.get('port') + '...');
});