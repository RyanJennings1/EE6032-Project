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

  processCommand(command) {
    const words = command.split(' ');
    const keyword = words[0].substring(1, words[0].length).toLowerCase();
    let message = false;

    switch (keyword) {
      case 'join':
        words.shift();
        this.changeRoom(words.join(' '));
        break;
      case 'nick':
        words.shift();
        this.socket.emit('nameAttempt', words.join(' '));
        break;
      default:
        message = 'Unrecognized command.';
        break;
    }
    return message;
  }
}
