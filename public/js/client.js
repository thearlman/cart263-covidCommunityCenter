//define the client socket by trying to connect to server
let clientSocket = io.connect()
//define the potential user's signature color, as an rgb value in string format
let userColor = `rgb(
  ${Math.floor(Math.random()*255)},
  ${Math.floor(Math.random()*255)},
  ${Math.floor(Math.random()*255)}
)`;
//define an undefined global ID for user
let myId;
//offset for the avatar
let avatarOffset = 10;
//define empty dictionary  to store users
let currentUsers = {};
//the main container (one inside body)
let wrapper = document.getElementById("communityWrapper");
//the whiteboard (html5 canvas)
let whiteboard = document.getElementById('whiteboard');
//context for the canvas
let context = whiteboard.getContext('2d');
//the bounding area (relative position on the page)
let whiteboardBound = whiteboard.getBoundingClientRect();
//boolean to check if the user is drawing on the whiteboard
let isDrawing = false;
//XnY foruser pen position
let x = 0;
let y = 0;
//initial stroke color
let strokeColor = 'rgb(0, 0, 0)';
//initial stroke size
let strokeSize = 10;

//define some audio objs
let messageSound = new Audio();
messageSound.src = "messageSound.mp3";
messageSound.volume = 0.2;
let newUserSound = new Audio();
newUserSound.src = "newUserSound.wav";
newUserSound.volume = 0.2;
//creeate a library for them, for easy playability on servers request.
//u'll see...
let soundLibrary = {
  "messageSound": () => {
    messageSound.play();
  },
  "newUserSound": () => {
    // newUserSound.play();
  }
}

//when the server sends its initial handshake, make
//the login screen visible
clientSocket.on("handshake", function(message) {
  $("#login").css("visibility", "visible");
  //log out confirmation from the server
  console.log(message);
})

//if the user resizes the window, redefine where the canvas bounding area is
window.onresize = function() {
  whiteboardBound = whiteboard.getBoundingClientRect();
}
//same thing if they scroll
window.onscroll = function() {
  whiteboardBound = whiteboard.getBoundingClientRect();
}

//CLIC events:
//when user clicks on one of the whiteboards colors,
//tage it's background color and assign it to the global stroke color
//also reset stroke size (for now)
$(".whiteboardColorButton").on('click', function() {
  strokeColor = $(this).css("background-color");
  strokeSize = 10;
  // console.log($(this).css("background-color"));
})

//if user clicks eraser button, change stroke color to white,
//and make stroke bigger for more eraser power =^=
$("#eraserButton").on("click", function() {
  strokeColor = "rgb(255, 255, 255)"
  strokeSize = 20;
})

//if user clicks on trash button, tell the server
$("#trashButton").on("click", function() {
  clientSocket.emit("eraseDrawing", null);
})

//if user clicks submit (orpressed enter) on the user name form
$('#userNameForm').submit(function() {
  //if the value field is not empty
  if ($("#userName").val() !== "") {
    //inform the server there is a new user, passing the value as thir username
    clientSocket.emit("newUser", {
      userName: $("#userName").val(),
      userColor: userColor
    });
    //define the placeholder text of the chatroom field to be customized the username
    $("#userMessage").attr("placeholder", `Hello ${$("#userName").val()}, type to chat.`);
    //trash the login screen
    $("#loginWrapper").remove();
  }
  //prevent from POSTing
  return false;
});

//event triggered when server sends client's unique id
clientSocket.on("yourId", function(user) {
  //set global id to unique id
  myId = user.id;
  //add the id and the user name to the database
  currentUsers[user.id] = user.userName;
  //confirm to server the id was recieved
  clientSocket.emit("gotMyId", null);
  //log it out
  console.log(myId);
  //create a new user avatar, with an ID === to current user's
  $("#communityWrapper").append(`<div class = "avatar" id = "${user.id}">
      <img src="corona.jpg" alt="avatar"/>
      <p class = "userName" style = "color: ${user.userColor}">${user.userName}</p>
      </div>`);
  //add an event listener for the when the mouse is moved
  wrapper.addEventListener('mousemove', function() {
    //move the avatar to the same place as the mouse, with an offset
    $(`#${user.id}`).css({
      top: event.pageY + avatarOffset,
      left: event.pageX + avatarOffset
    })
    //alert server that mouse has moved, passing it an object with the
    //coordinates
    clientSocket.emit("mouseMoved", {
      x: event.pageX,
      y: event.pageY
    })
  })
})

