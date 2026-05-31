# 🔒 SecureVibe Chat

A modern, end-to-end encrypted chat application with a beautiful pastel aesthetic theme. Built with React, Firebase, and AES-GCM encryption.

## ✨ Features

### **Core Features:**
- � **End--to-End Encryption** - Messages encrypted with AES-GCM before sending
- � **Rseal-time Messaging** - Instant message delivery using Firebase Firestore
- 👥 **User Authentication** - Secure email/password authentication
- � **Beakutiful UI** - Soft pastel pink/blue gradient theme
- 🌙 **Dark Mode** - Toggle between light and dark themes
- 😊 **Emoji Picker** - Express yourself with emojis
- ✓ **Message Status** - Delivered and seen indicators
- � **OResponsive Design** - Works on mobile and desktop
- � **Onpline Status** - See who's online in real-time

### **🆕 New Features:**
- 💬 **WebRTC Live Typing** - Real-time typing indicators with bouncing dots animation
- 🗑️ **Message Deletion** - WhatsApp-style deletion (for me / for everyone)
- 🎯 **Context Menus** - Right-click (desktop) or long-press (mobile) for options
- ✨ **Smooth Animations** - Beautiful fade-in/fade-out effects
- 🚀 **Direct Messaging** - Start chatting with any user instantly (no friend requests needed)

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Firebase (Auth + Firestore)
- **Encryption**: Web Crypto API (AES-GCM)
- **Routing**: React Router v6
- **Styling**: Pure CSS with CSS Variables
- **Icons**: Emoji-based icons

## 📁 Project Structure

```
securevibe-chat/
├── src/
│   ├── config/
│   │   └── firebase.js          # Firebase configuration
│   ├── context/
│   │   └── ThemeContext.jsx     # Dark mode context
│   ├── pages/
│   │   ├── AuthScreen.jsx       # Login/Signup page
│   │   ├── ChatListScreen.jsx   # Chat list with contacts
│   │   ├── ChatScreen.jsx       # Individual chat screen
│   │   └── ProfileScreen.jsx    # User profile settings
│   ├── services/
│   │   ├── authService.js       # Authentication functions
│   │   └── chatService.js       # Chat & messaging functions
│   ├── styles/
│   │   ├── global.css           # Global styles & theme
│   │   ├── AuthScreen.css
│   │   ├── ChatListScreen.css
│   │   ├── ChatScreen.css
│   │   └── ProfileScreen.css
│   ├── utils/
│   │   └── encryption.js        # E2E encryption utilities
│   ├── App.jsx                  # Main app component
│   └── main.jsx                 # Entry point
├── index.html
├── package.json
├── vite.config.js
└── .env.example
```

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/aryankavar/SecureVibechat
cd securevibe-chat
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** → Email/Password
4. Create a **Firestore Database** (Start in production mode)
5. Add Firestore Security Rules:

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
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      
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

6. Get your Firebase config from Project Settings → General → Your apps

### 4. Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Fill in your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# IMPORTANT: Change this to a strong secret phrase
VITE_ENCRYPTION_SECRET=your_super_secret_phrase_here_change_this
```

⚠️ **IMPORTANT**: Change `VITE_ENCRYPTION_SECRET` to a unique, strong secret phrase. This is used for generating encryption keys.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 How Encryption Works

1. **Key Generation**: Each user has a unique encryption key derived from their UID + secret phrase using SHA-256
2. **Encryption**: Messages are encrypted using AES-GCM before being sent to Firestore
3. **Storage**: Only encrypted messages are stored in the database
4. **Decryption**: Messages are decrypted locally using the sender's key when received
5. **Security**: Plain text messages NEVER reach or are stored in Firestore

### Encryption Flow

```
User A sends message:
Plain Text → Encrypt with User A's Key → Store Encrypted in Firestore

