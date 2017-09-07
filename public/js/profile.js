var basic; //define a croppie image
var user = account; //define current user
var socket = io.connect();
var onlineFriends = []; //define online friends' usernames;
var interlocutor = null; //define the person current user wants to chat with
var currentGroup = null; //define the current group the user join
var searchGroupResult = null;
var userList = []; //define the information of all friends
var groupList = []; //define the information of all groups
var members = null;
var unknownMemberList = [] //define the information of unknown members
var privateMessageList = []; //define the messages send/receive from private
var publicMessageList = []; //define the messages send/recevie from group
var currentSaveId = {}; //store the current save id for each contact
var currentGroupSaveId = {} //store the current save id for each group
var notificationList = [];
var count = 0; //define the qty of pending message(current user hasn't read yet)
var change = false; //define if an image size has been changed(enlarged or reduced)
var oldHeight, oldWidth; //define the height and width of an image
var sendFileQty = 0; //define the quantity of the files which have been sent to the server
var MUTE_AUDIO_BY_DEFAULT = false;
var ICE_SERVERS = [{
    url: "stun:stun.l.google.com:19302"
}];
var peers = {};
var myConnection = null;
var localMediaStream = null;
var mediaConstraints = {
    mandatory: {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true
    }

};
var peerMediaStreams = {};
var videoChater = null;
var audioChater = null;
var minimize = false;
var maximize = false;
var snapImgOffset = 0;
var useVideo = false;
var useAudio = true;
var scrolled = false;
var toggleFloatInput = false;
var newFileUploadAvailable = true;
var selectedText = null;
var savePrivateDataToLocal = false; //define if private data has been saved in local
var savePublicDataToLocal = false;
var mousedown = false;
var currentReadId = null;
var oldHistoryDate = null;
$(document).ready(function() {
    //socket = io.connect();
    $('#message').emojiPicker({
        width: '300px',
        height: '200px',
        position: 'top',
        botton: false

    });
    $('#textarea').emojiPicker({
        width: '300px',
        height: '200px',
        position: 'right',
        button: false

    });

    $(function() {
        $('[data-toggle="tooltip"]').tooltip()
    })

    //$('.snapshot').css('pointer-events', 'none');
    socket.emit('new user', user.username, function(data) {
        if (!data) {
            $.Zebra_Dialog("This user has already logged in, please click OK to exit", {
                type: 'error',
                title: 'Error Information',
                buttons: [
                    { caption: 'Exit', callback: logout }

                ],
                onClose: logout
            });
        }
    });
    socket.on('friend info', function(friend) {
        userList.push(friend);
        listFriend(friend);

    });
    socket.on('group info', function(group) {
        groupList.push(group);
        listGroup(group);

    })
    socket.on('new user online', function(message) {

        onlineFriends.push(message.sender); //add friend's username to onlineFriends
        var friend = getPersonalInfo(message.sender);
        var name = friend.profile.first_name + ' ' + friend.profile.last_name;
        $('#' + friend.username + 'Div').find('.circle-offline').attr('class', 'circle-online');
        var content = name + ' is online now'
        popupOnlineNotice(content);
        var online = true;
        changeOnlineStatus(message.sender, online);
        if (interlocutor === message.sender) { //if online user is interlocutor, enable video and phone chat
            $('.video').css('pointer-events', 'auto');
            $('.phone').css('pointer-events', 'auto');
        }

    });
    socket.on('user offline', function(username) {

        $('#' + username + 'Div').find('.circle-online').attr('class', 'circle-offline');
        if (videoChater === username) {
            deleteMedia();
        }
        var index = onlineFriends.indexOf(username);
        if (index > -1) {
            onlineFriends.splice(index, 1);
        }
        var online = false;
        changeOnlineStatus(username, online);
        if (interlocutor === username) { //if the offline user is interlocutor, disable phone and video chat
            $('.snapshot').css('pointer-events', 'none');
            $('.video').css('pointer-events', 'none');
            $('.phone').css('pointer-events', 'none');
        }
    });
    socket.on('renew avatar', function(avatar) {
        $('#personalAvatar').attr('src', avatar);
        user.profile.avatar = avatar;
    });
    socket.on('update avatar', function(message) {
        var senderUsername = message.sender;
        var gender = message.gender;
        var friendName = message.name;
        var thirdPerson = gender === 'Male' ? 'his' : 'her';
        $('#' + senderUsername + 'Div').find('img').attr('src', message.avatar);
        var content = friendName + ' has changed ' + thirdPerson + ' avatar';
        for (var i = 0; i < userList.length; i++) {
            if (userList[i].username === senderUsername) {
                userList[i].profile.avatar = message.avatar;
            }
        }
        if (interlocutor === senderUsername) {
            $('.friend-img').attr('src', message.avatar);
        }
        popupOnlineNotice(content);
    });
    socket.on('be a friend request', function(message) {
        var popupRequest = $('<div class="popup-request"></div>');
        var inviter = $('<div class = "inviter"></div>');
        inviter.html(message.inviter);
        popupRequest.append(inviter);
        var contentDiv = $('<div class = "request-content"></div>');
        popupRequest.append(contentDiv);
        var content = $('<h5></h5>');
        content.html(message.inviterName + ' wants to establish a connection with you.');
        contentDiv.append(content);
        var acceptDiv = $('<div class = "accept-request"><button id = "acceptRequest" class = "btn btn-success">Accept</button></div>');
        popupRequest.append(acceptDiv);
        var rejectDiv = $('<div class = "reject-request"><button id="rejectRequest" class = "btn btn-warning">Reject</button></div>');
        popupRequest.append(rejectDiv);

        $('body').append(popupRequest);
    });
    socket.on('new connection', function(connection) {
        userList.push(connection.newPeople);
        listFriend(connection.newPeople);
        var connectionName = connection.newPeople.profile.first_name + ' ' + connection.newPeople.profile.last_name;
        if (!connection.inviter)
            popupOnlineNotice("You established a new connection with " + connectionName + ' successfully')
        else popupOnlineNotice(connectionName + " has accepted your request. Now you have a new connection with " + connectionName)
    });
    socket.on('new offline conection', function(connection) {
        var connectionName = connection.newPeople.profile.first_name + ' ' + connection.newPeople.profile.last_name;
        popupOnlineNotice(connectionName + " has accepted your request. Now you have a new connection with " + connectionName);
    })
    socket.on('request is rejected', function(message) { //the request of adding new contact is rejected
        var invitee = message.invitee;
        popupOnlineNotice(invitee + 'has rejected your request');
    });
    socket.on('reject request successfully', function(message) {
        var inviterName = message.inviterName;
        popupOnlineNotice('you rejected the request from ' + inviterName + ' successfully');
    })
    socket.on('new message', function(message) {
        $('.friend-bar span').html('');
        saveReceiveRecord(message);
        displayReceiveMessage(message);
        playSound('sound/your-turn.mp3');

    });
    socket.on('new group message', function(message) {
        savePublicReceiveRecord(message);
        displayPublicReceiveMsg(message);
        playSound('sound/your-turn.mp3');
    })
    socket.on('typing', function(message) {
        //var receiver = getPersonalInfo(message.receiver);
        if (message.sender === interlocutor) {
            $('.friend-bar span').html('typing');
        }

    });
    socket.on('send file successfully', function(newMessage) {

        saveSendRecord(newMessage);
        if (newMessage.receiver === interlocutor) {
            displaySendMessage(newMessage);
        }

        sendFileQty++;
        var uploadFileList = $('.file-upload-status').find('li');
        if (uploadFileList.length === sendFileQty) {
            $('.file-upload-status').remove();
            if (toggleFloatInput) $('#fileAttachement2').css('pointer-events', 'auto')
            else $('#fileAttachement').css('pointer-events', 'auto')
            newFileUploadAvailable = true;
            sendFileQty = 0;
        }
    });
    socket.on('send group file successfully', function(newMessage) {
        savePublicSendRecord(newMessage);
        if (newMessage.group === currentGroup) {
            displaySendMessage(newMessage);
        }
        sendFileQty++;
        var uploadFileList = $('.file-upload-status').find('li');
        if (uploadFileList.length === sendFileQty) {
            $('.file-upload-status').remove();
            if (toggleFloatInput) $('#fileAttachement2').css('pointer-events', 'auto');
            else $('#fileAttachement').css('pointer-events', 'auto');
            newFileUploadAvailable = true;
            sendFileQty = 0;
        }
    })
    socket.on('request media chat', function(message) {
        var senderUsername = message.sender;
        useVideo = message.useVideo;

        var sender = getPersonalInfo(senderUsername);
        var requestVideoChat = $('<div class = "request-media-chat"></div>');
        var info = $('<h4></h4>');
        if (useVideo) info.html(sender.profile.first_name + ' ' + sender.profile.last_name + ' sent a video chat request to you');
        else info.html(sender.profile.first_name + ' ' + sender.profile.last_name + ' sent an audio chat request to you');
        requestVideoChat.append(info);
        acceptBtn = $('<button id = "accept">Accept</button>');
        rejectBtn = $('<button id = "decline">Decline</button>');
        requestVideoChat.append(acceptBtn);
        requestVideoChat.append(rejectBtn);
        var chaterDiv = $('<div id = "chater" class = "hide"></div>');
        chaterDiv.html(message.sender);
        requestVideoChat.append(chaterDiv);
        requestVideoChat.appendTo('body');
        playSound('sound/your-turn.mp3');

    });
    socket.on('request decline', function(message) {
        $('.media-popup').remove();
        // stream.getTracks().forEach(track => track.stop());
        navigator.getMedia({ audio: useAudio, video: useVideo },
            function(stream) {
                var track = stream.getTracks()[0];
                track.stop();
            }, onError
        )
        localMediaStream = null;
        var sender = getPersonalInfo(message.sender);
        var senderName = sender.profile.first_name + ' ' + sender.profile.last_name;
        $.Zebra_Dialog('Your request was declined by ' + senderName, {
            type: 'Information',
            title: 'Information',
            buttons: [{ caption: 'OK' }]
        });
        $('.video').css('pointer-events', 'auto');
        $('.phone').css('pointer-events', 'auto');

        playSound('sound/your-turn.mp3');
        useVideo = false;
    });
    socket.on('add peer', function(message) {

        var peerId = message.peerId;
        if (message.useVideo) {
            videoChater = peerId;
            audioChater = null;
        } else {
            audioChater = peerId;
            videoChater = null;
        }

        myConnection = new RTCPeerConnection({
            "iceServers": ICE_SERVERS
        }, {
            "optional": [{
                "DtlsSrtpKeyAgreement": true
            }]
        });
        peers[peerId] = myConnection;
        myConnection.onicecandidate = function(event) {

            if (event.candidate) {
                socket.emit('iceCanadiate', {
                    peerId: user.username,
                    receiver: message.peerId,
                    ice_candidate: {
                        'sdpMLineIndex': event.candidate.sdpMLineIndex,
                        'candidate': event.candidate.candidate
                    }
                });
            } else {
                console.log('ice finish');
            }
        }

        myConnection.onaddstream = function(event) {
            var remoteMedia;
            var remoteMediaDiv = $('<div class="remote-media"></div>');
            if (!useVideo) {
                var person = getPersonalInfo(audioChater);
                var remoteProfile = $('<img>');
                remoteProfile.attr('src', person.profile.avatar);
                var remoteProfileDiv = $('<div class = "remote-profile-div"></div>')
                remoteProfileDiv.append(remoteProfile);
                remoteMediaDiv.append(remoteProfileDiv);
                remoteMedia = $('<audio></audio>');
            } else remoteMedia = $('<video id="remoteVideo"  width="auto" height = "240px" autoplay = "autoplay"></video>');

            remoteMediaDiv.append(remoteMedia);
            $('.media-popup').append(remoteMediaDiv);
            // attachMediaStream(remoteMedia[0], event.stream);
            if (videoChater === interlocutor) {
                $('.snapshot').css('pointer-events', 'auto');
            }
            var src = window.URL.createObjectURL(event.stream);
            if (MUTE_AUDIO_BY_DEFAULT) {
                remoteMedia.attr("muted", "true");
            }
            remoteMedia.attr('autoplay', 'autoplay');
            remoteMedia.attr('src', src);
            // remoteMedia.srcObject = event.stream;
            remoteMedia.attr("controls", "");
            peerMediaStreams[peerId] = remoteMedia;

        };
        myConnection.addStream(localMediaStream);
        if (message.offer) {
            myConnection.createOffer(
                function(local_description) {
                    myConnection.setLocalDescription(local_description,
                        function() {
                            socket.emit('offer', {
                                peerId: user.username,
                                receiver: message.peerId,
                                offer: local_description
                            });

                        },
                        onError
                    );
                },
                onError, mediaConstraints);
        }

    });
    socket.on('offer', function(message) {

        var peerId = message.peerId;
        var remote_description = message.offer;
        var desc = new RTCSessionDescription(remote_description);
        var peer = peers[peerId];

        var stuff = peer.setRemoteDescription(desc,
            function() {

                peer.createAnswer(
                    function(local_description) {

                        peer.setLocalDescription(local_description,
                            function() {
                                socket.emit('answer', {
                                    'peerId': user.username,
                                    'receiver': peerId,
                                    'answer': local_description
                                });

                            },
                            function() {
                                Alert("Answer setLocalDescription failed!");
                            }
                        );
                    },
                    function(error) {
                        console.log("Error creating answer: ", error);

                    }, mediaConstraints);

            },
            function(error) {
                console.log("setRemoteDescription error: ", error);
            }
        );
    });
    socket.on('answer', function(message) {

        var peerId = message.peerId;
        var peer = peers[peerId]
        var remote_description = message.answer;
        peer.setRemoteDescription(new RTCSessionDescription(remote_description));

    });
    socket.on('iceCanadiate', function(message) {

        var candidate = new RTCIceCandidate(message.ice_candidate);
        peer = peers[message.peerId];
        peer.addIceCandidate(candidate);

    });
    socket.on('remove group', function(group) {
        deleteGroup(group);
    });
    socket.on('group was removed', function(message) {
        popupOnlineNotice('Group ' + message.groupName + ' has been removed by its owner, so you are no longer a member of this group');
    });
    socket.on('remove friend successfully', function(contacter) {
        var passive = false;
        removeFriend(contacter, passive);
    });
    socket.on('remove friend please', function(contacter) {
        var passive = true;
        removeFriend(contacter, passive);
    });
    socket.on('no group', function() {
        $.Zebra_Dialog('No group can be found', {
            type: 'error',
            title: 'Group Search Error',
        })
    });
    socket.on('new group', function(group) {
        var isNewGroup = true;

        //check if this group is new or not
        for (var i = 0; i < groupList.length; i++) {
            if (groupList[i].name === group.name) {
                console.log(groupList[i].name)
                groupList[i].avatar = group.avatar;
                isNewGroup = false;
                break;
            }
        }

        if (isNewGroup) {
            groupList.push(group);
            listGroup(group);
            if (group.owner != user.username) {
                popupOnlineNotice('You join group ' + group.name + ' successfully');
            } else popupOnlineNotice('You create group ' + group.name + ' successfully');
        } else {
            var targetName = group.name.replace(/\s/g, '');
            $('#' + targetName + 'Div').find('img').attr('src', group.avatar);
            if (group.owner != user.username) {
                popupOnlineNotice('The avatar of ' + group.name + ' was updated');
            } else popupOnlineNotice('You update the avatar of ' + group.name + ' successfully');
        }
    });
    socket.on('update group', function(group) {
        for (var x in groupList) {
            if (groupList[x].name === group.name) {
                groupList[x].members = group.members;
            }
        }
    })
    socket.on('group result', function(group) {
        $('.total').remove();
        displayGroupInfo(group);
    });
    socket.on('invite joining group', function(message) {
        //find if user has join this group, if yes return

        for (var i = 0; i < groupList.length; i++) {
            if (groupList[i].name === message.groupName) return;
        }
        var person = getPersonalInfo(message.inviter);
        var inviterName = person.profile.first_name + ' ' + person.profile.last_name;
        var name = message.groupName.replace(/\"/g, "");
        var popupRequest = $('<div class="popup-request"></div>');
        var group = $('<div class = "invite-group"></div>');
        group.html(name);
        popupRequest.append(group);
        var contentDiv = $('<div class = "request-content"></div>');
        popupRequest.append(contentDiv);
        var content = $('<h5></h5>');
        content.html(inviterName + ' invites you to join the group ' + message.groupName);
        contentDiv.append(content);
        var acceptDiv = $('<div class = "accept-request"><button id = "acceptGroupRequest" class = "btn btn-success">Accept</button></div>');
        popupRequest.append(acceptDiv);
        var rejectDiv = $('<div class = "reject-request"><button id="rejectGroupRequest" class = "btn btn-warning">Decline</button></div>');
        popupRequest.append(rejectDiv);
        $('body').append(popupRequest);
    });
    socket.on('be a member already', function(group) {
        popupOnlineNotice('You are already a member of ' + group);
    })
    socket.on('disconnect media', function(message) {
        console.log('disconnect media');
        deleteMedia();
    });

    //$("#user").focus();
    $('#user').on('click', function() {
        $('#contactDiv').attr('class', 'contact');
        $('#groupDiv').attr('class', 'hide');
        $('#chatWindow').attr('class', 'hide');
        currentGroup = null;
    });
    $('#group').on('click', function() {
        $('#contactDiv').attr('class', 'hide');
        $('#groupDiv').attr('class', 'group');
        $('#chatWindow').attr('class', 'hide');
        interlocutor = null;
    });
    $('#txtInput2').on('click', function(e) {
        e.preventDefault();
        searchGroupWindow();
    });
    $('.create-group a').on('click', createGroup);
    $('.invite-to-group a').on('click', function() {
        var ownerGroups = getOwnerGroups();
        if (!ownerGroups.length) {
            $.Zebra_Dialog('To invite someone to join your groups, you must be an owner of at least one group', {
                type: 'error',
                title: 'Error Information'
            })
        } else {
            var groupsDiv = $('<div class = "groups"></div>');
            var closeDiv = $('<div class = "groups-close"><i class = "fa fa-times"></i></div>');
            groupsDiv.append(closeDiv);
            var p = $('<p>Please select a group</p>');
            groupsDiv.append(p);
            var form = $('<form id = "groupOption" action = ""></form>');
            groupsDiv.append(form);
            var next = $('<div class = "next"><button class = "btn btn-primary">Next</button></div>');
            groupsDiv.append(next);
            var total = $('<div class = "total"></div>');
            total.append(groupsDiv);
            total.appendTo('body');
            for (var i = 0; i < ownerGroups.length; i++) {
                var check = $('<input type="radio" name = "group" value = "' + ownerGroups[i].name + '" >' + ownerGroups[i].name + '</input>');
                check.attr('id', ownerGroups[i].name);
                $('#groupOption').append(check);
                $('#groupOption').append('<br>');
            }
        }
    });
    $('.remove-group a').on('click', removeGroup);

    $("#avatarUpload").on("click", uploadAvatar);
    $("#profile").on("click", editProfile);
    $('#friendProfile').on("click", function() {
        if (interlocutor != null) {
            var person = getPersonalInfo(interlocutor);
            uploadProfile(person);
        } else {
            var info = {
                username: user.username,
                name: currentGroup
            }
            socket.emit('get group info', info);
        }

    });
    $('#messageSend').on("click", function(e) {
        e.preventDefault();
        var inputField = $('#message').val();
        sendMessage(inputField);
        $('#message').val('');
    });
    $('#messageSend2').on("click", function(e) {
        e.preventDefault();
        var inputField = $('#textarea').html().replace(/\n/g, '<br/>');
        sendMessage(inputField);
        $('#textarea').html('');
    });
    $('#noteMsg').on('click', showNote);


    $('#imageSelect').on('click', function(e) {

        e.preventDefault();
        if (interlocutor != null) {
            var online = checkIfUserOnline(interlocutor) //check if interlocutor is online
            if (online) selectImage()
            else $.Zebra_Dialog('This user is offline, please use file attachement to send image', {
                type: 'error',
                title: 'Send Image Error',
                buttons: ['OK']
            });
        } else {
            selectImage();
        }
    });
    $('#imageSelect2').on('click', function(e) {
        e.preventDefault();
        if (interlocutor != null) {
            var online = checkIfUserOnline(interlocutor) //check if interlocutor is online
            if (online) selectImage()
            else $.Zebra_Dialog('This user is offline, please use file attachement to send image', {
                type: 'error',
                title: 'Send Image Error',
                buttons: ['OK']
            });
        } else {
            selectImage();
        }
    });

    $('#fileAttachement').on('click', function(e) {
        e.preventDefault();
        attachFile();
    });
    $('#fileAttachement2').on('click', function(e) {
        e.preventDefault();
        attachFile();
    });
    $('.video').on('click', function() {
        useVideo = true;
        startMediaChat();
    });
    $('.phone').on('click', function() {
        useVideo = false;
        startMediaChat();
    });
    $('.snapshot').on('click', takeSnapshot);
    $('#message').keyup(function() {
        var message = {
            sender: user.username,
            receiver: interlocutor
        }
        socket.emit('typing', message);
    });
    $('#txtInput').on('click', function(e) {
        e.preventDefault();
        popupSearch();
    });
    $('.drop-menu li a').on('click', function(e) {
        var filter = $(this).parent().attr('id');
        $('.droplist tab1').html(filter);
        filterContacts(filter);
    });
    $('#chatWrapper').on('scroll', function() {
        scrolled = true;
    });
    $('#message').on('contextmenu', function(e) {
        if (!newFileUploadAvailable) return; //if files are uploading, do nothing
        e.preventDefault();
        $('#largeInputPanel').attr('class', 'large-input-panel');
        $('#message').prop('disabled', true);
        $('#emoji1').css('pointer-events', 'none');
        $('#imageSelect').css('pointer-events', 'none');
        $('#fileAttachement').css('pointer-events', 'none');
        $('#messageSend').css('pointer-events', 'none');
        toggleFloatInput = true;
    });
    $('#emoji1').on('click', function(e) {
        e.preventDefault();
        $('#message').emojiPicker('toggle');
    });
    $('#emoji2').on('click', function(e) {
        e.preventDefault();
        $('#textarea').emojiPicker('toggle');
    });

    $('.input-header').on('mousedown', function(e) {
        e.preventDefault();
        $(this).css("cursor", "move"); //change mouse shape
        var offset = $(this).offset(); //get the position of div 
        var x = e.pageX - offset.left; //get the distance between mouse and the left of div
        var y = e.pageY - offset.top; //get the distance between mouse and the top of div 
        $(document).bind("mousemove", function(ev) { //bind the mouse move event

            $(".large-input-panel").stop();
            var _x = ev.pageX - x; //get the move offset value in x axis 
            var _y = ev.pageY - y; //get the move offset value in y axis

            $(".large-input-panel").animate({ left: _x + "px", top: _y + "px" }, 10);
        });
        $(document).mouseup(function() {
            $(".large-input-panel").css("cursor", "default");
            $(this).unbind("mousemove");
        });
    });
    $('.input-header .fa-times').on('click', function() {
        if (!newFileUploadAvailable) return; //if files are uploading, do nothing
        $('#message').prop('disabled', false);
        $('#emoji1').css('pointer-events', 'auto');
        $('#imageSelect').css('pointer-events', 'auto');
        $('#fileAttachement').css('pointer-events', 'auto');
        $('#messageSend').css('pointer-events', 'auto');
        $('#largeInputPanel').attr('class', 'hide');
        toggleFloatInput = false;
    });
    $('.input-header .fa-times').on('mousemove', function() {
        $(this).css("cursor", "pointer");
        $(this).css("color", "yellow");
    });
    $('.input-header .fa-times').on('mouseleave', function() {
        $(this).css("color", "white");
    });


    /* Chat History */

    $('.history').on('click', function(e) {
        e.preventDefault();
        $('#historyList').empty();
        oldHistoryDate = null;
        var insertData = false;
        if (interlocutor != null) {
            var person = getPersonalInfo(interlocutor);
            readPrivateChatHistory(interlocutor, function(result) {
                if (result != null) {
                    currentReadId = result.length - 1;
                    getTenRecords(result, function(records) {
                        //console.log(records);
                        displayPrivateChatHistory(interlocutor, records, insertData);
                    })
                } else {
                    var person = getPersonalInfo(interlocutor);
                    $('.history-chatter').html(person.profile.first_name + ' ' + person.profile.last_name);
                    $('#historyList').append('<li class = "no-data">No Data</li>');
                    $('#chatHistory').show();
                }
            })
        } else {
            var group = getGroupInfo(currentGroup);
            readPublicChatHistory(currentGroup, function(result) {
                if (result != null) {
                    currentReadId = result.length - 1;
                    getTenRecords(result, function(records) {
                        console.log(records);
                        displayPublicChatHistory(currentGroup, records, insertData);
                    })
                } else {

                    $('.history-chatter').html(currentGroup);
                    $('#historyList').append('<li class = "no-data">No Data</li>');
                    $('#chatHistory').show();
                }
            })
        }
    });
    $('.display-bar').on('mousedown', function(e) {
        e.preventDefault();
        mousedown = true;
    });
    $('.display-bar').on('mousemove', function(e) {
        if (mousedown) {
            pauseEvent(e);
        }
    });
    $('.chat-history').on('mousedown', function(e) {
        $(this).css("cursor", "move"); //change mouse shape
        var offset = $(this).offset(); //get the position of div 
        var x = e.pageX - offset.left; //get the distance between mouse and the left of div
        var y = e.pageY - offset.top; //get the distance between mouse and the top of div 
        $(document).bind("mousemove", function(ev) { //bind the mouse move event

            $(".chat-history").stop();
            var _x = ev.pageX - x; //get the move offset value in x axis 
            var _y = ev.pageY - y; //get the move offset value in y axis

            $(".chat-history").animate({ left: _x + "px", top: _y + "px" }, 10);
        });
        $(document).mouseup(function() {
            $(".chat-history").css("cursor", "default");
            $(this).unbind("mousemove");
        });
    })
    $('.chat-history-bar').on('mousedown', function(e) {
        $(this).css("cursor", "move"); //change mouse shape
        var offset = $(this).offset(); //get the position of div 
        var x = e.pageX - offset.left; //get the distance between mouse and the left of div
        var y = e.pageY - offset.top; //get the distance between mouse and the top of div 
        $(document).bind("mousemove", function(ev) { //bind the mouse move event

            $(".chat-history").stop();
            var _x = ev.pageX - x; //get the move offset value in x axis 
            var _y = ev.pageY - y; //get the move offset value in y axis

            $(".chat-history").animate({ left: _x + "px", top: _y + "px" }, 10);
        });
        $(document).mouseup(function() {
            $(".chat-history").css("cursor", "default");
            $(this).unbind("mousemove");
        });

    });
    $('.chat-history-tool i').on('mousemove', function() {
        $(this).css("cursor", "pointer");
        $(this).css("color", "yellow");
    });
    $('.chat-history-tool i').on('mouseleave', function() {
        $(this).css("color", "white");
    });
    $('.chat-history-tool .fa-power-off').on('click', function() {
        //$('#historyList').empty();
        $('#chatHistory').hide();
        currentReadId = null;
        oldHistoryDate = null;
    });
    $('.chat-history-tool .fa-file-text-o').on('click', function() {
        var element = document.getElementById('chatListDiv');
        if ((element.scrollTop + element.clientHeight) < (element.scrollHeight - element.clientHeight)) {
            element.scrollTop += element.clientHeight
        } else
            element.scrollTop = element.scrollHeight - element.clientHeight;
    });
    $('.chat-history-tool .fa-plus').on('click', function(e) {
        e.preventDefault();
        if (currentReadId >= 0) {
            var insertData = true;
            if (interlocutor != null) {
                readPrivateChatHistory(interlocutor, function(result) {
                    if (result != null) {
                        getTenRecords(result, function(data) {
                            var cacheData = [];
                            for (var i = data.length - 1; i >= 0; i--) {
                                cacheData.push(data[i]);
                            }
                            displayPrivateChatHistory(interlocutor, cacheData, insertData);
                        })
                    }
                })
            } else {
                readPublicChatHistory(currentGroup, function(result) {
                    if (result != null) {
                        getTenRecords(result, function(data) {
                            var cacheData = [];
                            for (var i = data.length - 1; i >= 0; i--) {
                                cacheData.push(data[i]);
                            }
                            displayPublicChatHistory(currentGroup, cacheData, insertData);
                        })
                    }
                })
            }
        } else {
            $('#historyList li:eq(0)').before('<li class = "data-end">----------End----------</li>');
        }
    });
});

/* context menu on message*/

$('body').on('click', '#liLink', function(e) {
    e.preventDefault();
    var url = $(this).attr('href');
    window.open(url, "_blank");
    $(this).parent().remove();
});
$('body').on('contextmenu', '.chat-list li img', function(e) {
    e.preventDefault();

    var link = $(this).attr('src');
    var contextmenu = $('<div id = "liContext"></div>');
    var linkElement = $('<a id = "liLink" >Open</a>');
    contextmenu.append(linkElement);
    linkElement.attr('href', link);
    $(this).parent().append(contextmenu);
    $('#liContext').css({
        display: "block",
        position: fixed,
        left: e.pageX,
        top: e.pageY
    });
});

/* Highlight text right click function */
var selectedText = null;
$('body').on('contextmenu', '.chat-content', function(e) {
    e.preventDefault();
    if ($('#liContextMenu') != null) $('#liContextMenu').remove();
    var linkElement = null;
    var contextDiv = null;
    selectedText = window.getSelection().toString();
    if (e.target.tagName.toLowerCase() === 'a') {
        var link = $(e.target).attr('href');
        console.log(link)
        linkElement = $('<a  id = "liLink" class = "open-link">Open</a>');
        linkElement.attr('href', link);
    }
    if (selectedText.length === 0) {
        if (linkElement != null) {
            contextDiv = $('<div id = "liContextMenu" class = "li-contextmenu"></div>');
            contextDiv.append(linkElement);
        } else return;
    } else {
        contextDiv = $('<div id = "liContextMenu" class = "li-contextmenu"><a  href= "#" class = "text-copy">Copy</a><a href = "#" class = "text-search">Search</a></div>');
        if (linkElement != null) contextDiv.append(linkElement);
    }
    $(e.target).parent().append(contextDiv);
    $('#liContextMenu').css({
        position: 'fixed',
        display: "block",
        top: e.pageY,
        left: e.pageX
    });

});
$('body').on('mousemove', '.li-contextmenu', function() {
    $('.arrowup').css('border-bottom-color', '#666');
});
$('body').on('mouseleave', '.li-contextmenu', function() {
    $('.arrowup').css('border-bottom-color', '#222');
})
$('#chatWrapper').on('click', '.text-copy', function(e) {
    e.preventDefault();
    var copied;
    if (selectedText != null) {
        try {
            // Copy the text
            copied = document.execCommand('copy');

        } catch (ex) {
            copied = false;
        }
        if (copied) selectedText = null;
        copied = false;
    }
    $('.li-contextmenu').remove();
});
$('#chatWrapper').on('click', '.text-search', function(e) {
        e.preventDefault;
        if (selectedText != null) {
            window.open('https://www.google.ca/search?q=' + selectedText);
        }
    })
    //remove liContextMenu menu if clicking any other element but liContextMenu 
$(document).on('click', 'body', function(e) {
    if (e.target.id != 'liContextMenu' && selectedText != null) {
        $('.li-contextmenu').remove();
        selectedText = null;
    }
    if (e.target.id != '#textarea') {
        if ($('#inputContextMenu') != null) $('#inputContextMenu').remove();
    }
});

/* group list left click event */

$('body').on('click', '.group-info a', function() {

    currentGroup = $(this).attr('id');
    $('.friend-bar span').html('');
    $('#chatList').empty(); //clear chat list

    for (var x in groupList) {
        if (groupList[x].name === currentGroup) {

            $('.friend-img').attr('src', groupList[x].avatar);
            $('#friendName').html(groupList[x].name);
            $('#chatWindow').attr('class', 'chat-window');
            $('#chatWindow').show();
            $('.snapshot').css('pointer-events', 'none');
            $('.video').css('pointer-events', 'none');
            $('.phone').css('pointer-events', 'none');

            for (var i in publicMessageList) {

                if (publicMessageList[i].group === currentGroup) {

                    for (var m in publicMessageList[i].message) {

                        var chatItem, chatDiv, symbol;
                        var sentByMe = publicMessageList[i].message[m].sender === user.username;
                        var currentMessage = publicMessageList[i].message[m];
                        if (!sentByMe) displayPublicReceiveMsg(currentMessage);
                        else displaySendMessage(currentMessage);
                    }

                    count = parseInt(count) - parseInt(publicMessageList[i].count);
                    publicMessageList[i].count = 0;
                    //clear the current group messages in notification
                    $('#' + currentGroup.replace(/\s/g, '') + 'Div').find('.new-message').html('');
                    $('#' + currentGroup.replace(/\s/g, '') + 'Div').find('.latest-message').html('');
                    if (count <= 0) {
                        $('#noteMsg').css('color', 'lightgray');
                        $('#notificationCount').html('');
                    } else {
                        $('#notificationCount').html(count);
                    }
                    notificationList = notificationList.filter(function(item) {
                        return item.group != currentGroup; //clear current group's notices
                    })
                }
            }
            return;
        }
    }
});

/* create group events */
$('body').on('click', '.confirm-create-group .btn-success', function() {
    var newGroupName = $('#groupName').val();
    $('#error-message').attr('class', 'hide');
    var info = {
        owner: user.username,
        groupName: newGroupName
    }
    $('.total').remove();
    socket.emit('new group', info, function(result) {
        if (result != 'success') {
            $.Zebra_Dialog('This group already exists', {
                type: 'error',
                title: 'Group Create Error'
            })
        } else {
            selectGroupAvatar(newGroupName);
        }
    })
});
$('body').on('click', '.cancel-create-group .btn-danger', function() {
    $('.total').remove();
});
//upload group avatar
$('body').on('click', '.confirm-group-avatar .btn-success', function() {
    var groupName = $('#groupName').html();
    basic.croppie('result', {
        type: 'canvas',
        size: 'viewport'
    }).then(function(data) {
        if (!$('#groupAvatar').val()) {
            $('#error-message').html('You did not select a file');
            $('#error-message').attr('class', 'error-message');
            return;
        }
        var message = {
            sender: user.username,
            groupName: groupName,
            avatar: data
        }
        $('.total').remove();
        socket.emit('update group avatar', message);

    });

});
$('body').on('click', '.group-info .group-img', function(e) {
    e.preventDefault();
    var groupName = $(this).siblings().find('.full-name').find('a').html();
    var group = getGroupInfo(groupName);
    if (group.owner === user.username) {

        selectGroupAvatar(groupName);
    }
});

$('body').on('click', '.cancel-group-avatar .btn-danger a', function(e) {
    e.preventDefault();
    var groupName = $('#groupName').html();
    var isNewGroup = true;
    for (var i = 0; i < groupList.length; i++) {
        if (groupList[i].name === groupName) {
            isNewGroup = false;
            break;
        }
    }
    if (isNewGroup) {
        var info = {
            sender: user.username,
            groupName: groupName
        }
        socket.emit('new group without avatar', info);
    }
    $('.total').remove();
});

/* remove group events */
$('body').on('click', '.remove-group-confirm .btn-danger', function(e) {
    e.preventDefault();
    var targetGroup = $('input[name = "group"]:checked').attr('id').replace(/\"/g, "");
    var info = {
        owner: user.username,
        groupName: targetGroup
    };
    socket.emit('remove group', info);
    $('.total').remove();

});


/* search group events */

$('body').on('keyup', '#groupInput', function(e) {
    e.preventDefault();
    var input = $(this).val().toUpperCase();
    if (!input.length) {
        $("#listResult").empty();
        return;
    } else {
        $("#listResult").empty();
        var query = {
            sender: user.username,
            name: input
        }

        socket.emit('search group', query, function(data) {

            for (var i = 0; i < data.length; i++) {
                $("#listResult").append('<li>' + data[i] + '</li>');

            }
        });
    }
});
$('body').on('click', '#listResult li', function() {
    $('#groupInput').val($(this).text());
});
$('body').on('click', '#searchGroup', function(e) {
    e.preventDefault();
    var input = $('#groupInput').val();
    var info = {
        name: input,
        username: user.username
    };
    if (!input.length) return;
    $('.total').remove();
    socket.emit('get group info', info);

});
$('body').on('click', '.member-count a', function(e) {
    var groupName = $('.group-name-info').html();

    var groupMembers = [];
    var unknownMembers = [];
    for (var i = 0; i < searchGroupResult.members.length; i++) {
        groupMembers.push(searchGroupResult.members[i]);
        unknownMembers.push(searchGroupResult.members[i]);
    }

    var groupMembersList = $('<div class = "group-members-list"></div>');
    var close = $('<div class = "groups-members-close"><i id = "closeGroupInfo" class = "fa fa-times"></i></div>');
    groupMembersList.append(close);

    var groupNameDiv = $('<div class = "group-member-groupName"></div>');
    groupNameDiv.html(groupName);
    groupMembersList.append(groupNameDiv);
    var membersDiv = $('<div class = "members-list"></div>');
    groupMembersList.append(membersDiv);
    $('.total').append(groupMembersList);

    var knownMembersInfo = [];
    var knownMembers = [];


    for (var i = 0; i < groupMembers.length; i++) {
        if (groupMembers[i] === user.username) {
            var index = i;
            unknownMembers.splice(index, 1);
            var personInfo = {
                username: user.username,
                name: user.profile.first_name + ' ' + user.profile.last_name,
                avatar: user.profile.avatar,
                relationship: 'Me',
                online: true
            }
            knownMembersInfo.push(personInfo);
            break;
        }
    }
    //get known members 
    for (var i = 0; i < groupMembers.length; i++) {
        for (var j = 0; j < userList.length; j++) {
            if (groupMembers[i] === userList[j].username) {
                knownMembers.push(groupMembers[i]);
            }
        }
    }

    // get unknown members
    for (var i = 0; i < knownMembers.length; i++) {
        for (var j = 0; j < unknownMembers.length; j++) {
            if (knownMembers[i] === unknownMembers[j]) {
                unknownMembers.splice(j, 1);
                break;
            }
        }
    }
    //get known members information
    for (let i = 0; i < knownMembers.length; i++) {
        var person = getPersonalInfo(knownMembers[i]);
        var personInfo = {
            username: person.username,
            name: person.profile.first_name + ' ' + person.profile.last_name,
            avatar: person.profile.avatar,
            relationship: person.class,
            online: person.online
        }
        knownMembersInfo.push(personInfo);
    }
    //list known members

    if ((typeof knownMembersInfo != 'undefine') && knownMembersInfo.length > 0) {
        for (var i = 0; i < knownMembersInfo.length; i++) {
            listMembers(knownMembersInfo[i])
        }
    }
    //get unknown members information
    if ((typeof unknownMembers != 'undefine') && unknownMembers.length > 0) {

        var info = {
            sender: user.username,
            unknownMembers: unknownMembers
        };
        socket.emit('getUnknownMembersInfo', info, function(membersInfo) {
            for (var i = 0; i < membersInfo.length; i++) {
                listMembers(membersInfo[i])
            }
        })
    }
});
$('body').on('click', '.leave button', function() {
    $('.total').remove();
    members = null; //release the memory of members
});
$('body').on('click', '.join button', function() {
    var groupName = $('.group-name-info').html();
    var info = {
        name: groupName,
        username: user.username
    }
    $('.total').remove();
    socket.emit('join group', info);
    members = null;
    playSound('sound/here-i-am.mp3');
});
$('body').on('click', '#closeGroupInfo', function() {
    $('.group-members-list').remove();
});
$('body').on('click', '.member-list-invite button', function() {
    var invitee = $(this).parent().parent().find('.member-list-username').html();
    var inviteeName = $(this).parent().parent().find('.member-list-name').html();
    $('.total').remove();
    invitePeople(invitee, inviteeName);
});

/* invite someone to group events */

$('body').on('click', '.groups-close .fa-times', function() {
    $('.total').remove();
});
$('body').on('click', '.next button', function(e) {
    e.preventDefault();
    var targetGroup = $('input[name = "group"]:checked').attr('id').replace(/\"/g, "");
    var groupInfo = getGroupInfo(targetGroup);
    $('.groups').remove();
    var selectUsersDiv = $('<div class = "select-users"></div>');
    var closeDiv = $('<div class = "groups-close"><i class = "fa fa-times"></i></div>');
    selectUsersDiv.append(closeDiv);
    var p = $('<p>group "' + targetGroup + '" is selected, Please select user(s)</p>');
    selectUsersDiv.append(p);
    var selectAll = $('<div class = "select-all"><input type="checkbox" name = "selectAll" value = "selectAll" onclick = "checkBoxToggle(this)" />Select All</div>');
    selectUsersDiv.append(selectAll);
    var multiSelect = $('<div class="multiselect"></div>');
    selectUsersDiv.append(multiSelect);
    var invite = $('<div class = "invite-users"><button class = "btn btn-success">Invite</button></div>');
    selectUsersDiv.append(invite);
    var selectGroup = $('<div class = "hide"></div>');
    selectGroup.html(targetGroup);
    selectUsersDiv.append(selectGroup);
    $('.total').append(selectUsersDiv);
    var candidates = [];
    var removeIndex = [];
    /* remove the users who have joined this group*/
    for (var i = 0; i < userList.length; i++) {
        candidates.push(userList[i].username);
    };

    for (let i = 0; i < groupInfo.members.length; i++) {
        for (var j = 0; j < candidates.length; j++) {
            if (groupInfo.members[i] === candidates[j]) {
                candidates.splice(j, 1)
            }
        }
    }
    for (let i = 0; i < candidates.length; i++) {
        var person = getPersonalInfo(candidates[i]);
        var name = person.profile.first_name + ' ' + person.profile.last_name;
        var option = $('<input type="checkbox" name="selectUser" value="' + candidates[i] + '" onclick ="toggleAll(this)" class = "checkBox"/>' + name + '<br>');
        $('.multiselect').append(option);
    }

});
$('body').on('click', '.invite-users button', function() {
    var targetGroup = $('.select-users .hide').html();
    var selectedUsers = [];
    var select = $('.checkBox:checked');
    for (var i = 0; i < select.length; i++) {
        selectedUsers.push(select[i].defaultValue);
    }

    var info = {
        sender: user.username,
        selectedUsers: selectedUsers,
        targetGroup: targetGroup
    }
    $('.total').remove();
    socket.emit('invite someone to group', info, function(result) {
        if (result) {
            var content = "You have send an invitation to " + selectedUsers.length + ' people';
        }
        popupOnlineNotice(content);

    })
});
$('body').on('click', '#acceptGroupRequest', function() {

    var group = $(this).parent().parent().find('.invite-group').html();
    var info = {
        name: group,
        username: user.username
    }
    socket.emit('join group', info);
    $(this).parent().parent().remove();
    //popupOnlineNotice('You select joining group ' + group);
});
$('body').on('click', '#rejectGroupRequest', function() {
    var group = $(this).parent().parent().find('.invite-group').html();
    $(this).parent().parent().remove();
    popupOnlineNotice('You decline to join the group ' + group);
});
/* group right click events*/
$('body').on('contextmenu', '.group-info a', function(e) {
    e.preventDefault();
    var selectedGroup = $(this).attr('id');
    $('#contextMenu2 .hide').html(selectedGroup);
    $('#contextMenu2').css({
        display: "block",
        left: e.pageX,
        top: e.pageY
    });
    var groupInfo = getGroupInfo(selectedGroup);
    if (user.username != groupInfo.owner) {
        $('#removeFromGroup').parent().show();
        $('#removeGroup').parent().hide();

    } else {
        $('#removeFromGroup').parent().hide();
        $('#removeGroup').parent().show();

    }
    return false;
});
$('#viewInfoGroup').on('click', function() {
    var groupName = $(this).parent().parent().parent().find('.hide').html();

    var info = {
        username: user.username,
        name: groupName
    }
    socket.emit('get group info', info);
});
$('#removeFromGroup').on('click', function() {
    var groupName = $(this).parent().parent().parent().find('.hide').html();

    var info = {
        username: user.username,
        groupName: groupName
    }

    socket.emit('withdraw from group', info);

    var name = groupName.replace(/\s/g, '');
    var divs = $('#' + name + 'Div');
    divs.remove();
    var index = groupList.indexOf(groupName);
    groupList.splice(index, 1);
    if (currentGroup === groupName) {
        $('#chatWindow').attr('class', 'hide');
        currentGroup = null;
    }
    popupOnlineNotice('You are withdrawn from group ' + groupName);

});
$('#removeGroup').on('click', function() {
    var groupName = $(this).parent().parent().parent().find('.hide').html();
    //check if user is the owner of this group
    for (var i = 0; i < groupList.length; i++) {
        if (groupList[i].name === groupName) {
            if (groupList[i].owner != user.username) $.Zebra_Dialog('You are not owner of this group, so you have no right to remove this group', {
                type: 'error',
                title: 'Remove Group Error'
            });
            else {
                var info = {
                    owner: user.username,
                    groupName: groupName
                };
                socket.emit('remove group', info);
                if (currentGroup === groupName) {
                    $('#chatWindow').attr('class', 'hide');
                    currentGroup = null;
                }
            }
        }
    }
});
//send image
$("body").on('click', '#submitImage', function(e) {
    e.preventDefault();
    if ($('#imageUpload').val() === "") return;
    var imageData = $('#targetImg').attr('src');
    if (imageData = null) return;
    $('.total').remove();
    var sendDate = new Date();
    var day = sendDate.getDate();
    var month = sendDate.getMonth() + 1;
    var year = sendDate.getFullYear();
    var hour = sendDate.getHours();
    var minute = sendDate.getMinutes();
    if (parseInt(minute) < 10) {
        minute = '0' + minute.toString();

    }
    //var findIt = false;
    if (interlocutor != null) {
        var newMessage = {
            type: 'image',
            sender: user.username,
            receiver: interlocutor,
            content: imageData,
            date: {
                year: year,
                month: month,
                day: day,
                hour: hour,
                minute: minute
            }
        };
        saveSendRecord(newMessage);
        socket.emit('send message', newMessage);
        displaySendMessage(newMessage);
    } else {
        if (currentGroup != null) {
            var newMessage = {
                type: 'image',
                sender: user.username,
                senderName: user.profile.first_name + ' ' + user.profile.last_name,
                group: currentGroup,
                content: imageData,
                date: {
                    year: year,
                    month: month,
                    day: day,
                    hour: hour,
                    minute: minute
                }
            };
            savePublicSendRecord(newMessage);
            displaySendMessage(newMessage);
            socket.emit('send group message', newMessage);
        }
    }
});
$("body").on('click', '#cancelSubmit', function() {
    $('.total').remove();
});
/* reply being a friend request events */

$('body').on('click', '#acceptRequest', function(e) {
    var inviter = $(this).parent().parent().find('.inviter').html();
    var sendDate = new Date();
    var day = sendDate.getDate();
    var month = sendDate.getMonth() + 1;
    var year = sendDate.getFullYear();
    var reply = {
        inviter: inviter,
        invitee: user.username,
        date: {
            year: year,
            month: month,
            day: day
        }
    }
    socket.emit('accept request', reply);
    //$('.popup-request').remove();
    $(this).parent().parent().remove();
});

$('body').on('click', '#rejectRequest', function(e) {
    var inviter = $(this).parent().parent().find('.inviter').html();
    var reply = {
        inviter: inviter,
        invitee: user.username
    }
    socket.emit('reject request', reply);
    $('.popup-request').remove();
});

/* search people events */

$('body').on('click', '.search-title .fa-times', function() {
    $('.total').remove();
});
$('body').on('click', '#searchFriend', function(e) {
    e.preventDefault();
    var target = $('#people').val();
    if (target === user.username) return;
    else {
        $('.search-function-bar').remove();
        socket.emit('search people', target, function(result) {
            if (!result) {
                $('.total').remove();
                $.Zebra_Dialog('Sorry, we can not find the people. Maybe the user name you typed is incorrect. Please try another user name', {
                    type: 'error',
                    title: 'find people error',
                    buttons: [{ caption: 'OK' }]
                })
            } else {
                //list the target information
                var peopleDiv = $('<div class = "search-people-result"></div>');
                var titleDiv = $('<h4></h4>');
                var title = 'Result we found with user name ' + target;
                titleDiv.html(title);
                peopleDiv.append(titleDiv);
                var targetDiv = $('<div class = "target-div"></div>');
                targetDiv.html(target);
                peopleDiv.append(targetDiv);
                var infoDiv = $('<div class= "people-info"></div>');
                peopleDiv.append(infoDiv);
                var avatar = $('<img class = "people-avatar" />');
                avatar.attr('src', result.avatar)
                infoDiv.append(avatar);
                var profileDiv = $('<div class = "people-profile"></div>');
                infoDiv.append(profileDiv);
                var nameDiv = $('<div class= "peopel-name"></div>');
                nameDiv.html(result.name);
                profileDiv.append(nameDiv);
                var genderDiv = $('<div class = "people-gender"></div>');
                genderDiv.html(result.gender)
                profileDiv.append(genderDiv);
                var locationDiv = $('<div class = "people-location"></div>');
                if (result.location != null) locationDiv.html(result.location)
                else locationDiv.html('location: unknown');
                profileDiv.append(locationDiv);
                var inviteDiv = $('<div class = "invite"><button id="invitePeople" class = "btn btn-success">Invite People</button></div>');
                var cancelDiv = $('<div class = "cancel-invite"><button id = "cancelInvite" class = "btn btn-warning">Cancel</button></div>');
                peopleDiv.append(inviteDiv);
                peopleDiv.append(cancelDiv);

                var totalDiv = $('<div class = "total"></div>');
                var maskDiv = $('<div class = ".frosted-glass" ></div>');
                maskDiv.append(peopleDiv);
                totalDiv.append(maskDiv);
                totalDiv.appendTo('body');

            }

        })
    }

});
$('body').on('click', '#invitePeople', function(e) {
    e.preventDefault();
    var inviteeName = $('.peopel-name').html();
    var invitee = $('.target-div').html();
    $('.total').remove();
    invitePeople(invitee, inviteeName);
})
$('body').on('click', '#cancelInvite', function() {
    $('.total').remove();
})

/*  close online notcie event*/

$('body').on('click', '.notice-close .fa-times', function(e) {
    $(this).parent().parent().remove();
});

/*  media chat events  */

//accept media chat request
$('body').on('click', '#accept', function() {
    var reply = {
        sender: user.username,
        receiver: $('#chater').html(),
        useVideo: useVideo
    }
    $('.request-media-chat').remove();
    if (videoChater != null || audioChater != null) { //if it is on video chat when receiving an incoming video chat request
        $('.media-popup').remove(); //at first, current video chat should be removed if accept button was clicked

        var receiver = videoChater != null ? videoChater : audioChater;
        var disconnectVideoChat = {
            sender: user.username,
            receiver: receiver
        }
        socket.emit('disconnect media', disconnectVideoChat);
        removeMedia(function(success) {
            if (!success) { //if the old video chat can not be removed, decline the incoming video chat request
                alert('system failed to disconnect current video chat');
                socket.emit('request decline', reply);
            }
        });
    }
    setupLocalMedia(function() { //  a new video chat will be created, initializeing camera and audio device
        socket.emit('receiver steam ok', reply);
        $('.video').css('pointer-events', 'none');
        $('.phone').css('pointer-events', 'none');

    });

});

// decline media chat request
$('body').on('click', '#decline', function() {
    var reply = {
        sender: user.username,
        receiver: $('#chater').html(),
        useVideo: useVideo
    }
    $('.request-media-chat').remove();
    socket.emit('request decline', reply);
});
$('body').on('click', '#min', function() {
    if (!minimize) {
        var winHeight = $(document).height();
        var top = winHeight - 40;
        $('.media-popup').animate({
            width: '650px',
            height: '40px',
            left: '0px',
            top: top + 'px'

        }, 200);
        $('.media-header').animate({
            width: ' 650px',
            height: '40px',
        }, 200);
        $('tab3').css('padding-left', '10em');
        $('tab3').css('padding-right', '5.5em');
        $('.local-media').hide();
        $('.remote-media').hide();
        minimize = true;
        maximize = false;
        $('#max').css('pointer-events', 'auto');
    } else {
        return;
    }
});
$('body').on('click', '#max', function() {
    if (!minimize && !maximize) {

        $('.media-popup').animate({
            width: '100%',
            height: '100%',
            left: '0px',
            top: '0px'
        }, 200);
        $('.local-media').animate({
            width: '49%',
            height: 'auto'
        }, 200);
        var width = $(document).width() / 2 - 10;
        $('#localVideo').attr('width', width + 'px');
        $('#localVideo').attr('height', 'auto');
        $('.remote-media').animate({
            width: '49%',
            height: 'auto'
        }, 200);
        $('#remoteVideo').attr('width', width + 'px');
        $('#remoteVideo').attr('height', 'auto');
        var distance = $(document).width() - 288;
        var paddingLeft = distance * 9 / 15.5;
        var paddingRight = distance * 6.5 / 15.5;
        $('tab3').css('padding-left', paddingLeft + 'px');
        $('tab3').css('padding-right', paddingRight + 'px');
        maximize = true;
        minimize = false;
    } else {
        $('.local-media').show();
        $('.remote-media').show();
        $('.media-popup').animate({
            width: '650px',
            height: '290px',
            left: '10px',
            top: '10px'
        }, 200);
        $('.local-media').animate({
            width: '320px',
            height: '240px'

        }, 200);
        $('.remote-media').animate({
            width: '320px',
            height: '240px'
        }, 200);
        $('#localVideo').attr('width', 'auto');
        $('#localVideo').attr('height', '240px');
        $('#remoteVideo').attr('width', 'auto');
        $('#remoteVideo').attr('height', '240px');
        $('tab3').css('padding-left', '10em');
        $('tab3').css('padding-right', '5.5em');
        maximize = false;
        minimize = false;
        if (audioChater != null) $('#max').css('pointer-events', 'none');
    }
});

//move media chat window
$('body').on('mousedown', '.media-header', function(e) {
    $(this).css("cursor", "move"); //change mouse shape
    var offset = $(this).offset(); //get the position of div 
    var x = e.pageX - offset.left; //get the distance between mouse and the left of div
    var y = e.pageY - offset.top; //get the distance between mouse and the top of div 
    $(document).bind("mousemove", function(ev) { //bind the mouse move event

        $(".media-popup").stop();

        var _x = ev.pageX - x; //get the move offset value in x axis 
        var _y = ev.pageY - y; //get the move offset value in y axis

        $(".media-popup").animate({ left: _x + "px", top: _y + "px" }, 10);
    });
    $(document).mouseup(function() {
        $(".media-popup").css("cursor", "default");
        $(this).unbind("mousemove");
    });
});
$('body').on('mousemove', '.media-title', function(e) {
    $(this).css("cursor", "pointer");
    $(this).css("color", "yellow");
});
$('body').on('mouseleave', '.media-title', function(e) {

    $(this).css("color", "dimgray");
});
$('body').on('click', '#disconnectVideo', function() {
    $.Zebra_Dialog('Do you want to end up this video chat?', {
        type: 'question',
        title: 'Question',
        buttons: [{
            caption: 'OK',
            callback: exitMediaChat
        }, { caption: 'Cancel' }]
    })
});

/* take snapshot events */

$('body').on('mouseover', '.closeSnapshot .fa-times', function() {
    $(this).css('cursor', 'pointer');
    $(this).css('color', 'yellow');
});
$('body').on('mouseleave', '.closeSnapshot .fa-times', function() {

    $(this).css('color', 'snow');
});
$('body').on('click', '.closeSnapshot .fa-times', function() {
    $(this).parent().parent().remove();
    snapImgOffset -= 10;
});

/* friend list left click event */

$('body').on('click', '.contacts-info a', function() {
    interlocutor = $(this).attr('id');
    $('.friend-bar span').html('');
    $('#chatList').empty(); //clear chat list

    for (var x in userList) {
        if (userList[x].username === interlocutor) {

            $('.friend-img').attr('src', userList[x].profile.avatar);
            $('#friendName').html(userList[x].profile.first_name + " " + userList[x].profile.last_name);
            $('#chatWindow').attr('class', 'chat-window');
            $('#chatWindow').show();
            if (!userList[x].online || audioChater != null) {

                $('.snapshot').css('pointer-events', 'none');
                $('.video').css('pointer-events', 'none');
                $('.phone').css('pointer-events', 'none');
            } else {
                if (videoChater != null && videoChater === interlocutor) {
                    $('.snapshot').css('pointer-events', 'auto');
                    $('.video').css('pointer-events', 'none');
                    $('.phone').css('pointer-events', 'none');
                } else if (videoChater != null && videoChater != interlocutor) {
                    $('.snapshot').css('pointer-events', 'none');
                    $('.video').css('pointer-events', 'none');
                    $('.phone').css('pointer-events', 'none');
                } else {

                    $('.snapshot').css('pointer-events', 'none');
                    $('.video').css('pointer-events', 'auto');
                    $('.phone').css('pointer-events', 'auto');
                }

            }
            for (var i in privateMessageList) {

                if (privateMessageList[i].friend === interlocutor) {

                    for (var m in privateMessageList[i].message) {

                        var chatItem, chatDiv, symbol;
                        var sentByFriend = privateMessageList[i].message[m].sender == interlocutor;
                        var currentMessage = privateMessageList[i].message[m];
                        if (sentByFriend) displayReceiveMessage(currentMessage);
                        else displaySendMessage(currentMessage);
                    }

                    count = parseInt(count) - parseInt(privateMessageList[i].count);
                    privateMessageList[i].count = 0;
                    //clear the interlocutor messages in notification
                    $('#' + interlocutor + 'Div').find('.new-message').html('');
                    $('#' + interlocutor + 'Div').find('.latest-message').html('');
                    if (count <= 0) {
                        $('#noteMsg').css('color', 'lightgray');
                        $('#notificationCount').html('');
                    } else {
                        $('#notificationCount').html(count);
                    }
                    notificationList = notificationList.filter(function(item) {
                        return item.sender != interlocutor; //clear interlocutor's notices
                    })
                }
            }
            return;
        }
    }
});

/* friend list right click event */
$('body').on('contextmenu', '.contacts-info a', function(e) {
    var contact = $(this).attr('id');
    $('#contextMenu .hide').html(contact);
    $('#contextMenu').css({
        display: "block",
        left: e.pageX,
        top: e.pageY
    });
    return false;
});

/* html click event*/
$('html').click(function() {
    $('#contextMenu').hide();
    $('#contextMenu2').hide();
    $('#contextMenuInput').hide();
    $('#liContext').remove();
    $('.li-contextmenu').remove();
});
/* relationship change events */
$('#changeRelationship').on('click', function() {
    var contacter = $(this).parent().parent().parent().find('.hide').html();
    var person = getPersonalInfo(contacter);
    var selectRelationDiv = $('<div class = "select-relation"></div>');
    var titleDiv = $('<div class = "relation-title-div"><i class = "fa fa-times"></i></div>');
    var targetDiv = $('<div class = "hide"></div>');
    targetDiv.html(contacter);
    selectRelationDiv.append(targetDiv);
    var title = $('<h5></h5>');
    var titleContent = 'Please select one of the following relationship for ';
    title.html(titleContent);
    var span = $('<span class = "relation-target"></span>');
    span.html(person.profile.first_name + ' ' + person.profile.last_name);
    title.append(span);
    selectRelationDiv.append(titleDiv);
    selectRelationDiv.append(title);

    var formDiv = $('<form></form>');
    selectRelationDiv.append(formDiv);
    var checkBox = $('<input type = "radio" name = "relationship" value = "family">Family</input>' + '<br>' +
        '<input type = "radio" name = "relationship" value = "friend">Friend</input>' + '<br>' +
        '<input type = "radio" name = "relationship" value = "classmate">Classmate</input>' + '<br>' +
        '<input type = "radio"  name = "relationship" value = "colleague">Colleague</input>' + '<br>' +
        '<input type = "radio"  name = "relationship" value = "business">Bussiness</input>');
    formDiv.append(checkBox);
    var confirmDiv = $('<div class = "confirm-relation"><button class = "btn btn-success">Confirm</button></div>');
    formDiv.append(confirmDiv);
    var totalDiv = $('<div class = "total"></div>');
    totalDiv.append(selectRelationDiv);
    totalDiv.appendTo('body');

});
$('body').on('click', '.relation-title-div .fa-times', function() {
    $('.total').remove();
});
$('body').on('click', '.profile-button button', function() {
    $('.total').remove();
})
$('body').on('click', '.confirm-relation button', function(e) {
    e.preventDefault();
    var target = $('.select-relation .hide').html();
    var relationship = $('input[name = "relationship"]:checked').val();

    var targetName = $('.relation-target').html();
    var info = {
        sender: user.username,
        target: target,
        relationship: relationship
    }
    socket.emit('change relationship', info);
    $('.total').remove();
    for (var i = 0; i < userList.length; i++) {
        if (userList[i].username === target) {
            userList[i].class = relationship;
            break;
        }
    }
    var filter = $('.droplist tab1').html();
    if (filter != 'All') $('#' + target + 'Div').remove(); //if contact display filter is not all, remove this contact from contact list
    var content = "You add " + targetName + ' to your ' + relationship;
    popupOnlineNotice(content);


});
$('#viewInfo').on('click', function() {
    var contacter = $(this).parent().parent().parent().find('.hide').html();
    var person = getPersonalInfo(contacter);
    uploadProfile(person);
});
$('body').on('click', '.contect-profile-title .fa-times', function() {
    $('.total').remove();
});
/*contacter remove events */
$('#removeConnection').on('click', function() {
    var contacter = $(this).parent().parent().parent().find('.hide').html();
    var person = getPersonalInfo(contacter);
    var contactName = person.profile.first_name + ' ' + person.profile.last_name;
    var removeConnectionDiv = $('<div class = "remove-connection-div"></div>');
    var targetDiv = $('<div class = "hide"></div>');
    targetDiv.html(contacter);
    removeConnectionDiv.append(targetDiv);
    var content = $('<h5></h5>');
    var text = "Are you sure to remove " + contactName + ' from your contact list'
    content.html(text);
    removeConnectionDiv.append(content);
    var confirmDiv = $('<div class = "confirm-contact-remove"><button class = "btn btn-danger">Confirm</button></div>');
    removeConnectionDiv.append(confirmDiv);
    var cancelDiv = $('<div class = "cancel-contact-remove"><button class = "btn btn-success">Cancel</button></div>');
    removeConnectionDiv.append(cancelDiv);
    var total = $('<div class = "total"></div>');
    total.append(removeConnectionDiv);
    total.appendTo('body');
});
$('body').on('click', '.cancel-contact-remove button', function() {
    $('.total').remove();
});
$('body').on('click', '.confirm-contact-remove', function() {
    var contacter = $('.remove-connection-div .hide').html();
    var info = {
        sender: user.username,
        target: contacter
    }
    socket.emit('remove contacter', info);
    $('.total').remove();
});
/* update profile avatar */
$("body").on('click', '#send', function(e) {
    e.preventDefault();
    basic.croppie('result', {
        type: 'canvas',
        size: 'viewport'
    }).then(function(data) {
        if (!$('#avatar').val()) {
            $('#error-message').html('You did not select a file');
            $('#error-message').attr('class', 'error-message');
            return;
        }
        var message = {
            sender: user.username,
            receivers: onlineFriends,
            avatar: data
        }

        socket.emit('update avatar', message);
        $('#totalDiv').remove();
        basic = null;
    })
});
$("body").on('click', '#cancel', function() {
    $('#totalDiv').remove();
});

/*  enlarge image events */

$('body').on('click', '.image-frame-left', enlargeImg);
$('body').on('click', '.image-frame-right', enlargeImg);

//close enlargeImg 
$('body').on('click', '.close', function() {
    change = false;
    $('.total').remove();
});
//scale-up event
$('body').on('click', '#magnify', function() {

    if (parseInt($('#range').val()) >= 175) { //set max scale rate ti 175%
        return;
    } else {
        if (!change) {
            oldWidth = $('#fullImage').width();
            oldHeight = $('#fullImage').height();
            change = true;
        }

        $('#range').val(parseInt($('#range').val()) + 25);
        var newWidth = oldWidth * parseInt($('#range').val()) / 100;
        var newHeight = oldHeight * parseInt($('#range').val()) / 100;

        $('#fullImage').css('width', newWidth);
        $('#fullImage').css('height', newHeight);
        $('.factor h3').html($('#range').val() + '%');
    }

});
//scale-down event
$('body').on('click', '#minify', function() {

    if (parseInt($('#range').val()) <= 25) { //set min scale rate to 25%
        return;
    } else {
        if (!change) {
            oldWidth = $('#fullImage').width();
            oldHeight = $('#fullImage').height();
            change = true;
        }
        $('#range').val(parseInt($('#range').val()) - 25);
        var newWidth = oldWidth * parseInt($('#range').val()) / 100;
        var newHeight = oldHeight * parseInt($('#range').val()) / 100;
        $('#fullImage').css('width', newWidth);
        $('#fullImage').css('height', newHeight);
        $('.factor h3').html($('#range').val() + '%');
    }

});
//scale range bar event
$('body').on('change', '#range', changeSize);


/*  file attachement events */

//clicking the submit button event on file attachement form
$("body").on('click', '#submitFiles', function(e) {
    e.preventDefault();
    var receiver = interlocutor != null ? interlocutor : currentGroup;
    var files = $('#myFiles').prop('files');

    //remove file attachement form
    $('.total').remove();
    newFileUploadAvailable = false;
    //disable file attachement button when filea are uploading to server
    if (toggleFloatInput) $('#fileAttachement2').css('pointer-events', 'none');
    else $('#fileAttachement').css('pointer-events', 'none');

    //create a div to display file upload progress status
    var progressUploadDiv = $('<div class = "file-upload-status"><h5></h5><ul class = "file-upload-list"></ul></div>');
    $('.chat-interface').append(progressUploadDiv);
    if (interlocutor != null) {
        for (var x in userList) {
            if (userList[x].username === receiver) {
                $('.file-upload-status').find('h5').html('Sending files to ' + userList[x].profile.first_name + ' ' + userList[x].profile.last_name);
            }
        }
    } else {
        $('.file-upload-status').find('h5').html('Sending files to group ' + currentGroup);
    }


    for (var i = 0; i < files.length; i++) {

        var li = $('<li class = "upload-item"></li>');
        li.attr('id', receiver + i);
        li.html(files[i].name);
        var progressDiv = $('<div class = "progress"></div>');
        var barDiv = $('<div class="bar"></div>');
        progressDiv.append(barDiv);
        var percentDiv = $('<div class="percent">0%</div>');
        progressDiv.append(percentDiv);
        li.append(progressDiv);
        $('.file-upload-list').append(li);
        var progressId = receiver + i;
        var data = new FormData();
        data.append('sender', user.username);
        data.append('senderName', user.profile.first_name + ' ' + user.profile.last_name);
        data.append('groupName', currentGroup);
        data.append('receiver', receiver);
        data.append('progressId', progressId);
        data.append('file', files[i]);

        // XMLHttpRequest Object
        var xhr = new XMLHttpRequest();
        xhr.upload.li = li;
        xhr.upload.div = progressUploadDiv;
        xhr.open('post', 'user/sendFile', true);
        xhr.upload.addEventListener('progress', function(evt) {
            var percentage = Math.round(evt.loaded / evt.total * 100).toFixed(2) + '%';
            this.li.find('.percent').html(percentage);
            this.li.find('.bar').width(percentage);

        }, false);
        xhr.send(data);
    }
});
$('body').on('click', '#closeFileUpload', function() {
    $('.total').remove();
});

/*  Edit profile events */

$('body').on('click', '#homeLink', function() {
    $('#totalDiv').remove();
    //location.reload();
});
$('body').on('click', '#saveProfile', function() {
    if (!$('#firstname').val() || !$('#lastname').val()) return;
    $.post('/user/saveProfile', $('#profileForm').serialize(), function(result) {
        $('.user-info').html(result.first_name + " " + result.last_name);
        $('.location').html(result.location.city + "." + result.location.province + "<br>" + result.location.postal_code + " " + result.location.country_code);
        user.profile = result;
        $('#taskDiv').find('input, textarea, button, select').attr('disabled', 'disabled');
        $('a').on('click.myDisable', function() { return false; });

        $.Zebra_Dialog('Profile information was saved successfully, please click OK to exit', {
            type: 'confirmation',
            title: 'Success Information',
            buttons: [
                { caption: 'OK', callback: exitProfile }

            ],
            onClose: exitProfile
        });
    })
});
$('body').on('click', '#profileLink', function() {
    $('.task-title').find('h2').html('Genetal Settings');
    $('#passwordForm').attr('class', 'hidden');
    $('#profileForm').attr('class', 'profile-form');
    $('#profileForm').validator();
});
$('body').on('click', '#passwordLink', function() {
    $('.task-title').find('h2').html('Change Password');
    $('#profileForm').attr('class', 'hidden');
    $('#passwordForm').attr('class', 'password-form');
    $('#passwordForm').validator();
});
$('body').on('click', '#savePassword', function() {
    if (($('#valid_oldpass').text() != 'Minimum of 6 characters') || ($('#valid_newpass').text() != 'Minimum of 6 characters') || ($('#confirm_pass').text() != ""))
        return;
    $.post('/user/changePassword', $('#passwordForm').serialize(), function(result) {
        //$('#taskDiv').find('input, textarea, button, select').attr('disabled', 'disabled');
        //$('a').on('click.myDisable', function() { return false; });
        if (result === "OK") {
            $.Zebra_Dialog('Password was changed successfully, please click OK to exit and log in', {
                type: 'confirmation',
                title: 'Success Information',
                buttons: [
                    { caption: 'OK', callback: logout }

                ],
                onClose: logout
            });
        } else {
            $.Zebra_Dialog('Old password is incorrect, please click Return to exit and try again', {
                type: 'error',
                title: 'Error Information',
                buttons: ['Return']

            });
        }
    })
});

function insertAtCaret(areaId, text) {
    var txtarea = document.getElementById(areaId);
    if (!txtarea) { return; }

    var scrollPos = txtarea.scrollTop;
    var strPos = 0;
    var br = ((txtarea.selectionStart || txtarea.selectionStart == '0') ?
        "ff" : (document.selection ? "ie" : false));
    if (br == "ie") {
        txtarea.focus();
        var range = document.selection.createRange();
        range.moveStart('character', -txtarea.value.length);
        strPos = range.text.length;
    } else if (br == "ff") {
        strPos = txtarea.selectionStart;
    }

    var front = (txtarea.value).substring(0, strPos);
    var back = (txtarea.value).substring(strPos, txtarea.value.length);
    txtarea.value = front + text + back;
    strPos = strPos + text.length;
    if (br == "ie") {
        txtarea.focus();
        var ieRange = document.selection.createRange();
        ieRange.moveStart('character', -txtarea.value.length);
        ieRange.moveStart('character', strPos);
        ieRange.moveEnd('character', 0);
        ieRange.select();
    } else if (br == "ff") {
        txtarea.selectionStart = strPos;
        txtarea.selectionEnd = strPos;
        txtarea.focus();
    }

    txtarea.scrollTop = scrollPos;
};

function displayPrivateChatHistory(username, readCache, isInsert) {
    var person = getPersonalInfo(username);
    var lastInsertItem = false;
    var count = 0;

    $('#chatHistory').show();
    $('.history-chatter').html(person.profile.first_name + ' ' + person.profile.last_name);
    for (let i = 0; i < readCache.length; i++) {
        count++;
        if (count >= readCache.length && isInsert) {
            lastInsertItem = true;
        }
        var sentByMe = readCache[i].sender === user.username ? true : false;
        if (!sentByMe) displayReceiveHistory(readCache[i], isInsert, lastInsertItem);
        else displaySendHistory(readCache[i], isInsert, lastInsertItem);
    }
};

function displayPublicChatHistory(group, readCache, isInsert) {
    var lastInsertItem = false;
    var count = 0;
    $('#chatHistory').show();
    $('.history-chatter').html(group);
    for (let i = 0; i < readCache.length; i++) {
        count++;
        if (count >= readCache.length && isInsert) {
            lastInsertItem = true;
        }
        var sentByMe = readCache[i].sender === user.username ? true : false;
        if (!sentByMe) displayPublicReceiveHistory(readCache[i], isInsert, lastInsertItem);
        else displaySendHistory(readCache[i], isInsert, lastInsertItem);
    }
};

function displayPublicReceiveHistory(message, isInsert, lastInsertItem) {
    var sender = getPersonalInfo(message.sender);
    if (!sender) { //if can not find sender in contacts, search it in unknown members
        sender = getUnknownMemberInfo(message.sender);
        if (!sender) { //if can not find sender in unknown members, send req to server
            socket.emit('getUnknownMember', message.sender, function(unKnownMemberinfo) {
                sender = unKnownMemberinfo;
                displayPublicReceiveHis(message, sender, isInsert, lastInsertItem);
            })
        } else {
            displayPublicReceiveHis(message, sender, isInsert, lastInsertItem);
        }
    } else {
        displayPublicReceiveHis(message, sender, isInsert, lastInsertItem);
    }
}

function displayPublicReceiveHis(message, sender, isInsert, lastInsertItem) {
    var messageDate = null;
    var newHistoryDate;
    if (oldHistoryDate == null) {
        oldHistoryDate = message.date.day + '-' + message.date.month + '-' + message.date.year;
        messageDate = oldHistoryDate;
    } else {
        newHistoryDate = message.date.day + '-' + message.date.month + '-' + message.date.year;
        if (newHistoryDate == oldHistoryDate) {
            messageDate = null;
        } else {
            oldHistoryDate = newHistoryDate;
            messageDate = newHistoryDate;
        }
    }
    var chatItem, hint;
    chatItem = $('<li class="chat-item right"></li>');
    var dateDiv = $('<div class = "send-date"></div>');
    if (lastInsertItem) dateDiv.html(message.date.day + '-' + message.date.month + '-' + message.date.year);
    else dateDiv.html(messageDate);
    chatItem.append(dateDiv);
    var chatDiv = $('<div class ="avatar-info-right"></div>');
    chatItem.append(chatDiv);
    var senderAvatar = $('<img class="chat-avatar">');
    senderAvatar.attr('src', sender.profile.avatar);
    chatDiv.append(senderAvatar);
    var timeDiv = $('<div class = "time"></div>');
    var time = message.date.hour + ':' + message.date.minute;
    timeDiv.html(time);
    chatDiv.append(timeDiv);
    if (message.type === 'image') {
        var imgDiv = $('<div></div>');
        var imgLink = $('<a href = "#"></a>');
        imgLink.attr('id', sender.username + message.date.time + message.date.day + message.date.month + message.date.year);
        imgDiv.append(imgLink);
        var imgTag = $('<img class = "image-frame-right">');
        if (message.content === null) {
            imgTag.attr('src', 'img/no-image.jpg');
        } else {
            imgTag.attr('src', message.content);
        }
        imgLink.append(imgTag);
        chatItem.append(imgDiv);

    } else {
        var contentDiv = $('<div class="bubble-item"></div>');
        if (sender.profile.gender === 'Female') {
            contentDiv.addClass('bubble-parrot-red');
        } else {
            contentDiv.addClass('bubble-parrot-yellow');
        }

        chatItem.append(contentDiv);
        var chatContent = $('<div class ="chat-content"></div>');
        if (message.type === 'text') {

            var textContent = replaceURLWithHTMLLinks(message.content);
            chatContent.html(textContent);
        } else {
            var preText = $('<p></p>');
            preText.html(sender.profile.first_name + ' ' + sender.profile.last_name + ' sent a file, please click ');
            chatContent.append(preText);
            var fileLink = $('<a target = "_blank" class = "file-link">here to download</a>');
            fileLink.attr('href', message.content);
            preText.append(fileLink);
        }
        contentDiv.append(chatContent);
        var symbol = $('<span class="cell cell-7"></span>');
        contentDiv.append(symbol);
    }
    if (isInsert) $('#historyList li:eq(0)').before(chatItem)
    else
        $('#historyList').append(chatItem);
    updateScrollUp();
};

function displayReceiveHistory(message, isInsert, lastInsertItem) {
    var messageDate = null;
    var newHistoryDate;
    if (oldHistoryDate == null) {
        oldHistoryDate = message.date.day + '-' + message.date.month + '-' + message.date.year;
        messageDate = oldHistoryDate;
    } else {
        newHistoryDate = message.date.day + '-' + message.date.month + '-' + message.date.year;
        if (newHistoryDate == oldHistoryDate) {
            messageDate = null;
        } else {
            oldHistoryDate = newHistoryDate;
            messageDate = newHistoryDate;
        }
    }
    var sender = getPersonalInfo(message.sender);

    var chatItem, hint;
    chatItem = $('<li class="chat-item right"></li>');
    var dateDiv = $('<div class = "send-date"></div>');
    if (lastInsertItem) dateDiv.html(message.date.day + '-' + message.date.month + '-' + message.date.year);
    else dateDiv.html(messageDate);
    chatItem.append(dateDiv);
    var chatDiv = $('<div class ="avatar-info-right"></div>');
    chatItem.append(chatDiv);
    var senderAvatar = $('<img class="chat-avatar">');
    senderAvatar.attr('src', sender.profile.avatar);
    chatDiv.append(senderAvatar);
    var timeDiv = $('<div class = "time"></div>');
    var time = message.date.hour + ':' + message.date.minute;
    timeDiv.html(time);
    chatDiv.append(timeDiv);
    if (message.type === 'image') {
        var imgDiv = $('<div></div>');
        var imgLink = $('<a href = "#"></a>');
        imgLink.attr('id', sender.username + message.date.time + message.date.day + message.date.month + message.date.year);
        imgDiv.append(imgLink);
        var imgTag = $('<img class = "image-frame-right">');
        if (message.content === null) {
            imgTag.attr('src', 'img/no-image.jpg');
        } else {
            imgTag.attr('src', message.content);
        }
        imgLink.append(imgTag);
        chatItem.append(imgDiv);

    } else {
        var contentDiv = $('<div class="bubble-item"></div>');
        if (sender.profile.gender === 'Female') {
            contentDiv.addClass('bubble-parrot-red');
        } else {
            contentDiv.addClass('bubble-parrot-yellow');
        }

        chatItem.append(contentDiv);
        var chatContent = $('<div class ="chat-content"></div>');
        if (message.type === 'text') {

            var textContent = replaceURLWithHTMLLinks(message.content);
            chatContent.html(textContent);
        } else {
            var preText = $('<p></p>');
            preText.html(sender.profile.first_name + ' ' + sender.profile.last_name + ' sent a file, please click ');
            chatContent.append(preText);
            var fileLink = $('<a target = "_blank" class = "file-link">here to download</a>');
            fileLink.attr('href', message.content);
            preText.append(fileLink);
        }
        contentDiv.append(chatContent);
        var symbol = $('<span class="cell cell-7"></span>');
        contentDiv.append(symbol);
    }
    if (isInsert) $('#historyList li:eq(0)').before(chatItem)
    else
        $('#historyList').append(chatItem);
    //$('#chatWrapper').scrollTop($('#chatList li').last().position().top + $('#chatList li').last().height());
    updateScrollUp();

};

function displaySendHistory(newMessage, isInsert, lastInsertItem) {
    var messageDate = null;
    var newHistoryDate;
    if (oldHistoryDate == null) {
        oldHistoryDate = newMessage.date.day + '-' + newMessage.date.month + '-' + newMessage.date.year;
        messageDate = oldHistoryDate;
    } else {
        newHistoryDate = newMessage.date.day + '-' + newMessage.date.month + '-' + newMessage.date.year;
        if (newHistoryDate == oldHistoryDate) {
            messageDate = null;
        } else {
            oldHistoryDate = newHistoryDate;
            messageDate = newHistoryDate;
        }
    }
    var chatItem;
    chatItem = $('<li class="chat-item left"></li>');
    var dateDiv = $('<div class = "send-date"></div>');
    if (lastInsertItem) dateDiv.html(newMessage.date.day + '-' + newMessage.date.month + '-' + newMessage.date.year);
    else dateDiv.html(messageDate);
    chatItem.append(dateDiv);
    var chatDiv = $('<div class ="avatar-info-left"></div>');
    chatItem.append(chatDiv);
    var senderAvatar = $('<img class="chat-avatar">');
    senderAvatar.attr('src', user.profile.avatar);
    chatDiv.append(senderAvatar);
    var timeDiv = $('<div class = "time"></div>');
    var time = newMessage.date.hour + ":" + newMessage.date.minute;
    timeDiv.html(time);
    chatDiv.append(timeDiv);

    if (newMessage.type === 'image') {

        var imgDiv = $('<div></div>');
        var imgLink = $('<a href = "#"></a>');
        imgLink.attr('id', user.username + newMessage.date.time + newMessage.date.day + newMessage.date.month + newMessage.date.year);
        imgDiv.append(imgLink);
        var imgTag = $('<img class = "image-frame-left">');
        if (newMessage.content === null)
            imgTag.attr('src', 'img/no-image.jpg');
        else
            imgTag.attr('src', newMessage.content);
        imgLink.append(imgTag);
        chatItem.append(imgDiv);

    } else {
        var contentDiv = $('<div class="bubble-item"></div>');
        if (user.profile.gender === 'Female') {
            contentDiv.addClass('bubble-parrot-red');
        } else {
            contentDiv.addClass('bubble-parrot-yellow');
        }
        chatItem.append(contentDiv);
        var chatContent = $('<div class ="chat-content"></div>');
        if (newMessage.type === 'text') {
            var textContent = replaceURLWithHTMLLinks(newMessage.content);
            chatContent.html(textContent);

        } else {
            var preText = $('<p></p>');
            if (newMessage.receiver != null) {
                var receiver = getPersonalInfo(newMessage.receiver);
                preText.html('Send a file to ' + receiver.profile.first_name + ' ' + receiver.profile.last_name + ' successfully, please click ');

            } else {
                preText.html('Share a file to group ' + newMessage.group + ' successfully, please click ');
            }
            chatContent.append(preText);
            var fileLink = $('<a target= "_blank" class = "file-link">here to download</a>');
            fileLink.attr('href', newMessage.content);
            preText.append(fileLink);
        }
        contentDiv.append(chatContent);
        var symbol = $('<span class="cell cell-5"></span>');
        contentDiv.append(symbol);
    }
    if (isInsert) $('#historyList li:eq(0)').before(chatItem)
    else
        chatItem.appendTo($('#historyList'));
    updateScrollUp();
};

function getTenRecords(result, callback) {
    // get 10 recoreds everytime until no record
    var readCache = [];
    for (var i = 0; i < result.length; i++) {
        if ((currentReadId - i) >= 0) {
            var tempData = result[currentReadId - i];
            console.log(i);
            // console.log(tempData)
            if (readCache.length != 0) {
                var cloneChache = [];
                for (var j = 0; j < readCache.length; j++) {
                    cloneChache.push(readCache[j]);
                }
                readCache = [];
                for (var j = 0; j < tempData.message.length; j++) {
                    readCache.push(tempData.message[j])
                }
                for (var j = 0; j < cloneChache.length; j++) {
                    readCache.push(cloneChache[j])
                }
            } else {
                for (var j = 0; j < tempData.message.length; j++) {
                    readCache.push(tempData.message[j])
                }
            }
            if (readCache.length >= 10) {
                if (currentReadId) currentReadId -= i + 1;
                else currentReadId = -1;
                console.log(readCache);
                console.log('current read id: ' + currentReadId);
                break;
            }
        } else {
            currentReadId = -1;
            break;
        }

    }
    if (callback) callback(readCache);
};

function pauseEvent(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
    e.cancelBubble = true;
    e.returnValue = false;
    return false;
};

function readPrivateChatHistory(id, callback) {
    var saveKey = 'privateChat' + user.username + id;
    var buffer = JSON.parse(localStorage.getItem(saveKey));
    if (callback) callback(buffer);
};

function readPublicChatHistory(id, callback) {
    var saveKey = 'chatPublic' + user.username + id;
    var buffer = JSON.parse(localStorage.getItem(saveKey));
    if (callback) callback(buffer);
};

function savePrivateChatToLocal(id, records, callback) {
    var currentPrivateChatKey = 'privateChat' + user.username + id;
    var currentPrivateChatHistory = JSON.stringify(records);
    localStorage.setItem(currentPrivateChatKey, currentPrivateChatHistory);
    if (callback) callback();
};

function savePublicChatToLocal(id, records, callback) {
    var currentPublicChatKey = 'chatPublic' + user.username + id;
    var currentPublicChatHistory = JSON.stringify(records);
    localStorage.setItem(currentPublicChatKey, currentPublicChatHistory);
    if (callback) callback();
};

function updateScrollUp(username) {
    scrolled = false;
    if (!scrolled) {
        var element = document.getElementById('chatListDiv');
        element.scrollTop = 0;
    }
};

function updateScroll() {
    scrolled = false;
    if (!scrolled) {
        var element = document.getElementById('chatWrapper');
        element.scrollTop = element.scrollHeight - element.clientHeight;
    }
};

function getOwnerGroups() {
    var ownerGroups = [];
    for (var i = 0; i < groupList.length; i++) {
        if (groupList[i].owner === user.username) ownerGroups.push(groupList[i])
    }
    return ownerGroups;
};

function createGroup() {
    var createGroupDiv = $('<div class = "create-group-div"></div>');
    var title = $('<h4>Create A New Group</h4>');
    createGroupDiv.append(title);
    var errorMsg = $('<div id="error-message" class = "hidden"></div>');
    createGroupDiv.append(errorMsg);
    var form = $('<form></form>');
    createGroupDiv.append(form);
    var groupName = $('<div class = "form-group"><label class="col-sm-10">New Group Name</label><div class = ""col-sm-10""><input type="username" class="form-control" id = "groupName"><div class="help-block with-errors"></div></div></div>');
    form.append(groupName);
    var confirmBtn = $('<div class = "confirm-create-group"><button class = "btn btn-success">Confirm</button></div>');
    createGroupDiv.append(confirmBtn);
    var cancelBtn = $('<div class = "cancel-create-group"><button class = "btn btn-danger">Cancel</button></div>');
    createGroupDiv.append(cancelBtn);
    var total = $('<div class = "total"></div>');
    total.append(createGroupDiv);
    total.appendTo('body');
};

function removeGroup() {
    var ownerGroups = getOwnerGroups();
    if (!ownerGroups.length) {
        $.Zebra_Dialog('To remove a group, you must be an owner of at least one group', {
            type: 'error',
            title: 'Error Information'
        })
    } else {
        var groupsDiv = $('<div class = "groups"></div>');
        var closeDiv = $('<div class = "groups-close"><i class = "fa fa-times"></i></div>');
        groupsDiv.append(closeDiv);
        var p = $('<p>Please select a group</p>');
        groupsDiv.append(p);
        var form = $('<form id = "groupOption" action = ""></form>');
        groupsDiv.append(form);
        var note = $('<div class = "remove-group-note">Note: Removeing group will delete this group and its members</div>');
        groupsDiv.append(note);
        var next = $('<div class = "remove-group-confirm"><button class = "btn btn-danger">Remove</button></div>');
        groupsDiv.append(next);
        var total = $('<div class = "total"></div>');
        total.append(groupsDiv);
        total.appendTo('body');
        for (var i = 0; i < ownerGroups.length; i++) {
            var check = $('<input type="radio" name = "group" value = "' + ownerGroups[i].name + '" >' + ownerGroups[i].name + '</input>');
            check.attr('id', ownerGroups[i].name);
            $('#groupOption').append(check);
            $('#groupOption').append('<br>');
        }
    }
}

function searchGroupWindow() {
    var searchDiv = $('<div class = "search-group-bar"></div>');
    var titleDiv = $('<div class = "search-title"><i class = "fa fa-times"></i></div>');
    searchDiv.append(titleDiv);
    var formDiv = $('<form class = "search-group-form"  autocomplete="off" action = ""></form>');
    searchDiv.append(formDiv);
    var inputDiv = $('<div class = "input-group search-content"></div>');
    formDiv.append(inputDiv);
    var inputField = $('<input type="text" id="groupInput"  name = "group" class = "form-control" placeholder="type a group name for search" >');
    inputDiv.append(inputField);
    var btnDiv = $('<div class = "input-group-btn" ></div>');
    inputDiv.append(btnDiv);
    var btn = $('<button id = "searchGroup" class = "btn btn-default search-btn"><i class="fa fa-search"></i></button');
    btnDiv.append(btn);
    var list = $('<div class = "input-group result-display-bar"><ul id = "listResult" class = ""list-group""></ul></div>');
    searchDiv.append(list);
    var totalDiv = $('<div class = "total" id = "totalDiv"></div>');
    totalDiv.append(searchDiv);
    totalDiv.appendTo('body');
}

function filterContacts(filter) {
    $('.list-contacts').empty();
    if (filter === 'All') {
        for (var i = 0; i < userList.length; i++) listFriend(userList[i]);
    } else {
        for (var i = 0; i < userList.length; i++) {
            if (userList[i].class === filter) {
                listFriend(userList[i])
            }
        }
    }
};

function checkIfUserOnline(username) {
    for (var x in onlineFriends) {
        if (onlineFriends[x] === username) return true
    }
    return false;
}

function removeFriend(contacter, passive) {
    var content;
    var person = getPersonalInfo(contacter);
    if (passive) {
        if (person != null) content = "Youe are removed by " + person.profile.first_name + ' ' + person.profile.last_name;
        else content = "Youe are removed by " + contacter;
    } else {
        var contactName = person.profile.first_name + ' ' + person.profile.last_name;
        content = 'You remove ' + contactName + ' from your contact list successfully'
    }
    popupOnlineNotice(content);
    if (person === null) return;
    $('#' + contacter + 'Div').remove(); //remove contacter from contacter display list
    var index = userList.indexOf(contacter);
    userList.splice(index);
    if (interlocutor === contacter) {
        $('#chatWindow').attr('class', 'hide');
        interlocutor = null;
    }
};

function deleteGroup(group) {
    var name = group.name.replace(/\s/g, "");
    var divs = $('#' + name + 'Div');
    divs.remove();
    popupOnlineNotice('Group ' + group.name + ' has been removed, so you are no longer a member of this group');
    for (var i = 0; i < groupList.length; i++) {
        if (groupList[i].name === group.name) {
            groupList.splice(i, 1);
            break;
        }
    }

    if (currentGroup === group.name) {
        currentGroup = null;
        $('#chatWindow').attr('class', 'hide');
    }
};

function changeOnlineStatus(username, online) {

    for (var i = 0; i < userList.length; i++) {
        if (userList[i].username === username) {
            userList[i].online = online;
            return;
        }
    }
};

function listFriend(friend) {
    //var id = friend.id;
    var username = friend.username;
    var name = friend.profile.first_name + " " + friend.profile.last_name;
    var contactDiv = $('<div class = "contacts-info" ></div>');
    contactDiv.attr('id', username + 'Div');
    var img = $('<img class = "contacts-img">');
    img.attr('src', friend.profile.avatar);
    contactDiv.append(img);
    var status = $('<div id = "onlineStatus" ></div>');
    if (friend.online) {
        status.attr('class', 'circle-online');
        onlineFriends.push(friend.username); //if friend is online, push to onlineFriends array;
    } else status.attr('class', 'circle-offline')
    contactDiv.append(status);
    var detailInfo = $('<div class = "detail-info"></div>');
    var friendDiv = $('<div class = "contact-name clearfix"></div>');
    var newMsgCount = $('<div  class = "new-message "></div');
    var friendNameDiv = $('<div class = "full-name"></div>');
    var friendName = $('<a href = "#"></a>');
    friendName.attr('id', username);
    friendName.html(name);
    friendNameDiv.append(friendName);
    friendDiv.append(friendNameDiv);
    friendDiv.append(newMsgCount);
    detailInfo.append(friendDiv);

    var lastMessage = $('<div class = "latest-message"></div>');
    detailInfo.append(lastMessage);
    contactDiv.append(detailInfo);
    $('.list-contacts').append(contactDiv);
};

function listGroup(group) {
    var groupName = group.name;
    var groupDiv = $('<div class = "group-info" ></div>');
    groupDiv.attr('id', groupName.replace(/\s/g, "") + 'Div');
    var img = $('<img class = "group-img">');
    img.attr('src', group.avatar);
    groupDiv.append(img);
    var detailInfo = $('<div class = "detail-info"></div>');
    var groupNameDiv = $('<div class = "group-name clearfix"></div>');
    var newMsgCount = $('<div  class = "new-message "></div');
    var fullNameDiv = $('<div class = "full-name"></div>');
    var fullName = $('<a href = "#"></a>');
    fullName.attr('id', groupName);
    fullName.html(groupName);
    fullNameDiv.append(fullName);
    groupNameDiv.append(fullNameDiv);
    groupNameDiv.append(newMsgCount);
    detailInfo.append(groupNameDiv);

    var lastMessage = $('<div class = "latest-message"></div>');
    detailInfo.append(lastMessage);
    groupDiv.append(detailInfo);
    $('.list-groups').append(groupDiv);
};

function popupSearch() {
    var searchDiv = $('<div class = "search-function-bar"></div>');
    var titleDiv = $('<div class = "search-title"><i class = "fa fa-times"></i></div>');
    searchDiv.append(titleDiv);
    var formDiv = $('<form action = ""></form>');
    searchDiv.append(formDiv);
    var inputDiv = $('<div class = "input-group search-content"></div>');
    formDiv.append(inputDiv);
    var inputField = $('<input type="text" id="people" name = "people" class = "form-control" placeholder="type a username for search" >');
    inputDiv.append(inputField);
    var btnDiv = $('<div class = "input-group-btn" ></div>');
    inputDiv.append(btnDiv);
    var btn = $('<button id = "searchFriend" class = "btn btn-default search-btn"><i class="fa fa-search"></i></button');
    btnDiv.append(btn);
    var totalDiv = $('<div class = "total" id = "totalDiv"></div>');
    totalDiv.append(searchDiv);
    totalDiv.appendTo('body');
};

function popupOnlineNotice(content) {

    var popupDiv = $('<div class = "online-notice"></div>');
    var closeTag = $('<div class = "notice-close"><i class = "fa fa-times"></i></div>');
    popupDiv.append(closeTag);
    var notice = $('<h5></h5>');
    notice.html(content);
    popupDiv.append(notice);
    $('body').append(popupDiv);
    playSound('sound/here-i-am.mp3');
    setTimeout(function() {
        $('.online-notice').fadeOut(1500, "linear", function() {
            $('online-notice').remove();
        })
    }, 10000);
};

function deleteMedia() {
    $('.snapshot').css('pointer-events', 'none');
    $('.media-popup').remove();
    removeMedia();
};

function takeSnapshot() {

    var video = $('video');
    video[1].pause();
    var canvas = document.getElementById("canvas"); //jquery can not support canvas
    var context = canvas.getContext('2d');
    canvas.width = video[1].videoWidth;
    canvas.height = video[1].videoHeight;
    context.drawImage(video[1], 0, 0);
    video[1].play();

    playSound('sound/camera-shutter-click.mp3');
    var dataUrl = canvas.toDataURL(); //get's image string
    var imgDiv = $('<div class = "snapshot-image"></div>');
    var top = 100 + snapImgOffset;
    var left = 300 + snapImgOffset;
    imgDiv.css('top', top + 'px');
    imgDiv.css('left', left + 'px');
    var closeDiv = $('<div class = "closeSnapshot"><i class = "fa fa-times"></i></div>')
    imgDiv.append(closeDiv);
    var link = $('<a download="snapshot.png"></a>');
    var url = dataUrl.replace(/^data:image\/[^;]/, 'data:application/octet-stream');
    link.attr('href', url);
    imgDiv.append(link);
    var img = $('<img>');
    img.attr('src', dataUrl);
    link.append(img);
    $('body').append(imgDiv);
    snapImgOffset += 10;
};

function startMediaChat() {

    setupLocalMedia(function() {
        socket.emit('request media chat', {
            sender: user.username,
            receiver: interlocutor,
            useVideo: useVideo
        });
        $('.video').css('pointer-events', 'none');
        $('.phone').css('pointer-events', 'none');

    });
};

function onError(err) {
    console.log(err.message);
};

function playSound(src) {
    $('.play-audio').prop('loop', false);
    $('.play-audio').attr('src', src);

};

function selectImage() {
    var imageWindow = $('<div id = "imageSubmitWindow"></div>');
    var errorMsg = $('<div id="error-message" class = "hidden"></div>');
    imageWindow.append(errorMsg);
    var imageDiv = $('<div class="form-group row"><div class = "image-display"><img id = "targetImg"></div><div class = "col-sm-12"><input type="file" class="form-control-file" id="imageUpload" accept = ".jpg, .gif, .png, .jpeg"  onchange="displayImage(this)" name = "image" aria-describedby="fileHelp" required><small id="fileHelp" class="form-text text-muted help">Select image less than 2 MB. For the image with more than 2 MB size, please use file attachement</small></div></div>');
    imageWindow.append(imageDiv);
    var confirmDiv = $('<div class="form-group float-left"><div class = "col-sm-5 "><button id = "submitImage" class="btn btn-primary btn-block">Send</button></div></div>');
    imageWindow.append(confirmDiv);
    var cancelDiv = $('<div class="form-group float-left"><div class = "col-sm-5 "><button id = "cancelSubmit" class="btn btn-primary btn-block">Cancel</button></div></div>');
    imageWindow.append(cancelDiv);
    var totalDiv = $('<div class = "total"></div>');
    var maskDiv = $('<div class = ".frosted-glass" ></div>');
    maskDiv.append(imageWindow);
    totalDiv.append(maskDiv);
    totalDiv.appendTo('body');

};

function displayImage(input) {
    if ($('#error-message').html()) {
        $('#error-message').html("");
        $('#error-message').attr('class', 'hidden');
    }
    $('#targetImg').hide();
    var validImageTypes = ["image/gif", "image/jpeg", "image/png", "image/jpg"];
    if (input.files && input.files[0]) {
        if (input.files[0].size > 2048000) {
            $('#error-message').html("file size is too big");
            $('#error-message').attr('class', 'error-message');
            $('#imageUpload').val("");
        } else {
            if ($.inArray(input.files[0].type, validImageTypes) < 0) {
                $('#error-message').html("file type is incorrect");
                $('#error-message').attr('class', 'error-message');
                $('#imageUpload').val("");
            } else {
                var reader = new FileReader();
                reader.onload = function(e) {
                    $('#targetImg').attr('src', e.target.result)
                        .width(300)
                        .height('auto');
                }
                $('#targetImg').show();
                reader.readAsDataURL(input.files[0]);
            }

        }
    }
};

function uploadAvatar() {
    var avatarUploadDiv = $('<div class = "form-group row avatar-upload-form"></div>');
    var errorMsg = $('<div id="error-message" class = "hidden"></div>');
    avatarUploadDiv.append(errorMsg);
    var img = $('<div id = "myAvatar"></div>');
    var avatarUploadFrom = $('<form autocomplete="off" id = "uploadForm" class="form-avatar" data-toggle="validator" role="form" ></form>');
    avatarUploadDiv.append(img);
    var uploadDiv = $('<div class = "col-sm-10"></div>');
    var fileUpload = $('<input type="file" class="file-loading" id="avatar" accept = ".jpg, .gif, .png, .jpeg"  onchange="readURL(this)" name = "avatar" aria-describedby="fileHelp" >');
    var small = $('<small id="fileHelp" class="form-text text-muted">Please upload your avatar file, up to 1MB</small>');
    uploadDiv.append(fileUpload);
    uploadDiv.append(small);
    avatarUploadFrom.append(uploadDiv);
    var confirmDiv = $('<div class = "form-group row"></div>');
    var confirmBtn = $('<div class = "col-sm-5 div-center confirm"><a href = "#" id = "send" >Save</a></div>');
    confirmDiv.append(confirmBtn);
    var cancelDiv = $('<div class = "form-group row"></div>');
    var cancelBtn = $('<div class = "col-sm-5 div-center cancel"><a href = "#" id = "cancel" >Cancel</a></div>')
    cancelDiv.append(cancelBtn);
    avatarUploadFrom.append(confirmDiv);
    avatarUploadFrom.append(cancelDiv);
    avatarUploadDiv.append(avatarUploadFrom);
    var totalDiv = $('<div class = "total" id = "totalDiv"></div>');
    var frostDiv = $('<div class="frosted-glass"></div>');
    totalDiv.append(frostDiv);
    totalDiv.append(avatarUploadDiv);
    totalDiv.appendTo('body');
    basic = $("#myAvatar").croppie({
        viewport: { width: 250, height: 250 },
        boundary: { width: 300, height: 300 },
        showZoomer: true,
        url: null
    });


}

function readURL(input) {
    if ($('#error-message').html()) {
        $('#error-message').html("");
        $('#error-message').attr('class', 'hidden');
    }
    var validImageTypes = ["image/gif", "image/jpeg", "image/png", "image/jpg"];
    if (input.files && input.files[0]) {
        if (input.files[0].size > 1024000) {
            $('#error-message').html("file size is too big");
            $('#error-message').attr('class', 'error-message');
            if ($('#avatar').val()) $('#avatar').val("");
            if ($('#groupAvatar').val()) $('#groupAvatar').val("");
        } else {
            if ($.inArray(input.files[0].type, validImageTypes) < 0) {
                $('#error-message').html("file type is incorrect");
                $('#error-message').attr('class', 'error-message');
                if ($('#avatar').val()) $('#avatar').val("");
                if ($('#groupAvatar').val()) $('#groupAvatar').val("");
            } else {
                var reader = new FileReader();
                reader.onload = function(e) {
                    basic.croppie('bind', {
                        url: e.target.result

                    })
                };
                reader.readAsDataURL(input.files[0]);
            }
        }
    }
};

function editProfile() {
    var profileDiv = $('<div id = "profile" class = "profile-div row"></div>');
    var navBar = $('<div id = "navBar" class = "nav-bar"></div>');
    var taskDiv = $('<div id = "taskDiv" class = "task-div"></div>');
    profileDiv.append(navBar);
    profileDiv.append(taskDiv);

    var navTitle = $('<div class = "nav-title"><div class = "mask"></div><div class = "profile-title-div"><img id = "profilePhoto" class = "chat-avatar" ><div class = "user-info"></div><div class = "location"></div></div></div>')
    var profileLink = $('<div class = "profile-link"><a id = "profileLink" href = "#"><i class="fa fa-id-card-o"></i>General</a></div>');
    var passwordLink = $('<div class = "password-link"><a id = "passwordLink" href = "#"> <i class="fa fa-key"></i>Security</a></div>');
    var homeLink = $('<div class = "home-link"><a id = "homeLink" href="#"><i class="fa fa-home"></i>Home</a></div>');
    navBar.append(navTitle);
    navBar.append(profileLink);
    navBar.append(passwordLink);
    navBar.append(homeLink);

    var taskTitle = $('<div class = "task-title"><h2>General Settings</h2></div>');
    var profileForm = $('<form autocomplete="off" id = "profileForm" class = "profile-form" role="form"></form>');
    var passwordForm = $('<form autocomplete="off" id = "passwordForm" class="passowrd-form hide" role="form"></form>');
    taskDiv.append(taskTitle);
    taskDiv.append(profileForm);
    taskDiv.append(passwordForm);

    var userId = $('<input type = "hidden" id = "userId" name = "userId">');
    var user_id = $('<input type = "hidden" id = "user_id" name = "userId">');
    userId.val(user._id);
    user_id.val(user._id);
    profileForm.append(userId);
    passwordForm.append(user_id);

    var firstName = $('<div class="form-group row"><label for="firstname" class="col-sm-3 col-form-label">First Name</label><div class="col-sm-9"><input type="username" class="form-control" id="firstname" name = "firstname"  data-error="first name cannot be empty"  required></div><div class="help-block with-errors"></div>');
    profileForm.append(firstName);

    var lastName = $('<div class="form-group row" ><label for="lastname" class="col-sm-3 col-form-label">Last Name</label><div class="col-sm-9"><input type="username" class="form-control" id="lastname" name = "lastname"  data-error="last name cannot be empty"  required></div><div class="help-block with-errors"></div></div>');
    profileForm.append(lastName);

    var gender = $('<div class="form-group row" ><label for="sel1" class="col-sm-3 col-form-label">Gender</label><div class="form-check form-check-inline font-color-blue"> <label class="form-check-label"><input class="form-check-input" type="radio" name="gender" id="male" value="Male"> Male</label><label class="form-check-label female"><input class="form-check-input " type="radio" name="gender" id="female" value="Female"> Female</label></div></div>');
    profileForm.append(gender);

    var city = $('<div class = "form-group row"><label for = "city" class="col-sm-3 col-form-label" >City</label><div class="col-sm-9"><input type="city" class = "form-control" name = "city" id = "city" placeholder = "city"><div></div>');
    profileForm.append(city);
    var province = $('<div class = "form-group row"><label for = "province" class="col-sm-3 col-form-label" >Province</label><div class="col-sm-9"><input type="province" class = "form-control" name = "province" id = "province" placeholder = "province"><div></div>');
    profileForm.append(province);

    var postalCode = $('<div class = "form-group row"><label for = "postalcode" class="col-sm-3 col-form-label" >Postal Code</label><div class="col-sm-9"><input type="postalcode" id="postalcode" class = "form-control" name = "postalcode" placeholder = "postal code"><div></div>');
    profileForm.append(postalCode);

    var country = $('<div class = "form-group row"><label for = "country" class="col-sm-3 col-form-label" >Country</label><div class="col-sm-9"> <select id="country" name="country" class="form-control"><option value="" selected="selected">(please select a country)</option><div></div>');
    profileForm.append(country);

    var saveBtn = $('<div class="form-group row"><div class = "col-sm-5 div-center"><div class = "save-btn"><a href="#" id = "saveProfile">Save</a></div></div>');
    profileForm.append(saveBtn);

    var oldPassword = $('<div class = "form-group row"><label for = "oldpassword" class="col-sm-4 col-form-label">Old password</label><div class = "col-sm-8"><input type="password" class = "form-control" name = "oldpassword" placeholder="Old password" data-minlength="6" required></div><div id = "valid_oldpass" class="help-block with-errors">Minimum of 6 characters</div></div>');
    passwordForm.append(oldPassword);

    var newPassword = $('<div class = "form-group row"><label for = "newpassword" class = "col-sm-4 col-form-label">New password</label><div class = "col-sm-8"><input type="password" id = "password1" class = "form-control" name = "newpassword" placeholder="New password" data-minlength="6" required></div><div id = "valid_newpass" class="help-block with-errors">Minimum of 6 characters</div></div>');
    passwordForm.append(newPassword);

    var confirmPassword = $('<div class = "form-group row"><label for = "confirmpassword" class ="col-sm-4 col-form-label" >Confirm new password</label><div class = "col-sm-8"><input type="password" class = "form-control" name = "confirmpassword" placeholder = "Confirm new passowrd" data-match="#password1" data-match-error="Whoops, these do not match" required></div><div id = "confirm_pass" class="help-block with-errors"></div></div>');
    passwordForm.append(confirmPassword);

    var changeBtn = $('<div class="form-group row"><div class = "col-sm-5 div-center"><div class = "change-btn"><a href="#" id = "savePassword">Change password</a></div></div>');
    passwordForm.append(changeBtn);

    var totalDiv = $('<div class = "total" id = "totalDiv"></div>');
    var frostDiv = $('<div class="frosted-glass"></div>');
    totalDiv.append(frostDiv);
    totalDiv.append(profileDiv);
    totalDiv.appendTo('body');
    //$('.profile-link').attr('tabindex', 0);
    $('#profileLink').focus();
    $('#profilePhoto').attr('src', user.profile.avatar);
    $('.user-info').html(user.profile.first_name + " " + user.profile.last_name);
    if (user.profile.location.city && user.profile.location.province && user.profile.location.country_code)
        $('.location').html(user.profile.location.city + "." + user.profile.location.province + "<br>" + user.profile.location.postal_code + " " + user.profile.location.country_code);
    $('#userName').val(user.username);
    $('#firstname').val(user.profile.first_name);
    $('#lastname').val(user.profile.last_name);

    if (user.profile.gender == 'Female') {
        $('#male').prop('checked', false);
        $('#female').prop('checked', true);
    } else {
        $('#female').prop('checked', false);
        $('#male').prop('checked', true);
    }
    if (user.profile.location.city) {
        $('#city').val(user.profile.location.city);
    }
    if (user.profile.location.province) {
        $('#province').val(user.profile.location.province);
    }
    if (user.profile.location.postal_code) {
        $('#postalcode').val(user.profile.location.postal_code);
    }

    $.each(countryList, function() {
        $('#country').append($('<option/>', {
            value: this.code,
            text: this.name
        }));

    });
    $('#country').val(user.profile.location.country_code);

    $('#profileForm').validator();
};

function uploadProfile(person) {
    var infoDiv = $('<div class = "contact-profile"></div>');
    var contentDiv = $('<div class = "contact-profile-content"></div>');
    infoDiv.append(contentDiv);
    var img = $('<img />');
    img.attr('src', person.profile.avatar);
    contentDiv.append(img);
    var detailsInfo = $('<div class = "profile-details"></div>');
    contentDiv.append(detailsInfo);
    var firstName = $('<div class = "profile-field"><p>First Name:</p></div>');
    var firstNameSpan = $('<span></span>');
    firstNameSpan.html(person.profile.first_name);
    firstName.append(firstNameSpan);
    detailsInfo.append(firstName);
    var lastName = $('<div class = "profile-field"><p>Last Name:</p></div>');
    var lastNameSpan = $('<span></span>');
    lastNameSpan.html(person.profile.last_name);
    lastName.append(lastNameSpan);
    detailsInfo.append(lastName);
    var gender = $('<div class = "profile-field"><p>Gentle:</p></div>');
    var genderSpan = $('<span></span>');
    genderSpan.html(person.profile.gender);
    gender.append(genderSpan);
    detailsInfo.append(gender);
    var location = $('<div class = "profile-field"><p>Location:</p></div>');
    var locationSpan = $('<span></span>');
    locationSpan.html(person.profile.location);
    location.append(locationSpan);
    detailsInfo.append(location);
    var relation = $('<div class = "profile-field"><p>relationship:</p></div>');
    relationSpan = $('<span></span>');
    relationSpan.html(person.class);
    relation.append(relationSpan);
    detailsInfo.append(relation);
    var buttonDiv = $('<div class = "profile-button"><button class = "btn btn-success">OK</button></div>');
    detailsInfo.append(buttonDiv);
    var total = $('<div class = "total"></div>');
    total.append(infoDiv);
    $('body').append(total);
};

function showNote() {
    var noteList = "";
    if (notificationList.length > 0) {
        for (var x in notificationList) {
            noteList += notificationList[x].note + '<br>';
        }
    } else {
        noteList = 'There is no notification';
    }
    $.Zebra_Dialog(noteList, {
        type: 'information',
        title: 'notification',
        buttons: ['OK']
    })
};

function getPersonalInfo(person) {
    for (var x in userList) {
        if (userList[x].username === person) {
            return userList[x];
        }
    }
    return null;
};

function getUnknownMemberInfo(person) {
    for (var x in unknownMemberList) {
        if (unknownMemberList[x].username === person) {
            return unknownMemberList[x];
        }
    }
    return null;
};

function getGroupInfo(name) {
    for (let i = 0; i < groupList.length; i++) {
        if (groupList[i].name === name) {

            return groupList[i];
        }
    }
    return null
};

function saveSendRecord(newMessage) {
    var findIt = false;
    if (privateMessageList.length > 0) {
        for (var x in privateMessageList) {
            if (privateMessageList[x].friend === newMessage.receiver) {
                privateMessageList[x].message.push(newMessage);
                findIt = true;
                // save data to local
                readPrivateChatHistory(newMessage.receiver, function(records) {
                    for (var x in records) {
                        console.log(newMessage.receiver + ' save id: ' + currentSaveId[newMessage.receiver]);
                        if (records[x].saveId == currentSaveId[newMessage.receiver]) {
                            records[x].message.push(newMessage);
                            savePrivateChatToLocal(newMessage.receiver, records)
                            break;
                        }
                    }
                });
                break;
            }
        }
    }
    if (privateMessageList.length <= 0 || !findIt) {
        var info = [];
        info.push(newMessage);
        var newprivateMessageList = {
            friend: newMessage.receiver,
            count: 0,
            message: info
        };
        privateMessageList.push(newprivateMessageList);
        // save data to local
        readPrivateChatHistory(newMessage.receiver, function(records) {
            var cloneInfo = [];
            cloneInfo.push(newMessage);
            if (records === null) { //if there is no chat record for this user in local
                var saveMessage = [];
                var info = {
                    saveId: '0',
                    message: cloneInfo
                }
                currentSaveId[newMessage.receiver] = 0;
                console.log(newMessage.receiver + ' save id: ' + currentSaveId[newMessage.receiver]);
                saveMessage.push(info);
                savePrivateChatToLocal(newMessage.receiver, saveMessage);
            } else {
                currentSaveId[newMessage.receiver] = records.length;
                console.log(newMessage.receiver + ' save id: ' + currentSaveId[newMessage.receiver]);
                var info = {
                    saveId: currentSaveId[newMessage.receiver],
                    message: cloneInfo
                }
                records.push(info);
                savePrivateChatToLocal(newMessage.receiver, records);
            }
        });
    }
};

function savePublicSendRecord(newMessage) {
    var findIt = false;
    if (publicMessageList.length > 0) {
        for (var x in publicMessageList) {
            if (publicMessageList[x].group === newMessage.group) {
                publicMessageList[x].message.push(newMessage);
                findIt = true;
                break;
            }
        }
        // save data to local
        readPublicChatHistory(newMessage.group, function(records) {
            for (var x in records) {
                if (records[x].saveId == currentGroupSaveId[newMessage.group]) {
                    records[x].message.push(newMessage);
                    savePublicChatToLocal(newMessage.group, records);
                    break;
                }
            }
        });
    }
    if (publicMessageList.length <= 0 || !findIt) {
        var info = [];
        info.push(newMessage);
        var newPublicMessageList = {
            group: newMessage.group,
            count: 0,
            message: info
        };
        publicMessageList.push(newPublicMessageList);
        // save data to local
        readPublicChatHistory(newMessage.group, function(records) {
            var cloneInfo = [];
            cloneInfo.push(newMessage);
            if (records === null) { //if there is no chat record for this user in local
                var saveMessage = [];
                var info = {
                    saveId: '0',
                    message: cloneInfo
                }
                currentGroupSaveId[newMessage.group] = 0; //initialize group save id
                saveMessage.push(info);
                savePublicChatToLocal(newMessage.group, saveMessage);
            } else {
                currentGroupSaveId[newMessage.group] = records.length; //current group save id equal the latest group save id plus 1
                var info = {
                    saveId: currentGroupSaveId[newMessage.group],
                    message: cloneInfo
                }
                records.push(info);
                savePublicChatToLocal(newMessage.group, records);
            }
        });
    }
};

function saveReceiveRecord(message) {
    var findIt = false;
    var sender = getPersonalInfo(message.sender);
    var note;

    if (message.type === 'text') {
        note = sender.profile.first_name + ' ' + sender.profile.last_name + ' ' + 'sent a message to you at ' + message.date.hour + ':' + message.date.minute;
    } else if (message.type === 'image') {
        note = sender.profile.first_name + ' ' + sender.profile.last_name + ' ' + 'sent an image to you at ' + message.date.hour + ':' + message.date.minute;
    } else {
        note = sender.profile.first_name + ' ' + sender.profile.last_name + ' ' + 'sent a file to you at ' + message.date.hour + ':' + message.date.minute;
    }
    if (privateMessageList.length > 0) { //check if any sender sent message to this user before
        for (var x in privateMessageList) {
            if (privateMessageList[x].friend === message.sender) {
                privateMessageList[x].message.push(message);
                if (message.sender != interlocutor) //if sender is not in current chat window, record this notifictaion
                {
                    privateMessageList[x].count += 1; //define receive new message count
                    count++;
                    var newNoteList = {
                        sender: message.sender,
                        note: note
                    }
                    notificationList.push(newNoteList);
                }
                findIt = true;
                if (privateMessageList[x].count) $('#' + message.sender + 'Div').find('.new-message').html(privateMessageList[x].count);
                // save data to local
                readPrivateChatHistory(message.sender, function(records) {
                    for (var x in records) {
                        if (records[x].saveId == currentSaveId[message.sender]) {
                            records[x].message.push(message);
                            savePrivateChatToLocal(message.sender, records)
                            break;
                        }
                    }
                });
                break;
            }
        }
    }
    if (privateMessageList.length < 0 || !findIt) { //if this is the first message user received or this user did not send any message before
        var messages = [];
        messages.push(message);
        var qty;
        if (message.sender != interlocutor) qty = 1
        else qty = 0;
        var newprivateMessageList = {
            friend: message.sender,
            count: qty,
            message: messages
        };
        privateMessageList.push(newprivateMessageList);
        count += qty;
        if (qty > 0) { //if sender is not in current chat window, record this notifictaion

            var newNoteList = {
                sender: message.sender,
                note: note
            }
            notificationList.push(newNoteList);
        }
        if (message.sender != interlocutor) $('#' + message.sender + 'Div').find('.new-message').html('1');
        // save data to local
        readPrivateChatHistory(message.sender, function(records) {
            var cloneInfo = [];
            cloneInfo.push(message);
            if (records === null) { //if there is no chat record for this user in local
                var saveMessage = [];
                var info = {
                    saveId: '0',
                    message: cloneInfo
                }
                currentSaveId[message.sender] = 0;
                saveMessage.push(info);
                savePrivateChatToLocal(message.sender, saveMessage);
            } else {
                currentSaveId[message.sender] = records.length;
                var info = {
                    saveId: currentSaveId[message.sender],
                    message: cloneInfo
                }
                records.push(info);
                savePrivateChatToLocal(message.sender, records);
            }
        });
    }
};

function savePublicReceiveRecord(message) {
    var findIt = false;
    senderName = message.senderName;
    var note;

    if (message.type === 'text' || message.type === 'group_text') {
        note = senderName + ' ' + 'sent a message to you at ' + message.date.hour + ':' + message.date.minute + ' in group ' + message.group;
    } else if (message.type === 'image') {
        note = senderName + ' ' + 'sent an image to you at ' + message.date.hour + ':' + message.date.minute + ' in group ' + message.group;
    } else {
        note = senderName + ' ' + 'sent a file to you at ' + message.date.hour + ':' + message.date.minute + ' in group ' + message.group;
    }
    if (publicMessageList.length > 0) { //check if this user receive group message before
        for (var x in publicMessageList) {
            if (publicMessageList[x].group === message.group) {
                publicMessageList[x].message.push(message);
                if (message.group != currentGroup) //if group is not in current chat window, record this notifictaion
                {
                    publicMessageList[x].count += 1; //define receive new message count
                    count++;
                    var newNoteList = {
                        group: message.group,
                        note: note
                    }
                    notificationList.push(newNoteList);
                }
                findIt = true;
                if (publicMessageList[x].count) $('#' + message.group.replace(/\s/g, '') + 'Div').find('.new-message').html(publicMessageList[x].count);
                // save data to local
                readPublicChatHistory(message.group, function(records) {
                    for (var x in records) {
                        if (records[x].saveId == currentGroupSaveId[message.group]) {
                            records[x].message.push(message);
                            savePublicChatToLocal(message.group, records);
                            break;
                        }
                    }
                });
                break;
            }
        }
    }
    if (publicMessageList.length < 0 || !findIt) { //if this is the first message user received or this user did not send any message before
        var messages = [];
        messages.push(message);
        var qty;
        if (message.group != currentGroup) qty = 1
        else qty = 0;
        var newpublicMessageList = {
            group: message.group,
            count: qty,
            message: messages
        };
        publicMessageList.push(newpublicMessageList);
        count += qty;
        if (qty > 0) { //if sender is not in current chat window, record this notifictaion
            var newNoteList = {
                group: message.group,
                note: note
            }
            notificationList.push(newNoteList);
        }
        if (message.group != currentGroup) $('#' + message.group.replace(/\s/g, '') + 'Div').find('.new-message').html('1');
        // save data to local
        readPublicChatHistory(message.group, function(records) {
            var cloneInfo = [];
            cloneInfo.push(message);
            if (records === null) { //if there is no chat record for this user in local
                var saveMessage = [];
                var info = {
                    saveId: '0',
                    message: cloneInfo
                }
                currentGroupSaveId[message.group] = 0;
                saveMessage.push(info);
                savePublicChatToLocal(message.group, saveMessage);
            } else {
                currentGroupSaveId[message.group] = records.length;
                var info = {
                    saveId: currentGroupSaveId[message.group],
                    message: cloneInfo
                }
                records.push(info);
                savePublicChatToLocal(message.group, records);
            }
        });
    }
};

function displaySendMessage(newMessage) {
    var chatItem;
    chatItem = $('<li class="chat-item left"></li>');
    var dateDiv = $('<div class = "send-date"></div>');
    dateDiv.html(newMessage.date.day + '-' + newMessage.date.month + '-' + newMessage.date.year);
    chatItem.append(dateDiv);
    var chatDiv = $('<div class ="avatar-info-left"></div>');
    chatItem.append(chatDiv);
    var senderAvatar = $('<img class="chat-avatar">');
    senderAvatar.attr('src', user.profile.avatar);
    chatDiv.append(senderAvatar);
    var timeDiv = $('<div class = "time"></div>');
    var time = newMessage.date.hour + ":" + newMessage.date.minute;
    timeDiv.html(time);
    chatDiv.append(timeDiv);

    if (newMessage.type === 'image') {

        var imgDiv = $('<div></div>');
        var imgLink = $('<a href = "#"></a>');
        imgLink.attr('id', user.username + newMessage.date.time + newMessage.date.day + newMessage.date.month + newMessage.date.year);
        imgDiv.append(imgLink);
        var imgTag = $('<img class = "image-frame-left">');
        if (newMessage.content === null)
            imgTag.attr('src', 'img/no-image.jpg');
        else
            imgTag.attr('src', newMessage.content);
        imgLink.append(imgTag);
        chatItem.append(imgDiv);

    } else {
        var contentDiv = $('<div class="bubble-item"></div>');
        if (user.profile.gender === 'Female') {
            contentDiv.addClass('bubble-parrot-red');
        } else {
            contentDiv.addClass('bubble-parrot-yellow');
        }
        chatItem.append(contentDiv);

        var chatContent = $('<div class ="chat-content"></div>');
        if (newMessage.type === 'text') {
            var textContent = replaceURLWithHTMLLinks(newMessage.content);
            chatContent.html(textContent);

        } else {
            var preText = $('<p></p>');
            if (newMessage.receiver != null) {
                var receiver = getPersonalInfo(newMessage.receiver);
                preText.html('Send the following file to ' + receiver.profile.first_name + ' ' + receiver.profile.last_name + ' successfully ');

            } else {
                preText.html('Send the following file to group ' + newMessage.group + ' successfully, please click ');
            }
            chatContent.append(preText);
            var fileLink = $('<a target = "_blank" class = "file-link">here to download</a>');
            fileLink.attr('href', newMessage.content);
            chatContent.append(fileLink);
        }
        contentDiv.append(chatContent);
        var symbol = $('<span class="cell cell-5"></span>');
        contentDiv.append(symbol);
    }
    chatItem.appendTo($('#chatList'));
    // $('#chatWrapper').scrollTop($('#chatList li').last().position().top + $('#chatList li').last().height());
    updateScroll();
};

function sendMessage(textField) {
    //var newText = $('#message').val();
    var newText = textField;
    if (!newText) return;
    var sendDate = new Date();
    var day = sendDate.getDate();
    var month = sendDate.getMonth() + 1;
    var year = sendDate.getFullYear();
    var hour = sendDate.getHours();
    var minute = sendDate.getMinutes();

    if (parseInt(minute) < 10) {
        minute = '0' + minute.toString();
    }
    if (interlocutor != null) {
        var newMessage = {
            type: 'text',
            sender: user.username,
            receiver: interlocutor,
            content: newText,
            date: {
                year: year,
                month: month,
                day: day,
                hour: hour,
                minute: minute
            }
        };
        // record this message to privateMessageList
        saveSendRecord(newMessage);
        socket.emit('send message', newMessage);
        displaySendMessage(newMessage);
    } else {
        if (currentGroup != null) {
            var newMessage = {
                type: 'text',
                sender: user.username,
                senderName: user.profile.first_name + ' ' + user.profile.last_name,
                group: currentGroup,
                content: newText,
                date: {
                    year: year,
                    month: month,
                    day: day,
                    hour: hour,
                    minute: minute
                }
            };
            savePublicSendRecord(newMessage);
            displaySendMessage(newMessage);
            socket.emit('send group message', newMessage);
        }
    }
};

function displayReceiveMessage(message) {

    var sender = getPersonalInfo(message.sender);
    var chatItem, hint;
    if (message.sender != interlocutor) {
        $('#noteMsg').css('color', 'yellow');
        $('#notificationCount').html(count);
        if (message.type === 'text') {
            hint = message.content;
        } else if (message.type === 'image') {
            hint = sender.profile.first_name + ' ' + sender.profile.last_name + ' send you an image';
        } else { hint = sender.profile.first_name + ' ' + sender.profile.last_name + ' share a file'; }
        $('#' + message.sender + 'Div').find('.latest-message').html(hint);

    } else {
        chatItem = $('<li class="chat-item right"></li>');
        var dateDiv = $('<div class = "send-date"></div>');
        dateDiv.html(message.date.day + '-' + message.date.month + '-' + message.date.year);
        chatItem.append(dateDiv);
        var chatDiv = $('<div class ="avatar-info-right"></div>');
        chatItem.append(chatDiv);
        var senderAvatar = $('<img class="chat-avatar">');
        senderAvatar.attr('src', sender.profile.avatar);
        chatDiv.append(senderAvatar);
        var timeDiv = $('<div class = "time"></div>');
        var time = message.date.hour + ':' + message.date.minute;
        timeDiv.html(time);
        chatDiv.append(timeDiv);
        if (message.type === 'image') {

            var imgDiv = $('<div></div>');
            var imgLink = $('<a href = "#"></a>');
            imgLink.attr('id', sender.username + message.date.time + message.date.day + message.date.month + message.date.year);
            imgDiv.append(imgLink);
            var imgTag = $('<img class = "image-frame-right">');
            if (message.content === null) {
                imgTag.attr('src', 'img/no-image.jpg');
            } else {
                imgTag.attr('src', message.content);
            }
            imgLink.append(imgTag);
            chatItem.append(imgDiv);

        } else {
            var contentDiv = $('<div class="bubble-item"></div>');
            if (sender.profile.gender === 'Female') {
                contentDiv.addClass('bubble-parrot-red');
            } else {
                contentDiv.addClass('bubble-parrot-yellow');
            }

            chatItem.append(contentDiv);
            var chatContent = $('<div class ="chat-content"></div>');
            if (message.type === 'text') {
                var textContent = replaceURLWithHTMLLinks(message.content);
                chatContent.html(textContent);
            } else {
                var fileLink = $('<a target = "_blank" class = "file-link">here to download</a>');
                fileLink.attr('href', message.content);
                var preText = $('<p></p>');
                preText.html(sender.profile.first_name + ' ' + sender.profile.last_name + ' send you a file, please click ');
                preText.append(fileLink);
                chatContent.append(preText);
            }

            contentDiv.append(chatContent);
            var symbol = $('<span class="cell cell-7"></span>');
            contentDiv.append(symbol);
        }

        $('#chatList').append(chatItem);
        //$('#chatWrapper').scrollTop($('#chatList li').last().position().top + $('#chatList li').last().height());
        updateScroll();
    }
};

function displayPublicReceiveMsg(message) {
    var sender = getPersonalInfo(message.sender);
    if (!sender) { //if can not find sender in contacts, search it in unknown members
        sender = getUnknownMemberInfo(message.sender);
        if (!sender) { //if can not find sender in unknown members, send req to server
            socket.emit('getUnknownMember', message.sender, function(unKnownMemberinfo) {
                sender = unKnownMemberinfo;
                displayReceiveMsg(message, sender);
            })
        } else {
            displayReceiveMsg(message, sender);
        }
    } else {
        displayReceiveMsg(message, sender);
    }

};

function displayReceiveMsg(message, sender) {
    var chatItem, hint;
    if (message.group != currentGroup) {
        $('#noteMsg').css('color', 'yellow');
        $('#notificationCount').html(count);
        if (message.type === 'text' || message.type === 'group_text') {
            hint = message.content;
        } else if (message.type === 'image') {
            hint = sender.profile.first_name + ' ' + sender.profile.last_name + ' share an image';
        } else { hint = sender.profile.first_name + ' ' + sender.profile.last_name + ' share a file'; }
        $('#' + message.group.replace(/\s/g, '') + 'Div').find('.latest-message').html(hint);

    } else {
        chatItem = $('<li class="chat-item right"></li>');
        var dateDiv = $('<div class = "send-date"></div>');
        dateDiv.html(message.date.day + '-' + message.date.month + '-' + message.date.year);
        chatItem.append(dateDiv);
        var chatDiv = $('<div class ="avatar-info-right"></div>');
        chatItem.append(chatDiv);
        var senderAvatar = $('<img class="chat-avatar">');
        senderAvatar.attr('src', sender.profile.avatar);
        chatDiv.append(senderAvatar);
        var timeDiv = $('<div class = "time"></div>');
        var time = message.date.hour + ':' + message.date.minute;
        timeDiv.html(time);
        chatDiv.append(timeDiv);
        if (message.type === 'image') {

            var imgDiv = $('<div></div>');
            var imgLink = $('<a href = "#"></a>');
            imgLink.attr('id', sender.username + message.date.time + message.date.day + message.date.month + message.date.year);
            imgDiv.append(imgLink);
            var imgTag = $('<img class = "image-frame-right">');
            if (message.content === null) imgTag.attr('src', 'img/no-image.jpg');
            else imgTag.attr('src', message.content);
            imgLink.append(imgTag);
            chatItem.append(imgDiv);

        } else {
            var contentDiv = $('<div class="bubble-item"></div>');
            if (sender.profile.gender === 'Female') {
                contentDiv.addClass('bubble-parrot-red');
            } else {
                contentDiv.addClass('bubble-parrot-yellow');
            }

            chatItem.append(contentDiv);
            var chatContent = $('<div class ="chat-content"></div>');
            if (message.type === 'text' || message.type === 'group_text') {
                var textContent = replaceURLWithHTMLLinks(message.content);
                chatContent.html(textContent);
            } else {
                var preText = $('<p></p>');
                var fileLink = $('<a target = "_blank" class = "file-link">here to download</a>');
                fileLink.attr('href', message.content);
                preText.html(sender.profile.first_name + ' ' + sender.profile.last_name + ' share a file, please click ');
                chatContent.append(preText);
                preText.append(fileLink);
            }

            contentDiv.append(chatContent);
            var symbol = $('<span class="cell cell-7"></span>');
            contentDiv.append(symbol);
        }

        $('#chatList').append(chatItem);
        //$('#chatWrapper').scrollTop($('#chatList li').last().position().top + $('#chatList li').last().height());
        updateScroll();

    }
};

function exitProfile() {
    $('#totalDiv').remove();
    $('#response').remove();
    location.reload();
};

function logout() {

    $.post('/user/logout', function() {
        window.location.replace('/login')
    });
};

function enlargeImg() {
    var imgWindow = $('<div class = "img-window"></div>');
    var toolBar = $('<div class = "img-tool-bar"></div>');
    imgWindow.append(toolBar);
    var controlDiv = $('<div class = "control-size"><div class = "factor"><h3>100%</h3></div><div id="magnify"><i  class="fa fa-search-plus"></i></div><div class = "range"><input type = "range" id = "range" min = "25" max = "175" step = "25" value = "100"  ></div><div id="minify"><i  class="fa fa-search-minus"></i></div></div>');
    toolBar.append(controlDiv);
    var download = $('<div class = "img-download"><a id = "downloadImg" download="image.png"><i class = "fa fa-download"></i></a></div>');
    toolBar.append(download);
    var closeTag = $('<div class = "close-div"><a  class="close"><i class="fa fa-times" aria-hidden="true"></i></a></div>')
    toolBar.append(closeTag);
    var imgDiv = $('<div class = "enlarge"></div>');
    imgWindow.append(imgDiv);
    var imgTag = $('<img id = "fullImage">');
    imgTag.attr('src', $(this).attr('src'));
    imgDiv.append(imgTag);

    var totalDiv = $('<div class = "total"></div>');
    var maskDiv = $('<div class = ".frosted-glass" ></div>');
    maskDiv.append(imgWindow);
    totalDiv.append(maskDiv);
    totalDiv.appendTo('body');
    var url = $('#fullImage').attr('src').replace(/^data:image\/[^;]/, 'data:application/octet-stream');
    $('#downloadImg').attr('href', url);

};

function changeSize() {
    var factor = $('#range').val();
    if (!change) {
        oldWidth = $('#fullImage').width();
        oldHeight = $('#fullImage').height();
        change = true;
    }
    var newWidth = oldWidth * parseInt($('#range').val()) / 100;
    var newHeight = oldHeight * parseInt($('#range').val()) / 100;

    $('#fullImage').css('width', newWidth);
    $('#fullImage').css('height', newHeight);
    $('.factor h3').html(factor + '%')
};

function attachFile() {
    var fileUploadWindow = $('<div class = "file-upload-window"></div>');
    var closeDiv = $('<div class = "close-div-fileupload"><a href="#" id="closeFileUpload"><i class ="fa fa-times"></i></a></div>')
    fileUploadWindow.append(closeDiv);
    var formDiv = $('<div class = "file-Div"></div>');
    fileUploadWindow.append(formDiv);
    var fileForm = $('<form autocomplete="off" data-toggle="validator" role="form"  id = "myFile" name="myFile" enctype="multipart/form-data" action="user/sendFile" method="post" multiple></form>');
    var fileAttachementField = $('<div class="form-group row"><div class = "col-sm-10"><input type = "file" id = "myFiles" class="form-control-file" name = "myFiles" multiple aria-describedby="fileHelp" required><small id="fileHelp" class="form-text text-muted">Please upload your file</small></div></div>');
    var submitBtn = $(' <div class="form-group row"><div class = "col-sm-5" style="margin-left:200px"><button id="submitFiles" type="button" class="btn btn-primary btn-block">send</button></div></div>');
    fileForm.append(fileAttachementField);
    fileForm.append(submitBtn);
    formDiv.append(fileForm);

    var totalDiv = $('<div class = "total"></div>');
    var maskDiv = $('<div class = ".frosted-glass" ></div>');
    maskDiv.append(fileUploadWindow);
    totalDiv.append(maskDiv);
    totalDiv.appendTo('body');
};

function removeMedia(callback) {

    navigator.getMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;
    navigator.getMedia({ "audio": useAudio, "video": useVideo }, function(stream) {
        var tracks = stream.getTracks();
        for (var i in tracks) {
            tracks[i].stop();
        }

        for (peerId in peers) {
            peers[peerId].close();
        }
        for (peerId in peerMediaStreams) {
            peerMediaStreams[peerId].remove();
        }

        myConnection = null;
        localMediaStream = null;
        peers = {};
        peerMediaStreams = {};
        videoChater = null;
        audioChater = null;
        $('.video').css('pointer-events', 'auto');
        $('.phone').css('pointer-events', 'auto');
        var result = true;
        useVideo = false;

        if (callback) callback(result);
    }, function(err) {
        console.log(err);
        result = false;
        if (callback) callback(result);
    })
};

function setupLocalMedia(callback, errorback) {

    navigator.getMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;


    navigator.getMedia({ "audio": useAudio, "video": useVideo }, function(stream) { /* user accepted access to a/v */
            var localMedia;
            localMediaStream = stream;
            var src = window.URL.createObjectURL(stream);
            var videoDiv = $('<div class= "local-media"></div>');
            if (!useVideo) {
                var localProfile = $('<img>');
                localProfile.attr('src', user.profile.avatar);
                var localProfileDiv = $('<div class = "local-profile-div"></div>');
                localProfileDiv.append(localProfile);
                videoDiv.append(localProfileDiv);
                localMedia = $('<audio></audio>');
            } else localMedia = $('<video id="localVideo" width="auto" height = "240px" autoplay = "autoplay"></video>')

            localMedia.attr('autoplay', 'autoplay');
            localMedia.attr("muted", "muted"); /* always mute ourselves by default */
            localMedia.attr("controls", "");
            localMedia.attr('src', src);
            videoDiv.append(localMedia);
            var popupDiv = $('<div class="media-popup"></div>');
            var header = $('<div class = "media-header"><p><tab3>Media Chat</tab3> <i id="min" class="fa fa-minus-square media-title"></i><i id="max" class="fa fa-square-o media-title" aria-hidden="true"></i><i id="disconnectVideo" class="fa fa-times media-title"></i></p></div>');
            popupDiv.append(header);
            popupDiv.append(videoDiv);
            $('body').append(popupDiv);
            if (!useVideo) $('#max').css('pointer-events', 'none');
            if (callback) callback();
        },
        function(err) { /* user denied access to a/v */
            alert("You chose not to provide access to the camera/microphone, video / audio chat will not work.");
            if (errorback) errorback();
        });
};

function replaceURLWithHTMLLinks(text) {
    var imgRegex1 = /<img.*?(?:>|\/>)/gi;
    var atagReg = /<a.*?(?:>|\/>)/gi;
    var urlRegex1 = /src=[\'\"]?([^\'\"]*)[\'\"]?/i;
    var aUrlReg = /href=[\'\"]?([^\'\"]*)[\'\"]?/i;
    var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    var imgRegex = /(http)?s?:?(\/\/[^"']*\.(?:png|jpg|jpeg|gif|png|svg|ico))/ig;
    var urlRegex2 = /(http)?s?:?(\/\/[^"']*\.(?:cur|cur\S+))/ig;
    var arr = text.match(imgRegex1); //get img tag
    var atag = text.match(atagReg); //get a tag
    var imgUrls = [];
    var aLinks = [];
    var cur = text.match(urlRegex2);
    var curs = [];

    if (arr != null) {
        for (var i = 0; i < arr.length; i++) {
            var src = arr[i].match(urlRegex1);
            if (src[1]) {
                imgUrls.push(src[1]);
            }
        }
    }

    if (atag != null) {
        for (var i = 0; i < atag.length; i++) {
            var src = atag[i].match(aUrlReg);
            if (src != null) {
                if (src[1]) {
                    aLinks.push(src[1]);
                }
            }
        }
    }
    if (cur != null) {
        for (var i = 0; i < cur.length; i++) {
            curs.push(cur[i]);
        }
    }

    return text.replace(urlRegex, function(match) {
        imgRegex.lastIndex = 0;
        if (imgUrls != null) {
            for (var i = 0; i < imgUrls.length; i++) {
                if (match == imgUrls[i]) {
                    return match;
                }
            }
        }
        if (aLinks != null) {
            for (var i = 0; i < aLinks.length; i++) {
                if (match == aLinks[i]) {
                    return match;
                }
            }
        }
        if (curs != null) {
            for (var i = 0; i < curs.length; i++) {
                if (match == curs[i]) {
                    return match;
                }
            }
        }
        if (imgRegex.test(match)) {
            return match;
        } else if (urlRegex2.test(match)) {
            return null;
        } else {
            return '<a href="' + match + '" target="_blank">' + match + '</a>';
        }

    })
};

function selectGroupAvatar(newGroupName) {
    var avatarUploadDiv = $('<div class = "form-group row avatar-upload-form"></div>');
    var title = $('<h5 class="group-avatar-title"></h5>');
    title.html('Please select an avatar for new group ' + newGroupName);
    avatarUploadDiv.append(title);
    var errorMsg = $('<div id="error-message" class = "hidden"></div>');
    avatarUploadDiv.append(errorMsg);
    var img = $('<div id = "avatarImg"></div>');
    avatarUploadDiv.append(img);
    var avatarUploadFrom = $('<form class = "group-avatar-form"></form>');
    var fileUpload = $('<div><input type="file" id="groupAvatar" accept = ".jpg, .gif, .png, .jpeg"  onchange="readURL(this)" name = "avatar" aria-describedby="fileHelp" ></div>');
    var small = $('<small id="fileHelp" class="form-text text-muted">Please upload your avatar file, up to 1MB</small>');
    avatarUploadFrom.append(fileUpload);
    avatarUploadFrom.append(small);
    avatarUploadDiv.append(avatarUploadFrom);
    var actionDiv = $('<div class = "group-avatar-action"></div>');
    avatarUploadDiv.append(actionDiv);
    var confirmBtn = $('<div class = "confirm-group-avatar"><button class = "btn btn-success"><a href = "#"><i class="fa fa-check fa-2x"></i></a></button></div>');
    actionDiv.append(confirmBtn);
    var cancelDiv = $('<div class = "cancel-group-avatar"><button class = "btn btn-danger"><a href="#"><i class = "fa fa-times fa-2x"></i></a></button></div>')
    actionDiv.append(cancelDiv);
    var groupNameDiv = $('<div id = "groupName" class = "hide"></div>');
    groupNameDiv.html(newGroupName);
    avatarUploadDiv.append(groupNameDiv);
    var total = $('<div class = "total"></div>');
    total.append(avatarUploadDiv);
    $('body').append(total);
    basic = $("#avatarImg").croppie({
        viewport: { width: 250, height: 250 },
        boundary: { width: 300, height: 300 },
        showZoomer: true,
        url: null
    });
};

function displayGroupInfo(group) {
    searchGroupResult = group;
    members = group.members;
    var groupDiv = $('<div class = "search-group-result"></div>');
    var avatar = $('<img class = "group-avatar" />');
    avatar.attr('src', group.avatar);
    groupDiv.append(avatar);
    var infoDiv = $('<div class= "group-infomation"></div>');
    groupDiv.append(infoDiv);
    var groupNameDiv = $('<div class = "group-name-info"></div>');
    groupNameDiv.html(group.name);
    infoDiv.append(groupNameDiv);
    var memberCountDiv = $('<div class = "member-count"></div>');
    var memberLink = $('<a href = "#"><img src = "../img/user-group-icon.png"/></a>')
    var span = $('<span></span>');
    span.html(group.memberCount);
    memberLink.append(span);
    memberCountDiv.append(memberLink);
    infoDiv.append(memberCountDiv);
    var inviteDiv = $('<div class = "join"><button  class = "btn btn-success"><i class = "fa fa-plus"></i><span>Join</span></button></div>');
    var cancelDiv = $('<div class = "leave"><button class = "btn btn-warning"><i class = "fa fa-sign-out"></i><span>Leave</span></button></div>');
    groupDiv.append(inviteDiv);
    groupDiv.append(cancelDiv);
    var totalDiv = $('<div class = "total"></div>');
    totalDiv.append(groupDiv);
    totalDiv.appendTo('body');

    for (var i = 0; i < groupList.length; i++) {

        if (groupList[i].name === group.name) {
            $('.join').css('pointer-events', 'none');
        }
    }
};

function checkBoxToggle(source) {
    var checkBoxes = $('.multiselect').find('input:checkbox');
    for (var i = 0; i < checkBoxes.length; i++) {
        checkBoxes[i].checked = source.checked;
    }
};

function toggleAll(source) {
    if (!source.checked) {
        var selectAll = $('.select-all').find('input:checkbox');
        selectAll.prop('checked', false);
    }
};

function listMembers(member) {
    var memberDiv = $('<div class = "member-list"></div>');
    var avatar = $('<img>');
    avatar.attr('src', member.avatar);
    memberDiv.append(avatar);
    var onlineDiv = $('<div></div>');
    if (member.online) {
        onlineDiv.attr('class', 'member-online');
    } else onlineDiv.attr('class', 'member-offline');
    memberDiv.append(onlineDiv);
    var name = $('<div class = "member-list-name"></div>');
    name.html(member.name);
    memberDiv.append(name);
    var relationship = $('<div class = "member-list-relationship"></div>');
    relationship.html(member.relationship);
    memberDiv.append(relationship);
    if (member.relationship === 'new') {
        var invite = $('<div class = "member-list-invite"><button class = "btn btn-success">Invite</button></div>');
        memberDiv.append(invite);
    }
    var username = $('<div class = "member-list-username"></div>');
    username.html(member.username);
    memberDiv.append(username);
    $('.members-list').append(memberDiv);

};

function invitePeople(invitee, inviteeName) {
    var sendDate = new Date();
    var day = sendDate.getDate();
    var month = sendDate.getMonth() + 1;
    var year = sendDate.getFullYear();
    var message = {
        inviter: user.username,
        invitee: invitee,
        inviteeName: inviteeName,
        class: 'friend', //by default
        date: {
            year: year,
            month: month,
            day: day
        }
    };
    socket.emit('invite people', message, function(feedback) {
        if (feedback === "be friend already") {
            $.Zebra_Dialog(inviteeName + ' is your friend already. Request is rejected', {
                type: 'error',
                title: 'Invite People Error',
                buttons: [{ caption: 'OK' }]
            })
        } else if (feedback === 'repeat request') {
            $.Zebra_Dialog('repeat request', {
                type: 'error',
                title: 'Invite People Error'
            })
        } else {
            popupOnlineNotice(feedback);
        }
    });
};

function getSelectionCharOffsetsWithin(element) {
    var start = 0,
        end = 0;
    var sel, range, priorRange;
    if (typeof window.getSelection != "undefined") {
        range = window.getSelection().getRangeAt(0);
        priorRange = range.cloneRange();
        priorRange.selectNodeContents(element);
        priorRange.setEnd(range.startContainer, range.startOffset);
        start = priorRange.toString().length;
        end = start + range.toString().length;
    } else if (typeof document.selection != "undefined" &&
        (sel = document.selection).type != "Control") {
        range = sel.createRange();
        priorRange = document.body.createTextRange();
        priorRange.moveToElementText(element);
        priorRange.setEndPoint("EndToStart", range);
        start = priorRange.text.length;
        end = start + range.text.length;
    }
    return {
        start: start,
        end: end
    };
}

function exitMediaChat() {
    $('.snapshot').css('pointer-events', 'none');
    var receiver = videoChater != null ? videoChater : audioChater;
    var message = {
        sender: user.username,
        receiver: receiver
    }
    socket.emit('disconnect media', message);
    $('.media-popup').remove();
    removeMedia();
};