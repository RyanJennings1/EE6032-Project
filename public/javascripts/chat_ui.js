let globalFileData;
let globalMessageData = null;

/*
 * Returns message HTML block.
 * Escape tags in messages to prevent XXS attacks.
 * Use Moment.js to get locale time.
 */
function divEscapedContentElement(message, socketId) {
  message = message.replace(/>/g, '&gt');
  message = message.replace(/</g, '&lt');

  // Content for the sender to see on their screen
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
  message = message.replace(/>/g, '&gt');
  message = message.replace(/</g, '&lt');

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

function downloadFileBox(fileName, socketId, idNum, fileText, mimetype) {
  // Put a backslash before apostrohpes? maybe transfer fileText as a blob
  return `
  <div class="d-flex justify-content-end mb-4">
    <div class="msg_cotainer_send">
      <a href='#' id="download-button" class="btn btn-download" onclick="downloadFile({data: \`${fileText}\`, name: \`${fileName}\`, mimetype: \`${mimetype}\`})">
        ${fileName}
        <span class="download-box">
          <i class="fas fa-file-download"></i>
        </span>
      </a>
      <div>
        <button id='show-contents' data-uuid='${idNum}' onclick="toggleContent(this.getAttribute('data-uuid'))">Show Contents</button>
      </div>
      <pre id='${idNum}' style='display: none'>
      ${fileText}
      </pre>
      <span class="msg_time_send">${moment().format('LT')}</span>
    </div>
    <div class="img_cont_msg">
    <canvas width="80" height="80" data-jdenticon-value="${socketId}" class="rounded-circle user_img_msg" style="background-color: white"></canvas>
    </div>
  </div>
  `;
}

function otherUserDownloadFileBox(fileName, socketId, idNum, fileText, mimetype) {
  return `
  <div class="d-flex justify-content-start mb-4">
    <div class="img_cont_msg">
    <canvas width="80" height="80" data-jdenticon-value="${socketId}" class="rounded-circle user_img_msg" style="background-color: white"></canvas>
    </div>
    <div class="msg_cotainer_received">
      <a href='#' id="download-button" class="btn btn-download" onclick="downloadFile({data: \`${fileText}\`, name: \`${fileName}\`, mimetype: \`${mimetype}\`})">
        ${fileName}
        <span class="download-box">
          <i class="fas fa-file-download"></i>
        </span>
      </a>
      <div>
        <button id='show-contents' data-uuid='${idNum}' onclick="toggleContent(this.getAttribute('data-uuid'))">Show Contents</button>
      </div>
      <pre id='${idNum}' style='display: none'>
      ${fileText}
      </pre>
      <span class="msg_time_send">${moment().format('LT')}</span>
    </div>
  </div>
  `;
}

function imageHTML(data, socketId, filename) {
  return `
  <div class="d-flex justify-content-end mb-4">
    <div class="msg_cotainer_send">
      ${filename}
      <img src=${data} style='width:100%; border-radius:20px'>
      <span class="msg_time_send">${moment().format('LT')}</span>
    </div>
    <div class="img_cont_msg">
    <canvas width="80" height="80" data-jdenticon-value="${socketId}" class="rounded-circle user_img_msg" style="background-color: white"></canvas>
    </div>
  </div>
  `;
}

function otherUserImageHTML(data, socketId, filename) {
  return `
  <div class="d-flex justify-content-start mb-4">
    <div class="img_cont_msg">
    <canvas width="80" height="80" data-jdenticon-value="${socketId}" class="rounded-circle user_img_msg" style="background-color: white"></canvas>
    </div>
    <div class="msg_cotainer_received">
      ${filename}
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

function b64toUnicode(data) {
  // const b64text = data.replace(/^data:(image|text)\/(png|plain);base64,/, '');
  const b64text = data.replace(/^data:.*\/.*;base64,/, '');
  return decodeURIComponent(escape(window.atob(b64text)));
}

/*
 * Is called when a file is attached from the browser.
 */
function handleFiles(data) {
  const file = data.files[0];
  const reader = new FileReader();

  reader.onloadend = () => {
    globalFileData = reader.result;
    // open modal for selecting filename before sending to server
    $('#fileNameModal').css('display', 'block');
  };
  reader.readAsDataURL(file);
}

/*
 * Is called when 'show content' button is pressed on download box
 */
function toggleContent(data) {
  // Toggle showing the file contents
  if ($(`#${data}`).css('display') === 'block') {
    $(`#${data}`).css('display', 'none');
  } else {
    $(`#${data}`).css('display', 'block');
  }
}

