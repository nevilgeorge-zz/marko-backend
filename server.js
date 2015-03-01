// server.js

// module dependencies
var express = require('express'),
	app = express(),
	request = require('request'),
	cors = require('cors'),
	wait = require('wait.for'),
	bodyParser = require('body-parser'),
	_ = require('underscore');

// variables
var apikey = 'J7hxBtcABx8AsszfDzq-',
	baseURL = 'https://www.quandl.com/api/v1/datasets/WIKI/';
	extURL = '.json?column=11&sort_order=asc&collapse=daily&exclude_headers=true&auth_token=' + apikey;

// functions
// asynchronous function that finds the latest date to start calculating portfolios from
var getLatestDate = function(results, callback) {
	var date, current,
		index = 0,
		maxDateString = results[0][0][0],
		maxDate = new Date(results[0][0][0]);
	for (var i = 0; i < results.length; i++) {
		current = results[i][0][0];
		date = new Date(current);
		if (date > maxDate) {
			maxDate = date;
			maxDateString = current;
			index = i;
		}
	}
	return callback(results, index);
}

// asynchronous function that removes all entries before a certain year
var filterDataByMaxDate = function(results, index, callback) {
	var shortestLength = results[index].length,
		slicedResults = [],
		diff, sliced;
	for (var i = 0; i < results.length; i++) {
		diff = results[i].length - shortestLength;
		sliced = results[i].slice(diff, results[i].length)
		slicedResults.push(sliced);
	}

	return callback(slicedResults, slicedResults[0].length);
}

// asychronous function that calculates the stock portfolio given the values of all stocks
var computePortfolio = function(res, length, callback) {
	var aggr, rows, col,
		temp = [],
		returnArr = [];

	for (var row = 0; row < length; row++) {
		aggr = 0;
		temp = [];
		// grab date
		temp.push(res[0][row][0])
		for (var col = 0; col < res.length; col++) {
			aggr += res[col][row][1];
			
		}
		temp.push(aggr);
		returnArr.push(temp);
	}

	return callback(returnArr);
}

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set('port', (process.env.PORT || 5000));

app.get('/', function(req, res) {
	res.send('Welcome to the Markowitz server!');
});

app.get('/quandl', function(req, res) {
	console.log(req.query);
	if (req.query.stocks === null || _.isEmpty(req.query)) {
		// res.status(500).send('You sent an empty array.');
		return res.json([]);
	}

	if (typeof req.query.stocks === 'string') {
		stocks = [req.query.stocks];
	} else {
		stocks =  req.query.stocks;
	}
	var count = stocks.length;
	var results = [];
	var url, payload;
	var j = 0;
	for (var i = 0; i < stocks.length; i++) {
		url = baseURL + stocks[i] + extURL;
		request(url, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				payload = JSON.parse(body);
				results.push(payload.data);
				j++;
				// check if we should return yet. Avoids using setTimeout
				if (j === count) {
					// res.json(results);
					getLatestDate(results, function(maxDateString, index) {
						filterDataByMaxDate(results, index, function(slicedResults, length) {
							var returnData = [];
							computePortfolio(slicedResults, length, function(portfolioData) {
								for (var i = 0; i < results.length; i++) {
									returnData.push(results[i]);
								}
								returnData.push(portfolioData);
								return res.json(returnData);
							});
						});
					});
				}
			}
		});
	}
	// setTimeout(function() {
	// 	res.json(results);
	// }, 500 * count);
});

app.get('/test', function(req, res) {
	res.json({
		data: 
			[[1147651200000,67.79],
			[1147737600000,64.98],
			[1147824000000,65.26]]
	});
});

app.get('/tina', function(req, res) {
	res.send('Hello Tina');
});

app.listen(app.get('port'), function() {
	console.log('App listening on port ' + app.get('port') + '...');
});
