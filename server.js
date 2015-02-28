// server.js

// module dependencies
var express = require('express'),
	app = express(),
	request = require('request'),
	cors = require('cors'),
	wait = require('wait.for');

// variables
var apikey = 'J7hxBtcABx8AsszfDzq-',
	baseURL = 'https://www.quandl.com/api/v1/datasets/WIKI/';
	extURL = '.json?column=11&sort_order=asc&collapse=monthly&auth_token=' + apikey;
	url = 'https://www.quandl.com/api/v1/datasets/WIKI/AAPL.json?column=11&sort_order=asc&collapse=daily&auth_token=J7hxBtcABx8AsszfDzq-';

app.use(cors());
app.set('port', (process.env.PORT || 5000));

app.get('/', function(req, res) {
	res.send('Hello there Nevil');
});

app.get('/quandl', function(req, res) {
	var stocks = req.query.stocks;
	var count = req.query.stocks.length;
	console.log(stocks);
	results = [];
	var url;
	var payload;
	for (var i = 0; i < stocks.length; i++) {
		url = baseURL + stocks[i] + extURL;
		request(url, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				payload = JSON.parse(body);
				results.push(payload.data);
			}
		});
	}

	setTimeout(function() {
		res.json(results);
	}, 500 * count);
});

app.get('/test', function(req, res) {
	res.json({
		data: 
			[[1147651200000,67.79],
			[1147737600000,64.98],
			[1147824000000,65.26]]
	});
});

app.listen(app.get('port'), function() {
	console.log('App listening on port ' + app.get('port') + '...');
});
