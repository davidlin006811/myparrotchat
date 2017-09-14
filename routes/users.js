var express = require('express');
var router = express.Router();
var Passport = require('../models/passport');
var mime = require('mime');
var User = require('../models/user');
var Group = require('../models/group.js');
var Email = require('../models/email');
var crypto = require('crypto');
var fs = require('fs');
var URLSafeBase64 = require('urlsafe-base64');
var Token = require('../models/token');
var formidable = require('formidable');
var users = {}; //it is used to store socket information
var groups = [];

// get the name of every group
Group.getAllGroupNames(function(err, names) {
    groups = names;
});

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
                    var blank = [];
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
                        },
                        friends: blank,
                        potentialFriends: blank,
                        groups: blank

                    });
                    User.newUser(newUser, function(err, user) {
                        if (err) throw err;
                        var userid = user._id;
                        var username = user.username;
                        var verify_code = user.verify_code;
                        var randomVerifyCode = URLSafeBase64.encode(new Buffer(verify_code, 'base64')); //encode verify_code so that it can be put inside an url
                        //var link = "http://66.228.39.175/user/verify?id=" + userid + "&" + "user=" + username + "&" + "verifycode=" + randomVerifyCode;
                        var link = "https://www.myparrotchat.com/user/verify?id=" + userid + "&" + "user=" + username + "&" + "verifycode=" + randomVerifyCode;
                        var subject = "Please confirm your Email account";
                        var content = "Dear " + user.username + ",<br> Please click on the following link to verify your email within 24 hours. This link will be invalid after 24 hours. This message comes from https://www.myparrotchat.com<br><a href=" + link + ">Click here to verify</a>";
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
        if (err === "No user") {
            req.flash('error_msg', err + ',  please sign up');
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
});
router.post('/verifymail', function(req, res) {
    var email = req.body.email;
    var servicePosition = email.indexOf('@') + 1;
    var mailService = email.slice(servicePosition);
    Email.emailRedirect(mailService, email, req, res);

});
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
            //var link = "http://66.228.39.175/reset_password?id=" + user._id + "&" + "resetcode=" + randomRequestCode;
            var link = "https://www.myparrotchat.com/reset_password?id=" + user._id + "&" + "resetcode=" + randomRequestCode;
            var subject = "Reset your Parrot password";
            var content = "Hello " + user.username + ",<br> Please click on the following link to reset your password. This message comes from https://www.myparrotchat.com<br><a href=" + link + ">Click here to reset your password</a>"
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

router.post('/changePassword', function(req, res) {
    var id = req.body.userId;
    var old_password = req.body.oldpassword;
    var new_password = req.body.newpassword;
    User.changePassword(id, old_password, new_password, function(err, result) {
        res.send(result);
    })
});
router.post('/sendFile', function(req, res) {
    var sender, receiver, fileName, filePath, groupName, senderName;

    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        sender = fields.sender;
        groupName = fields.groupName;
        receiver = fields.receiver;

        res.send('success');
    });

    form.on('fileBegin', function(name, file) {
        //file.path = '/root/chat/uploads/' + file.name;
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
        if (receiver != groupName) {
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
            } else {
                User.pushOfflineMessage(receiver, newMessage, function(err, user) {
                    if (err) throw err;

                });
            }
        } else {
            User.getUserByUsername(sender, function(err, user) {
                if (err) throw err;
                var newMessage = {
                    type: 'file',
                    sender: sender,
                    senderName: user.profile.first_name + ' ' + user.profile.last_name,
                    group: groupName,
                    receive: null,
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
                    users[sender].emit('send group file successfully', newMessage);
                }
                Group.getGroupByName(groupName, function(err, group) {
                    for (let i = 0; i < group.members.length; i++) {

                        if (group.members[i] === sender) continue //if current group member is sender, skip to send message
                        if (group.members[i] in users) {
                            users[group.members[i]].emit('new group message', newMessage);
                        } //if group member is online, send message; if not save message as offline message
                        else {
                            newMessage.type = 'group_file';
                            User.pushOfflineMessage(group.members[i], newMessage, function(err, user) {
                                if (err) throw err;
                            })
                        }
                    }
                })
            })

        }
    })
});
router.get('/download', function(req, res) {
    var fileName = req.query.file;
    //var filePath = '/root/chat/uploads/' + fileName;
    var filePath = '/node/uploads/' + fileName;
    try {
        res.download(filePath);
    } catch (e) {
        console.log(e);
    }

});

