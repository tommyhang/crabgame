var io;
var gameSocket;
var db;
/**
 * This function is called by index.js to initialize a new game instance.
 *
 * @param sio The Socket.IO library
 * @param socket The socket object for the connected client.
 */
exports.initGame = function(sio, socket,sdb){
    io = sio;
    gameSocket = socket;
    db=sdb;
    gameSocket.emit('connected', { message: "You are connected!" });

    //test Event
    gameSocket.on('test', test);
    gameSocket.on('roll', roll);
    gameSocket.on('updateBet',updateBet);
    gameSocket.on('getInitialData',getInitialData);

    // Player Events
    gameSocket.on('playerJoinGame', playerJoinGame);
    gameSocket.on('disconnect', playerDisconnect);

    // Create a Socket.IO Room
    var thisGameId = 1;

    // Join the Room 
    gameSocket.join(thisGameId.toString());

}

/**
 * getInitialData retrieves the current values of the board from the db
 */
function getInitialData() {

    var data = {};
    console.log("Retrieving initial data")

    
    db.serialize(function(){
        /**
            select all in connected_users table 
            for connecter user in connected_users
                get player_id

            db get ("SELECT * FROM player WHERE player_id='"+player_id+"';")
                data[player_id] = {}
                data[player_id]["gourd"]=row.player_gourd_bet;
                data[player_id]["crab"]=row.player_crab_bet;
                data[player_id]["shrimp"]=row.player_shrimp_bet;
                data[player_id]["fish"]=row.player_fish_bet;
                data[player_id]["rooster"]=row.player_rooster_bet;
                data[player_id]["deer"]=row.player_deer_bet;
                data[player_id]["money"]=row.player_money;
                data[player_id]["lastRoundWinAmount"]=row.player_last_round_win_amount;
            
        **/
        
       db.each("SELECT * FROM connected_users", function(err, row) {
           console.log("connected playerid",row);
            db.get("SELECT * FROM player WHERE player_id=?", [row.player_id], (err, row) => {
                data[row.player_id]=row;
            });
            
        }); 

        db.all("SELECT * FROM board", function(err, rows) {  
            data["dice1"]=rows[0].board_piece;
            data["dice2"]=rows[1].board_piece;
            data["dice3"]=rows[2].board_piece;
            // console.log("sending out initial: ",data)
        });
    });


    setTimeout(() => { io.sockets.emit('getInitialData',data); }, 1000);
    

    
}

/**
 * updateBet update bet of specific board piece
 * @param data "boardPiece = name of board piece. playerId=user Id used for searching up user"
 */
function updateBet(data) {
    var sock=this;

    var currentMoney = 0;
    var currentBetAmount = 0;
        
    console.log("update bet data",data)
    db.serialize(function(){
        // subtract bet from total money
        db.get("SELECT player_money FROM player WHERE player_id=?", [data.playerId], (err, row) => {
            currentMoney=row.player_money;
            currentMoney--;
            db.run("UPDATE player SET player_money=? WHERE player_id=?", currentMoney, data.playerId);
        });

        // increment bet for board piece
        db.get("SELECT player_"+data.boardPiece+"_bet FROM player WHERE player_id=?", [data.playerId], (err, row) => {
            currentBetAmount=row["player_"+data.boardPiece+"_bet"];
            currentBetAmount++;
            db.run("UPDATE player SET player_"+data.boardPiece+"_bet=? WHERE player_id=?",currentBetAmount,data.playerId);
            console.log("updated bet amount")

            // returning data back to client to update UI
            data['bets'] = currentBetAmount
            data['currentMoney'] = currentMoney
            // console.log(data.playerId,data.boardPiece,currentBetAmount,currentMoney)
            io.sockets.emit('updateBet',data);
        });
    });
}


/**
 * roll
 */
