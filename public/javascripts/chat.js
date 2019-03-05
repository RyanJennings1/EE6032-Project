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

  changeRoom(room) {
    this.socket.emit('join', {
      newRoom: room,
    });
  }
}
