// Load required modules
var http    = require("http");              // http server core module
const cors = require('cors');
var express = require("express");           // web framework external module
var serveStatic = require('serve-static');  // serve static files
var socketIo = require("socket.io");        // web socket external module
var fs      = require("fs");        // file system core module
var port = process.env.PORT || 6001;
// This sample is using the easyrtc from parent folder.
// To use this server_example folder only without parent folder:
// 1. you need to replace this "require("../");" by "require("open-easyrtc");"
// 2. install easyrtc (npm i open-easyrtc --save) in server_example/package.json

var easyrtc = require("../"); // EasyRTC internal module

// Set process name
process.title = "node-easyrtc";

// Setup and configure Express http server. Expect a subfolder called "static" to be the web root.
var app = express();
app.use(cors());
app.use(serveStatic('static', {'index': ['index.html']}));

// Start Express http server on port
var webServer = http.createServer(app);

// Start Socket.io so it attaches itself to Express server
var socketServer = socketIo.listen(webServer, {"log level":1});

// Cross-domain workaround presented below:
/*
socketServer.origins(function(origin, callback) {
    if (origin && ![
        'http://localhost:' + port,
        '*'
    ].includes(origin)) {
        return callback('origin not allowed', false);
    }
    callback(null, true);
});
*/

easyrtc.setOption("logLevel", "debug");

// Overriding the default easyrtcAuth listener, only so we can directly access its callback
easyrtc.events.on("easyrtcAuth", function(socket, easyrtcid, msg, socketCallback, callback) {
    easyrtc.events.defaultListeners.easyrtcAuth(socket, easyrtcid, msg, socketCallback, function(err, connectionObj){
        if (err || !msg.msgData || !msg.msgData.credential || !connectionObj) {
            callback(err, connectionObj);
            return;
        }

        connectionObj.setField("credential", msg.msgData.credential, {"isShared":false});

        console.log("["+easyrtcid+"] Credential saved!", connectionObj.getFieldValueSync("credential"));

        callback(err, connectionObj);
    });
});

// To test, lets print the credential to the console for every room join!
easyrtc.events.on("roomJoin", function(connectionObj, roomName, roomParameter, callback) {
    easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, function(err, success) {
        if(err) {
            callback(err, null);
            return;
        }else{
            console.log("roomJoin " + success);
            callback(err, success);
        }
    });
});

// Start EasyRTC server
var rtc = easyrtc.listen(app, socketServer, null, function(err, rtcRef) {
    console.log("Initiated");

    rtcRef.events.on("roomCreate", function(appObj, creatorConnectionObj, roomName, roomOptions, callback) {
        console.log("roomCreate fired! Trying to create: " + roomName);

        appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
    });
});
var chatHistories = require('../lib/easyrtc_default_event_listeners.js');

function getChatHistory(roomName) {
    var chatHistory = chatHistories.get(roomName);
    return chatHistory;
}

app.get('/api/chathistory/:roomName', function(req, res) {
    var roomName = req.params.roomName;
    var chatHistory = getChatHistory(roomName);
    if (chatHistory) {
        res.json(chatHistory);
    } else {
        res.status(404).send('Chat history not found for this ' + roomName + ' room');
    }
});
// Listen on port
webServer.listen(port, function () {
    console.log('listening on http://localhost:' + port + '/');
});
