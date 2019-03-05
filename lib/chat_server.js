const socketio = require('socket.io');
const fs = require('fs');
const imageDataURI = require('image-data-uri');
const uuid = require('uuid/v1');

const parseDataURL = require('data-urls');
const { decode } = require('whatwg-encoding');

let io;
let guestNumber = 1;
const nickNames = {};
const namesUsed = [];
const currentRoom = {};
const imageExtensions = new Set(['png', 'jpg', 'jpeg']);

/*
 * Assign dummy Guestx name upon joining.
 */
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

/*
 * Handle room joining and broadcast the joining to the room.
 */
function joinRoom(socket, room) {
  socket.join(room);
  currentRoom[socket.id] = room;
  socket.emit('joinResult', { room });

  socket.broadcast.to(room).emit('systemMessage', {
    text: `${nickNames[socket.id]} has joined.`,
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
    if (name.indexOf('Guest') === 0) {
      socket.emit('nameResult', {
        success: false,
        message: 'Names cannot begin with "Guest".',
      });
    } else if (namesUsed.indexOf(name) === -1) {
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

function handleClientDisconnection(socket) {
  socket.on('disconnect', () => {
    const nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  });
}

function emitDownload(socket, fileName, fileExtension, data) {
  socket.emit('postDownloadBox', {
    fileData: data,
    fileName: `${fileName}.${fileExtension}`,
    socketId: socket.id,
  });

  socket.broadcast.to('Lobby').emit('otherUserPostDownloadBox', {
    fileData: data,
    fileName: `${fileName}.${fileExtension}`,
    socketId: socket.id,
  });
}

function emitImage(socket, data) {
  socket.emit('postImage', {
    fileData: data,
    socketId: socket.id,
  });

  socket.broadcast.to('Lobby').emit('otherUserPostImage', {
    fileData: data,
    socketId: socket.id,
  });
}

function handleFileIO(socket) {
  socket.on('writeFile', (fileData) => {
    const tmpDir = './public/tmp';
    const fileId = uuid();
    let fileExtension = (fileData.data.split(';')[0]).split('/')[1];
    const outputPath = `./public/tmp/${fileData.filename}.${fileExtension}`;

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }

    if (imageExtensions.has(fileExtension)) {
      imageDataURI.outputFile(fileData.data, outputPath)
        .then((res) => {
          emitImage(socket, fileData.data);
          console.log('Response: ', res);
        }, (err) => {
          console.log('Error: ', err);
        });
    } else {
      const dataURL = parseDataURL(fileData.data);
      const bodyDecoded = decode(dataURL.body, 'UTF-8');
      if (fileExtension === 'plain') fileExtension = 'txt';

      fs.writeFile(outputPath, bodyDecoded, (err) => {
        if (err) { console.log(err); }

        emitDownload(socket, fileData.filename, fileExtension, fileData.data);
      });
    }
  });
}

exports.listen = (server) => {
  console.log(Date(Date.now()).toString());
  io = socketio.listen(server);
  io.set('log level', 1);

  io.sockets.on('connection', (socket) => {
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
    console.log('Current Guest Number: ', guestNumber);
    if (guestNumber < 4) {
      joinRoom(socket, 'Lobby');
      handleMessageBroadcasting(socket, nickNames);
      handleNameChangeAttempts(socket, nickNames, namesUsed);
      handleRoomJoining(socket);
      handleFileIO(socket);
    } else {
      // TODO: Show 'Server Full' page
      console.log('SERVER FULL ===============================================');
    }

    socket.on('rooms', () => {
      socket.emit('rooms', io.of('/').adapter.rooms);
    });
    handleClientDisconnection(socket, nickNames, namesUsed);
  });
};