function roll() {
    
    var sock=this;
    var gamePieces = ["gourd", "crab", "shrimp", "fish", "rooster", "deer"]

    // var gamePieces = ["shrimp", "shrimp", "shrimp", "shrimp", "shrimp", "shrimp"]
    
    var data = [gamePieces[Math.floor(Math.random() * 6)],gamePieces[Math.floor(Math.random() * 6)],gamePieces[Math.floor(Math.random() * 6)]] 

    /*
        Game Rules
        If there are matches, refund original bet.
        1 Match = Win bet amount
        2 Match = Win double bet amount
        3 Match = Win triple bet amount
    */

    // Calculating round winnings for player
    var uniqueGamePieces = data.filter(onlyUnique);

    db.serialize(function(){

        // for each user (SELECT * FROM player)
        db.all("SELECT * FROM player", function(err, rows) {            
            rows.forEach(function (row) { 
                var roundWinnings = 0;
                // refund original bets if there are bets on winning board pieces

                console.log("before calc player money: ",row.player_money)
                for(const gamepiece of uniqueGamePieces)
                {
                    roundWinnings=roundWinnings+row["player_"+gamepiece+"_bet"];
                }
                console.log("refund amount:",roundWinnings)

                // calculate winnings
                for(const gamepiece of data)
                {
                    roundWinnings=roundWinnings+row["player_"+gamepiece+"_bet"];
                }

                console.log("winnings amount:",roundWinnings)

                // add winnings to user's money counter in db
                var playerTotalMoney = row.player_money+roundWinnings
                db.run("UPDATE player SET player_money=? WHERE player_id=?", playerTotalMoney, row.player_id);
                console.log("adding winnings to",row.player_id,playerTotalMoney,roundWinnings);

                // update player's last winnings value:
                db.run("UPDATE player SET player_last_round_win_amount=? WHERE player_id=?", roundWinnings, row.player_id);

                // Reset player's bets to 0
                db.run("UPDATE player SET player_gourd_bet=? WHERE player_id=?", 0, row.player_id);
                db.run("UPDATE player SET player_crab_bet=? WHERE player_id=?", 0, row.player_id);
                db.run("UPDATE player SET player_shrimp_bet=? WHERE player_id=?", 0, row.player_id);
                db.run("UPDATE player SET player_fish_bet=? WHERE player_id=?", 0, row.player_id);
                db.run("UPDATE player SET player_rooster_bet=? WHERE player_id=?", 0, row.player_id);
                db.run("UPDATE player SET player_deer_bet=? WHERE player_id=?", 0, row.player_id);
                console.log("reset player's bet");
            })
        });

        // Adding last dice roll round to db
        db.run("UPDATE BOARD SET board_piece=? WHERE dice=?", data[0], "dice_1");
        db.run("UPDATE BOARD SET board_piece=? WHERE dice=?", data[1], "dice_2");
        db.run("UPDATE BOARD SET board_piece=? WHERE dice=?", data[2], "dice_3");

        // reloading everyone's values
        db.all("SELECT * FROM board", function(err, rows) { 
            io.sockets.emit('reload',data);
        });
    });
}


/**
 * test
 * @param data 
 */
function test(data) {
    console.log("hi there");
}


function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}


/* *****************************
   *                           *
   *     PLAYER FUNCTIONS      *
   *                           *
   ***************************** */

/**
 * A player clicked the 'START GAME' button.
 * Attempt to connect them to the room that matches
 * the gameId entered by the player.
 * @param data Contains data entered via player's input - playerName and gameId.
 */
function playerJoinGame(data) {
    //console.log('Player ' + data.playerName + 'attempting to join game: ' + data.gameId );

    // A reference to the player's Socket.IO socket object
    var sock = this;

    // Look up the room ID in the Socket.IO manager object.
    var room = gameSocket.manager.rooms["/" + 1];

    // If the room exists...
    if( room != undefined ){
        // attach the socket id to the data object.
        data.mySocketId = sock.id;

        // Join the room
        sock.join(data.gameId);
        db.serialize(function()
        {
            var stmt = " SELECT * FROM player WHERE player_id='"+data.playerId+"';";
            db.get(stmt, function(err, row){
                if(err) throw err;
                if(typeof row == "undefined") {
                        db.prepare("INSERT INTO player (player_name,player_id,player_gourd_bet,player_crab_bet,player_shrimp_bet,player_fish_bet,player_rooster_bet,player_deer_bet,player_money,player_last_round_win_amount) VALUES(?,?,?,?,?,?,?,?,?,?)").run(data.playerName,data.playerId,0,0,0,0,0,0,100,0).finalize();
                } else {
                    // console.log("row is: ", row);
                }
            });
            db.prepare("INSERT INTO connected_users (socket_id,player_id) VALUES(?,?)").run(sock.id,data.playerId).finalize(); // adding dummy test account
            console.log("sock_id",sock.id);
            db.get(stmt, function(){
                // console.log('Player ' + data.playerId + ' joining game: ' + data.gameId );
                io.sockets.emit('reload',data);
            });
        });

        // io.sockets.emit('reload',data);
        // Emit an event notifying the clients that the player has joined the room.
        // io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

       
    } else {
        // Otherwise, send an error message back to the player.
        this.emit('error',{message: "This room does not exist."} );
    }
}

function playerDisconnect() {
    // A reference to the player's Socket.IO socket object
    var sock = this;
    /**
     * TODO:
     * Retrieve playerId using socket id
     * then: io.sockets.emit('disconnect',playerId);
     */
    db.run("DELETE FROM connected_users WHERE socket_id=?",sock.id);
    
    console.log("disconnect",sock.id)
}

