var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var Forecast = require('forecast');
var cors = require('cors');
var MongoClient = require('mongodb').MongoClient;

var mongoDbUrl = 'mongodb://localhost:27017/dronestorm';
var mongoDb = null;

// Connect to MongoDB server
MongoClient.connect(mongoDbUrl, function(err, db) {
	if (!err) {
		mongoDb = db;
		console.log("Connected to MongoDB server");

		// console.log("Closed connection.");
		// db.close();
	}
});

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

// Allow requests from other servers
app.use(cors());

// Setup middleware
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// Get server version
app.get('/', function (req, res) {
	res.send({
		version: '1.2.0'
	});
});

// Get drone data
app.post('/getData', function (req, res) {
	console.log(req.body);
	if ('latitude' in req.body && 'longitude' in req.body) {
		var userLocation = [
			req.body.longitude,
			req.body.latitude
		];
		var data = {};

		// Get weather data
		getWeatherData(userLocation, {
			onsuccess: function(weatherData) {
				data.weather = weatherData;

				// Get no fly zone data
				inNoFlyZone(userLocation, function (err, count) {
					console.log(count);
					data.noFlyZone = (count > 0);
					data.safety = computeSafety(data.weather, data.noFlyZone);

					// Send all data back to client
					res.send(data);
				});
			},
			onerror: function() {
				res.status(400).send({
					error: 'Error getting data from forecast.io'
				});
			}
		});

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
			callbacks.onerror(err);
		}

		// Extract data from forecast's JSON
		var current = weather.currently;
		var data = {
			summary: current.summary,
			icon: current.icon,
			temperature: current.temperature,
			precipitation: {
				intensity: current.precipIntensity,
				probability: current.precipProbability,
				type: current.precipType
			},
			visibility: current.visibility,
			wind: {
				speed: current.windSpeed,
				bearing: current.windBearing
			}
		};
		callbacks.onsuccess(data);
	});
}

// Check if location is within a no-fly zone
function inNoFlyZone(location, callback) {
	var collection = mongoDb.collection('nofly4');
	collection.count({'geometry': {$near: {$geometry: {'type': 'Point', 'coordinates': location}, $maxDistance: 8000}}}, callback);
}

function computeSafety(weather, noFlyZone) {
	var safety = {
		messages: [],
		level: 1
	};
	var dangerLevel = 0;
	if (noFlyZone) {
		safety.messages.push('Caution: This location intersects a no-fly zone.');
		dangerLevel += 1;
	}
	if (weather.wind.speed) {
		if (weather.wind.speed > 20) {
			safety.messages.push('Dangerously high wind speeds, your drone could fly away!');
			dangerLevel += 0.3;
		} else if (weather.wind.speed > 10) {
			safety.messages.push('Be cautious of the wind.');
			dangerLevel += 0.2;
		}
	}
	if (weather.temperature) {
		if (weather.temperature > 100) {
			safety.messages.push('Very high temperatures, your drone might overheat.');
			dangerLevel += 0.1;
		} else if (weather.temperature < 32) {
			safety.messages.push('Below freezing temperatures, could negatively affect drone flight time and performance.');
			dangerLevel += 0.1;
		}
	}
	if (weather.visibility && weather.visibility < 30) {
		safety.messages.push("Don't let your drone fade away in the distance.");
		dangerLevel += 0.1;
	}
	if (weather.precipitation.intensity && weather.precipitation.probability && weather.precipitation.probability > 0.6) {
		if (weather.precipitation.intensity > 0.6) {
			safety.messages.push('High chance of heavy storms: ' + weather.precipitation.type);
			dangerLevel += 0.4;
		} else if (weather.precipitation.intensity > 0.3) {
			safety.messages.push('High chance of light to medium storms: ' + weather.precipitation.type);
			dangerLevel += 0.2;
		}
	}
	if (dangerLevel > 1) {
		dangerLevel = 1;
	}
	safety.level = 1 - dangerLevel;
	return safety;
}
