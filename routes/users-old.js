var express = require('express');
var router = express.Router();
var Passport = require('../models/passport');
var mime = require('mime');
var User = require('../models/user');
var Email = require('../models/email');
var crypto = require('crypto');
var fs = require('fs');
var URLSafeBase64 = require('urlsafe-base64');
var Token = require('../models/token');
var formidable = require('formidable');
var users = {};
var userList = [];


router.post('/register', function(req, res) {

    var email = req.body.email,
        username = req.body.username,
        password = req.body.password1,
        first_name = req.body.firstname,
        last_name = req.body.lastname;

    User.getUserByEmail(email, function(err, user) {
        if (err) throw err;
        if (user) {

            req.flash('error_msg', 'Email has been used! Please use a new email');
            return res.redirect('/register');

        } else {
            User.getUserByUsername(username, function(err, user) {
                if (err) throw err;
                if (user) {

                    req.flash('error_msg', 'username has been used! Please use a new username ');
                    return res.redirect('/register');

                } else {
                    var verify_code = require('crypto').createHash('sha512').update(Token.generateToken(6)).digest("base64"); //create and encrypt a random 6-digi code 
                    var expire_date = new Date(new Date().getTime() + 60 * 60 * 24 * 1000);
                    var newUser = new User({
                        username: username,
                        password: password,
                        email: email,
                        activated: false,
                        verify_code: verify_code,
                        expire_date: expire_date,
                        profile: {
                            first_name: first_name,
                            last_name: last_name,
                            gender: null,
                            avatar: 'img/blank_avatar.svg',
                            location: {
                                city: null,
                                province: null,
                                postal_code: null,
                                country_code: null
                            }
                        }

                    });
                    User.newUser(newUser, function(err, user) {
                        if (err) throw err;
                        var userid = user._id;
                        var username = user.username;
                        var verify_code = user.verify_code;
                        var randomVerifyCode = URLSafeBase64.encode(new Buffer(verify_code, 'base64')); //encode verify_code so that it can be put inside an url
                        var link = "http://192.168.2.97:3000/user/verify?id=" + userid + "&" + "user=" + username + "&" + "verifycode=" + randomVerifyCode;
                        var subject = "Please confirm your Email account";
                        var content = "Dear " + user.username + ",<br> Please Click on the link to verify your email within 24 hours. This link will be invalid after 24 hours.<br><a href=" + link + ">Click here to verify</a>";
                        var url = "/send?name=" + user.username + "&" + "email=" + user.email;
                        Email.sendEmail(user.email, subject, content, url, res);
                    })
                }
            })
        }
    })
});


router.get('/verify', function(req, res) {
    var query = req.query;
    var verify_code = URLSafeBase64.decode(query.verifycode).toString("base64");
    User.activateAccount(query.id, verify_code, function(err, success) {
        if (err === "Acount has been activated!") {
            req.flash('error_msg', err + ' Please sign in');
            return res.redirect('/login');
        }
        if (err === "Verify Code is incorrect!") {
            req.flash('error_msg', err + ' Please sign up again.');
            return res.redirect('/register');
        }
        if (err === "verify code is expired!") {
            req.flash('error_msg', err + ' Please sign up again.');
            return res.redirect('/register');
        }
        if (success) {
            req.flash('success_msg', 'Activate successfully, please sign in');
            return res.redirect('/login');
        }
    })
})

router.post('/verifymail', function(req, res) {
    var email = req.body.email;
    var servicePosition = email.indexOf('@') + 1;
    var mailService = email.slice(servicePosition);
    Email.emailRedirect(mailService, email, req, res);

})

router.post('/login', Passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }), function(req, res, next) {
        if (!req.body.remember_me) { return next(); }
        res.clearCookie('remember');
        var token = Token.generateToken(64);
        Token.save(token, req.user.id, function(err) {
            if (err) { return done(err); }
            res.cookie('remember', token, { path: '/', httpOnly: true, maxAge: 604800000 }); // 7 days
            return next();
        });
    },
    function(req, res) {
        res.redirect('/profile');
    });


