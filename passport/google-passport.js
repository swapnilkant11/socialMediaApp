const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const keys = require('../config/keys');

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: keys.GoogleClientID,
    clientSecret: keys.GoogleClientSecret,
    callbackURL: "/auth/google/callback",
    proxy: true
  },
  (accessToken, refreshToken, profile, done) => {
    console.log(profile);
    User.findOne({
        google: profile.id
    }).then((user) => {
        if(user){
            done(null, user);
        }
        else{
            const newUser = {
                google: profile.id,
                fullname: profile.displayName,
                lastname: profile.name.familyName,
                firstname: profile.name.givenName,
                email: profile.emails[0].value,
                image: profile.photos[0].value
            }
            // Save new user to database.
            new User(newUser).save()
            .then((user) => {
                done(null, user);
            })
        }
    })
  }
));