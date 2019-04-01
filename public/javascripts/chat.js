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

  sendEncryptedMessage(message) {
    const encoder = new TextEncoder('utf-8');
    encryptAES(aesKab, iv, encoder.encode(JSON.stringify(message))).then((encryptedMessage) => {
      this.socket.emit('encryptedMessage', encryptedMessage);
    });
  }

  sendFile(data) {
    this.socket.emit('sendFile', data);
  }

  sendEncryptedFile(data) {
    // TODO
    this.socket.emit('sendEncryptedFile', data);
  }

  sendImage(data) {
    this.socket.emit('sendImage', data);
  }

  sendEncryptedImage(data) {
    // TODO
    const encoder = new TextEncoder('utf-8');
    encryptAES(aesKab, iv, encoder.encode(JSON.stringify(data))).then((encryptedData) => {
      this.socket.emit('encryptedImage', encryptedData);
    });
  }

  changeRoom(room) {
    this.socket.emit('join', {
      newRoom: room,
    });
  }
}
