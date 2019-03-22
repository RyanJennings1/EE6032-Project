class Chat {
  constructor(socket) {
    this.socket = socket;
  }

  sendMessage(room, text) {
    const message = {
      room,
      text,
    };
    this.socket.emit('message', message);
  }

  sendFile(data) {
    this.socket.emit('sendFile', data);
  }

  sendImage(data) {
    this.socket.emit('sendImage', data);
  }

  changeRoom(room) {
    this.socket.emit('join', {
      newRoom: room,
    });
  }
}