router.post('/logout', function(req, res) {
    //res.clearCookie('remember');
    req.logout();
    res.redirect('/login');
});
router.get('/logout', function(req, res) {
    //res.clearCookie('remember');
    req.logout();
    res.redirect('/login');
});

router.post('/request_password', function(req, res) {
    var email = req.body.email;
    var requestCode = require('crypto').createHash('sha512').update(Token.generateToken(10)).digest("base64");
    User.requestPasswordByMail(email, requestCode, function(err, user) {
        if (err) {
            req.flash('error_msg', err);
            return res.redirect('/forget_password');
        } else {
            var randomRequestCode = URLSafeBase64.encode(new Buffer(requestCode, 'base64')); //encode requestCode  so that it can be put inside an url
            var link = "http://192.168.2.97:3000/reset_password?id=" + user._id + "&" + "resetcode=" + randomRequestCode;
            var subject = "Reset your Parrot password";
            var content = "Hello " + user.username + ",<br> Please Click on the link to reset your password.<br><a href=" + link + ">Click here to reset your password</a>"
            var url = "/sendresetpassword?name=" + user.username + "&" + "email=" + user.email;
            Email.sendEmail(user.email, subject, content, url, res);
        }
    })
});

router.post('/resetpassword', function(req, res) {

    var user_id = req.body.user_id;
    var reset_code = URLSafeBase64.decode(req.body.reset_code).toString("base64");
    var new_password = req.body.password1;
    User.resetPassword(user_id, reset_code, new_password, function(err, success) {
        if (err) {
            req.flash("error_msg", err)
            return res.redirect("/login");
        }
        req.flash("success_msg", "Reset password successfully, please log in");
        return res.redirect('/login')

    })

});

router.post('/uploadImage', function(req, res) {
    var id = req.body.userId;
    var image = req.body.imagebase64;
    User.updateAvatar(id, image, function(err, user) {
        if (user)
            res.send(user.profile.avatar);
    })

});

router.post('/saveProfile', function(req, res) {
    var id = req.body.userId;
    var first_name = req.body.firstname;
    var last_name = req.body.lastname;
    var gender = req.body.gender;
    var city = req.body.city;
    var province = req.body.province;
    var postal_code = req.body.postalcode;
    var country_code = req.body.country;

    var profile = {
        first_name: first_name,
        last_name: last_name,
        gender: gender,
        location: {
            city: city,
            province: province,
            postal_code: postal_code,
            country_code: country_code
        }
    };
    User.updateProfile(id, profile, function(err, user) {
        if (err) throw err;
        var updateProfile = user.profile;
        res.send(updateProfile);
    })
});

router.post('/changePassword', function(req, res) {
    var id = req.body.userId;
    var old_password = req.body.oldpassword;
    var new_password = req.body.newpassword;
    User.changePassword(id, old_password, new_password, function(err, result) {
        res.send(result);
    })
});

router.post('/sendFile', function(req, res) {
    var sender, receiver, fileName, filePath;

    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        //console.log('fields' + fields);
        sender = fields.sender;
        receiver = fields.receiver;

        res.send('success');

    });

    form.on('fileBegin', function(name, file) {
        file.path = '/node/uploads/' + file.name;
        fileName = file.name;
        filePath = file.path;

    });

    form.on('end', function() {

        var sendDate = new Date();
        var day = sendDate.getDate();
        var month = sendDate.getMonth() + 1;
        var year = sendDate.getFullYear();
        var hour = sendDate.getHours();
        var minute = sendDate.getMinutes();
        if (parseInt(minute) < 10) {
            minute = '0' + minute.toString();

        }
        var newMessage = {
            type: 'file',
            sender: sender,
            receiver: receiver,
            content: fileName,
            date: {
                year: year,
                month: month,
                day: day,
                hour: hour,
                minute: minute
            }
        };
        if (sender in users) {
            users[sender].emit('send file successfully', newMessage);
        }
        if (receiver in users) {
            users[receiver].emit('new message', newMessage);
        }

    })

});

