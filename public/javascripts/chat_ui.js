let globalFileData;
let globalFileContents;

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

function downloadFileBox(fileName, socketId, idNum) {
  return `
  <div class="d-flex justify-content-end mb-4">
    <div class="msg_cotainer_send">
      <a href="/tmp/${fileName}" id="download-button" class="btn btn-download" target="_blank">
        ${fileName}
        <span class="download-box">
          <i class="fas fa-file-download"></i>
        </span>
      </a>
      <div>
        <button id='show-contents' data-uuid='${idNum}' onclick="toggleContent(this.getAttribute('data-uuid'))">Show Contents</button>
      </div>
      <pre id='${idNum}' style='display: none'></pre>
      <span class="msg_time_send">${moment().format('LT')}</span>
    </div>
    <div class="img_cont_msg">
    <canvas width="80" height="80" data-jdenticon-value="${socketId}" class="rounded-circle user_img_msg" style="background-color: white"></canvas>
    </div>
  </div>
  `;
}

function otherUserDownloadFileBox(fileName, socketId, idNum) {
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
      <div>
        <button id='show-contents' data-uuid='${idNum}' onclick='toggleContent(this.getAttribute('data-uuid'))'>Show Contents</button>
      </div>
      <pre id='${idNum}' style='display: none'></pre>
      <span class="msg_time_send">${moment().format('LT')}</span>
    </div>
  </div>
  `;
}

function imageHTML(data, socketId) {
  return `
  <div class="d-flex justify-content-end mb-4">
    <div class="msg_cotainer_send">
      <img src=${data} style='width:100%; border-radius:20px'>
      <span class="msg_time_send">${moment().format('LT')}</span>
    </div>
    <div class="img_cont_msg">
    <canvas width="80" height="80" data-jdenticon-value="${socketId}" class="rounded-circle user_img_msg" style="background-color: white"></canvas>
    </div>
  </div>
  `;
}

function otherUserImageHTML(data, socketId) {
  return `
  <div class="d-flex justify-content-start mb-4">
    <div class="img_cont_msg">
    <canvas width="80" height="80" data-jdenticon-value="${socketId}" class="rounded-circle user_img_msg" style="background-color: white"></canvas>
    </div>
    <div class="msg_cotainer_received">
      <img src=${data} style='width:100%; border-radius:20px'>
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

function processFileTransfer(fileName, socketId, idNum) {
  $('#messages').append(downloadFileBox(fileName, socketId, idNum));
}

function otherUserProcessFileTransfer(fileName, socketId, idNum) {
  $('#messages').append(otherUserDownloadFileBox(fileName, socketId, idNum));
}

function postImage(fileData, socketId) {
  $('#messages').append(imageHTML(fileData, socketId));
}

function otherUserPostImage(fileData, socketId) {
  $('#messages').append(otherUserImageHTML(fileData, socketId));
}

function openModalBeforeSendingFileToServer(fileData) {
  globalFileData = fileData;
  $('#fileNameModal').css('display', 'block');
}

/*
 * Is called when a file is attached from the browser.
 */
function handleFiles(data) {
  const file = data.files[0];
  const myReader = new FileReader();
  myReader.onloadend = (e) => {
    openModalBeforeSendingFileToServer(myReader.result);
    globalFileContents = myReader.result;
  };
  myReader.readAsDataURL(file);
}

/*
 * Is called when 'show content' button is pressed on download box
 */
function toggleContent(data) {
  // Decode from base64
  const b64text = globalFileContents.replace(/^data:(image|text)\/(png|plain);base64,/, '');
  const unicodeText = decodeURIComponent(escape(window.atob(b64text)));
  $(`#${data}`).text(unicodeText);

  // Toggle showing the file contents
  if ($(`#${data}`).css('display') === 'block') {
    $(`#${data}`).css('display', 'none');
  } else {
    $(`#${data}`).css('display', 'block');
  }
}

const socket = io.connect();

/*
 * Start program when document ready.
 */
$(document).ready(() => {
  const chatApp = new Chat(socket);

  $('#send-message').focus();

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
    $('#messages').append(divEscapedContentElement(data, socket.id));
  });

  /*
   * Append download box to screen
   */
  socket.on('postDownloadBox', (data) => {
    processFileTransfer(data.fileName, data.socketId, data.idNum);
  });

  /*
   * Append download box to screen for other user
   */
  socket.on('otherUserPostDownloadBox', (data) => {
    otherUserProcessFileTransfer(data.fileName, data.socketId, data.idNum);
  });

  /*
   * Append image to screen
   */
  socket.on('postImage', (data) => {
    postImage(data.fileData, data.socketId);
  });

  /*
   * Append image to screen for other user
   */
  socket.on('otherUserPostImage', (data) => {
    otherUserPostImage(data.fileData, data.socketId);
  });

  /*
   * Send message
   */
  $('#send-form').submit(() => {
    const message = $('#send-message').val();

    chatApp.sendMessage($('#room').text(), message);

    $('#messages').append(divEscapedContentElement(message, socket.id));
    $('#messages').scrollTop($('#messages').prop('scrollHeight'));

    $('#send-message').val('');
    return false;
  });

  /*
   * close the filename modal
   */
  $('#close-button').click(() => {
    $('#fileNameModal').css('display', 'none');
  });

  /*
   * When a filename is submitted from the modal,
   * send the file data via sockets
   */
  $('#file-name-input').submit((fileName) => {
    // Send the filename and file data to the backend
    $('#fileNameModal').css('display', 'none');
    socket.emit('writeFile', {
      data: globalFileData,
      filename: fileName.target[0].value,
    });
    return false;
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