function downloadFile(fileData) {
  const blob = new Blob([fileData.data], { type: `${fileData.mimetype};charset=utf-8` });
  saveAs(blob, fileData.name);
}

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function str2ab(str) {
  const buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i += 1) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

const socket = io.connect();

/*
 * Start program when document ready.
 */
$(document).ready(() => {
  // Initialise protocol here to get keys
  // start off protocol by creating rsa public and private keys (async)
  initiateProtocol(socket);

  // receive remote public key from other client (async)
  getRemotePublicKey(socket);

  // Step 1: A -> B: A, B, { PassA, { H(PassA) }Ka-1 }Kb
  step1(socket);

  // Step 2: B: Kab = H(PassA || PassB)
  step2(socket);

  // Step 3 (called from within step2)
  // B -> A: B, A, { PassB, { PassA }Kab, { H(PassB, { PassA }Kb) }Kb-1 }Ka

  // Step 4: A: Kab = H(PassA || PassB)
  step4(socket);

  // Step 5: A -> B: A, B, { PassB }Kab
  // TODO
  step5(socket);

  const chatApp = new Chat(socket);

  $('#send-message').focus();

  setInterval(() => {
    socket.emit('rooms');
  }, 1000);

  /*
   * Print system message when room is changed.
   */
  socket.on('joinResult', (result) => {
    $('#room').text(result.room);
    $('#messages').append(divSystemContentElement('Room changed.'));
  });

  socket.on('initiateEncryptionDisplay', () => {
    $('#lockimg').css('display', 'block');
    $('#body').css('background', 'gray');
    $('#encryptChat').prop('checked', true);
  });

  socket.on('stopEncryptionDisplay', () => {
    $('#lockimg').css('display', 'none');
    $('#body').css('background', 'linear-gradient(to right, #91EAE4, #86A8E7, #7F7FD5)');
    $('#encryptChat').prop('checked', false);
  });

  /*
   * Add basic message to chat.
  socket.on('message', (message) => {
    const newElement = $('<div></div>').text(message.text);
    $('#messages').append(newElement);
  });
   */

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
   * Append download box to screen for other user
   */
  socket.on('otherUserPostDownloadBox', (data) => {
    $('#messages').append(otherUserDownloadFileBox(data.fileName, data.socketId, data.idNum, b64toUnicode(data.fileData), data.mimetype));
  });

  /*
   * Append image to screen for other user
   */
  socket.on('otherUserPostImage', (data) => {
    $('#messages').append(otherUserImageHTML(data.data, data.socketId, data.fileName));
  });

  socket.on('receiveEncryptedMessage', (message) => {
    const decoder = new TextDecoder();
    const messageArrayBuffer = new Uint8Array(Object.values(message));
    console.log('message array buffer: ', messageArrayBuffer);
    decryptAES(aesKab, iv, messageArrayBuffer).then((decryptedMessage) => {
      console.log('decryted Message: ', decryptedMessage);
      const decodedMessage = decoder.decode(decryptedMessage);
      console.log('decoded Message: ', decodedMessage);
      const finalMessage = JSON.parse(decodedMessage);
      $('#messages').append(otherUserDivEscapedContentElement(finalMessage.message, finalMessage.socketId));
    });
  });

  socket.on('receiveEncryptedImage', (data) => {
    const decoder = new TextDecoder();
    const messageArrayBuffer = new Uint8Array(Object.values(data));
    decryptAES(aesKab, iv, messageArrayBuffer).then((decryptedMessage) => {
      const decodedMessage = JSON.parse(decoder.decode(decryptedMessage));
      console.log('decoded Message: ', decodedMessage);
      $('#messages').append(otherUserImageHTML(decodedMessage.data, decodedMessage.socketId, decodedMessage.fileName));
    });
  });

  socket.on('encryptionFinishedMessage', () => {
    chatApp.sendEncryptedMessage(globalMessageData);
    globalMessageData = null;
  });

  /*
   * Send message
   */
  $('#send-form').submit(() => {
    const message = $('#send-message').val();

    if ($('#encryptChat').prop('checked')) {
      if (aesKab) {
        // use encryption key already stored
        console.log('aesKab has a value ++++++++');
        // chatApp.sendEncryptedMessage(message);
        chatApp.sendEncryptedMessage({ message: message, socketId: socket.id });
      } else {
        // start encryption and send message afterwards
        console.log('aesKab is null ------------');
        globalMessageData = message;
        socket.emit('encryptProtocol');
      }
    } else {
      chatApp.sendMessage($('#room').text(), message);
    }

    $('#messages').append(divEscapedContentElement(message, socket.id));
    $('#messages').scrollTop($('#messages').prop('scrollHeight'));

    $('#send-message').val('');
    return false;
  });

  /*
   * When a filename is submitted from the modal,
   * send the file data via sockets
   */
  $('#file-name-input').submit((fileName) => {
    // Send the filename and file data to the backend
    $('#fileNameModal').css('display', 'none');
    const randomIdNumber = Math.random().toString().split('.')[1];

    // Analyse file extension here on client rather than server
    let fileExtension = (globalFileData.split(';')[0]).split('/')[1];
    if (fileExtension === 'plain') fileExtension = 'txt';
    const mimeType = (globalFileData.split(';')[0].split(':')[1]);

    const message = {
      fileName: `${fileName.target[0].value}.${fileExtension}`,
      data: globalFileData,
      idNum: randomIdNumber,
      socketId: socket.id,
      mimetype: mimeType,
    };

    // Determine if its an image from its mime type
    if (mimeType.split('/')[0] === 'image') {
      if ($('#encryptChat').prop('checked')) {
        if (aesKab) {
          // use encryption key already stored
          console.log('aesKab has a value ++++++++');
          chatApp.sendEncryptedImage(message);
        } else {
          // start encryption and send image afterwards
          console.error('aesKab is null ------------');
          // socket.emit('encryptProtocol');
        }
      } else {
        chatApp.sendImage(message);
      }

      $('#messages').append(
        imageHTML(globalFileData,
          socket.id,
          `${fileName.target[0].value}.${fileExtension}`)
      );
    } else {
      if ($('#encryptChat').prop('checked')) {
        if (aesKab) {
          // use encryption key already stored
          console.log('aesKab has a value ++++++++');
          chatApp.sendEncryptedFile(message);
        } else {
          // start encryption and send file afterwards
          console.log('aesKab is null ------------');
          socket.emit('encryptProtocol');
        }
      } else {
        chatApp.sendFile(message);
      }

      $('#messages').append(
        downloadFileBox(`${fileName.target[0].value}.${fileExtension}`,
          socket.id,
          randomIdNumber,
          b64toUnicode(globalFileData),
          mimeType)
      );
    }

    return false;
  });

  /*
   * Close the filename modal
   */
  $('#close-button').click(() => {
    $('#fileNameModal').css('display', 'none');
  });

  $('#encryptChat').change((event) => {
    if (event.target.checked) {
      $('#lockimg').css('display', 'block');
      $('#body').css('background', 'gray');
      // turn on encryption for the other user too
      socket.emit('turnOnEncryption');
      if (!aesKab) { socket.emit('encryptProtocol'); }
    } else {
      $('#lockimg').css('display', 'none');
      $('#body').css('background', 'linear-gradient(to right, #91EAE4, #86A8E7, #7F7FD5)');
      socket.emit('turnOffEncryption');
    }
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
