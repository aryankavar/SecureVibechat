const admin = require('firebase-admin');

// Ensure you have run `firebase login` and `firebase use vibelockchat` 
// or set GOOGLE_APPLICATION_CREDENTIALS

admin.initializeApp();

const db = admin.firestore();

async function backfill() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  if (snapshot.empty) {
    console.log('No users found.');
    return;
  }

  const batch = db.batch();
  let count = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.displayName && !data.displayNameLower) {
      batch.update(doc.ref, {
        displayNameLower: data.displayName.toLowerCase()
      });
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Successfully backfilled ${count} users.`);
  } else {
    console.log('All users already have displayNameLower.');
  }
}

backfill().catch(console.error);
