var passport = module.exports = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var LinkedInStrategy = require('passport-linkedin').Strategy;
var User = require('../models/user');
var config = require('../models/config-passport');
var Token = require('../models/token');


/* local authentication strategy */
passport.use('local', new LocalStrategy(

    function(username, password, done) {
        User.getUserByUsername(username, function(err, user) {
            if (err) throw err;

            if (!user) {
                return done(null, false, { message: 'Unknown User' });
            }
            if (!user.activated) {
                return done(null, false, { message: 'Account is inactive' });
            }

            User.comparePassword(password, user.password, function(err, isMatch) {
                if (err) throw err;
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Invalid password' });
                }
            });
        });
    }));

/* linkedin authentication strategy*/
passport.use(new LinkedInStrategy({
        consumerKey: config.linkdin.clientID,
        consumerSecret: config.linkdin.clientSecret,
        callbackURL: config.linkdin.callbackURL
    },
    function(req, accessToken, refreshToken, profile, done) {
        console.log(profile);
        if (req.user) {
            User.findOne({ linkedinId: profile.id }, function(err, user) {

                if (user) {
                    req.flash('error_msg', 'Linkedin account has been bound by a user');
                    done(err)
                } else {
                    User.getUserById(use.id, function(err, user) {
                        user.linkedinId = profile.id;
                        user.token.push({ 'kind': 'linkedin', accessToken: accessToken });
                        use.profile.first_name = user.profile.first_anme || profile.first - name;
                        user.profile.last_name = user.profile.last_name || profile.last - name;
                        user.profile.avatar = user.profile.avatar || profile.picture - url;
                        user.profile.location = user.profile.location || profile.location;
                        req.flash('success_msg', 'Linkedin account was bound successfully')
                        user.save(done);
                    });
                }
            });
        } else {
            User.findOne({ linkedinId: profile.id }, function(err, user) {
                if (user) return done(null, user);
            });
            User.findOne({ email: profile.email - address }, function(err, user) {
                if (user) {
                    req.flash('error_msg', 'Please log in and bind this linkedin account');
                    done('error');
                } else {
                    var newUser = new User;
                    newUser.username = profile.formatted - name;
                    newUser.email = profile.email - address;
                    newUser.linkedinId = profile.id;
                    newUser.Token.push({ 'kind': 'linkedin', accessToken: accessToken });
                    newUser.profile.first_name = profile.first - name;
                    newUser.profile.last_name = profile.last - name;
                    newUser.profile.avatar = profile.avatar;
                    newUser.profile.location = profile.location;
                    newUser.save(done);
                }
            });
        }

    }
));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.getUserById(id, function(err, user) {
        done(err, user);
    });
});