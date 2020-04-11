//import express server
let express = require('express');
//import and define file system
let fs = require('fs')
//define express server application
const APP = express();
//define the port (env is for heroku, 6969 is for local)
const PORT = process.env.PORT || 6969;
//import nodemailer
let nodemailer = require('nodemailer');
//import http and create instance using express
let httpServer = require('http').createServer(APP);
//import node static, (for serving static files)
let static = require('node-static');
//import socketIO, bind it to http server
let io = require('socket.io')(httpServer);
//define the login creds for nodemailer
let transporter = nodemailer.createTransport({
  'service': 'gmail',
  'auth': {
    user: 'nodeautonotifier@gmail.com',
    pass: 'autonotify!23'
  }
})
//initalize system admin Id
let systemAdminId;
//create epty object to hold clients
let users = {};
//pull the canvas png from the root directory, convert to base64, store in var
let canvasData = `data:image/png;base64,${base64Encode('canvas.png')}`

//tell the express app to use the current filepath (__dirname) + the public directory (for client-side)
APP.use(express.static(__dirname + '/public'));
//begin listening for incoming requests from the client
httpServer.listen(PORT, function() {
  console.log(`HTTPS server is running on port ${PORT}`);
  console.log(__dirname);
})



//when client socket connects to server
//all of the events are handled inside of this annonymous function
//as "socket" is event, and user specific
io.on("connect", function(socket) {
  //send a handshake to verify the connection
  socket.emit("handshake", "hello from server");
  //log out IP address
  console.log("client connected from ip: " + socket.request.connection.remoteAddress);
  //log out users
  console.log(users);
  //event triggered once user has submitted a display name
  socket.on("newUser", function(message) {
    //if their name is this password
    if (message.userName === "$pwdHas#*10") {
      //set the admin Id to their socket id
      systemAdminId = socket.id;
      //store them in the users object as the system admin
      users[socket.id] = {
        userName: "System Admin",
        userColor: "rgb(255, 0, 0)"
      };
      //otherwise just store them in the users obejct under whatever
      // name they provided
    } else {
      users[socket.id] = {
        userName: message.userName,
        userColor: message.userColor
      };
    }
    //confirm reciept of display name with their socket id and display name
    socket.emit("yourId", {
      id: socket.id,
      userName: users[socket.id].userName
    });
    //once the client confirms they have recieved their id:
    socket.on("gotMyId", function() {
      //tell all active socket connections there is anew user
      io.emit("userUpdate", users)
      //send a message to the chatroom telling all users the new user is here
      io.emit("newChatMessage", {
        color: users[socket.id].userColor,
        message: `${users[socket.id].userName} has joined the room!`
      });
      //tell all active clients (other than new user) to trigger the new user sound
      socket.broadcast.emit('alert', "newUserSound");
      // update the new user's canvas, with the locally stored base64
      socket.emit("updateCanvas", canvasData);
    })
  })

  //event triggered when new chat message comes from active socket connection
  socket.on("newChatMessage", function(message) {
      //if the message comes from the system admin, check it against a stored list of commands
      if (socket.id === systemAdminId) {
        if (message.includes("server shutdown")) {
          let time = message.split("-").pop();
          shutdownServer(time);
          //if it doesn't match any of the commands treat it like a normal message
        } else {
          io.emit("newChatMessage", {
            color: users[socket.id].userColor,
            message: `${users[socket.id].userName}: ${message}`
          });
        }
        socket.broadcast.emit('alert', "messageSound");
      //if user is undefined
      //(happens when server goes to sleep with user still inside)
      //redirect them to the lost connection page
    } else if (users[socket.id] == undefined) {
      socket.emit("connectionLost", null);
      //otherwise emit the new message to all active socket connections
    } else {
      io.emit("newChatMessage", {
        color: users[socket.id].userColor,
        message: `${users[socket.id].userName}: ${message}`
      });
      //trigger an alert sound for all users except the sender
      socket.broadcast.emit('alert', "messageSound");
    }
  })

//event triggered when active socket connection moves mouse
socket.on("mouseMoved", function(mousePos) {
  //if user is undefined
  //(happens when server goes to sleep with user still inside)
  //redirect them to the lost ocnnection page
  if (users[socket.id] == undefined) {
    socket.emit("connectionLost", null)
    //otherwise, send their mouse position to everyone other than sender
  } else {
    socket.broadcast.emit("mouseMoved", {
      client: socket.id,
      mousePosition: mousePos
    });
  }
})

//event triggered when active socket is drawing
socket.on("drawing", function(coords) {
  //send canvas coordinates to everyone other than sender
  socket.broadcast.emit("drawing", coords);
})

//event triggered when user releases mouse over the canvas
//updates the the canvas data with new base64 coming from user      socket.emit("connectionLost", null);

socket.on("saveCanvas", function(data) {
  canvasData = data;
})

//event triggered when user erases the current drawing
socket.on("eraseDrawing", function() {
  //trigger erase event for all users
  io.emit("drawingErased", null);
  //broadcast to chatroom that the sender erased the drawing
  io.emit("newChatMessage", {
    color: users[socket.id].userColor,
    message: `${users[socket.id].userName} ERASED the drawing!`
  });
  //manually update canvas data (since user's  mouse is not over canvas at time)
  canvasData = "";
})

//included event triggered when socketio detects a dropped socket connection
socket.on('disconnect', function() {
  //log it out
  console.log("client disconnected");
  //if the user is undefined (happens if someone leaves before entering a display name)
  if (users[socket.id] === undefined) {
    //do nothing
    return;
  } else {
    //otherwise broadcast to the chatroom that the user has left
    io.emit("newChatMessage", {
      color: users[socket.id].userColor,
      message: `${users[socket.id].userName} has left the room...`
    });
    //remove them from the users object
    delete users[socket.id];
    //tell all active clients to remove their avatar
    io.emit("removeAvatar", socket.id);
    //at to update their user database
    io.emit("userUpdate", users)
    //log out remaining users
    console.log(users);
  }
})

//end of socket events
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
})

