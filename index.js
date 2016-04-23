var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var Forecast = require('forecast');
var await = require('asyncawait/await');

// Initialize forecast.io API
var forecast = new Forecast({
	service: 'forecast.io',
	key: '6fa331afaca19b963d8991a56c553351',
	units: 'f',
	cache: true,
	ttl: {
		minutes: 120,
		seconds: 0
	}
});

// For parsing multipart/form-data
var upload = multer();

// Create express app
var app = express();

// Setup middleware
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// Get server version
app.get('/', function (req, res) {
	res.send({
		version: '1.0.0'
	});
});

// Get drone data
app.post('/getData', function (req, res) {
	console.log(req.body);
	if ('latitude' in req.body && 'longitude' in req.body) {
		var userLocation = [
			req.body.latitude,
			req.body.longitude
		];
		var data = {};

		// Populate response object
		getWeatherData(userLocation, {
			onsuccess: function(weatherData) {
				data.weather = weatherData;

				// Send weather data back to client
				res.send(data);
			},
			onerror: function() {
				res.status(400).send({
					error: 'Error getting data from forecast.io'
				});
			}
		});

		// data.noFlyZone = inNoFlyZone(userLocation);
		// data.safetyLevel = computeSafetyLevel(data.weather, data.noFlyZone);

	} else {
		res.status(400).send({
			error: 'Must specify latitude and longitude'
		});
	}
});

// Start server
app.listen(3000, function () {
	console.log('Server listening on port 3000.');
});



// Retrieve weather information from coordinates
function getWeatherData(location, callbacks) {
	forecast.get(location, function(err, weather) {
		if (err) {
			callbacks.onerror();
			return console.log(err);
		}
		var data = {};
		data.current = weather.currently;
		callbacks.onsuccess(data);
	});
}

// Check if location is within a no-fly zone
function inNoFlyZone(location) {
	return false;
}

function computeSafetyLevel(weather, noFlyZone) {
	return 0.5;
}
