let express = require('express');
let fs = require('fs')
const APP = express();
const PORT = 6902;
let canvasData;

let httpServer = require('http').createServer(APP);
let static = require('node-static');
//tell the express app to use the current filepath (__dirname) + the public directory (for client-side)
APP.use(express.static(__dirname + '/public'));
// for the serverside
APP.use(express.static(__dirname + '/node_modules'));


//begin listening for incoming requests from the client
httpServer.listen(PORT, function() {
  console.log(`HTTPS server is running on port ${PORT}`);
  console.log(__dirname);
})


let io = require('socket.io')(httpServer);

let users = {};

io.on("connect", function(socket){
  socket.emit("handshake", "hello from server");
  console.log("client connected from ip: " + socket.request.connection.remoteAddress);
  console.log(users);
  socket.on("newUser", function(message){
    users[socket.id] = {
      userName: message.userName,
      // userColor: message.userColor
    };
    socket.emit("yourId", {
      id: socket.id,
      userName: message.userName
    });
    socket.on("gotMyId", function(){
      io.emit("userUpdate", users)
      io.emit("newChatMessage", `${message.userName} has joined the room!`);
      socket.broadcast.emit('alert', "newUserSound");
      socket.emit("updateCanvas", canvasData);
    })
  })

  socket.on("newChatMessage", function(message){
    io.emit("newChatMessage", `${users[socket.id].userName}: ${message}`);
    socket.broadcast.emit('alert', "messageSound");
  })


  socket.on("mouseMoved", function(mousePos){
    io.emit("mouseMoved", {
      client: socket.id,
      mousePosition: mousePos
    });
  })

  socket.on("drawing", function(coords){
    socket.broadcast.emit("drawing", coords);
  })

  socket.on("saveCanvas", function(data){
    canvasData = data;
  })

  socket.on('disconnect', function(){
    console.log("client disconnected");
    if (users[socket.id] === undefined){
      return;
    } else {
      io.emit("newChatMessage", `${users[socket.id].userName} has left the room :-(`);
      delete users[socket.id];
      io.emit("removeAvatar", socket.id);
      io.emit("userUpdate", users)
      console.log(users);
    }
  })
})