//used to send emails (for monitoring, and for fun)
function sendNotificationEmail(subject, data) {
  //deine the options for the email
  let mailOptions = {
    from: 'nodeautonotifier@gmail.com',
    to: 'nodeautonotifier@gmail.com',
    subject: subject,
    text: data
  };
  //fire it off
  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}


//turns off server. can be used to save the current canvas, also to end a session
//that got out of hand for some reason? Maybe I just like the idea of having the power
function shutdownServer(time) {
  //extract the header from the current canvas data
  let regexedCanvasData = canvasData.replace(/^data:image\/png;base64,/, "");
  //write over the current canvas file in the root directory with this new data
  fs.writeFile("canvas.png", regexedCanvasData, 'base64', function(err) {
    //toss them errors
    if (err) throw err;
    //log it out
    console.log("Shutting down server on client's request");
    //tell all active users we will be closing down in the passed number of seconds
    io.emit("newChatMessage", {
      color: 'rgb(255, 0, 0)',
      message: `System Administrator: the server will be shutting down in ${time} seconds for a maintenance period`
    })
    //set timeout for that number of seconds later
    setTimeout(() => {
      //redirect them to the lost connection page
      io.emit("connectionLost", null)
      //exit the server
      process.exit();
    }, time * 1000)
  })
}

//nice little function to encode image passed from a url into base64;
// https://stackoverflow.com/questions/24523532/how-do-i-convert-an-image-to-a-base64-encoded-data-url-in-sails-js-or-generally
function base64Encode(url) {
  // read binary data
  var bitmap = fs.readFileSync(url);
  // convert binary data to base64 encoded string
  return new Buffer(bitmap).toString('base64');
}
