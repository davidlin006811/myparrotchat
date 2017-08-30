var express = require('express');
var router = express.Router();
var Passport = require('../models/passport');
var Token = require('../models/token');
var User = require('../models/user');
var country = require('../country.json');


router.get('/', function(req, res) {

    if (req.cookies.remember) {
        Token.consume(req.cookies.remember, function(err, user) {
            if (err) throw (err);
            if (!user) {
                res.redirect('/login');
            } else {
                User.getUserById(user.user_id, (err, account) => {
                    if (!account) {
                        res.redirect('/login');
                    } else {
                        res.clearCookie('remember');
                        var token = Token.generateToken(64);
                        Token.save(token, account.id, function(err) {
                            if (err) { return done(err); }
                            res.cookie('remember', token, { path: '/', httpOnly: true, maxAge: 604800000 }); // 7 days
                            res.render('profile', { user: account });

                        });

                    }
                })
            }
        })
    } else res.redirect('/login');
});

router.get('/login', function(req, res) {
    res.render('index');
})

router.get('/register', function(req, res) {
    res.render('register');
});
router.get('/manualverify', function(req, res) {
    res.render('manualverify');
})
router.get('/user/register', function(req, res) {
    res.render('register');
});
router.get('/send', function(req, res) {
    var user = {
        username: req.query.name,
        email: req.query.email
    }
    res.render('send', { user, user });

});

router.get('/profile', ensureAuthenticated, function(req, res) {
    var info = {
        _id: req.user._id,
        username: req.user.username,
        profile: {
            first_name: req.user.profile.first_name,
            last_name: req.user.profile.last_name,
            gender: req.user.profile.gender,
            avatar: req.user.profile.avatar,
            location: req.user.profile.location
        }
    };
    var user = { user: info, country: country };
    //var user = { user: req.user };
    res.render('profile', user);
});

router.get('/forget_password', function(req, res) {
    res.render('forgetpassword');
});

router.get('/sendresetpassword', function(req, res) {
    var user = {
        username: req.query.name,
        email: req.query.email
    }
    res.render('sendresetpassword', { user: user });
});

router.get('/reset_password', function(req, res) {
    var id = req.query.id;
    var reset_code = req.query.resetcode;
    var user = { id: id, reset_code: reset_code };
    res.render('resetpassword', { user: user });

});

router.get('/auth/linkedin',
    Passport.authenticate('linkedin'));

router.get('/auth/linkedin/callback',
    Passport.authenticate('linkedin', { failureRedirect: '/' }),
    function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/profile');
    });

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/');
    }

}

function isAuthorized(req, res, next) {
    var provider = req.path.split('/').slice(-1)[0];
    if (_.find(req.user.tokens, { kind: provider })) {
        next();
    } else {
        res.redirect('/auth/' + provider);
    }
};


module.exports = router;