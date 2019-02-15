const socketio = require('socket.io');

let io;
let guestNumber = 1;
const nickNames = {};
const namesUsed = [];
const currentRoom = {};

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
  const name = `Guest${guestNumber}`;
  nickNames[socket.id] = name;

  socket.emit('nameResult', {
    success: true,
    name,
  });

  namesUsed.push(name);
  return guestNumber + 1;
}

function joinRoom(socket, room) {
  socket.join(room);
  currentRoom[socket.id] = room;
  socket.emit('joinResult', { room });

  socket.broadcast.to(room).emit('message', {
    text: `${nickNames[socket.id]} has joined ${room}.`,
  });

  const usersInRoom = io.of('/').in(room).clients;
  if (usersInRoom.length > 1) {
    let usersInRoomSummary = `Users currently in ${room}: `;

    for (const index in usersInRoom) {
      const userSocketId = usersInRoom[index].id;

      if (userSocketId != socket.id) {
        if (index > 0) {
          usersInRoomSummary += ', ';
        }
        usersInRoomSummary += nickNames[userSocketId];
      }
    }

    usersInRoomSummary += '.';
    socket.emit('message', { text: usersInRoomSummary });
  }
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
  socket.on('nameAttempt', (name) => {
    if (name.indexOf('Guest') == 0) {
      socket.emit('nameResult', {
        success: false,
        message: 'Names cannot begin with "Guest".',
      });
    } else if (namesUsed.indexOf(name) == -1) {
      const previousName = nickNames[socket.id];
      const previousNameIndex = namesUsed.indexOf(previousName);
      namesUsed.push(name);
      nickNames[socket.id] = name;
      delete namesUsed[previousNameIndex];

      socket.emit('nameResult', {
        success: true,
        name,
      });

      socket.broadcast.to(currentRoom[socket.id]).emit('message', {
        text: `${previousName} is now known as ${name}.`,
      });
    } else {
      socket.emit('nameResult', {
        success: false,
        message: 'That name is already in use.',
      });
    }
  });
}

function handleMessageBroadcasting(socket) {
  socket.on('message', (message) => {
    socket.broadcast.to(message.room).emit('message', {
      text: `${nickNames[socket.id]}: ${message.text}`,
    });
  });
}

function handleRoomJoining(socket) {
  socket.on('join', (room) => {
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

function handleClientDisconnection(socket) {
  socket.on('disconnect', () => {
    const nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  });
}

exports.listen = (server) => {
  console.log(Date(Date.now()).toString());
  io = socketio.listen(server);
  io.set('log level', 1);

  io.sockets.on('connection', (socket) => {
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
    joinRoom(socket, 'Lobby');
    handleMessageBroadcasting(socket, nickNames);
    handleNameChangeAttempts(socket, nickNames, namesUsed);
    handleRoomJoining(socket);

    socket.on('rooms', () => {
      socket.emit('rooms', io.of('/').adapter.rooms);
    });
    handleClientDisconnection(socket, nickNames, namesUsed);
  });
};
