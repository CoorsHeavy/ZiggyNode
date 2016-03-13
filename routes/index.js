var express = require('express');
var jwt = require("jwt-simple");
var moment = require("moment");
var cookie = require('cookies');
var cookieParser = require('cookie-parser');
var multer = require('multer'),
    path = require('path');
var fs = require('fs');
var busboy = require('connect-busboy');

var debug = require('debug')('untitled:server');
//var fileupload = require('fileupload').createFileUpload('/uploadDir').middleware;

var router = express.Router();

var User = require('../models/user');

//router.post('/uploadPic', fileupload, function(req, res) {
//    // files are now in the req.body object along with other form fields
//    // files also get moved to the uploadDir specified
//});

router.get('/about',function(req, res){
    res.render('about.ejs');
});

router.get('/get', function(req, res) {
    console.log("Cookies :  ", req.cookies.ziggy_token);
});

router.get('/', isLoggedIn, function (req, res) {
    res.render('index.ejs'); // load the index.ejs file
});

router.post('/signup', isLoggedIn, function (req, res) {
    if(!req.body.email || !req.body.password) {
        return res.json('Error');
    }
    var email = req.body.email;
    var password = req.body.password;
    //var fullname = req.body.fullname;
    //var username = req.body.username;
    if (email)
        email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

    // asynchronous
    process.nextTick(function() {
        User.findOne({ 'local.email' :  email  }, function(err, user) {
            // if there are any errors, return the error
            if (err)
                return done(err);

            // check to see if theres already a user with that email
            if (user) {
                res.json("Email Taken");
            } else {

                // create the user
                var newUser            = new User();
                newUser.local.email    = email;
                newUser.local.password = newUser.generateHash(password);

                newUser.save(function(err, user) {
                    var nodemailer = require('nodemailer');
                    var transporter = nodemailer.createTransport('smtps://96hudson%40gmail.com:<placeholder>@smtp.gmail.com');
                    var mailOptions = {
                        from: '"Hudson Hughes" <96hudson@gmail.com>', // sender address
                        to: email, // list of receivers
                        subject: 'Hello ✔', // Subject line
                        text: 'Hello world 🐴', // plaintext body
                        html: '<b>Hello world 🐴</b>' // html body
                    };
                    transporter.sendMail(mailOptions, function(error, info){
                        if(error){
                            return console.log(error);
                        }
                        console.log('Message sent: ' + info.response);
                    });
                    res.json("Register Email Sent. Go back to the login screen to sign in.");
                });
            }

        });
    });
});

router.post('/login', isLoggedIn, function (req, res) {
    if(!req.body.email || !req.body.password) {
        var response = {
            "message": "Missing Email or Password"
        };
        res.statusCode = 400;
        return res.json(response);
    }
    var email = req.body.email;
    var password = req.body.password;
    if (email)
        email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching
    // asynchronous
    process.nextTick(function() {
        User.findOne({ 'local.email' :  email }, function(err, user) {
            // if there are any errors, return the error
            if (err) {
                var response = {
                    "message": "Server side error when checking database."
                };
                res.statusCode = 400;
                return res.json(response);
            }
            // check to see if theres already a user with that email
            if (user) {
                if(!user.validPassword(password)){
                    var response = {
                        "message": "Invalid Password."
                    };
                    res.statusCode = 400;
                    return res.json(response);
                }else {
                    var expires = moment().add('minutes', 5).valueOf();
                    var token = jwt.encode({
                        iss: user.local.email,
                        email: user.local.email,
                        password: user.local.password,
                        id: user._id,
                        exp: expires
                    }, "itwasabrightcolddayinaprilandtheclockswerestrikingthirteen");
                    var response = {token:token, decoded:jwt.decode(token, "itwasabrightcolddayinaprilandtheclockswerestrikingthirteen")};

                    res.cookie("ziggy_token" , token);
                    console.log(token);
                    return res.redirect('/profile');
                }
            } else {
                var response = {
                    "message": "Email address not valid."
                };
                res.statusCode = 400;
                return res.json(response);

            }

        });
    });
});

