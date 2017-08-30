var mongoose = require('mongoose');

var tokenSchema = mongoose.Schema({
    user_id: String,
    token: String
});

var Token = module.exports = mongoose.model('Token', tokenSchema);

module.exports.consume = function(token, next) {
    var query = { token: token };
    Token.findOne(query, next);
}

module.exports.save = function(token, id, next) {
    var query = { user_id: id };
    Token.findOne(query, function(err, result) {
        if (err) throw err;
        if (!result) {
            var newToken = new Token({
                user_id: id,
                token: token
            });
            newToken.save(next);
        } else {
            result.token = token;
            result.save(next);
        }
    })
};

module.exports.generateToken = function(digit_number) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < digit_number; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}