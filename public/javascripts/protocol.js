// Starts the protocol off by creating private and public keys
// then sends the public key off to the other client
function initiateProtocol(socket) {
  socket.on('startRSA', () => {
    console.log('Protocol received ...');
    generateRSA().then((key) => {
      console.log('Public RSA Key: ', key.publicKey);
      console.log('Private RSA Key: ', key.privateKey);
      rsaPublicKey = key.publicKey;
      rsaPrivateKey = key.privateKey;
      // export the public key and send it
      exportRSA(rsaPublicKey).then((key) => {
        console.log('exported public key: ', key);
        const rsaExportedKey = key;
        socket.emit('sendPublicKey', rsaExportedKey);
      });
    });
  });
}

// Receive other clients public key
function getRemotePublicKey(socket) {
  socket.on('receivePublicKey', (msg) => {
    const rsaExportedKey_2 = msg;
    importRSA_OAEP(rsaExportedKey_2).then((key) => {
      rsaPublicKey_2 = key;
      console.log('rsa public key 2: ', rsaPublicKey_2);
    });
  });
}

// Completes step1 of encryption protocol
function step1(socket) {
  socket.on('step1', () => {
    console.log('step1 starting');
    passA = window.crypto.getRandomValues(new Uint8Array(6)); // random number challenge
    console.log('random values: ', passA);
    hashSHA(passA).then((hashed) => { // H(passA) hashed challenge
      // { H(passA) }ka-1 signed hash with my private key
      console.log('rsa private key A: ', rsaPrivateKey);
      signRSA(rsaPrivateKey, hashed).then((signedHash) => {
        const combinedArray = new Uint8Array(passA.length + signedHash.length);
        combinedArray.set(passA);
        combinedArray.set(signedHash, passA.length);
        const splitCombinedArray = combinedArray.slice(0, 190);
        const splitCombinedArray_2 = combinedArray.slice(190, combinedArray.length);
        console.log('before encrypt pubkey2: ', rsaPublicKey_2);
        encryptRSA(rsaPublicKey_2, splitCombinedArray).then((data) => {
          encryptRSA(rsaPublicKey_2, splitCombinedArray_2).then((data_2) => {
            // { passA,{ H(passA) }ka-1 }kb
            const combinedArray = new Uint8Array(data.length + data_2.length);
            combinedArray.set(data);
            combinedArray.set(data_2, data.length);
            const message = combinedArray;
            socket.emit('getResponseStep2', message);
          });
        });
      });
    });
  });
}

// Completes step 2 of encryption protocol
function step2(socket) {
  socket.on('step2', (msg) => {
    console.log('step2 starting');
    combinedArray = new Uint8Array(Object.values(msg));
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
                      const passB = window.crypto.getRandomValues(new Uint8Array(6));
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

// Completes step 3 of encryption protocol
function step3(passA, passB, aesKeyHash, socket) {
  console.log('step3 starting');
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
                  socket.emit('getResponseStep4', message);
                });
              });
            });
          });
        });
      });
    });
  });
}

// Completes step 4 of encryption protocol
function step4(socket) {
  socket.on('step4', (msg) => {
    console.log('step4 starting');
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
            const encryptedPassA = message.slice(6, 28); // {passB}kab
            const signature = message.slice(28, 284);
            combinedArray = new Uint8Array(passB.length + encryptedPassA.length);
            combinedArray.set(passB);
            combinedArray.set(encryptedPassA, passB.length);
            hashSHA(combinedArray).then((hashed) => { // H(PassB, {passA}kab )
              exportRSA(rsaPublicKey_2).then((exportedPublicRSAKey) => {
                importRSA_PSS(exportedPublicRSAKey).then((importedPublicRSAKey) => {
                  verifyRSA(importedPublicRSAKey, signature, hashed).then((isvalid) => {
                    if (isvalid) {
                      console.log('Signature is vaild continue');
                      const aesKey = new Uint8Array(passA.length + passB.length);
                      aesKey.set(passA);
                      aesKey.set(passB, passA.length); // PassA||PassB
                      hashSHA(aesKey).then((hashed) => { // hash newly created AES Key
                        aesKeyHash = hashed; // Kab = H(PassA || PassB)
                        console.log('Hashed AES Key:');
                        console.log(aesKeyHash);
                        importAES(aesKeyHash, iv).then((Kab) => { // Kab key object
                          aesKab = Kab;
                          decryptAES(Kab, iv, encryptedPassA).then((newPassA) => { // {PassA}Kab
                            console.log('Decrypted PassA: ', newPassA);
                            if (newPassA.sort().join(',') === passA.sort().join(',')) {
                              console.log('Encrption Protocol has run Successfully!');
                              // socket.emit('encryptionFinished');
                            } else {
                              console.log("Protocol failed: PassA's are NOT the same");
                            }
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

// TODO
function step5(socket) {
  socket.on('step5', () => {
    //
  });
}
