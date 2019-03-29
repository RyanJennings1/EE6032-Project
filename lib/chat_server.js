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
    console.log('User disconnected');
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

function msleep(n) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}
function sleep(n) {
  msleep(n * 1000);
}

function startProto(socket) {
  if (guestNumber === 3) {
    sleep(5);
    console.log('Initiating protocol');
    // socket.emit('START');
    socket.emit('startRSA');
  }
}

/*
function listenforkeys(socket) {
  socket.on('sendPublicKey', (data) => {
    console.log('data: ', data);
    // socket.broadcast.to('Lobby').emit('recPublicKey', data);
  });
}
*/

exports.listen = (server) => {
  console.log(Date(Date.now()).toString());
  io = socketio.listen(server);

  io.sockets.on('connection', (socket) => {
    guestNumber = assignGuestName(socket, guestNumber, nickNames);
    // (guestNumber - 1) because it starts at 1 not 0 for readability in the app
    console.log('Current Guest Number: ', guestNumber - 1);
    if ((guestNumber - 1) <= 2) {
      joinRoom(socket, 'Lobby');
      handleMessageBroadcasting(socket, nickNames);
      handleRoomJoining(socket);
      handleClientDisconnection(socket);
      handleFileBroadcasting(socket);
      handleImageBroadcasting(socket);
      startProto(socket);
      // listenforkeys(socket);
    } else {
      // TODO: Show 'Server Full' page
      console.log('SERVER FULL ===============================================');
    }

    socket.on('sendPublicKey', (data) => {
      console.log('public key data: ', data);
      // socket.broadcast.to('Lobby').emit('receivePublicKey', data);
      socket.emit('receivePublicKey', data);
    });

    // Step 2
    socket.on('getResponseStep2', (msg) => {
      console.log('getResponseStep2 ...');
      // socket.broadcast.to('Lobby').emit('step2', msg);
      socket.emit('step2', msg);
    });

    // Step 3
    socket.on('getResponseStep3', (msg) => {
      console.log('getResponseStep3 ...');
      // socket.broadcast.to('Lobby').emit('step3', msg);
      socket.emit('step3', msg);
    });

    // Step 4
    socket.on('getResponseStep4', (msg) => {
      console.log('getResponseStep4 ...');
      // socket.broadcast.to('Lobby').emit('step4', msg);
      socket.emit('step4', msg);
    });

    // User started the encrypt protocol
    socket.on('encryptProtocol', () => {
      console.log('Encryption protocol started ...');
      // socket.broadcast.emit('encryptedMessage');
      socket.broadcast.to('Lobby').emit('step1'); // Start step 1
      // chatEncrypted = true; // when we have a sucessful encrypted pipe
    });

    socket.on('rooms', () => {
      socket.emit('rooms', io.of('/').adapter.rooms);
    });
  });
};
