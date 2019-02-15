function divEscapedContentElement(message) {
  message = message.replace(/>/, '&gt');
  message = message.replace(/</, '&lt');

  return `
  <div class="d-flex justify-content-end mb-4">
    <div class="msg_cotainer_send">
      ${message}
      <span class="msg_time_send">8:55 AM, Today</span>
    </div>
    <div class="img_cont_msg">
  <img src="https://ih0.redbubble.net/image.373223104.8912/flat,550x550,075,f.u1.jpg" class="rounded-circle user_img_msg">
    </div>
  </div>
  `;
}

function divSystemContentElement(message) {
  return $('<div></div>').html(`<i>${message}</i>`);
}

function processUserInput(chatApp, socket) {
  const message = $('#send-message').val();
  let systemMessage;

  if (message.charAt(0) === '/') {
    systemMessage = chatApp.processCommand(message);
    if (systemMessage) {
      $('#messages').append(divSystemContentElement(systemMessage));
    }
  } else {
    chatApp.sendMessage($('#room').text(), message);
    $('#messages').append(divEscapedContentElement(message));
    $('#messages').scrollTop($('#messages').prop('scrollHeight'));
  }
  $('#send-message').val('');
}

const socket = io.connect();
$(document).ready(() => {
  const chatApp = new Chat(socket);

  socket.on('nameResult', (result) => {
    let message;
    if (result.success) {
      message = `You are now known as ${result.name}.`;
    } else {
      message = result.message;
    }
    $('#messages').append(divSystemContentElement(message));
  });

  socket.on('joinResult', (result) => {
    $('#room').text(result.room);
    $('#messages').append(divSystemContentElement('Room changed.'));
  });

  socket.on('message', (message) => {
    const newElement = $('<div></div>').text(message.text);
    $('#messages').append(newElement);
  });

  socket.on('rooms', (rooms) => {
    $('#room-list').empty();

    for (let room in rooms) {
      room = room.substring(1, room.length);
      if (room != '') {
        $('#room-list').append(divEscapedContentElement(room));
      }
    }

    $('#room-list div').click(function () {
      chatApp.processCommand(`/join ${$(this).text()}`);
      $('#send-message').focus();
    });
  });

  setInterval(() => {
    socket.emit('rooms');
  }, 1000);

  $('#send-message').focus();

  $('#send-form').submit(() => {
    processUserInput(chatApp, socket);
    return false;
  });

  $('#send-message').keypress((e) => {
    const code = (e.keyCode ? e.keyCode : e.which);
    if (code == 13) {
      $('#send-form').submit();
      e.preventDefault();
    }
  });
});
