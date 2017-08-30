var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

var userSchema = mongoose.Schema({

    username: { type: String, index: true },
    password: String,
    email: String,
    activated: Boolean,
    verify_code: String,
    pass_request_code: String,
    expire_date: Date,
    facebookId: String,
    twitterId: String,
    githubId: String,
    googleplusId: String,
    tqqId: String,
    linkedinId: String,
    token: Array,
    profile: {
        first_name: String,
        last_name: String,
        gender: String,
        avatar: String,
        location: {
            city: String,
            province: String,
            postal_code: String,
            country_code: String
        }
    },
    friends: [{
        username: String,
        iaminviter: Boolean,
        class: String,
        date: {
            year: Number,
            month: Number,
            day: Number
        }
    }],
    potentialFriends: [{
        username: String,
        iaminviter: Boolean,
        class: String,
        date: {
            year: Number,
            month: Number,
            day: Number
        }
    }],
    groups: [String],
    offlineMessages: Array
});

var User = module.exports = mongoose.model('User', userSchema);

module.exports.newUser = function(newUser, next) {

    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(newUser.password, salt, function(err, hash) {
            newUser.password = hash;
            newUser.save(next);
        });
    });
};

module.exports.getUserByUsername = function(userName, next) {
    var query = { username: userName };
    User.findOne(query, next);
};

module.exports.getUserByEmail = function(mail, next) {
    var query = { email: mail };
    User.findOne(query, next);
};
module.exports.comparePassword = function(candidatePassword, hash, callback) {
    bcrypt.compare(candidatePassword, hash, function(err, isMatch) {
        if (err) throw err;
        callback(null, isMatch);
    })
};

module.exports.getUserById = function(id, callback) {
    User.findById(id, callback);
};

module.exports.activateAccount = function(id, verifyCode, callback) {
        User.findById(id, function(err, user) {
            if (err) throw err;
            if (user.activated) {

                return callback('Acount has been activated!');
            } else {
                var now = new Date();
                var expire_date = new Date(user.expire_date);
                if (now <= expire_date) {
                    if (verifyCode === user.verify_code) {
                        user.activated = true;
                        user.verify_code = null;
                        user.expire_date = undefined;
                        user.save(callback(null, 'success'));
                    } else {
                        return callback('Verify Code is incorrect!');
                    }
                } else {
                    return callback('verify code is expired!');
                }
            }
        })
    }
    /*password reset request*/
module.exports.requestPasswordByMail = function(email, requestCode, callback) {
        var query = { email: email };
        User.findOne(query, function(err, user) {
            if (err) throw err;
            if (!user) {
                callback('Invalid email address');
            } else {
                user.pass_request_code = requestCode;
                user.save(callback);
            }
        })
    }
    /* reset password */
module.exports.resetPassword = function(id, pass_request_code, password, callback) {

    User.findById(id, function(err, user) {
        if (err) throw err;
        if (!user) {
            callback("This user does not exist any more");
        } else {
            if (!user.pass_request_code || user.pass_request_code === null || pass_request_code != user.pass_request_code) {
                callback("Password request code can not be reused!");
            } else {

                bcrypt.genSalt(10, function(err, salt) {
                    bcrypt.hash(password, salt, function(err, hash) {
                        user.password = hash;
                        user.pass_request_code = null;
                        user.save(callback);
                    })
                })

            }
        }
    })
};
module.exports.updateAvatar = function(username, avatar, callback) {
    User.getUserByUsername(username, function(err, user) {
        if (err) throw err;
        if (!user) {
            callback("unknown user");
        } else {
            user.profile.avatar = avatar;
            user.save(callback);
        }
    })
};

module.exports.updateProfile = function(id, profile, callback) {
    User.getUserById(id, function(err, user) {
        if (err) throw err;
        user.profile.first_name = profile.first_name;
        user.profile.last_name = profile.last_name;
        user.profile.gender = profile.gender;
        user.profile.location.city = profile.location.city;
        user.profile.location.province = profile.location.province;
        user.profile.location.postal_code = profile.location.postal_code;
        user.profile.location.country_code = profile.location.country_code;
        user.save(callback);
    })
};

module.exports.changePassword = function(id, old_password, new_password, callback) {
    User.getUserById(id, function(err, user) {
        if (err) throw err;
        bcrypt.compare(old_password, user.password, function(err, isMatch) {
            if (err) throw err;
            if (!isMatch) {
                return callback(null, 'password does not match');
            } else {
                bcrypt.genSalt(10, function(err, salt) {
                    bcrypt.hash(new_password, salt, function(err, hash) {
                        user.password = hash;
                        user.pass_request_code = null;
                        user.save(callback(null, 'OK'));
                    })
                })
            }
        })
    })
};

module.exports.addPotentialConnection = function(username, potentialFriend, callback) {
    User.getUserByUsername(username, function(err, user) {
        if (err) throw err;

        if (typeof user.friends != 'undefined' && user.friends.length > 0) {
            for (var i = 0; i < user.friends.length; i++) {
                if (user.friends[i].username === potentialFriend.username) {
                    return callback('be friend already')
                }
            }
        }
        user.potentialFriends.push(potentialFriend);
        user.save(callback);
    })
};
module.exports.addConnection = function(username, friend, callback) {
    User.getUserByUsername(username, function(err, user) {
        if (err) throw err;
        user.friends.push(friend);
        user.save(callback);
    })
};
module.exports.moveFromPotential = function(username, friendName, callback) {
    User.getUserByUsername(username, function(err, user) {
        if (err) throw err;

        for (var i = 0; i < user.potentialFriends.length; i++) {
            if (user.potentialFriends[i].username === friendName) {
                user.friends.push(user.potentialFriends[i]);
                user.potentialFriends.splice(i, 1);
                user.save(callback);
            }
        }
    })
};
module.exports.removeFromPotential = function(username, friendName, callback) {
    User.getUserByUsername(username, function(err, user) {
        if (err) throw err;
        if (!user) return callback('no user');
        for (var x in user.potentialFriends) {
            if (user.potentialFriends[x].username === friendName) {
                user.potentialFriends.splice(x, 1);
                user.save(callback);
            }
        }
    })
};
module.exports.changeRelationship = function(username, friendName, friendClass, callback) {
    User.getUserByUsername(username, function(err, user) {
        if (err) throw err;
        if (!user) return callback("unknow user");
        for (var i = 0; i < user.friends.length; i++) {
            if (user.friends[i].username === friendName) {
                user.friends[i].class = friendClass;
                return user.save(callback);
            }
        }
    })
};
module.exports.removeConnection = function(username, friendName, callback) {
    User.getUserByUsername(username, function(err, user) {
        if (err) throw err;

        User.update({ username: username }, { $pull: { friends: { username: friendName } } }, callback);
        // User.update({ username: username }, { $set: { friends: friends } }, callback);
    })
};
module.exports.addGroup = function(username, group_name, callback) {
    User.getUserByUsername(username, function(err, user) {
        if (err) throw err;
        user.groups.push(group_name);
        user.save(callback);
    })
};
module.exports.removeGroup = function(username, group_name, callback) {
    User.update({ username: username }, { $pull: { groups: group_name } }, callback);
}
module.exports.pushOfflineMessage = function(targetName, offlineMessage, callback) {
    User.getUserByUsername(targetName, function(err, user) {
        if (err) throw err;
        user.offlineMessages.push(offlineMessage);
        user.save(callback);
    })
};
module.exports.removeOfflineMessages = function(username) {
    User.getUserByUsername(username, function(err, user) {
        if (err) throw err;

        user.offlineMessages = [];

        user.save();
    })
}