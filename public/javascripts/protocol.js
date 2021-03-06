/*
 * Name: protocol.js
 *
 * Protocol functions for setting up encryption to encrypt messages between users
 */

/*
 * Starts the protocol off by creating private and public keys
 * then sends the public key off to the other client
 */
function initiateProtocol(socket) {
  socket.on('startRSA', () => {
    generateRSA().then((key) => {
      rsaPublicKey = key.publicKey;
      rsaPrivateKey = key.privateKey;
      // Export the public key and send it
      exportRSA(rsaPublicKey).then((key) => {
        const rsaExportedKey = key;
        socket.emit('sendPublicKey', rsaExportedKey);
      });
    });
  });
}

/*
 * Receive other clients public key
 * Set other user's public key to a variable
 */
function getRemotePublicKey(socket) {
  socket.on('receivePublicKey', (msg) => {
    const rsaExportedKey_2 = msg;
    importRSA_OAEP(rsaExportedKey_2).then((key) => {
      rsaPublicKey_2 = key;
      console.log('Other user public key received successfully');
    });
  });
}

/*
 * Step 1 of encryption protocol
 * A -> B: { PassA, { H(PassA) }Ka-1 }Kb
 */
function step1(socket) {
  socket.on('step1', () => {
    console.log('Step 1 starting');
    passA = window.crypto.getRandomValues(new Uint8Array(6)); // random number challenge
    console.log('Challenge A: ', passA);
    hashSHA(passA).then((hashed) => { // H(passA) hashed challenge
      // { H(passA) }ka-1 signed hash with private key
      signRSA(rsaPrivateKey, hashed).then((signedHash) => {
        const combinedArray = new Uint8Array(passA.length + signedHash.length);
        combinedArray.set(passA);
        combinedArray.set(signedHash, passA.length);
        const splitCombinedArray = combinedArray.slice(0, 190);
        const splitCombinedArray_2 = combinedArray.slice(190, combinedArray.length);
        encryptRSA(rsaPublicKey_2, splitCombinedArray).then((data) => {
          encryptRSA(rsaPublicKey_2, splitCombinedArray_2).then((data_2) => {
            // { passA,{ H(passA) }ka-1 }kb
            const combinedArray = new Uint8Array(data.length + data_2.length);
            combinedArray.set(data);
            combinedArray.set(data_2, data.length);
            const message = combinedArray;
            socket.emit('getResponseToStartStep2', message);
          });
        });
      });
    });
  });
}

/*
 * Step 2 of encryption protocol
 * B: Kab = H(PassA || PassB)
 */