User B receives message:
Fetch Encrypted from Firestore → Decrypt with User A's Key → Display Plain Text
```

## 📱 Usage

### Creating an Account

1. Click "Sign Up" on the auth screen
2. Enter your name, email, and password
3. Click "Sign Up" to create your account

### Starting a Chat

1. Click "➕ New Chat" button
2. Select a user from the list
3. Start sending encrypted messages!

### Sending Messages

1. Type your message in the input box
2. Click the emoji button (😊) to add emojis
3. Press Enter or click the send button (➤)
4. Your message is encrypted and sent instantly

### Profile Settings

1. Click the profile icon (👤) in the header
2. Update your display name or avatar URL
3. Click "Update Profile" to save changes

### Dark Mode

Click the moon icon (🌙) in the header to toggle dark mode.

## 🚀 Deployment

### **Deploy to Firebase Hosting (Recommended)**

Your app is pre-configured for Firebase Hosting!

**Quick Deploy (3 steps):**

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Deploy:
```bash
npm run deploy
```

**Your app will be live at:** https://vibelockchat.web.app

**Alternative Commands:**
```bash
npm run deploy:hosting    # Deploy hosting only (faster)
npm run deploy:rules       # Deploy Firestore rules only
./deploy.sh                # Interactive deployment
```

**📖 Detailed Guide:** Read `🔥_DEPLOY_NOW.md` for complete instructions.

---

### **Deploy to Vercel**

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Build and deploy:
```bash
npm run build
vercel
```

3. Add environment variables in Vercel dashboard

---

### **Deploy to Netlify**

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Build and deploy:
```bash
npm run build
netlify deploy --prod
```

3. Add environment variables in Netlify dashboard

## 🔒 Security Best Practices

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use strong passwords** - Minimum 6 characters for Firebase Auth
3. **Change encryption secret** - Use a unique, strong secret phrase
4. **Enable Firestore rules** - Restrict access to authenticated users only
5. **HTTPS only** - Always use HTTPS in production
6. **Regular updates** - Keep dependencies updated

## 🎨 Customization

### Changing Theme Colors

Edit `src/styles/global.css`:

```css
:root {
  --pastel-pink: #FFB6D9;    /* Change to your color */
  --pastel-blue: #A8D8EA;    /* Change to your color */
  /* ... other colors */
}
```

### Adding New Features

- **Voice Messages**: Integrate Firebase Storage for audio files
- **Image Sharing**: Add image upload with encryption
- **Group Chats**: Extend chat service for multiple participants
- **Video Calls**: Integrate WebRTC for video calling

## 📚 Documentation

### **Getting Started:**
- `README.md` - This file (overview)
- `QUICKSTART.md` - Quick setup guide
- `START_HERE.md` - Project introduction

### **New Features:**
- `🚀_START_HERE_NEW_FEATURES.md` - New features overview
- `FEATURES_SUMMARY.md` - Detailed feature descriptions
- `IMPLEMENTATION_GUIDE.md` - Implementation details

### **Development:**
- `API_REFERENCE.md` - Complete API documentation
- `CODE_EXAMPLES.md` - 20+ code examples
- `ARCHITECTURE_DIAGRAM.md` - Visual architecture

### **Deployment:**
- `🔥_DEPLOY_NOW.md` - Quick deployment guide
- `FIREBASE_DEPLOYMENT_GUIDE.md` - Detailed deployment
- `DEPLOYMENT_SUMMARY.md` - Deployment overview

### **Testing:**
- `TESTING_GUIDE.md` - 30 comprehensive tests
- `✅_DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist

## 🐛 Troubleshooting

### Messages not decrypting

- Ensure all users have the same `VITE_ENCRYPTION_SECRET`
- Check browser console for encryption errors

### Firebase connection issues

- Verify `.env` file has correct credentials
- Check Firebase project settings
- Ensure Firestore rules are properly configured

### Build errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📄 License

MIT License - Feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using React, Firebase, and modern web technologies.
