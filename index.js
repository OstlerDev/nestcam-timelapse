var express = require('express'),
	session = require('express-session'),
	cookieParser = require('cookie-parser'),
	app = express(),
	passport = require('passport'),
	bodyParser = require('body-parser'),
	NestStrategy = require('passport-nest').Strategy,
	request = require('request'),
	fs = require('fs');

var config = require("./config.json");

passport.use(new NestStrategy({
		clientID: config.NEST_ID,
		clientSecret: config.NEST_SECRET,
		tokenURL: 'https://api.home.nest.com/oauth2/access_token',
		authorizationURL: 'https://home.nest.com/login/oauth2'
	}
));

var bearerToken = config.NEST_BEARER;

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


app.use(cookieParser('cookie_secret_shh'));
app.use(bodyParser());
app.use(session({secret: 'session_secret_shh'}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/nest', passport.authenticate('nest'));
app.get('/auth/nest/callback',
	passport.authenticate('nest', { }),
	function(req, res) {
		console.log(req.user.accessToken);
		bearerToken = req.user.accessToken;
		getNestAPIJSON(req.user.accessToken, function(body){
			console.log(body);
		});
		res.send('/');
	}
);

function getNestAPIJSON(bearerToken, callback){
	request.get({ url: 'https://developer-api.nest.com/'}, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			callback(body);
		} else {
			console.log(error);
			console.log(response.statusCode);
			console.log(body);
		}
	}).auth(null, null, true, bearerToken);
}

var download = function(uri, filename, callback){
	request.head(uri, function(err, res, body){
		request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
	});
};

var grabImage = function(){
	getNestAPIJSON(bearerToken, function(response){
		var jsonRes = JSON.parse(response);
		var d = new Date();
		var pad = "0000"
		var str = "" + (((d.getHours()+1)*60) + (d.getMinutes() + 1));
		var paddedString = pad.substring(0, pad.length - str.length) + str
		var dateString = (d.getMonth() + 1) + '-' + d.getDate() + '-' + paddedString;
		console.log('Attempting to download images ' + dateString);
		for (var camera in jsonRes.devices.cameras){
			var cam = jsonRes.devices.cameras[camera];
			if (!fs.existsSync('/Volumes/Multimedia/Photos/Timelapse\ Photos/' + cam.name + "-" + cam.device_id.substr(0,6) + '/')){
				fs.mkdirSync('/Volumes/Multimedia/Photos/Timelapse\ Photos/' + cam.name + "-" + cam.device_id.substr(0,6) + '/');
			}
			download(cam.snapshot_url, '/Volumes/Multimedia/Photos/Timelapse\ Photos/' + cam.name + "-" + cam.device_id.substr(0,6) + '/' + dateString + '.jpg', function(){});
		}
	})
}

var grabImageLoop = setInterval(grabImage, 58*1000);
grabImage();

app.listen(8080);