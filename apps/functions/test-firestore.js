const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('users').get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data().displayName, '| lower:', doc.data().displayNameLower);
  });
}
run().catch(console.error);
