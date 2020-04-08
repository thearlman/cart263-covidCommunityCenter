let clientSocket = io.connect()
let userColor = `rgb(
  ${Math.floor(Math.random()*255)},
  ${Math.floor(Math.random()*255)},
  ${Math.floor(Math.random()*255)}
)`;

let whiteboard;
let context;

let myId;
let currentUsers = {};
let messageSound = new Audio();
messageSound.src = "messageSound.mp3";
messageSound.volume = 0.2;
let newUserSound = new Audio();
newUserSound.src = "newUserSound.wav";
newUserSound.volume = 0.2;
let isDrawing = false;


let strokeColor = 'rgb(0, 0, 0)';
let strokeSize = 10;

let soundLibrary = {
  "messageSound": () => {
    messageSound.play();
  },
  "newUserSound": () => {
    // newUserSound.play();
  }
}
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
$(document).ready(() => {

  let x = 0;
  let y = 0;

  whiteboard = document.getElementById('whiteboard');
  context = whiteboard.getContext('2d');

  $(".whiteboardColorButton").on('click', function() {
    strokeColor = $(this).css("background-color");
    strokeSize = 10;
    // console.log($(this).css("background-color"));
  })

  $("#eraserButton").on("click", function() {
    strokeColor = "rgb(255, 255, 255)"
    strokeSize = 20;
  })
  $("#trashButton").on("click", function() {
    context.clearRect(0, 0, whiteboard.width, whiteboard.height);
    clientSocket.emit("eraseDrawing", "haha");
  })

  clientSocket.on("handshake", (message) => {
    console.log(message);
  })

  clientSocket.on("newChatMessage", function(message) {
    date = new Date();
    day = date.getDate();
    month = date.getMonth();
    year = date.getFullYear();
    hours = date.getHours();
    minutes = date.getMinutes();
    seconds = date.getSeconds();
    $("#messages").append(`
      <p>(${day}/${month}/${year} - ${hours}:${minutes}:${seconds}) <br/> <span style = "color: ${message.color}">${message.message}</span></p>`);
    $("#messages").animate({
      scrollTop: 1000000000000000000000
    }, 50);
    // updateChatlog();
  })


  clientSocket.on("yourId", function(user) {
    myId = user.id;
    currentUsers[user.id] = user.userName;
    clientSocket.emit("gotMyId", "thankzzz");
    console.log(myId);
    $("#communityWrapper").append(`<div class = "avatar" id = "${user.id}">
      <img src="corona.jpg" alt="avatar"/>
      <p class = "userName">${user.userName}</p>
      </div>`);
    $("#communityWrapper").on('mousemove', function() {
      clientSocket.emit("mouseMoved", {
        x: event.pageX,
        y: event.pageY
      })
    })
  })

  clientSocket.on("userUpdate", function(users) {
    let objectKeys = Object.keys(currentUsers)
    console.log(currentUsers);
    for (let i = 0; i < Object.keys(users).length; i++) {
      console.log(objectKeys.includes(Object.keys(users)[i]));
      if (Object.keys(users)[i] !== myId && objectKeys.includes(Object.keys(users)[i]) === false) {
        currentUsers[Object.keys(users)[i]] = users[Object.keys(users)[i]].userName;
        console.log(Object.keys(users)[i]);
        $("#communityWrapper").append(`<div class = "avatar" id = "${Object.keys(users)[i]}">
          <img src="corona.jpg" alt="avatar"/>
          <p class = "userName">${users[Object.keys(users)[i]].userName}</p>
          </div>`);
      }
    }

    if (Object.keys(currentUsers).length - 1 >= 2) {
      $("#numUsers").html(`<p>there are ${Object.keys(currentUsers).length - 1} other people here right now. say hi</p>`);
    } else if (Object.keys(currentUsers).length - 1 === 1) {
      $("#numUsers").html(`<p>there is 1 other person here right now. say hi</p>`);
    } else {
      $("#numUsers").html(`<p>there are no other people here right now :-(</p>`);
    }
  })


  clientSocket.on("mouseMoved", function(mouseInfo) {
    $(`#${mouseInfo.client}`).css({
      top: mouseInfo.mousePosition.y + 10,
      left: mouseInfo.mousePosition.x + 10
    })
  })

  clientSocket.on("removeAvatar", function(avatarId) {
    $(`#${avatarId}`).empty();
    $(`#${avatarId}`).remove();
    delete currentUsers[avatarId];
  })

  clientSocket.on("alert", function(soundType) {
    soundLibrary[soundType]();
  })

  $("#sendMessage").submit(function() {
    sendMessage();
    return false;
  })

  $("#userMessage").keypress(function(e) {
    if (e.which == 13 && !e.shiftKey) {
      $("sendMessage").submit();
      sendMessage();
      return false;
      e.preventDefault();
    }
  });

  $('#userNameForm').submit(function() {
    if ($("#userName").val() !== "") {
      submitUserName();
    }
    return false;
  });



  let mouseOffsetX = 0;
  let mouseOffsetY = 0;
  const whiteboardBound = whiteboard.getBoundingClientRect();
  // Add the event listeners for mousedown, mousemove, and mouseup
  whiteboard.addEventListener('mousedown', e => {
    x = e.clientX - mouseOffsetX - whiteboardBound.left;
    y = e.clientY - mouseOffsetY - whiteboardBound.top;
    isDrawing = true;
  });

  whiteboard.addEventListener('mousemove', e => {
    if (isDrawing === true) {
      drawLine(context, x, y, e.clientX - mouseOffsetX - whiteboardBound.left, e.clientY - mouseOffsetY - whiteboardBound.top, true);
      x = e.clientX - mouseOffsetX - whiteboardBound.left;
      y = e.clientY - mouseOffsetY - whiteboardBound.top;
    }
  });

  window.addEventListener('mouseup', e => {
    if (isDrawing === true) {
      drawLine(context, x, y, e.clientX - mouseOffsetX - whiteboardBound.left, e.clientY - mouseOffsetY - whiteboardBound.top, true);
      x = 0;
      y = 0;
      isDrawing = false;
      let data = whiteboard.toDataURL();
      clientSocket.emit("saveCanvas", data);
    }
  });

  clientSocket.on("updateCanvas", function(canvasData) {
    if (canvasData === null) {
      console.log("No picture Saved!");
      return;
    } else {
      let currentCanvas = new Image();
      currentCanvas.onload = function() {
        context.clearRect(0, 0, whiteboard.width, whiteboard.height);
        context.drawImage(currentCanvas, 0, 0);
      }
      currentCanvas.src = canvasData;
    }
  })

  clientSocket.on("drawing", function(coords) {
    drawLine(context, coords.x1, coords.y1, coords.x2, coords.y2, false, coords.remoteStrokeColor, coords.remoteStrokeSize);
  })

  clientSocket.on("drawingErased", function(){
    context.clearRect(0, 0, whiteboard.width, whiteboard.height);
  })

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
})

function drawLine(context, x1, y1, x2, y2, emit, remoteStrokeColor, remoteStrokeSize) {
  context.beginPath();
  if (!emit) {
    context.strokeStyle = remoteStrokeColor;
    context.strokeSize = remoteStrokeSize;
  } else {
    context.strokeStyle = strokeColor;
    context.lineWidth = strokeSize;
  }
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
  context.closePath();
  if (!emit) {
    return
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
