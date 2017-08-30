var mongoose = require('mongoose');
var groupSchema = mongoose.Schema({
    name: String,
    owner: String,
    avatar: String,
    members: [String]
});
var Group = module.exports = mongoose.model('Group', groupSchema);

module.exports.newGroup = function(newGroup, next) {
    //newGroup.save(next);
    Group.create(newGroup, next);
};
module.exports.getGroupByName = function(name, next) {
    var query = { name: name };
    Group.findOne(query, next);
};

module.exports.getAllGroupNames = function(callback) {
    var names = [];
    Group.find({}, 'name', function(err, groups) {
        for (var i = 0; i < groups.length; i++) {
            names.push(groups[i].name);

        }
        callback(null, names);
    })
};
module.exports.updateAvatar = function(name, avatar, next) {
    Group.getGroupByName(name, function(err, group) {
        if (err) throw err;
        group.avatar = avatar;
        group.save(next);
    })
}
module.exports.addMember = function(groupName, memberName, callback) {

    Group.getGroupByName(groupName, function(err, group) {
        if (err) throw err;
        if (!group) return callback(null, 'no group');
        if (typeof group.members != 'undefine' && group.members.lenght > 0) {
            for (var x in group.members) {
                if (group.members[x] === memberName) {
                    return callback(null, 'be a member already')
                }
            }
        }
        group.members.push(memberName);
        group.save(callback);
    })
};
module.exports.removeMember = function(groupName, memberName, callback) {
    console.log('group:' + groupName);
    Group.update({ name: groupName }, { $pull: { members: memberName } }, callback);
};
module.exports.removeGroup = function(groupName, callback) {
    Group.remove({ name: groupName }, callback);
}