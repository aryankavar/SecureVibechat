const admin = require('firebase-admin');
const https = require('https');

// Initialize admin SDK (uses application default credentials if available, otherwise emulator)
admin.initializeApp({ projectId: "vibelockchat" });

const API_KEY = "AIzaSyBSTfcOVScyc-hNKzc7oP9iGRm_VCGpiEw";

async function run() {
  try {
    // 1. Get a custom token for the test user ID
    const customToken = await admin.auth().createCustomToken('dmZn3g2SSNX0BlEDpIjWDG0Ddqg1');
    
    // 2. Exchange custom token for an ID token
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true })
    });
    const data = await res.json();
    const idToken = data.idToken;
    
    if (!idToken) throw new Error("Failed to get ID token: " + JSON.stringify(data));
    
    // 3. Call the Cloud Function
    const cfRes = await fetch(`https://us-central1-vibelockchat.cloudfunctions.net/searchUsers`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ data: { query: "" } })
    });
    
    const cfData = await cfRes.json();
    console.log("CF response for '': ", JSON.stringify(cfData, null, 2));

    const cfRes2 = await fetch(`https://us-central1-vibelockchat.cloudfunctions.net/searchUsers`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ data: { query: "+918460566882" } })
    });
    
    const cfData2 = await cfRes2.json();
    console.log("CF response for '+918460566882': ", JSON.stringify(cfData2, null, 2));

  } catch(e) { console.error("Error:", e); }
}

run();
