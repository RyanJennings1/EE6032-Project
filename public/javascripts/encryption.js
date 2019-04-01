// RSA Keys
let rsaPublicKey; // My public
let rsaPrivateKey; // My private
let rsaPublicKey_2; // Other user's public key
let aesKeyHash;
let passA;
let aesKab;
let iv;
let incoming_nickname;
let current_nickname;

// Hash with SHA
function hashSHA(data) {
  return window.crypto.subtle.digest({
    name: 'SHA-256',
  },
  data) // The data you want to hash as an ArrayBuffer
    .then((hash) => {
      // Returns the hash as an ArrayBuffer
      const hashed = new Uint8Array(hash);
      // console.log(hashed);
      return hashed;
    })
    .catch((err) => {
      console.error(err);
    });
}

// Generate The RSA keypair
function generateRSA() {
  return window.crypto.subtle.generateKey({
    name: 'RSA-PSS',
    modulusLength: 2048, // can be 1024, 2048, or 4096
    // modulusLength: 1024, // can be 1024, 2048, or 4096
    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
    hash: {
      name: 'SHA-256',
      // name: 'SHA-1',
    }, // can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
  },
  true, // whether the key is extractable (i.e. can be used in exportKey)
  ['sign', 'verify']) // can be any combination of "sign" and "verify"
    .then(key => key)
    .catch((err) => {
      console.error(err);
    });
}

function exportRSA(publicKey) {
  return window.crypto.subtle.exportKey(
    'spki', // can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
    publicKey, // can be a publicKey or privateKey, as long as extractable was true
  )
    .then(keydata => keydata)
    .catch((err) => {
      console.error(err);
    });
}

function exportPrivateRSA(privateKey) {
  return window.crypto.subtle.exportKey(
    'pkcs8', // can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
    privateKey, // can be a publicKey or privateKey, as long as extractable was true
  )
    .then(keydata => keydata)
    .catch((err) => {
      console.error(err);
    });
}

