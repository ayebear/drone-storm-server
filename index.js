var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');

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
		var userLocation = {
			latitude: req.body.latitude,
			longitude: req.body.longitude
		};

		// Populate response object
		data.weather = getWeatherData(userLocation);
		data.noFlyZone = isNoFlyZone(userLocation);
		data.safetyLevel = computeSafetyLevel(data.weather, data.noFlyZone);

		// Send data back to client
		res.send(data);
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



// Data processing/fetching
function getWeatherData(location) {
	return {};
}

function isNoFlyZone(location) {
	return false;
}

function computeSafetyLevel(weather, noFlyZone) {
	return 0.5;
}
