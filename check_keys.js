const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./firebase-service-account.json'); // We don't have this, but wait. We can use the REST API or just firebase-admin if it's logged in.