//event triggered when server detects mouse movement from other client(s)
//expects an object
clientSocket.on("mouseMoved", function(mouseInfo) {
  //move the target avatar to the target position
  $(`#${mouseInfo.client}`).css({
    top: mouseInfo.mousePosition.y + avatarOffset,
    left: mouseInfo.mousePosition.x + avatarOffset
  })
})

//event triggered when server detects new user: (expects an object)
clientSocket.on("userUpdate", function(users) {
  //create an array of the keys in the current users
  let currentUserKeys = Object.keys(currentUsers)
  //for each of the keys in the object passed by the user
  for (let i = 0; i < Object.keys(users).length; i++) {
    //check to see if the key in the corresponding position of the object passed by the server
    //is not the same as our id, and is also not equal to the keys of any of current users
    if (Object.keys(users)[i] !== myId && currentUserKeys.includes(Object.keys(users)[i]) === false) {
      //add the unique id, and username to our current users object
      currentUsers[Object.keys(users)[i]] = users[Object.keys(users)[i]].userName;
      //append an avatar with their id, and username to the environment
      $("#communityWrapper").append(`<div class = "avatar" id = "${Object.keys(users)[i]}">
          <img src="corona.jpg" alt="avatar"/>
          <p class = "userName" style = "color: ${users[Object.keys(users)[i]].userColor}">${users[Object.keys(users)[i]].userName}</p>
          </div>`);
    }
  }
  //log it out cause I'm obsessed with logging
  console.log(currentUsers);

  //below calculates number of users and creates string to inform them
  //still working out how to best impliment this
  // if (Object.keys(currentUsers).length - 1 >= 2) {
  //   $("#messages").append(`<p>there are ${Object.keys(currentUsers).length - 1} other people here right now. say hi</p>`);
  // } else if (Object.keys(currentUsers).length - 1 === 1) {
  //   $("#messages").append(`<p>there is 1 other person here right now. say hi</p>`);
  // } else {
  //   $("#messages").append(`<p>there are no other people here right now :-(</p>`);
  // }
})

//event triggered when server requests an avatar be removed (user elaves room)
clientSocket.on("removeAvatar", function(avatarId) {
  //empty their wrapper
  $(`#${avatarId}`).empty();
  //remove the shell
  $(`#${avatarId}`).remove();
  //remove them from the database
  delete currentUsers[avatarId];
})

//event triggered when server calls an alert (usually for messages)
clientSocket.on("alert", function(soundType) {
  //grab the corresponding sound from the library, and run its function
  soundLibrary[soundType]();
})

// $("#userMessage").one("input", function(e){
//   // if (e.val() > 0){
//   //   console.log("hanged!");
//   // }
// })

//when the sumit action for the message form (chatroom) is triggered
$("#sendMessage").submit(function() {
  //if the value field is not empty
  if ($("#userMessage").val() !== "") {
    //tell the server there is a new message, passing the value as the body
    clientSocket.emit("newChatMessage", $("#userMessage").val());
    //empty out the value field
    $("#userMessage").val("");
  }
  //prevent the page from trying to POST
  return false;
})

//event triggered when server relays chat message. function expects an object
clientSocket.on("newChatMessage", function(message) {
  //append the message to the chatroom, adding the clients local date and time
  $("#messages").append(`
      <p>(${getDate()}) <br/> <span style = "color: ${message.color}">${message.message}</span></p>`);
  //auto scroll down as messages come in <=BROKEN NEEDS FIXINGGGGG
  $("#messages").animate({
    scrollTop: 1000000000000000000000
  }, 50);
})

