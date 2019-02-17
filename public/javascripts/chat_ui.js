/*
 * Returns message HTML block.
 * Escape tags in messages to prevent XXS attacks.
 * Use Moment.js to get locale time.
 */
function divEscapedContentElement(message, socketId) {
  message = message.replace(/>/, '&gt');
  message = message.replace(/</, '&lt');

  return `
  <div class="d-flex justify-content-end mb-4">
    <div class="msg_cotainer_send">
      ${message}
      <span class="msg_time_send">${moment().format('LT')}</span>
    </div>
    <div class="img_cont_msg">
    <canvas width="80" height="80" data-jdenticon-value="${socketId}" class="rounded-circle user_img_msg" style="background-color: white"></canvas>
    </div>
  </div>
  `;
}

function otherUserDivEscapedContentElement(message, socketId) {
  message = message.replace(/>/, '&gt');
  message = message.replace(/</, '&lt');

  return `
  <div class="d-flex justify-content-start mb-4">
    <div class="img_cont_msg">
    <canvas width="80" height="80" data-jdenticon-value="${socketId}" class="rounded-circle user_img_msg" style="background-color: white"></canvas>
    </div>
    <div class="msg_cotainer_received">
      ${message}
      <span class="msg_time_send">${moment().format('LT')}</span>
    </div>
  </div>
  `;
}

function downloadFileBox(fileName, socketId) {
  return `
  <div class="d-flex justify-content-end mb-4">
    <div class="msg_cotainer_send">
      <a href="/tmp/${fileName}" id="download-button" class="btn btn-download" target="_blank">
        ${fileName}
        <span class="download-box">
          <i class="fas fa-file-download"></i>
        </span>
      </a>
      <span class="msg_time_send">${moment().format('LT')}</span>
    </div>
    <div class="img_cont_msg">
    <canvas width="80" height="80" data-jdenticon-value="${socketId}" class="rounded-circle user_img_msg" style="background-color: white"></canvas>
    </div>
  </div>
  `;
}

function otherUserDownloadFileBox(fileName, socketId) {
  return `
  <div class="d-flex justify-content-start mb-4">
    <div class="img_cont_msg">
    <canvas width="80" height="80" data-jdenticon-value="${socketId}" class="rounded-circle user_img_msg" style="background-color: white"></canvas>
    </div>
    <div class="msg_cotainer_received">
      <a href="/tmp/${fileName}" id="download-button" class="btn btn-download" target="_blank">
        ${fileName}
        <span class="download-box">
          <i class="fas fa-file-download"></i>
        </span>
      </a>
      <span class="msg_time_send">${moment().format('LT')}</span>
    </div>
  </div>
  `;
}

/*
 * Returns system HTML block.
 */
function divSystemContentElement(message) {
  return $('<div class="d-flex justify-content-center mb-4"></div>').html(`<i>${message}</i>`);
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
    $('#messages').append(divEscapedContentElement(message, socket.id));
    $('#messages').scrollTop($('#messages').prop('scrollHeight'));
  }
  $('#send-message').val('');
}

function processFileTransfer(fileName, socketId) {
  $('#messages').append(downloadFileBox(fileName, socketId));
}

function otherUserProcessFileTransfer(fileName, socketId) {
  $('#messages').append(otherUserDownloadFileBox(fileName, socketId));
}

const socket = io.connect();

function sendFileToServer(img) {
  socket.emit('writeFile', img);
}

function handleFiles(data) {
  const file = data.files[0];
  const myReader = new FileReader();
  myReader.onloadend = (e) => {
    sendFileToServer(myReader.result);
  };
  myReader.readAsDataURL(file);
}

/*
 * Start program when document ready.
 */
$(document).ready(() => {
  const chatApp = new Chat(socket);

  /*
   * Print system message when nickname changed.
   */
  socket.on('nameResult', (result) => {
    const message = (result.success ? `You are now known as ${result.name}` : result.message);
    $('#messages').append(divSystemContentElement(message));
  });

  /*
   * Print system message when room is changed.
   */
  socket.on('joinResult', (result) => {
    $('#room').text(result.room);
    $('#messages').append(divSystemContentElement('Room changed.'));
  });

  /*
   * Add basic message to chat.
   */
  socket.on('message', (message) => {
    const newElement = $('<div></div>').text(message.text);
    $('#messages').append(newElement);
  });

  /*
   * Add a system message to the chat.
   */
  socket.on('systemMessage', (message) => {
    $('#messages').append(divSystemContentElement(message.text));
  });

  /*
   * Add message from other user in chat.
   */
  socket.on('otherUserMessage', (message) => {
    $('#messages').append(otherUserDivEscapedContentElement(message.text, message.userId));
  });

  /*
   * Add file download box to chat.
   */
  socket.on('sendFile', (data) => {
    console.log('captured in socket on');
    // $('#messages').append(downloadFileBox(data));
    $('#messages').append(divEscapedContentElement(data, socket.id));
  });

  socket.on('rooms', (rooms) => {
    $('#room-list').empty();

    for (let room in rooms) {
      room = room.substring(1, room.length);
      if (room != '') {
        $('#room-list').append(divEscapedContentElement(room, socket.id));
      }
    }

    $('#room-list div').click(() => {
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

  socket.on('postDownloadBox', (data) => {
    processFileTransfer(data.fileName, data.socketId);
  });

  socket.on('otherUserPostDownloadBox', (data) => {
    otherUserProcessFileTransfer(data.fileName, data.socketId);
  });

  $('#download-button').click(() => {
    // read file from tmp/ and download
  });

  /*
   * Send message on 'Enter' press.
   */
  $('#send-message').keypress((e) => {
    const code = (e.keyCode ? e.keyCode : e.which);
    if (code === 13) {
      $('#send-form').submit();
      e.preventDefault();
    }
  });
});