function step2(socket) {
  socket.on('step2', (message) => {
    console.log('Step 2 starting');
    combinedArray = new Uint8Array(Object.values(message));
    exportPrivateRSA(rsaPrivateKey).then((exportedRSAKey) => {
      importPrivateRSA_OAEP(exportedRSAKey).then((importedRSAKey) => {
        const splitCombinedArray = combinedArray.slice(0, 256);
        const splitCombinedArray_2 = combinedArray.slice(256, 512);
        decryptRSA(importedRSAKey, splitCombinedArray).then((data) => {
          decryptRSA(importedRSAKey, splitCombinedArray_2).then((data_2) => {
            // { passA,{ H(passA) }ka-1 }kb
            const combinedArray = new Uint8Array(data.length + data_2.length);
            combinedArray.set(data);
            combinedArray.set(data_2, data.length);
            const message = combinedArray;
            const passA = message.slice(0, 6); // PassA
            const signature = message.slice(6, 262);
            hashSHA(passA).then((hashed) => { // H(PassA)
              exportRSA(rsaPublicKey_2).then((exportedPublicRSAKey) => {
                importRSA_PSS(exportedPublicRSAKey).then((importedPublicRSAKey) => {
                  verifyRSA(importedPublicRSAKey, signature, hashed).then((isvalid) => {
                    if (isvalid) {
                      // Create random number PassB
                      passB = window.crypto.getRandomValues(new Uint8Array(6));
                      // const passB = window.crypto.getRandomValues(new Uint8Array(6));
                      console.log('Pass B: ', passB);
                      const aesKey = new Uint8Array(passA.length + passB.length);
                      aesKey.set(passA);
                      aesKey.set(passB, passA.length); // PassA || PassB
                      console.log('Aes Key: ', aesKey);
                      hashSHA(aesKey).then((hashed) => { // hash newly created AES Key
                        aesKeyHash = hashed; // Kab = H(PassA || PassB)
                        console.log('Hashed AES Key: ', aesKeyHash);
                        step3(passA, passB, aesKeyHash, socket);
                      });
                    } else {
                      console.error('[Invalid Digital Signature]');
                    }
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

/*
 * Step 3 of encryption protocol
 * B -> A: { PassB, { PassA }Kab, { H(PassB, { PassA }Kab) }Kb-1 }Ka
 */
function step3(passA, passB, aesKeyHash, socket) {
  console.log('Step 3 starting');
  iv = crypto.getRandomValues(new Uint8Array(12));
  importAES(aesKeyHash, iv).then((Kab) => { // Kab key object
    aesKab = Kab;
    encryptAES(Kab, iv, passA).then((encryptedPassA) => { // {PassA}Kab
      const combinedArray = new Uint8Array(passB.length + encryptedPassA.length);
      combinedArray.set(passB);
      combinedArray.set(encryptedPassA, passB.length);
      hashSHA(combinedArray).then((hashed) => { // H(PassB,{PassA}Kab)
        signRSA(rsaPrivateKey, hashed).then((signedHash) => { // {H(PassB,{PassA}Kab)}Kb-1
          const combinedArray = new Uint8Array(passB.length + encryptedPassA.length + signedHash.length);
          combinedArray.set(passB);
          combinedArray.set(encryptedPassA, passB.length);
          combinedArray.set(signedHash, passB.length + encryptedPassA.length);
          const splitCombinedArray = combinedArray.slice(0, 190);
          const splitCombinedArray_2 = combinedArray.slice(190, combinedArray.length);
          exportRSA(rsaPublicKey_2).then((exportedPublicRSAKey) => {
            importRSA_OAEP(exportedPublicRSAKey).then((importedPublicOAEPKey) => {
              // {PassB, {PassA}Kab,{H(PassB,{PassA}Kab)}kb-1}Ka
              encryptRSA(importedPublicOAEPKey, splitCombinedArray).then((encryptedData) => {
                encryptRSA(importedPublicOAEPKey, splitCombinedArray_2).then((encryptedData_2) => {
                  const message = new Uint8Array(iv.length + encryptedData.length + encryptedData_2.length);
                  message.set(iv);
                  message.set(encryptedData, iv.length);
                  message.set(encryptedData_2, (iv.length + encryptedData.length));
                  socket.emit('getResponseToStartStep4', message);
                });
              });
            });
          });
        });
      });
    });
  });
}

/*
 * Step 4 of encryption protocol
 * A: Kab = H(PassA || PassB)
 */
function step4(socket) {
  socket.on('step4', (msg) => {
    console.log('Step 4 starting');
    // { passB, {passB}kab , { H(passB, {passA}kab ) }kb-1 }ka
    combinedArray = new Uint8Array(Object.values(msg));
    iv = combinedArray.slice(0, 12);
    exportPrivateRSA(rsaPrivateKey).then((exportedRSAKey) => {
      importPrivateRSA_OAEP(exportedRSAKey).then((importedRSAKey) => {
        const splitCombinedArray = combinedArray.slice(12, 268);
        const splitCombinedArray_2 = combinedArray.slice(268, 524);
        decryptRSA(importedRSAKey, splitCombinedArray).then((data) => {
          decryptRSA(importedRSAKey, splitCombinedArray_2).then((data_2) => {
            // passB, {passB}kab , { H(passB, {passA}kab ) }kb-1
            let combinedArray = new Uint8Array(data.length + data_2.length);
            combinedArray.set(data);
            combinedArray.set(data_2, data.length);
            const message = combinedArray;
            const passB = message.slice(0, 6); // PassB
            console.log('PassB: ', passB);
            console.log('PassA: ', passA);
            const encryptedPassA = message.slice(6, 28); // {passA}kab
            const signature = message.slice(28, 284);
            combinedArray = new Uint8Array(passB.length + encryptedPassA.length);
            combinedArray.set(passB);
            combinedArray.set(encryptedPassA, passB.length);
            hashSHA(combinedArray).then((hashed) => { // H(PassB, {passA}kab )
              exportRSA(rsaPublicKey_2).then((exportedPublicRSAKey) => {
                importRSA_PSS(exportedPublicRSAKey).then((importedPublicRSAKey) => {
                  verifyRSA(importedPublicRSAKey, signature, hashed).then((isvalid) => {
                    if (isvalid) {
                      console.log('Signature is vaild');
                      const aesKey = new Uint8Array(passA.length + passB.length);
                      aesKey.set(passA);
                      aesKey.set(passB, passA.length); // PassA||PassB
                      hashSHA(aesKey).then((hashed) => { // hash newly created AES Key
                        aesKeyHash = hashed; // Kab = H(PassA || PassB)
                        console.log('Hashed AES Key:');
                        console.log(aesKeyHash);
                        importAES(aesKeyHash, iv).then((Kab) => { // Kab key object
                          aesKab = Kab;
                          // Step 5
                          // A -> B: { PassA }Kab
                          encryptAES(Kab, iv, passB).then((encryptedPassB) => {
                            socket.emit('finishProtocol', encryptedPassB);
                          });
                        });
                      });
                    } else {
                      console.error('[Invalid Digital Signature]');
                    }
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

/*
 * Step 5 of encryption protocol
 * A -> B: { PassB }Kab
 */
function step5(socket) {
  socket.on('step5', (encryptedPassB) => {
    const decodedPassB = new Uint8Array(Object.values(encryptedPassB));
    decryptAES(aesKab, iv, decodedPassB).then((newPassB) => { // {PassB}Kab
      console.log('Decrypted PassB: ', newPassB);
      if (newPassB.sort().join(',') === passB.sort().join(',')) {
        console.log('Encrption Protocol has run Successfully!');
      } else {
        console.error("Protocol failed: PassA's are NOT the same");
      }
    });
  });
}
