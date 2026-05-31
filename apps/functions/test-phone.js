const admin = require('firebase-admin');

admin.initializeApp({ projectId: "vibelockchat" });

async function addTestPhone() {
  try {
    // Add test phone number
    await admin.auth().projectConfigManager().updateProjectConfig({
      smsRegionConfig: {
        allowByDefault: {
          disallowedRegions: []
        }
      }
    });
    console.log("Updated config");
  } catch(e) {
    console.error(e);
  }
}
addTestPhone();