router.post('/logout', function(req, res){
    res.clearCookie("ziggy_token");
    res.redirect("/");
});

router.post('/editprofile', isLoggedIn, function (req, res) {
    var token = req.cookies.ziggy_token || (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
    console.log(req.body) // form fields

    getUser(token, res, req, function(token, res, req, user){
        var response = {
            "message": "",
            "payload": user
        };
        User.findById(user._id, function(err, p) {
            if (!p)
                return next(new Error('Could not load Document'));
            else {
                // do your updates here
                if(req.body.fname.length > 0)
                p.local.firstname = req.body.fname;
                if(req.body.lname.length > 0)
                p.local.lastname = req.body.lname;
                p.save(function(err) {
                    if (err)
                        console.log('error');
                    else
                        console.log('success');
                        res.redirect('profile');
                });
            }
        });

    });
});

router.post('/fileupload', function(req, res) {
    var token = req.cookies.ziggy_token || (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
    getUser(token, res, req, function(token, res, req, user){
        var fstream;
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file, filename) {
            console.log("Uploading: " + filename);
            fstream = fs.createWriteStream('public/profiles/' + user._id + ".jpg");
            file.pipe(fstream);
            fstream.on('close', function () {
                res.redirect('profile');
            });
        });
    });
});

router.get('/profile', verifyToken, function (req, res) {
    var token = req.cookies.ziggy_token || (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
    getUser(token, res, req, function(token, res, req, user){
        var response = {
            "message": "",
            "payload": user
        };
        res.statusCode = 200;
        //tryJson(res, response);
        console.log(user);
        var picturepath = "";
        var fs = require('fs');
        try {
            console.log("public/profiles/"+user._id+".jpg");
            fs.accessSync("public/profiles/"+user._id+".jpg", fs.F_OK);
            picturepath = "profiles/"+user._id+".jpg";
            // Do something
        } catch (e) {
            // It isn't accessible
            picturepath = "images/placeholder.jpg";
        }
        res.render('profile.ejs', { email : user.local.email, first : user.local.firstname, last : user.local.lastname, image : picturepath });
    });
});


function getUser(token, res, req, fun){
    var decoding;
    try {
        decoding = jwt.decode(token, "itwasabrightcolddayinaprilandtheclockswerestrikingthirteen");
    }catch(err){
        var response = {
            "message": "Invalid Token."
        };
        res.statusCode = 400;
        return res.json(response);
    }
    User.findOne({ 'local.email' :  decoding.email }, function(err, user) {
        if (err) {
            var response = {
                "message": "Server side error when checking database."
            };
            res.statusCode = 400;
            return res.json(response);
        }
        // check to see if theres already a user with that email
        if (!user) {
            var response = {
                "message": "User does not exist.",
                "email": decoding.email
            };
            res.statusCode = 400;
            return;
        }
        fun(token, res, req, user);
    });
}

function verifyToken(req, res, next) {
    var token = req.cookies.ziggy_token || (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
    console.log(token);
    var tokened = true;
    if (!token) {
        return res.json("No Token Provided");
    }
    var decoding;
    try {
       decoding = jwt.decode(token, "itwasabrightcolddayinaprilandtheclockswerestrikingthirteen");
    }catch(err){
        var response = {
            "message": "Invalid Token."
        };
        res.statusCode = 400;
        return res.json(response);
    }
    if(decoding.exp >= moment().value){
        var response = {
            "message": "Expired Token."
        };
        res.statusCode = 400;
        return res.json(response);
    }
    User.findOne({ 'local.email' :  decoding.email }, function(err, user) {
        if (err) {
            var response = {
                "message": "Server side error when checking database."
            };
            res.statusCode = 400;
            return res.json(response);
        }
        // check to see if theres already a user with that email
        if (!user) {
            var response = {
                "message": "User does not exist."
            };
            res.statusCode = 400;
            return res.json(response);
        }
    });
    return next();
}

function tryJson(res, json){
    try {
        res.send(json);
    }catch(err){

    }
}

function isLoggedIn(req, res, next) {
    var tokened = true;
    if (tokened) {
        return next();
    }
    res.json('Invalid Token');
}
module.exports = router;
