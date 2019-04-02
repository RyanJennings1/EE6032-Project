/*
 * Name: chat_server.js
 *
 * This file is the server for this chat app that handles socket
 * transfers between clients
 */

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

/*
 * Handle a user leaving the room
 */
function handleClientDisconnection(socket) {
  socket.on('disconnect', () => {
    console.log('User disconnected');
    socket.broadcast.to('Lobby').emit('systemMessage', {
      text: `${nickNames[socket.id]} has left`,
    });
    guestNumber -= 1;
  });
}

/*
 * Broadcast message to other user
 */
function handleMessageBroadcasting(socket) {
  socket.on('message', (message) => {
    socket.broadcast.to(message.room).emit('otherUserMessage', {
      text: `${message.text}`,
      userId: socket.id,
    });
  });
}

/*
 * Handle a user joining the room
 */
function handleRoomJoining(socket) {
  socket.on('join', (room) => {
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

/*
 * Broadcast image to other user
 */
function handleImageBroadcasting(socket) {
  socket.on('sendImage', (data) => {
    socket.broadcast.to('Lobby').emit('otherUserPostImage', data);
  });
}

/*
 * Broadcast file to other user
 */
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

/*
 * Turn ON encrypted background for other user
 */
function handleEncryptionDisplayTurnOn(socket) {
  socket.on('turnOnEncryption', () => {
    socket.broadcast.to('Lobby').emit('changeEncryptionDisplay', true);
  });
}

/*
 * Turn OFF encrypted background for other user
 */
function handleEncryptionDisplayTurnOff(socket) {
  socket.on('turnOffEncryption', () => {
    socket.broadcast.to('Lobby').emit('changeEncryptionDisplay', false);
  });
}

/*
 * If a second user joins then start generation of public and private keys
 */
function startProtocol(socket) {
  if (guestNumber === 3) {
    sleep(3);
    console.log('Initiating public and private key generation and transfer');
    socket.emit('startRSA');
    socket.broadcast.to('Lobby').emit('startRSA');
  }
}

function msleep(n) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

function sleep(n) {
  msleep(n * 1000);
}

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

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
      handleEncryptionDisplayTurnOn(socket);
      handleEncryptionDisplayTurnOff(socket);
      startProtocol(socket);
    } else {
      // TODO: Show 'Server Full' page
      console.log('SERVER FULL ===============================================');
    }

    socket.on('sendPublicKey', (data) => {
      console.log('Public key data received');
      socket.broadcast.to('Lobby').emit('receivePublicKey', data);
    });

    // Step 2
    socket.on('getResponseToStartStep2', (message) => {
      console.log('getResponseToStartStep2 ...');
      socket.broadcast.to('Lobby').emit('step2', message);
    });

    // Step 3
    socket.on('getResponseToStartStep3', (message) => {
      console.log('getResponseToStartStep3 ...');
      socket.emit('step3', message);
    });

    // Step 4
    socket.on('getResponseToStartStep4', (message) => {
      console.log('getResponseToStartStep4 ...');
      socket.broadcast.to('Lobby').emit('step4', message);
    });

    // Finish Protocol Step 5
    socket.on('finishProtocol', (message) => {
      socket.broadcast.to('Lobby').emit('step5', message);
    });

    // User started the encrypt protocol
    socket.on('encryptProtocol', () => {
      console.log('Encryption protocol started ...');
      socket.emit('step1');
    });

    socket.on('encryptedMessage', (message) => {
      console.log('Encrypted message: ', ab2str(new Uint8Array(Object.values(message))));
      socket.broadcast.to('Lobby').emit('receiveEncryptedMessage', message);
    });

    socket.on('encryptedImage', (data) => {
      // console.log('Encrypted file: ', ab2str(new Uint8Array(Object.values(data))));
      socket.broadcast.to('Lobby').emit('receiveEncryptedImage', data);
    });

    socket.on('encryptionFinished', () => {
      socket.emit('encryptionFinishedMessage');
    });

    socket.on('rooms', () => {
      socket.emit('rooms', io.of('/').adapter.rooms);
    });
  });
};
