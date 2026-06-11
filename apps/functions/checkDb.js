const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'securevibechat'
});
const db = admin.firestore();
async function main() {
  const chats = await db.collection('chats').get();
  console.log(`Found ${chats.size} chats`);
}
main().catch(console.error);
