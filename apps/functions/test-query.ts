import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin with the project's config
const serviceAccountPath = path.resolve(__dirname, 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Service account key not found. Please provide it or use default credentials.');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testQuery(searchStr: string) {
  const query = searchStr.toLowerCase().trim();
  const endQuery = query + '\uf8ff';
  
  console.log(`Querying for: ${query}`);
  const snapshot = await db.collection('users')
    .where('displayNameLower', '>=', query)
    .where('displayNameLower', '<=', endQuery)
    .limit(20)
    .get();
    
  console.log(`Found ${snapshot.docs.length} users`);
  snapshot.docs.forEach(doc => {
    console.log(doc.id, '=>', doc.data().displayName, '| lower:', doc.data().displayNameLower);
  });
}

async function run() {
  await testQuery('a');
  await testQuery('ar');
  await testQuery('aryan');
  
  // also check what users exist
  const allUsers = await db.collection('users').get();
  console.log(`\nTotal users in DB: ${allUsers.docs.length}`);
  allUsers.docs.forEach(doc => {
    console.log(doc.id, '=>', doc.data().displayName, '| lower:', doc.data().displayNameLower, '| phone:', doc.data().phoneNumber);
  });
}

run().catch(console.error);
