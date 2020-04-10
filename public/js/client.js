let clientSocket = io.connect()
let userColor = `rgb(
  ${Math.floor(Math.random()*255)},
  ${Math.floor(Math.random()*255)},
  ${Math.floor(Math.random()*255)}
)`;

let myId;
let currentUsers = {};
let wrapper = document.getElementById("communityWrapper");
let messageSound = new Audio();
messageSound.src = "messageSound.mp3";
messageSound.volume = 0.2;
let newUserSound = new Audio();
newUserSound.src = "newUserSound.wav";
newUserSound.volume = 0.2;
let isDrawing = false;
let whiteboard = document.getElementById('whiteboard');
let context = whiteboard.getContext('2d');
let whiteboardBound = whiteboard.getBoundingClientRect();
let x = 0;
let y = 0;
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


window.onresize = function() {
  whiteboardBound = whiteboard.getBoundingClientRect();
}
window.onscroll = function() {
  whiteboardBound = whiteboard.getBoundingClientRect();
}

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
  // context.clearRect(0, 0, whiteboard.width, whiteboard.height);
  clientSocket.emit("eraseDrawing", "haha");
})

clientSocket.on("handshake", (message) => {
  $("#login").css("visibility", "visible");
  console.log(message);
})

let interact = false;

clientSocket.on("newChatMessage", function(message) {

  $("#messages").append(`
      <p>(${getDate()}) <br/> <span style = "color: ${message.color}">${message.message}</span></p>`);
  $("#messages").animate({
    scrollTop: 1000000000000000000000
  }, 50);
  // document.title = "hello";
  // tabFlash();
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
  wrapper.addEventListener('mousemove', function() {
    $(`#${user.id}`).css({
      top: event.pageY + 10,
      left: event.pageX + 10
    })
    clientSocket.emit("mouseMoved", {
      x: event.pageX,
      y: event.pageY
    })
  })
})

clientSocket.on("mouseMoved", function(mouseInfo) {
  $(`#${mouseInfo.client}`).css({
    top: mouseInfo.mousePosition.y + 10,
    left: mouseInfo.mousePosition.x + 10
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
    $("#messages").append(`<p>there are ${Object.keys(currentUsers).length - 1} other people here right now. say hi</p>`);
  } else if (Object.keys(currentUsers).length - 1 === 1) {
    $("#messages").append(`<p>there is 1 other person here right now. say hi</p>`);
  } else {
    $("#messages").append(`<p>there are no other people here right now :-(</p>`);
  }
})



clientSocket.on("maintenance", function() {
  $("#communityWrapper").empty();

  $("#communityWrapper").append(`<h1>SERVER WENT DOWN FOR MAINTINENANCE AT ${getDate()}</h1>`);
})

clientSocket.on("removeAvatar", function(avatarId) {
  $(`#${avatarId}`).empty();
  $(`#${avatarId}`).remove();
  delete currentUsers[avatarId];
})

clientSocket.on("alert", function(soundType) {
  soundLibrary[soundType]();
})

// $("#userMessage").one("input", function(e){
//   // if (e.val() > 0){
//   //   console.log("hanged!");
//   // }
// })

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


// Add the event listeners for mousedown, mousemove, and mouseup
whiteboard.addEventListener('mousedown', e => {
  x = e.clientX - whiteboardBound.left;
  y = e.clientY - whiteboardBound.top;
  isDrawing = true;
});

whiteboard.addEventListener('mousemove', e => {
  if (isDrawing === true) {
    drawLine(context, x, y, e.clientX - whiteboardBound.left, e.clientY - whiteboardBound.top, true);
    x = e.clientX - whiteboardBound.left;
    y = e.clientY - whiteboardBound.top;
  }
});

window.addEventListener('mouseup', e => {
  if (isDrawing === true) {
    drawLine(context, x, y, e.clientX - whiteboardBound.left, e.clientY - whiteboardBound.top, true);
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

clientSocket.on("drawingErased", function() {
  context.clearRect(0, 0, whiteboard.width, whiteboard.height);
})


clientSocket.on("disconnect", function(){
  document.location = "disconnect.html";
})

clientSocket.on("connectionLost", function() {
  document.location = "disconnect.html";
});

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
