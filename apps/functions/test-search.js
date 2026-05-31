const admin = require('firebase-admin');
const { searchUsers } = require('./lib/index.js'); // Assuming lib/index.js is where TS compiles to

async function test() {
  try {
    const result = await searchUsers.run({ query: "a" }, { auth: { uid: "test" } });
    console.log(JSON.stringify(result, null, 2));
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
