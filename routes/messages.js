/**
 * Created by kaylab on 2/27/16.
 */
var express = require('express');
var async = require('async');
var jwt = require("jwt-simple");
var moment = require("moment");
var debug = require('debug')('untitled:server');
//var fileupload = require('fileupload').createFileUpload('/uploadDir').middleware;

var router = express.Router();

var User = require('../models/user');
//var Message = require('../models/message');

router.post('/inbox', verifyToken, function (req, res) {
    var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
    getUser(token, res, req, function(token, res, req, user){
        var response = {
            "message": "",
            "payload": user
        };
        res.statusCode = 200;
        tryJson(res, response);
    });
});

router.post('/conversation', verifyToken, function (req, res) {
    var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
    getUser(token, res, req, function(token, res, req, user){
        var response = {
            "message": "",
            "payload": user
        };
        res.statusCode = 200;
        tryJson(res, response);
    });
});

function getInbox(token, res, req, fun){
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

}

function getConversation(token, res, req, fun){
    //var decoding;
    //try {
    //    decoding = jwt.decode(token, "itwasabrightcolddayinaprilandtheclockswerestrikingthirteen");
    //}catch(err){
    //    var response = {
    //        "message": "Invalid Token."
    //    };
    //    res.statusCode = 400;
    //    return res.json(response);
    //}
    //Message.find({$or:[ {'from':decoding.id}, {'to':decoding.id}}).sort({date: -1}).exec(function(err, data) {
    //    if(err) {
    //        var response = {
    //            "message": "Server side error when checking database."
    //        };
    //        res.statusCode = 400;
    //        return res.json(response);
    //    }
    //    var response = {
    //        "payload": data
    //    };
    //    res.statusCode = 200;
    //    return res.json(response);
    //});
}

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
    User.findOne({ 'local.email' :  decoding.email, 'local.password' :  decoding.password }, function(err, user) {
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
        fun(token, res, req, user);
    });
}

function verifyToken(req, res, next) {
    var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
    var tokened = true;
    if (!token) {
        var response = {
            "message": "Expired Token."
        };
        res.statusCode = 400;
        return res.json(response);
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
    User.findOne({ 'local.email' :  decoding.email, 'local.password' :  decoding.password }, function(err, user) {
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