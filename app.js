// Load modules .
const express = require('express');
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const Handlebars = require('handlebars')
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access');

// Connect to MongoURI exported from external file.
const keys = require('./config/keys.js');
// User collection.
const User = require('./models/user.js');
// Link passports to the server.
require('./passport/google-passport');
require('./passport/facebook-passport');
// Initialize our application.
const app = express();

app.engine('handlebars', exphbs({
    defaultLayout: 'main',
    handlebars: allowInsecurePrototypeAccess(Handlebars)
}));
app.set('view engine', 'handlebars');

// Express config.
app.use(cookieParser());
app.use(bodyParser.urlencoded({ 
    extended: false 
}));
app.use(bodyParser.json());
app.use(session({ 
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true 
}));
app.use(passport.initialize());
app.use(passport.session());

// Golbal variables for user.
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
});

// Setup template engine for the view.
app.engine('handlebars', exphbs({
    defaultLayout: 'main'
}));

app.set('view engine', 'handlebars');
// Setup static files to serve css javascript and images.
app.use(express.static('public'));
mongoose.Promise = global.Promise;
// connect to remote database.
mongoose.connect(keys.MongoURI, {
    useUnifiedTopology: true,
    useNewUrlParser: true
})
.then(() =>{
    console.log(`Connected to remote database....`);
}).catch((err) => {
    console.log(err);
});

// Set environment variable for port.
const port = process.env.PORT || 3000;

// Handle routes.
app.get('/', (req, res) => {
    res.render('home');
});

app.get('/about', (req, res) => {
    res.render('about');
});

// Google auth route.
app.get('/auth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));

app.get('/auth/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login'
 }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/profile');
  });

// Facebook auth route.
app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { 
      failureRedirect: '/' 
  }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/profile');
  });
// Handdle profile route.
app.get('/profile', (req, res) => {
    User.findById({_id: req.user._id})
    .then((user) => {
        res.render('profile', {
            user:user
        });
    })    
});

// User logout handle route.
app.get('/logout', (req, res) => {
    req.logOut();
    res.redirect('/');
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});