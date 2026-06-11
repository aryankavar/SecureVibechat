const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();
  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function deleteCollection(db, collectionPath, batchSize) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);
  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function main() {
  const chatsSnapshot = await db.collection('chats').get();
  for (const chat of chatsSnapshot.docs) {
    console.log(`Deleting messages for chat ${chat.id}...`);
    await deleteCollection(db, `chats/${chat.id}/messages`, 100);
    console.log(`Deleting chat ${chat.id}...`);
    await chat.ref.delete();
  }
  console.log('All chats deleted.');
  process.exit(0);
}
main().catch(console.error);
