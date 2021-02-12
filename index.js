// Import the Express module
var express = require('express');

// Import the 'path' module (packaged with Node.js)
var path = require('path');

// Create a new instance of Express
var app = express();

// Import the fs
var fs = require('fs');
// Import the Anagrammatix game file.
var agx = require('./crabgame');
const e = require('express');

//creating database if it doesn't exist
var file ="mydb.db";
var exists = fs.existsSync(file);

if(!exists) {
  console.log("Creating DB file.");
  fs.openSync(file, "w");
}

var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(file);

db.serialize(function() {
  if(!exists) {
    // setting up board db
    db.run("CREATE TABLE board (dice TEXT, board_piece TEXT)");
    db.prepare("INSERT INTO board (dice,board_piece) VALUES(?,?)").run("dice_1","").finalize(); 
    db.prepare("INSERT INTO board (dice,board_piece) VALUES(?,?)").run("dice_2","").finalize(); 
    db.prepare("INSERT INTO board (dice,board_piece) VALUES(?,?)").run("dice_3","").finalize(); 

    db.run("CREATE TABLE player (player_name TEXT,player_id TEXT, player_gourd_bet INT, player_crab_bet INT, player_shrimp_bet INT, player_fish_bet INT, player_rooster_bet INT, player_deer_bet INT, player_money INT, player_last_round_win_amount INT)");
    db.prepare("INSERT INTO player (player_name,player_id,player_gourd_bet,player_crab_bet,player_shrimp_bet,player_fish_bet,player_rooster_bet,player_deer_bet,player_money,player_last_round_win_amount) VALUES(?,?,?,?,?,?,?,?,?,?)").run("tester","tester",0,0,0,0,0,0,100,0).finalize(); // adding dummy test account
    
    db.run("CREATE TABLE connected_users (socket_id TEXT, player_id TEXT)");
  }
  else{
    db.run("DELETE FROM connected_users");
  }
});


// Create a simple Express application
app.configure(function() {
    // Turn down the logging activity
    app.use(express.logger('dev'));

    // Serve static html, js, css, and image files from the 'public' directory
    app.use(express.static(path.join(__dirname,'public')));
});

// Create a Node.js based http server on port 8080
var server = require('http').createServer(app).listen(process.env.PORT || 8080);

// Create a Socket.IO server and attach it to the http server
var io = require('socket.io').listen(server);

// Reduce the logging output of Socket.IO
io.set('log level',1);

// Listen for Socket.IO Connections. Once connected, start the game logic.
io.sockets.on('connection', function (socket) {
    //console.log('client connected');
    agx.initGame(io, socket,db);
});
