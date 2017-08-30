var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    expressValidator = require('express-validator'),
    flash = require('connect-flash'),
    session = require('express-session');
var mongodB = require('mongodb'),
    mongoose = require('mongoose');
var passport = require('passport');

//include mongoose and create a connection to chat database
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/chat');
var db = mongoose.connection;

//initiate express
var app = express();
var server = require('http').createServer(app);
io = require('socket.io').listen(server);



//Set views and path
app.set('views', path.join(__dirname, 'views'));

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "uploads")));


// BodyParser Middleware

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
app.use(cookieParser());

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
    errorFormatter: function(param, msg, value) {
        var namespace = param.split('.'),
            root = namespace.shift(),
            formParam = root;

        while (namespace.length) {
            formParam += '[' + namespace.shift() + ']';
        }
        return {
            param: formParam,
            msg: msg,
            value: value
        };
    }
}));

// Connect Flash
app.use(flash());

// Global Vars
app.use(function(req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});



var routes = require('./routes/index'),
    users = require('./routes/users');
app.use('/', routes);
app.use('/user', users);


// Set Port
//var port = 3000;
var port = 80;
server.listen(port);
console.log("server is listening on " + port);