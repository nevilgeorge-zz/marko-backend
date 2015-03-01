// server.js

// module dependencies
var express = require('express'),
	app = express(),
	request = require('request'),
	cors = require('cors'),
	wait = require('wait.for'),
	bodyParser = require('body-parser'),
	_ = require('underscore'),
	fs = require('fs'),
	compute = require('compute.io');

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
	var aggr,
		// inverseWeight = res.length,
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

var stripDates = function(array) {
	var newArr = [];
	for (var i = 0; i < array.length; i++) {
		newArr.push(array[i][1]);
	}
	return newArr;
}

var findCorrelation = function(stocks, callback) {
	var argArray = [];
	for (var i = 0; i < stocks.length; i++) {
		var temp = stripDates(stocks[i]);
		argArray.push(temp);
		console.log(temp.length);
	}
	return callback(compute.pcorr.apply(null, argArray));
}

// middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set('port', (process.env.PORT || 5000));


// ENDPOINTS
app.get('/', function(req, res) {
	res.send('Welcome to the Markowitz server!');
});

/* 
Endpoint to get portfolio graph data for multiple stocks.
@params: stock tickers as an array of strings passed in as a JSON parameter with key 'stocks'. eg. { stocks: ['AAPL', 'MSFT'] }
@returns: an array of arrays that holds data to be plotted by high charts of only the portfolio plot
*/
app.get('/portfolio', function(req, res) {
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
							computePortfolio(slicedResults, length, function(returnData) {
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

/* 
Endpoint to get graph data for one stock.
@params: stock ticker as a string passed in as a JSON parameter with key 'stock'. eg. { stock: 'AAPL' }
@returns: an array of arrays that holds data to be plotted by high charts
*/
app.get('/quandl', function(req, res) {
	var url,
		stock = req.query.stock;
	if (stock === null || _.isEmpty(req.query) || _.isEmpty(stock) || typeof stock !== 'string') {
		return res.json([]);
	}
	
	url = baseURL + stock + extURL;
	request(url, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			var payload = JSON.parse(body);
			return res.json(payload.data);
		}
	});
});

/* 
Endpoint to get graph data from the Fama-French data.
@params: investment strategy as a string passed in as a JSON parameter with key 'factor'. eg. { factor: 'AAPL' }
@returns: an array of arrays that holds data to be plotted by high charts
*/
app.get('/french', function(req, res) {
	var data, result,
		factor = req.query.factor;
	if (factor === null || _.isEmpty(factor) || _.isEmpty(req.query) || typeof factor !== 'string') {
		return res.json([]);
	}

	fs.readFile('./F-F_Factors.json', 'utf8', function(err, data) {
		if (err) {
			return console.log(err);
		}
		data = JSON.parse(data);
		result = data[factor];
		res.json(result);
	});
});


/* 
Endpoint to get portfolio graph data for multiple strategies.
@params: stock tickers as an array of strings passed in as a JSON parameter with key 'strategies'. eg. { strategies: ['AAPL', 'MSFT'] }
@returns: an array of arrays that holds data to be plotted by high charts of only the portfolio plot
*/
app.get('/strategy', function(req, res) {
	var strats = req.query.strategies;
	if (strats === null || _.isEmpty(strats) || _.isEmpty(req.query) || strats.length === 0) {
		return res.json([]);
	}

	var count = strats.length;
	var results = [];
	fs.readFile('./F-F_Factors.json', 'utf8', function(err, data) {
		if (err) {
			return console.log(err);
		}
		data = JSON.parse(data);
		for (var k in data) {
			results.push(data[k]);
		}
		computePortfolio(results, results[0].length, function(returnData) {
			return res.json(returnData);
		});
	});
});

/* 
Endpoint to get portfolio chord graph data for multiple stocks.
@params: stock tickers as an array of strings passed in as a JSON parameter with key 'stocks'. eg. { stocks: ['AAPL', 'MSFT'] }
@returns: an array of arrays that holds data to be plotted by high charts of only the portfolio plot
*/
app.get('/compute/stock', function(req, res) {
	var series = req.query.stocks;
	if (series === null || _.isEmpty(series) || _.isEmpty(req.query)) {
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
							findCorrelation(slicedResults, function(returnData) {
								for (var i = 0; i < returnData.length; i++) {
									for (var j = 0; j < returnData[i].length; j++) {
										returnData[i][j] += 1;
									}
								}
								return res.json(returnData);
								// return res.json(returnData);
							});
						});
					});
				}
			}
		});
	}
});

/* 
Endpoint to get portfolio chord graph data for multiple stocks.
@params: stock tickers as an array of strings passed in as a JSON parameter with key 'stocks'. eg. { stocks: ['AAPL', 'MSFT'] }
@returns: an array of arrays that holds data to be plotted by high charts of only the portfolio plot
*/
// app.get('/compute/strategy', function(req, res) {
// 	var series = req.query.strategies;
// 	if (series === null || _.isEmpty(series) || _.isEmpty(req.query)) {
// 		return res.json([]);
// 	}
	
// 	if (typeof req.query.stocks === 'string') {
// 		strats = [series];
// 	} else {
// 		strats =  series;
// 	}
// 	var count = strats.length;
// 	var results = [];
// 	fs.readFile('./F-F_Factors.json', 'utf8', function(err, data) {
// 		if (err) {
// 			return console.log(err);
// 		}
// 		data = JSON.parse(data);
// 		for (var i = 0; i < strats.length; i++) {
// 			results.push(data[strats[i]]);
// 		}
// 		findCorrelation(results, function(returnData) {
// 			for (var i = 0; i < returnData.length; i++) {
// 				for (var j = 0; j < returnData[i].length; j++) {
// 					returnData[i][j] += 1;
// 				}
// 			}
// 			return res.json(returnData);
// 		});
// 	});
// });

app.listen(app.get('port'), function() {
	console.log('App listening on port ' + app.get('port') + '...');
});
