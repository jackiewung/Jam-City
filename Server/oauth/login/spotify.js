var
    // express = require('express'),
    // http = require('http'),
    SpotifyWebApi = require('spotify-web-api-node'),
    https = require('https'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    passport = require('passport'),
    passportSpotify=require('passport-spotify'),
    swig = require('swig'),
    SpotifyStrategy = require('../lib/passport-spotify/index').Strategy,
    app = require('../../app.js'),
    consolidate = require('consolidate'),
    DB,
    mongo = require('mongodb').MongoClient,
    hasJamCity = false;


var appKey = '526cbc85ee13460bacb7133580aba4a3';
var appSecret = 'c3cf83c6949941f29e6fc7f655b8c42a';

var currentUser;
var playlistId;
var trackArray = []

var mongoUri = 'mongodb://saintembers:bassandhon3y@ds031862.mongolab.com:31862/jam-city'

// mongo.connect(mongoUri, function(err, db) {
//   DB = db
//   db.createCollection('User')
//   console.log(DB)
// });
// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session. Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing. However, since this example does not
//   have a database of user records, the complete spotify profile is serialized
//   and deserialized.

module.exports = function (app, express) {

// credentials are optional
var spotifyApi = new SpotifyWebApi({
  clientId : appKey,
  clientSecret : appSecret,
  redirectUri : 'http://localhost:8008/callback'
});

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the SpotifyStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and spotify
//   profile), and invoke a callback with a user object.
passport.use(new SpotifyStrategy({
  clientID: appKey,
  clientSecret: appSecret,
  callbackURL: 'http://localhost:8008/callback'
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      // To keep the example simple, the user's spotify profile is returned to
      // represent the logged-in user. In a typical application, you would want
      // to associate the spotify account with a user record in your database,
      // and return that user instead.
      // User.findOrCreate({ spotifyId: profile.id }, function (err, user) {
      // console.log(user)
      // return done(err, user);
      console.log("refreshToken:", refreshToken)
      console.log("accessToken:", accessToken)

      spotifyApi.setAccessToken(accessToken);
      // console.log("profile:", profile)
      console.log("access:", accessToken)
      return done(null, profile);
    });
  }));



// var app = express();

// configure Express
app.use(express.static(__dirname + '/../../../client'));
app.set('views', __dirname + '/../../../client');
// app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride());
app.use(session({ secret: 'keyboard cat' }));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());


app.engine('html', consolidate.swig);

app.get('/', function(req, res){
  console.log(req.user)
  res.render('index.html', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account.html', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login.html', { user: req.user });
});

// GET /auth/spotify
//   Use passport.authenticate() as route middleware to authenticate the
//   request. The first step in spotify authentication will involve redirecting
//   the user to spotify.com. After authorization, spotify will redirect the user
//   back to this application at /auth/spotify/callback
app.get('/auth/spotify',
  passport.authenticate('spotify', {scope: ['user-read-email', 'user-read-private','playlist-modify-public'], showDialog: true}),
  function(req, res){
// The request will be redirected to spotify for authentication, so this
// function will not be called.
  console.log(res)
});


// GET /auth/spotify/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request. If authentication fails, the user will be redirected back to the
//   login page. Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/callback',
  passport.authenticate('spotify', { failureRedirect: '/login' }),
  function(req, res) {
    currentUser = res.req.user.id
    // getPlaylists(currentUser)
    //find if JamCity exists
    //create if not there
   spotifyApi.getUserPlaylists(currentUser)
   .then(function(data) {
     bigD = data.body.items
     console.log('playlistInfo', bigD)

     bigD.forEach(function(item){
        console.log('playlistName', item.name)
       if(item.name === 'city jams'){
        playlistId = item.id
        console.log(playlistId)
        hasJamCity = true;
        console.log(hasJamCity)
       }
     })
     // console.log('Retrieved playlists', data.body.items[0].name);

   },function(err) {
     console.log('Something went wrong!', err);
   }).then(function(){

   })
    console.log('userID: ', currentUser)
    res.redirect('/');
  });

app.get('/hotTracks', function(req, res){
  var spotifyId = req.query.artistId
  console.log('getHotTracks', spotifyId)
  spotifyApi.getArtistTopTracks(spotifyId, 'US')
  .then(function(data) {
    for(var i = 0; i < 3; i++){
    var spotifyTrack = 'spotify:track:'
    var track = spotifyTrack + data.body.tracks[i].id
    console.log(track)
    trackArray.push(track)
    }
    spotifyApi.addTracksToPlaylist(currentUser, playlistId, trackArray)
      .then(function(data) {
        console.log('Added tracks to playlist!');
        trackArray = []
      }, function(err) {
        console.log('Something went wrong!', err);
      });
    }, function(err) {
    console.log('Something went wrong!', err);
  })



})


app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});



// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed. Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}
}