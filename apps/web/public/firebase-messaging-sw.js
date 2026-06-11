importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Initialize Firebase App in SW
const firebaseConfig = {
  // Ideally these should be injected or fetched, but for SW it's often hardcoded
  // if you want background pushes to work without a backend.
  // We'll leave it empty to be initialized by the client if possible, or 
  // you must replace this with your actual config.
  // We will rely on onBackgroundMessage.
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new encrypted message.',
      icon: '/icon-192x192.png',
      data: payload.data
    };
  
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.log("Firebase config not set in SW. Push notifications will only work via FCM directly if configured.");
}
