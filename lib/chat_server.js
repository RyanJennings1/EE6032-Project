const socketio = require('socket.io');

let io;
let guestNumber = 1;
const nickNames = {};
const currentRoom = {};

/*
 * Assign dummy Guestx name upon joining.
 */
function assignGuestName(socket, guestNumber, nickNames) {
  const name = `Guest${guestNumber}`;
  nickNames[socket.id] = name;
  return guestNumber + 1;
}

/*
 * Handle room joining and broadcast the joining to the room
 * as a system message.
 */
function joinRoom(socket, room) {
  socket.join(room);
  currentRoom[socket.id] = room;
  socket.emit('joinResult', { room });

  socket.broadcast.to(room).emit('systemMessage', {
    text: `${nickNames[socket.id]} has joined`,
  });
}

function handleClientDisconnection(socket) {
  socket.on('disconnect', () => {
    socket.broadcast.to('Lobby').emit('systemMessage', {
      text: `${nickNames[socket.id]} has left`,
    });
    guestNumber -= 1;
  });
}

function handleMessageBroadcasting(socket) {
  socket.on('message', (message) => {
    socket.broadcast.to(message.room).emit('otherUserMessage', {
      text: `${message.text}`,
      userId: socket.id,
    });
  });
}

function handleRoomJoining(socket) {
  socket.on('join', (room) => {
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

function handleImageBroadcasting(socket) {
  socket.on('sendImage', (data) => {
    socket.broadcast.to('Lobby').emit('otherUserPostImage', data);
  });
}

function handleFileBroadcasting(socket) {
  socket.on('sendFile', (data) => {
    socket.broadcast.to('Lobby').emit('otherUserPostDownloadBox', {
      fileData: data.data,
      fileName: data.fileName,
      socketId: data.socketId,
      idNum: data.idNum,
      mimetype: data.mimetype,
    });
  });
}

exports.listen = (server) => {
  console.log(Date(Date.now()).toString());
  io = socketio.listen(server);

  io.sockets.on('connection', (socket) => {
    guestNumber = assignGuestName(socket, guestNumber, nickNames);
    console.log('Current Guest Number: ', guestNumber - 1);
    if (guestNumber < 4) {
      joinRoom(socket, 'Lobby');
      handleMessageBroadcasting(socket, nickNames);
      handleRoomJoining(socket);
      handleClientDisconnection(socket);
      handleFileBroadcasting(socket);
      handleImageBroadcasting(socket);
    } else {
      // TODO: Show 'Server Full' page
      console.log('SERVER FULL ===============================================');
    }

    socket.on('rooms', () => {
      socket.emit('rooms', io.of('/').adapter.rooms);
    });
  });
};