router.get('/download', function(req, res) {
    var fileName = req.query.file;
    var filePath = '/node/uploads/' + fileName;
    res.download(filePath);
})

io.on('connection', function(socket) {
    //console.log('a user connected' + socket.id);
    socket.on('new user', function(data, callback) {
        if (data in users) {
            callback(false);
        } else {
            callback(true);
            socket.username = data;
            users[socket.username] = socket;

            User.getUserByUsername(data, function(err, user) {
                var userInfo = {
                    id: user._id,
                    username: user.username,
                    profile: {
                        first_name: user.profile.first_name,
                        last_name: user.profile.last_name,
                        gender: user.profile.gender,
                        avatar: user.profile.avatar,
                        location: user.profile.location.city + " " + user.profile.location.province + " " + user.profile.location.country_code,
                    },
                    friends: user.friends,
                    groups: user.groups
                };

                userList.push(userInfo);
                io.sockets.emit('user list', userList);

            })

        }
    });

    socket.on('update avatar', function(username) {
        User.getUserByUsername(username, function(err, user) {
            for (var i = 0; i < userList.length; i++) {
                if (userList[i].username === username) {
                    userList[i].profile.avatar = user.profile.avatar;
                    io.sockets.emit('user list', userList);
                    return;
                }
            }
        })
    });
    socket.on('typing', function(message) {
        var receiver = message.receiver;

        if (receiver in users) {
            users[receiver].emit('typing', message);
        }
    })
    socket.on('send message', function(message, callback) {
        var receiver = message.receiver;
        if (receiver in users) {
            callback(true);
            users[receiver].emit('new message', message);
        }
    });

    socket.on('request video chat', function(message, callback) {
        var receiver = message.receiver;
        if (receiver in users) {
            //callback(true);
            users[receiver].emit('request video chat', message);
        }
    });
    socket.on('receiver steam ok', function(message, callback) {
        var receiver = message.receiver;
        var sender = message.sender;
        console.log('sender: ' + sender);
        console.log('receiver: ' + receiver);
        users[receiver].emit('add peer', { offer: true, peerId: sender });
        users[sender].emit('add peer', { offer: false, peerId: receiver });

    });

    socket.on('request decline', function(message, callback) {
        var receiver = message.receiver;
        users[receiver].emit('request decline', message);
    })
    socket.on('iceCanadiate', function(message, callback) {
        console.log('receive candidate from ' + message.peerId + ' to ' + message.receiver);
        console.log(message.ice_candidate);

        var receiver = message.receiver;
        users[receiver].emit('iceCanadiate', message);
    });

    socket.on('offer', function(message, callback) {
        var receiver = message.receiver;
        console.log('receive offer from ' + message.peerId + ' to ' + message.receiver);
        console.log(message.offer);
        if (receiver in users) {
            users[receiver].emit('offer', message);
        }
    });
    socket.on('answer', function(message, callback) {
        var receiver = message.receiver;
        console.log('receive answer from ' + message.peerId + ' to ' + message.receiver);
        console.log(message.answer);
        if (receiver in users) {
            users[receiver].emit('answer', message);
        }
    });
    socket.on('disconnect video', function(message) {
        var receiver = message.receiver;
        console.log('receive disconnect video request from' + message.sender + ' to ' + message.receiver);
        if (receiver in users) {

            users[receiver].emit('disconnect video', message)
            console.log('transfer disconnect OK');
        }

    });
    socket.on('disconnect', function() {
        //console.log('user disconnected');
        if (!socket.username) return;
        io.sockets.emit('user offline', socket.username);
        delete users[socket.username];
        for (var i = 0; i < userList.length; i++) {
            if (userList[i].username === socket.username) {
                userList.splice(i, 1);
            }
        }

    });
});

module.exports = router;