//allow the user to press enter to send the message,
$("#userMessage").keypress(function(e) {
  //if the key is enter, and not also shift
  if (e.which == 13 && !e.shiftKey) {
    //force submit the button
    $("#sendMessage").submit();
    return false;
    // e.preventDefault();
  }
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~Handle drawing events
//~~~~~~~~Basic canvas drawing based on MDN example:
//https://developer.mozilla.org/en-US/docs/Web/API/Element/mouseup_event

// mousdown triggered only when on top of the canvas
whiteboard.addEventListener('mousedown', e => {
  //set x and y positions to the mouse position minus the position of the
  //bounding box for the canvas context
  x = e.clientX - whiteboardBound.left;
  y = e.clientY - whiteboardBound.top;
  //set drawing to true
  isDrawing = true;
});

//triggered when the mouse is moved over top of the canvas
whiteboard.addEventListener('mousemove', e => {
  //drawing set to true my mmousedown
  if (isDrawing === true) {
    //send run the drawline function: last paprameter tells the function we want to emit
    //to the server
    drawLine(context, x, y, e.clientX - whiteboardBound.left, e.clientY - whiteboardBound.top, true);
    //update thr x and y coordinates
    x = e.clientX - whiteboardBound.left;
    y = e.clientY - whiteboardBound.top;
  }
});

//fired when the  mouse comes up anywhere on canvas, so long as drawing is still true
window.addEventListener('mouseup', e => {
  if (isDrawing === true) {
    //finish drawing the curren line
    drawLine(context, x, y, e.clientX - whiteboardBound.left, e.clientY - whiteboardBound.top, true);
    //reset x and y
    x = 0;
    y = 0;
    //set drawing back to false
    isDrawing = false;
    //save the canvas data as base64
    let data = whiteboard.toDataURL();
    //send it to server for saving
    clientSocket.emit("saveCanvas", data);
  }
});

//updates the canvas, either by local command, or remotely
function drawLine(context, x1, y1, x2, y2, emit, remoteStrokeColor, remoteStrokeSize) {
  //begin the path
  context.beginPath();
  //if function being being triggered by remote source, set the stroke color
  //and size to the parameters passed
  if (!emit) {
    context.strokeStyle = remoteStrokeColor;
    context.strokeSize = remoteStrokeSize;
    //otherwise, use the current stroke color and size
  } else {
    context.strokeStyle = strokeColor;
    context.lineWidth = strokeSize;
  }
  //move to the correct coordinates
  context.moveTo(x1, y1);
  //define the line
  context.lineTo(x2, y2);
  //execute stroke
  context.stroke();
  //close the path
  context.closePath();
  //if function triggered my remote source, exit function
  if (!emit) {
    return
    //if function triggered by local source, tell server someone is drawing,
    //and pass it the neccessary parameters as an obj
  } else {
    clientSocket.emit("drawing", {
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      remoteStrokeColor: strokeColor,
      remoteStrokeSize: strokeSize
    })
  }
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//event triggered when other uder is drawing. Expects an object
clientSocket.on("drawing", function(coords) {
  //run the draw function, making sure to tell it that source is remote by setting emit to false
  drawLine(context, coords.x1, coords.y1, coords.x2, coords.y2, false, coords.remoteStrokeColor, coords.remoteStrokeSize);
})
//event triggered when other user erases the drawing
clientSocket.on("drawingErased", function() {
  //clear the canvas
  context.clearRect(0, 0, whiteboard.width, whiteboard.height);
})

//event triggered when user first comes into room. Expects valid .png data
clientSocket.on("updateCanvas", function(canvasData) {
  //if there is no data (should be possible, but maybe image was erased on server)
  //then just exit function
  if (canvasData === null) {
    return;
  } else {
    //otherwise create new image object
    let currentCanvas = new Image();
    //define it's source as the data passed to function
    currentCanvas.src = canvasData;
    //when image object loads we clear the canvas, and draw the image object onto it
    currentCanvas.onload = function() {
      context.clearRect(0, 0, whiteboard.width, whiteboard.height);
      context.drawImage(currentCanvas, 0, 0);
    }
  }
})

//socket.io included event fired when socket disconnects
clientSocket.on("disconnect", function() {
  //send user to page exaplining connection was lost
  document.location = "disconnect.html";
})

//same as above, but custom event sent from server for when somethign get's all
//fucked up.
clientSocket.on("connectionLost", function() {
  document.location = "disconnect.html";
});

//returns a formatted date
function getDate() {
  let date = new Date();
  let day = date.getDate();
  let month = date.getMonth();
  let year = date.getFullYear();
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let seconds = date.getSeconds();
  return `${day}/${month}/${year}-${hours}:${minutes}:${seconds}`
}

//Unused, and/or in-progress functions
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function submitUserName() {
  clientSocket.emit("newUser", {
    userName: $("#userName").val(),
    userColor: userColor
  });
  $("#userMessage").attr("placeholder", `Hello ${$("#userName").val()}, type to chat.`)
  $("#loginWrapper").remove();
}

function sendMessage() {
  if ($("#userMessage").val() !== "") {
    clientSocket.emit("newChatMessage", $("#userMessage").val());
    $("#userMessage").val("");
  }
}

function tabFlash() {
  if (interact === false) {
    $(document).one(function() {
      let blink = false;
      let messageNotification = setInterval(function() {
        if (blink === false) {
          document.title = "New Message!"
          blink = false;
        } else if (blink === false) {
          document.title = "Covid Community Center";
          blink = true;
        }
      }, 500)
    })
  }
}

function updateChatlog() {
  $.ajax({
    type: "post",
    url: "/updateChatlog",
    body: "hello",
    success: () => {
      console.log("is good");
    },
    error: (err) => {
      console.log(err);
    }
  })
}
