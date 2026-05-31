const sodium = require('libsodium-wrappers');

try {
  const keys = sodium.crypto_box_keypair();
  console.log("Success:", keys);
} catch (e) {
  console.log("Error:", e.message);
}
