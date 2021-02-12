;
jQuery(function($){
    'use strict';

    /**
     * All the code relevant to Socket.IO is collected in the IO namespace.
     *
     * @type {{init: Function, bindEvents: Function, onConnected: Function, playerJoinedRoom: Function, error: Function}}
     */
    var IO = {

        /**
         * This is called when the page is displayed. It connects the Socket.IO client
         * to the Socket.IO server
         */
        init: function() {
            IO.socket = io.connect();
            IO.bindEvents();
            
        },

        /**
         * While connected, Socket.IO will listen to the following events emitted
         * by the Socket.IO server, then run the appropriate function.
         */
        bindEvents : function() {
            IO.socket.on('connected', IO.onConnected );
            
            IO.socket.on('playerJoinedRoom', IO.playerJoinedRoom );

            IO.socket.on('error', IO.error );

            IO.socket.on('updateBet',IO.updateBet);

            IO.socket.on('getInitialData',IO.getInitialData);
            

            IO.socket.on('reload',IO.reload);
            
            IO.socket.on('disconnect', function () {	
                IO.socket.emit('test');	
              });
        },

        /**
         * The client is successfully connected!
         */
        onConnected : function() {
            // Cache a copy of the client's socket.IO session ID on the App
            App.mySocketId = IO.socket.socket.sessionid;
            console.log("Socket ID: "+App.mySocketId);

            // Storing playerId if it doesn't exist
            var playerId = localStorage.getItem('playerId');
            var playerName = localStorage.getItem('playerName');
            console.log("playerId: "+playerId);
            if(playerId===null)
            {
                playerId=uuidv4();
                console.log("setting playerId: " + playerId);
                localStorage.setItem('playerId',playerId);
            }
            var playerName = localStorage.getItem("playerName");
            if(playerName === null)
            {
                playerName = prompt("Please enter your name", "");
                localStorage.setItem("playerName", playerName);
            }
            else{
                
            }

            var data = {
                gameId : 0,
                playerName : playerName,
                playerId : playerId,
                socketId : App.mySocketId
            };
            
            console.log("payload to server",data)
            // Send the gameId and playerName to the server
            IO.socket.emit('playerJoinGame', data);
        },

        // Update bet amount
        updateBet : function(data){
            
            console.log("updateBet",data)
            betBoxUpdate(data.bets,data.playerId,data.boardPiece);
            updatePlayerMoney(data.playerId,data.currentMoney);

        },
        
        // updates the numbers in all the clients
        reload : function(){
            IO.socket.emit('getInitialData');
        },
        getInitialData : function(data)
        {
            console.log("setting initial data")
            console.log(data)


            for(var playerId in data)
            {
                if(!playerId.startsWith("dice"))
                {
                    console.log("player",playerId);
                    console.log(data[playerId]);
                    betBoxUpdate(data[playerId]["player_gourd_bet"],playerId,"gourd")
                    betBoxUpdate(data[playerId]["player_crab_bet"],playerId,"crab")
                    betBoxUpdate(data[playerId]["player_shrimp_bet"],playerId,"shrimp")
                    betBoxUpdate(data[playerId]["player_fish_bet"],playerId,"fish")
                    betBoxUpdate(data[playerId]["player_rooster_bet"],playerId,"rooster")
                    betBoxUpdate(data[playerId]["player_deer_bet"],playerId,"deer")
        
                    createPlayerBox(playerId,data[playerId]["player_name"])
                    updatePlayerMoney(playerId,data[playerId]["player_money"]);
                    updatePlayerLastWinAmount(playerId,data[playerId]["player_last_round_win_amount"]);
                }
            }
            
            $('#dice-one').attr("src","img/"+data["dice1"]+".png");
            $('#dice-two').attr("src","img/"+data["dice2"]+".png");
            $('#dice-three').attr("src","img/"+data["dice3"]+".png");
        },

        /**
         * A player has successfully joined the game.
         */
        playerJoinedRoom : function(data) {

            
            console.log("player joined",data);

            // creating hidden bet boxes under board pieces when a client connects
            betBoxCreate(0,data.playerId,"deer",true);
            betBoxCreate(0,data.playerId,"gourd",true);
            betBoxCreate(0,data.playerId,"rooster",true);
            betBoxCreate(0,data.playerId,"fish",true);
            betBoxCreate(0,data.playerId,"crab",true);
            betBoxCreate(0,data.playerId,"shrimp",true);

            createPlayerBox(data.playerId,data.playerName);
            IO.socket.emit('getInitialData');
        },

        /**
         * An error has occurred.
         * @param data
         */
        error : function(data) {
            alert(data.message);
        }

    };

    // Helper function for generating UUID for user ids
    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
    }

    // Helper function used for converting UUID to colors
    var stringToColour = function(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        var colour = '#';
        for (var i = 0; i < 3; i++) {
            var value = (hash >> (i * 8)) & 0xFF;
            colour += ('00' + value.toString(16)).substr(-2);
        }
        return colour;
    }

    function updatePlayerMoney(playerId,money)
    {
        var playerMoney = document.getElementById(playerId+"-money");
        playerMoney.innerHTML = money;
    }
    function updatePlayerLastWinAmount(playerId,lastRoundWinAmount)
    {
        var playerLastRoundWinAmount = document.getElementById(playerId+"-last-round-win");
        playerLastRoundWinAmount.innerHTML = lastRoundWinAmount;
    }
    function createPlayerBox(playerId,playerName)
    {
        var playerTable = document.getElementById(playerId+"-table");
        if(playerTable === null)
        {
            console.log('creating player box');
            var playerArea = document.getElementById("players-container");

            playerTable = document.createElement("TABLE");
            playerTable.setAttribute("id", playerId+"-table");
            playerTable.style="border-radius: 20%;border: 15px solid "+stringToColour(playerId)+";";
            playerTable.style.backgroundColor = "white"

            var nameTR = document.createElement("TR");
            var nameTH = document.createElement("TH");
            nameTH.innerHTML=playerName;
            nameTR.appendChild(nameTH);
            
            var moneyTR = document.createElement("TR");
            var moneyTextTD = document.createElement("TD");
            var moneyValueTD = document.createElement("TD");
            moneyTextTD.innerHTML="money: ";
            moneyValueTD.innerHTML=0;
            moneyValueTD.setAttribute("id", playerId+"-money");
            moneyTR.appendChild(moneyTextTD);
            moneyTR.appendChild(moneyValueTD);
            
            var lastWinTR = document.createElement("TR");
            var lastWinTextTD = document.createElement("TD");
            var lastWinValueTD = document.createElement("TD");
            lastWinTextTD.innerHTML="last round win: ";
            lastWinValueTD.innerHTML=0;
            lastWinValueTD.setAttribute("id", playerId+"-last-round-win");
            lastWinTR.appendChild(lastWinTextTD);
            lastWinTR.appendChild(lastWinValueTD);
            
            playerTable.appendChild(nameTR);
            playerTable.appendChild(moneyTR);
            playerTable.appendChild(lastWinTR);
            
            playerArea.appendChild(playerTable);
        }
        else{

        }

        
    }

    // updates values of player bet boxes. Bet boxes turn invisible when bet value is 0
    function betBoxUpdate(bet,playerId,boardPiece) {
        var betBox = document.getElementById("container"+playerId+boardPiece);
        if(bet !== null)
        {
            console.log("BET",bet,playerId);
            if(betBox === null)
            {
                console.log("creating bet box");
                betBoxCreate(bet,playerId,boardPiece)
            }
            else{
                if(bet===0){
                    betBox.style="display:none;border: 15px solid "+stringToColour(playerId)+";";
                }
                else
                {
                    betBox.style="border: 15px solid "+stringToColour(playerId)+";";
                }
                betBox.innerHTML = bet;
            }
        }
        else{
            console.log("NULL BET",bet,playerId,boardPiece)
        }

    }

    // Helper function used for creating user's betbox underneath each boardpiece
    function betBoxCreate(bet,playerId,boardPiece) {
        var element = document.getElementById(boardPiece+"-container");
        var div = document.createElement("div");
        div.id = "container"+playerId+boardPiece;
        div.className = "userBetBox";
        div.innerHTML = bet;
        if(bet===0)
        {
            div.style="display:none;border: 15px solid "+stringToColour(playerId)+";";
        }
        else{
            div.style="border: 15px solid "+stringToColour(playerId)+";";
        }
        
        element.appendChild(div);
    }

    var App = {

        /**
         * Keep track of the gameId, which is identical to the ID
         * of the Socket.IO Room used for the players and host to communicate
         *
         */
        gameId: 0,

        /**
         * This is used to differentiate between 'Host' and 'Player' browsers.
         */
        myRole: '',   // 'Player' or 'Host'

        /**
         * The Socket.IO socket object identifier. This is unique for
         * each player and host. It is generated when the browser initially
         * connects to the server when the page loads for the first time.
         */
        mySocketId: '',

        /**
         * Identifies the current round. Starts at 0 because it corresponds
         * to the array of word data stored on the server.
         */
        currentRound: 0,

        /* *************************************
         *                Setup                *
         * *********************************** */

        /**
         * This runs when the page initially loads.
         */
        init: function () {
            App.cacheElements();
            App.showInitScreen();
            App.bindEvents();

            // Initialize the fastclick library
            FastClick.attach(document.body);
        },

        /**
         * Create references to on-screen elements used throughout the game.
         */
        cacheElements: function () {
            App.$doc = $(document);

            // Templates
            App.$gameArea = $('#gameArea');
            App.$templateIntroScreen = $('#intro-screen-template').html();

        },

        /**
         * Create some click handlers for the various buttons that appear on-screen.
         */
        bindEvents: function () {
            App.$doc.on('click', '#btnRoll', App.roll);

            App.$doc.on('click', '#shrimp', App.betClick);
            App.$doc.on('click', '#fish', App.betClick);
            App.$doc.on('click', '#rooster', App.betClick);
            App.$doc.on('click', '#gourd', App.betClick);
            App.$doc.on('click', '#crab', App.betClick);
            App.$doc.on('click', '#deer', App.betClick);

            App.$doc.on('click', '#back', App.onBackClick);
        },


        showInitScreen: function() {
            App.$gameArea.html(App.$templateIntroScreen);
            App.doTextFit('.title');
        },

        betClick : function(){
            
            var playerId = localStorage.getItem('playerId');
            console.log(this.id)
            console.log("clicked "+this.id);
            var data = {
                boardPiece : this.id,
                playerId : playerId
            }
            IO.socket.emit('updateBet',data);
        },
        roll : function(){
            IO.socket.emit('roll');
        },

        

        /* **************************
                  UTILITY CODE
           ************************** */


        /**
         * Make the text inside the given element as big as possible
         * See: https://github.com/STRML/textFit
         *
         * @param el The parent element of some text
         */
        doTextFit : function(el) {
            textFit(
                $(el)[0],
                {
                    alignHoriz:true,
                    alignVert:false,
                    widthOnly:true,
                    reProcess:true,
                    maxFontSize:300
                }
            );
        }

    };

    IO.init();
    App.init();

}($));
