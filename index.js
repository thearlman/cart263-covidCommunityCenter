let express = require('express');
let fs = require('fs')
const APP = express();
const PORT = process.env.PORT || 6969;
let nodemailer = require('nodemailer');
let transporter = nodemailer.createTransport({
  'service': 'gmail',
  'auth': {
    user: 'nodeautonotifier@gmail.com',
    pass: 'autonotify!23'
  }
})

let canvasData = `data:image/png;base64,${base64Encode('canvas.png')}`

let systemAdminId;

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

io.on("connect", function(socket) {
  socket.emit("handshake", "hello from server");
  console.log("client connected from ip: " + socket.request.connection.remoteAddress);
  console.log(users);
  socket.on("newUser", function(message) {
    if (message.userName === "$pwdHas#*10") {
      systemAdminId = socket.id;
      users[socket.id] = {
        userName: "System Admin",
        userColor: "rgb(255, 0, 0)"
      };
    } else {
      users[socket.id] = {
        userName: message.userName,
        userColor: message.userColor
      };
    }
    socket.emit("yourId", {
      id: socket.id,
      userName: users[socket.id].userName
    });
    socket.on("gotMyId", function() {
      io.emit("userUpdate", users)
      io.emit("newChatMessage", {
        color: users[socket.id].userColor,
        message: `${users[socket.id].userName} has joined the room!`
      });
      socket.broadcast.emit('alert', "newUserSound");
      socket.emit("updateCanvas", canvasData);
      // sendNewUserEmail( "new user joined", users[socket.id].userName);
    })
  })

  socket.on("newChatMessage", function(message) {
    if (socket.id === systemAdminId) {
      switch (message) {
        case "server shutdown":
          shutdownServer();
          break;
        default:
          io.emit("newChatMessage", {
            color: users[socket.id].userColor,
            message: `${users[socket.id].userName}: ${message}`
          });
          socket.broadcast.emit('alert', "messageSound");
      }
    } else {
      io.emit("newChatMessage", {
        color: users[socket.id].userColor,
        message: `${users[socket.id].userName}: ${message}`
      });
      socket.broadcast.emit('alert', "messageSound");
    }
  })



  socket.on("mouseMoved", function(mousePos) {
    socket.broadcast.emit("mouseMoved", {
      client: socket.id,
      mousePosition: mousePos
    });
  })

  socket.on("drawing", function(coords) {
    socket.broadcast.emit("drawing", coords);
  })

  socket.on("saveCanvas", function(data) {
    canvasData = data;
  })

  socket.on("eraseDrawing", function() {
    io.emit("drawingErased", "haha");
    io.emit("newChatMessage", {
      color: users[socket.id].userColor,
      message: `${users[socket.id].userName} ERASED the drawing!`
    });
    canvasData = "";
  })

  socket.on('disconnect', function() {
    console.log("client disconnected");
    if (users[socket.id] === undefined) {
      return;
    } else {
      io.emit("newChatMessage", {
        color: users[socket.id].userColor,
        message: `${users[socket.id].userName} has left the room...`
      });
      delete users[socket.id];
      io.emit("removeAvatar", socket.id);
      io.emit("userUpdate", users)
      console.log(users);
    }
  })
})

function sendNewUserEmail(subject, data){
  let mailOptions = {
  from: 'nodeautonotifier@gmail.com',
  to: 'nodeautonotifier@gmail.com',
  subject: subject,
  text: data
  };
  transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);
  }
});
}

function shutdownServer() {
  let regexedCanvasData = canvasData.replace(/^data:image\/png;base64,/, "");
  fs.writeFile("canvas.png", regexedCanvasData, 'base64', function(err) {
    if (err) throw err;
    console.log("Shutting down server on client's request");
    io.emit("newChatMessage", {
      color: 'rgb(255, 0, 0)',
      message: `System Administrator: the server will be shutting down in 30 seconds for a maintenance period`
    })
    setTimeout(() => {
      io.emit("maintenance", "");
      process.exit();
    }, 5000)
  })
}

function base64Encode(url) {
  // read binary data
  var bitmap = fs.readFileSync(url);
  // convert binary data to base64 encoded string
  return new Buffer(bitmap).toString('base64');
}
