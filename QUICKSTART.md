# ⚡ Quick Start Guide - SecureVibe Chat

Get up and running in 5 minutes!

## 🎯 Prerequisites

- Node.js 16+ installed
- Firebase account
- 5 minutes of your time

## 🚀 Quick Setup

### 1️⃣ Install Dependencies (1 min)

```bash
npm install
```

### 2️⃣ Firebase Setup (2 min)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project
3. Enable **Authentication** → Email/Password
4. Create **Firestore Database** (production mode)
5. Copy your config from Project Settings

### 3️⃣ Configure Environment (1 min)

```bash
cp .env.example .env
```

Edit `.env` with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_ENCRYPTION_SECRET=change_this_secret
```

### 4️⃣ Add Firestore Rules (1 min)

In Firebase Console → Firestore → Rules, paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Chats collection
    match /chats/{chatId} {
      // Allow read if user is a participant
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      
      // Allow create if user is one of the participants
      allow create: if request.auth != null && 
        request.auth.uid in request.resource.data.participants;
      
      // Allow update if user is a participant
      allow update: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      
      // Messages subcollection
      match /messages/{messageId} {
        allow read: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
        allow create: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
        allow update: if request.auth != null;
      }
    }
  }
}
```

Click **Publish**.

### 5️⃣ Run the App! (30 sec)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🎉 You're Done!

Now you can:
1. ✅ Sign up with email/password
2. ✅ Start chatting with end-to-end encryption
3. ✅ Toggle dark mode
4. ✅ Send emojis
5. ✅ See online status

## 🐛 Quick Troubleshooting

**Can't connect to Firebase?**
- Check `.env` file has correct credentials
- Verify Firebase project is active

**Authentication not working?**
- Enable Email/Password in Firebase Console
- Check password is at least 6 characters

**Messages not sending?**
- Verify Firestore rules are published
- Check browser console for errors

## 📚 Next Steps

- Read [README.md](README.md) for full documentation
- Check [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed Firebase guide
- See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment options

## 💡 Tips

- Use Chrome DevTools to debug
- Check Firebase Console for real-time data
- Test with multiple browser windows
- Try dark mode toggle (🌙 icon)

---

**Happy Chatting! 💬🔒**