function retrieveOfflineMessages(user) {
    if (user.offlineMessages.length) {
        for (var j in user.offlineMessages) {
            switch (user.offlineMessages[j].type) {
                case "text":
                    users[user.username].emit('new message', user.offlineMessages[j]);
                    break;
                case "file":
                    users[user.username].emit('new message', user.offlineMessages[j]);
                    break;
                case "invitePeople":
                    users[user.username].emit('be a friend request', user.offlineMessages[j]);
                    break;
                case "acceptRequest":
                    users[user.username].emit('new offline conection', user.offlineMessages[j]);
                    break;
                case "rejectRequest":
                    users[user.username].emit('request is rejected', user.offlineMessages[j]);
                    break;
                case "removeFriend":
                    users[user.username].emit('remove friend please', user.offlineMessages[j].sender);
                    break;
                case "inviteJoiningGroup":
                    users[user.username].emit('invite joining group', user.offlineMessages[j]);
                    break;
                case "removeGroup":
                    users[user.username].emit('group was removed', user.offlineMessages[j]);
                    break;
                case "group_text":
                    user.offlineMessages[j].type = 'text';
                    users[user.username].emit('new group message', user.offlineMessages[j]);
                    break;
                case "group_file":
                    users[user.username].emit('new group message', user.offlineMessages[j]);
                    break;
            }
        }
        User.removeOfflineMessages(user.username);
    }
}
io.on('connection', function(socket) {

    socket.on('new user', function(data, callback) {
        if (data in users) {
            callback(false);
        } else {
            callback(true);
            socket.username = data;
            users[socket.username] = socket;

            User.getUserByUsername(data, function(err, user) { //get user's infomation
                for (let i = 0; i < user.groups.length; i++) {
                    var groupName = user.groups[i];
                    Group.getGroupByName(groupName, function(err, group) {
                        if (err) throw err;
                        users[user.username].emit('group info', group);
                    })
                }
                var relation = {};
                if (!user.friends.length) retrieveOfflineMessages(user);
                let count = 0;
                //get friends' information
                for (let i = 0; i < user.friends.length; i++) {
                    var friend = user.friends[i];

                    // relation[friend.username] = friend.class;
                    //check if this friend is online, if online, info this friend user is online

                    User.getUserByUsername(friend.username, function(err, friendData) {
                        var online = false;
                        if (err) return;

                        if (friendData.username in users) {
                            online = true;
                            var onlineMessage = {
                                sender: user.username, //user is a sender, and friend is a receiver
                                receiver: friendData.username
                            };
                            users[friendData.username].emit('new user online', onlineMessage); //infor user's friends that user is online;
                        }
                        //get this friend personal information and send it to user
                        var friendInfo = {
                            username: friendData.username,
                            profile: {
                                first_name: friendData.profile.first_name,
                                last_name: friendData.profile.last_name,
                                gender: friendData.profile.gender,
                                avatar: friendData.profile.avatar,
                                location: friendData.profile.location.city + " " + friendData.profile.location.country_code
                            },
                            online: online,
                            //class: relation[friendData.username]
                            class: user.friends[i].class
                        };
                        users[user.username].emit('friend info', friendInfo); //send friend's information to user.
                        count++;

                        // if all friends'information has been sent 
                        if (count >= (user.friends.length) || user.friends.length == 0) {
                            //get and submit offlineMessages
                            retrieveOfflineMessages(user);
                        }
                    });
                }

            });
        }
    });
    socket.on('search people', function(username, callback) {
        User.getUserByUsername(username, function(err, user) {
            if (err) throw err;
            if (!user) {
                var fail = false;
                return callback(fail);
            }

            var target = {
                name: user.profile.first_name + ' ' + user.profile.last_name,
                avatar: user.profile.avatar,
                gender: user.profile.gender,
                location: user.profile.location.city + " " + user.profile.location.province + " " + user.profile.location.country_code
            }
            return callback(target);
        })
    });
    socket.on('saveProfile', function(message, callback) {
        var id = message.userId;
        var first_name = message.first_name;
        var last_name = message.last_name;
        var gender = message.gender;
        var city = message.city;
        var province = message.province;
        var postal_code = message.postal_code;
        var country_code = message.country;

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
            callback(updateProfile);
        })
    });
    socket.on('search group', function(message, callback) { //return max 10 results
        var count = 0;
        var response = new Array();
        var name = message.name.toUpperCase();

        for (let i = 0; i < groups.length; i++) {
            if (count >= 10) {
                return callback(response);

            }
            var length = name.length > 0 ? name.length : 1;
            if (name == groups[i].substring(0, length).toUpperCase()) {
                response.push(groups[i]);
                count++;
            }
        }
        callback(response);
    });
    socket.on('get group info', function(message) {
        var name = message.name;

        Group.getGroupByName(name, function(err, group) {
            if (err) throw err;
            if (!group) return users[message.username].emit('no group');
            else {

                var info = {
                    name: group.name,
                    avatar: group.avatar,
                    owner: group.owner,
                    memberCount: group.members.length,
                    members: group.members

                }
                return users[message.username].emit('group result', info);

            }
        })
    });
    socket.on('withdraw from group', function(message) {
        var groupName = message.groupName;
        var username = message.username;

        User.removeGroup(username, groupName, function(err) {
            if (err) throw err;
            Group.removeMember(groupName, username, function(err) {
                if (err) throw err;
                Group.getGroupByName(groupName, function(err, group) {
                    if (err) throw err;
                    for (let i = 0; i < group.members.length; i++) {
                        if (group.members[i] in users) {
                            users[group.members[i]].emit('update group', group);
                        }
                    }
                })
            })
        })
    });
    socket.on('remove group', function(message) {
        var owner = message.owner;
        var groupName = message.groupName;
        var count = 0;

        Group.getGroupByName(groupName, function(err, group) {

            if (err) throw err;
            if (!group) return;
            for (let i = 0; i < group.members.length; i++) {
                User.removeGroup(group.members[i], groupName, function(err) {
                    if (err) throw err;
                    if (group.members[i] in users) users[group.members[i]].emit('remove group', group);
                    else {
                        var info = {
                            type: 'removeGroup',
                            groupName: groupName,
                            owner: owner
                        }
                        User.pushOfflineMessage(group.members[i], info);
                    }
                    count++;
                    if (count === group.members.length) {
                        Group.removeGroup(groupName, function(err) {
                            if (err) throw err;
                            for (var i = 0; i < groups.length; i++) {
                                if (groups[i] === groupName) {
                                    groups.splice(i, 1);
                                }
                            }
                        })
                    }
                })
            }
        })
    });
    socket.on('getUnknownMembersInfo', function(message, callback) {
        var members = message.unknownMembers;
        var membersInfo = [];
        var count = 0;

        for (let i = 0; i < members.length; i++) {
            User.getUserByUsername(members[i], function(err, user) {
                if (err) throw err;
                var online;
                if (members[i] in users) online = true
                else online = false
                var info = {
                    username: user.username,
                    name: user.profile.first_name + ' ' + user.profile.last_name,
                    avatar: user.profile.avatar,
                    relationship: 'new',
                    online: online
                }

                membersInfo.push(info);
                count++;
                if (count === members.length) {
                    return callback(membersInfo)
                }
            })
        }
    });
    socket.on('getUnknownMember', function(unknownMember, callback) {
        User.getUserByUsername(unknownMember, function(err, user) {
            var online = false;
            if (user.username in users) online = true;
            var info = {
                username: user.username,
                profile: {
                    first_name: user.profile.first_name,
                    last_name: user.profile.last_name,
                    gender: user.profile.gender,
                    avatar: user.profile.avatar,
                    location: user.profile.location.city + " " + user.profile.location.country_code
                },
                online: online
            };
            return callback(info);
        })
    });
    socket.on('join group', function(message) {
        var groupName = message.name.replace(/\"/g, "");
        var member = message.username;
        Group.addMember(groupName, member, function(err, group) {
            if (err) throw err;
            if (group === 'no group') {
                return users[member].emit('no group');
            }
            if (group === 'be a member already') {
                return users[member].emit('be a member already', groupName);
            }
            User.addGroup(member, groupName, function(err, user) {
                users[user.username].emit('new group', group);
            });
            for (let i = 0; i < group.members.length; i++) {
                if ((group.members[i] != member) && (group.members[i] in users)) users[group.members[i]].emit('update group', group);
            }
        })
    });
    socket.on('invite people', function(message, callback) {
        var newFriend = {
            username: message.invitee,
            iaminviter: true, //used to record offline message
            class: message.class,
            date: message.date
        };
        User.addPotentialConnection(message.inviter, newFriend, function(err, user) {
            if (err) callback(err);
            if (user == 'be friend already') return callback('be friend already');
            else if (user == 'repeat request') return callback('repeat request');
            else {
                var invitee = message.invitee;
                var inviter = message.inviter;
                var inviterName = user.profile.first_name + ' ' + user.profile.last_name;
                var info = {
                    type: "invitePeople",
                    inviter: inviter,
                    inviterName: inviterName
                }
                if (invitee in users) {
                    users[invitee].emit('be a friend request', info);
                    var newMessage = 'You sent a message to ' + message.inviteeName + ' to establish a connection successfully';
                    callback(newMessage);
                } else User.pushOfflineMessage(invitee, info, function(err, user) {
                    if (err) throw err;
                    if (!user) return callback(false);
                    var newMessage = 'You sent an offline message to ' + message.inviteeName + ' to establish a connection successfully';
                    callback(newMessage);
                })

            }

        })
    });
    socket.on('invite someone to group', function(message, callback) {
        var selectedUsers = message.selectedUsers;

        var info = {
            type: 'inviteJoiningGroup',
            inviter: message.sender,
            groupName: message.targetGroup
        }
        for (let i = 0; i < selectedUsers.length; i++) {
            if (selectedUsers[i] in users) {
                users[selectedUsers[i]].emit('invite joining group', info);
                callback('success');
            } else {
                User.pushOfflineMessage(selectedUsers[i], info, function(err, user) {
                    if (err) throw err;
                    if (!user) callback(false)
                    else {
                        callback('success');
                    }
                })
            }
        }
    });
    socket.on('accept request', function(message) {
        var inviter = message.inviter;
        var invitee = message.invitee;
        var inviterOnline = (inviter in users) ? true : false;
        var inviteeOnline = (invitee in users) ? true : false;
        User.moveFromPotential(inviter, invitee, function(err, user) {
            if (inviteeOnline) {
                var newPeople = {
                    username: inviter,
                    profile: {
                        first_name: user.profile.first_name,
                        last_name: user.profile.last_name,
                        gender: user.profile.gender,
                        avatar: user.profile.avatar,
                        location: user.profile.location.city + " " + user.profile.location.province + " " + user.profile.location.country_code
                    },
                    online: inviterOnline
                };
                var reply = {
                    inviter: false,
                    newPeople
                }
                users[invitee].emit('new connection', reply);
            }
        });
        var newFriend = {
            username: inviter,
            iaminviter: false,
            class: 'friend',
            date: message.date
        };
        User.addConnection(invitee, newFriend, function(err, user) {
            var newPeople = {
                username: invitee,
                profile: {
                    first_name: user.profile.first_name,
                    last_name: user.profile.last_name,
                    gender: user.profile.gender,
                    avatar: user.profile.avatar,
                    location: user.profile.location.city + " " + user.profile.location.province + " " + user.profile.location.country_code
                },
                online: inviteeOnline
            };
            var reply = {
                    type: "acceptRequest",
                    inviter: true,
                    newPeople
                }
                //if inviter is online, send new connection. otherwise, save this reply as offline message
            if (inviterOnline) users[inviter].emit('new connection', reply);
            else User.pushOfflineMessage(inviter, reply, function(err, user) {
                if (err) throw err;

            });
        })
    });
    socket.on('reject request', function(message) {
        var inviter = message.inviter;
        var invitee = message.invitee;
        var inviterOnline = (inviter in users) ? true : false;
        //var inviteeOnline = (invitee in users) ? true : false;
        User.removeFromPotential(inviter, invitee, function(err, user) {
            if (err) throw err;
            var inviterName = user.profile.first_name + ' ' + user.profile.last_name;
            var info = {
                type: 'rejectRequest',
                inviter: inviter,
                inviterName: inviterName,
                invitee: invitee
            }
            if (inviterOnline) users[inviter].emit('request is rejected', info)
            else User.pushOfflineMessage(inviter, info, function(err, user) {
                if (err) throw err;
            });
            users[invitee].emit('reject request successfully', info);
        })
    })
    socket.on('update avatar', function(message) {
        var receivers = message.receivers;
        User.updateAvatar(message.sender, message.avatar, function(err, user) {
            if (user) {
                users[message.sender].emit('renew avatar', user.profile.avatar);
                name = user.profile.first_name + ' ' + user.profile.last_name;
                gender = user.profile.gender
                for (var i = 0; i < receivers.length; i++) {
                    users[receivers[i]].emit('update avatar', { sender: message.sender, name: name, gender: gender, avatar: user.profile.avatar });
                }
            }
        })
    });
    socket.on('change relationship', function(message) {
        var sender = message.sender;
        var target = message.target;
        var relationship = message.relationship;
        User.changeRelationship(sender, target, relationship, function(err, user) {
            if (err) throw err;
        })
    });
    socket.on('remove contacter', function(message) {
        var sender = message.sender;
        var receiver = message.target;

        User.removeConnection(sender, receiver, function(err) { //remove receiver from sender's friends
            if (err) throw err;
            if (sender in users) users[sender].emit('remove friend successfully', receiver);

            User.removeConnection(receiver, sender, function(err) { //remove sender from receiver's friends
                if (err) throw err;
                var info = {
                    type: 'removeFriend',
                    sender: sender,
                }
                if (receiver in users) users[receiver].emit('remove friend please', info.sender)
                else User.pushOfflineMessage(receiver, info, function(err, user) {
                    if (err) throw err;
                })
            })
        });
    });
    socket.on('typing', function(message) {
        var receiver = message.receiver;

        if (receiver in users) {
            users[receiver].emit('typing', message);
        }
    });
    socket.on('send message', function(message) {
        var receiver = message.receiver;
        if (receiver in users) {
            users[receiver].emit('new message', message);
        } else {
            User.pushOfflineMessage(receiver, message, function(err, user) {
                if (err) throw err;
            });
        }
    });
    socket.on('send group message', function(message) {
        var groupName = message.group;
        Group.getGroupByName(groupName, function(err, group) {
            for (let i = 0; i < group.members.length; i++) {
                if (group.members[i] === message.sender) continue;
                else {
                    if (group.members[i] in users) {
                        users[group.members[i]].emit('new group message', message);
                    } else {
                        if (message.type === 'text') {
                            message.type = 'group_text';
                            User.pushOfflineMessage(group.members[i], message, function(err, user) {
                                if (err) throw err;
                            });
                        }
                    }
                }
            }
        })
    });
    socket.on('request media chat', function(message) {
        var receiver = message.receiver;
        if (receiver in users) {
            users[receiver].emit('request media chat', message);
        }
    });
    socket.on('receiver steam ok', function(message) {
        var receiver = message.receiver;
        var sender = message.sender;
        users[receiver].emit('add peer', { offer: true, peerId: sender, useVideo: message.useVideo });
        users[sender].emit('add peer', { offer: false, peerId: receiver, useVideo: message.useVideo });
    });
    socket.on('request decline', function(message) {
        var receiver = message.receiver;
        users[receiver].emit('request decline', message);
    });
    socket.on('iceCanadiate', function(message) {
        var receiver = message.receiver;
        users[receiver].emit('iceCanadiate', message);
    });
    socket.on('offer', function(message) {
        var receiver = message.receiver;
        if (receiver in users) {
            users[receiver].emit('offer', message);
        }
    });
    socket.on('answer', function(message) {
        var receiver = message.receiver;

        if (receiver in users) {
            users[receiver].emit('answer', message);
        }
    });
    socket.on('new group', function(message, callback) {
        var groupName = message.groupName;
        Group.getGroupByName(groupName, function(err, group) {
            if (err) throw err;
            if (group) callback(groupName + ' has been used');
            else {
                var newGroup = {
                    name: groupName,
                    owner: message.owner,
                    avatar: 'img/blank_avatar.svg',
                    members: [message.owner]
                }
                Group.newGroup(newGroup, function(err, group) {
                    if (err) throw err;
                    User.addGroup(message.owner, groupName, function(err, user) {
                        if (err) throw err;
                        groups.push(group.name);
                        callback('success');
                    })

                })
            }
        })
    });
    socket.on('update group avatar', function(message) {
        var groupName = message.groupName;
        Group.updateAvatar(groupName, message.avatar, function(err, group) {
            if (err) throw err;
            for (var i = 0; i < group.members.length; i++) {
                if (group.members[i] in users) {
                    users[group.members[i]].emit('new group', group);
                }
            }
        })
    });
    socket.on('new group without avatar', function(message) {
        var groupName = message.groupName;
        var sender = message.sender;
        Group.getGroupByName(groupName, function(err, group) {
            if (err) throw err;
            if (sender in users) {
                users[sender].emit('new group', group);
            }
        })
    })
    socket.on('disconnect media', function(message) {
        var receiver = message.receiver;
        if (receiver in users) {
            users[receiver].emit('disconnect media', message)
        }
    });
    socket.on('disconnect', function() {
        if (!socket.username) return;
        User.getUserByUsername(socket.username, function(err, user) { //search user's online friends and send offline information to them
            if (err) throw err;
            for (var i = 0; i < user.friends.length; i++) {
                if (users[user.friends[i].username] != null) {
                    users[user.friends[i].username].emit('user offline', user.username);
                }
            }
            delete users[socket.username];
        })
    });
});

module.exports = router;