function importRSA_PSS(exportedKey) {
  return window.crypto.subtle.importKey(
    'spki', // can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
    exportedKey, { // these are the algorithm options
      name: 'RSA-PSS',
      hash: {
        name: 'SHA-256',
      }, // can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    },
    true, // whether the key is extractable (i.e. can be used in exportKey)
    ['verify'], // "verify" for public key import, "sign" for private key imports
  )
    .then(publicKey => publicKey)
    .catch((err) => {
      console.error(err);
    });
}

function importRSA_OAEP(exportedKey) {
  return window.crypto.subtle.importKey(
    'spki', // can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
    exportedKey, { // these are the algorithm options
      name: 'RSA-OAEP',
      hash: {
        name: 'SHA-256',
      }, // can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    },
    true, // whether the key is extractable (i.e. can be used in exportKey)
    ['encrypt'], // "encrypt" or "wrapKey" for public key import or
    // "decrypt" or "unwrapKey" for private key imports
  )
    .then(publicKey => publicKey)
    .catch((err) => {
      console.error(err);
    });
}

function importPrivateRSA_OAEP(exportedKey) {
  return window.crypto.subtle.importKey(
    'pkcs8', // can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
    exportedKey, { // these are the algorithm options
      name: 'RSA-OAEP',
      hash: {
        name: 'SHA-256',
      }, // can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    },
    true, // whether the key is extractable (i.e. can be used in exportKey)
    ['decrypt'], // "encrypt" or "wrapKey" for public key import or
    // "decrypt" or "unwrapKey" for private key imports
  )
    .then(publicKey => publicKey)
    .catch((err) => {
      console.error(err);
    });
}

// RSA Sign
function signRSA(privateKey, data) {
  return window.crypto.subtle.sign({
    name: 'RSA-PSS',
    saltLength: 128, // the length of the salt
  },
  privateKey, // from generateKey or importKey above
  data) // ArrayBuffer of data you want to sign
    .then((signature) => {
    // returns an ArrayBuffer containing the signature
      const signatureArray = new Uint8Array(signature);
      // console.log();
      return signatureArray;
    })
    .catch((err) => {
      console.error(err);
    });
}

// encrypt with publicKey
function encryptRSA(publicKey, data) {
  return window.crypto.subtle.encrypt({
    name: 'RSA-OAEP',
    // label: Uint8Array([...]) //optional
  },
  publicKey, // from generateKey or importKey above
  new Uint8Array(data)) // ArrayBuffer of data you want to encrypt
    .then((encrypted) => {
    // returns an ArrayBuffer containing the encrypted data
      const data = new Uint8Array(encrypted);
      return data;
    })
    .catch((err) => {
      console.error(err);
    });
}

// decrypt with privateKey
function decryptRSA(privateKey, data) {
// console.log(data);
// console.log(privateKey);
  return window.crypto.subtle.decrypt({
    name: 'RSA-OAEP',
    // label: Uint8Array([...]) //optional
  },
  privateKey, // from generateKey or importKey above
  new Uint8Array(data)) // ArrayBuffer of the data
    .then((decrypted) => {
    // returns an ArrayBuffer containing the decrypted data
      const data = new Uint8Array(decrypted);
      return data;
    })
    .catch((err) => {
      console.error(err);
    });
}

// RSA verify
function verifyRSA(publicKey, signature, data) {
  return window.crypto.subtle.verify({
    name: 'RSA-PSS',
    saltLength: 128, // the length of the salt
  },
  publicKey, // from generateKey or importKey above
  signature, // ArrayBuffer of the signature
  data) // ArrayBuffer of the data
    .then(isvalid => isvalid)
    .catch((err) => {
      console.error(err);
    });
}

// Generate AES Key
function generateAES() {
  return window.crypto.subtle.generateKey({
    name: 'AES-GCM',
    length: 256, // can be  128, 192, or 256
  },
  true, // whether the key is extractable (i.e. can be used in exportKey)
  ['encrypt', 'decrypt']) // can "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    .then(key => key)
    .catch((err) => {
      console.error(err);
    });
}

async function importAES(aesKeyHash, iv) {
  return window.crypto.subtle.importKey(
    'raw', // can be "jwk" or "raw"
    aesKeyHash, { // this is the algorithm options
      name: 'AES-GCM',
      iv,
    },
    true, // whether the key is extractable (i.e. can be used in exportKey)
    ['encrypt', 'decrypt'], // can "encrypt", "decrypt", "wrapKey", or "unwrapKey"
  )
    .then(key => key)
    .catch((err) => {
      console.error(err);
    });
}

function exportAES(key) {
  return window.crypto.subtle.exportKey(
    'raw', // can be "jwk" or "raw"
    key, // extractable must be true
  )
    .then(keydata => keydata)
    .catch((err) => {
      console.error(err);
    });
}

function encryptAES(key, iv, data) {
  return window.crypto.subtle.encrypt({
    name: 'AES-GCM',

    // Don't re-use initialization vectors!
    // Always generate a new iv every time your encrypt!
    // Recommended to use 12 bytes length
    iv,

    // Additional authentication data (optional)
    // additionalData: ArrayBuffer,

    // Tag length (optional)
    tagLength: 128, // can be 32, 64, 96, 104, 112, 120 or 128 (default)
  },
  key, // from generateKey or importKey above
  data) // ArrayBuffer of data you want to encrypt
    .then((encrypted) => {
    // returns an ArrayBuffer containing the encrypted data
      const data = new Uint8Array(encrypted);
      return data;
    })
    .catch((err) => {
      console.error(err);
    });
}

function decryptAES(key, iv, data) {
  return window.crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv, // The initialization vector you used to encrypt
    // additionalData: ArrayBuffer, // The addtionalData you used to encrypt (if any)
    tagLength: 128, // The tagLength you used to encrypt (if any)
  },
  key, // from generateKey or importKey above
  data) // ArrayBuffer of the data
    .then((decrypted) => {
    // returns an ArrayBuffer containing the decrypted data
      const data = new Uint8Array(decrypted);
      return data;
    })
    .catch((err) => {
      console.error(err);
    });
}

function encryptFileAES(key, data, iv) {
  return window.crypto.subtle.encrypt({
    name: 'AES-GCM',

    // Don't re-use initialization vectors!
    // Always generate a new iv every time your encrypt!
    // Recommended to use 12 bytes length
    iv,

    // Additional authentication data (optional)
    // additionalData: ArrayBuffer,

    // Tag length (optional)
    tagLength: 128, // can be 32, 64, 96, 104, 112, 120 or 128 (default)
  },
  key, // from generateKey or importKey above
  data) // ArrayBuffer of data you want to encrypt
    .then(encrypted => encrypted)
    .catch((err) => {
      console.error(err);
    });
}

async function decryptFileAES(key, data, iv) {
  return window.crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv, // The initialization vector you used to encrypt
    // additionalData: ArrayBuffer, // The addtionalData you used to encrypt (if any)
    tagLength: 128, // The tagLength you used to encrypt (if any)
  },
  key, // from generateKey or importKey above
  data) // ArrayBuffer of the data
    .then(decrypted => decrypted)
    .catch((err) => {
      console.error(err);
    });
}
