// server.js

var express = require('express'),
	app = express();

app.set('port', (process.env.PORT || 5000));

app.get('/', function(req, res) {
	res.send('Hello there Nevil');
});

app.listen(app.get('port'), function() {
	console.log('App listening on port ' + app.get('port') + '...');
});