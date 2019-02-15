/*
 * Returns message HTML block.
 * Escape tags in messages to prevent XXS attacks.
 * Use Moment.js to get locale time.
 * TODO: Pass in username for jdenticon value.
 */
function divEscapedContentElement(message) {
  message = message.replace(/>/, '&gt');
  message = message.replace(/</, '&lt');

  return `
  <div class="d-flex justify-content-end mb-4">
    <div class="msg_cotainer_send">
      ${message}
      <span class="msg_time_send">${moment().format('LT')}</span>
    </div>
    <div class="img_cont_msg">
    <canvas width="80" height="80" data-jdenticon-value="${message}" class="rounded-circle user_img_msg" style="background-color: white"></canvas>
    </div>
  </div>
  `;
}

/*
 * Returns system HTML block.
 */
function divSystemContentElement(message) {
  return $('<div></div>').html(`<i>${message}</i>`);
}

/*
 * Handle input, add message to chat or execute command.
 */
function processUserInput(chatApp, socket) {
  const message = $('#send-message').val();

  if (message.charAt(0) === '/') {
    const systemMessage = chatApp.processCommand(message);
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

/*
 * Start program when document ready.
 */
const socket = io.connect();
$(document).ready(() => {
  const chatApp = new Chat(socket);

  /*
   * Print system message when nickname changed
   */
  socket.on('nameResult', (result) => {
    const message = result.success ? `You are now known as ${result.name}` : result.message;
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
