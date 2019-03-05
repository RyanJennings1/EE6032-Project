const socketio = require('socket.io');
const fs = require('fs');
const imageDataURI = require('image-data-uri');

const parseDataURL = require('data-urls');
const { decode } = require('whatwg-encoding');

let io;
let guestNumber = 1;
const nickNames = {};
const currentRoom = {};
const imageExtensions = new Set(['png', 'jpg', 'jpeg']);

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
    text: `${nickNames[socket.id]} has joined.`,
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

function emitDownload(socket, fileName, fileExtension, data) {
  const randomIdNumber = Math.random().toString().split('.')[1];
  socket.emit('postDownloadBox', {
    fileData: data,
    fileName: `${fileName}.${fileExtension}`,
    socketId: socket.id,
    idNum: randomIdNumber,
  });

  socket.broadcast.to('Lobby').emit('otherUserPostDownloadBox', {
    fileData: data,
    fileName: `${fileName}.${fileExtension}`,
    socketId: socket.id,
    idNum: randomIdNumber,
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

function handleFileBroadcasting(socket) {
  socket.on('writeFile', (fileData) => {
    const tmpDir = './public/tmp';

    let fileExtension = (fileData.data.split(';')[0]).split('/')[1];
    if (fileExtension === 'plain') fileExtension = 'txt';

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

  io.sockets.on('connection', (socket) => {
    guestNumber = assignGuestName(socket, guestNumber, nickNames);
    console.log('Current Guest Number: ', guestNumber);
    if (guestNumber < 4) {
      joinRoom(socket, 'Lobby');
      handleMessageBroadcasting(socket, nickNames);
      handleRoomJoining(socket);
      handleFileBroadcasting(socket);
    } else {
      // TODO: Show 'Server Full' page
      console.log('SERVER FULL ===============================================');
    }

    socket.on('rooms', () => {
      socket.emit('rooms', io.of('/').adapter.rooms);
    });
  });
};
