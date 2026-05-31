# 🔧 Troubleshooting Guide

## Common Issues & Solutions

---

## ❌ Error: "permission-denied" in Firestore

### **Error Message:**
```
FirebaseError: [code=permission-denied]: Missing or insufficient permissions
```

### **Cause:**
1. Firestore rules not deployed, OR
2. User not authenticated in the app

### **Solution:**

**1. Deploy Firestore rules:**
```bash
firebase deploy --only firestore:rules
```

**2. Make sure you're logged in to the app:**
- Open your app (http://localhost:3000)
- Sign up or log in
- Then try accessing data

**3. Verify rules are deployed:**
```bash
firebase firestore:rules:get
```

**4. Check Firebase Console:**
Visit: https://console.firebase.google.com/project/vibelockchat/firestore/rules

**Note:** This error is **normal** if you're not logged in. Your Firestore rules require authentication, which is good for security!

---

## ❌ Error: "CREDENTIALS_MISSING" or "UNAUTHENTICATED" (Firebase CLI)

### **Error Message:**
```
Request is missing required authentication credential
CREDENTIALS_MISSING
```

### **Cause:**
You haven't logged in to Firebase CLI yet.

### **Solution:**
```bash
firebase login
```

This will open your browser for authentication. Once logged in, the error will disappear.

---

## ❌ Error: "toJSON is not a function" (WebRTC)

### **Error Message:**
```
WebRTC init error: TypeError: f.toJSON is not a function
```

### **Cause:**
Calling `.toJSON()` on WebRTC objects (offer, answer, ICE candidates) which don't have this method in all browsers.

### **Solution:**
✅ **Already Fixed!** Updated `src/utils/webrtcManager.js` to manually extract properties instead of using `.toJSON()`.

**Rebuild your app:**
```bash
npm run build
npm run dev
```

**Read more:** WEBRTC_TOJSON_FIX.md

---

## ❌ Error: "Cannot read properties of undefined"

### **Error Message:**
```
Uncaught TypeError: Cannot read properties of undefined (reading 'toLowerCase')
```

### **Cause:**
Trying to call a method on a value that's `undefined` or `null`.

### **Solution:**
✅ **Already Fixed!** Updated `src/pages/ChatListScreen.jsx` to check for undefined values before calling `.toLowerCase()`.

**Rebuild your app:**
```bash
npm run build
npm run dev
```

**Prevention:**
Always check for undefined before calling methods:
```javascript
// ✅ Good
if (user.name) {
  const lowercase = user.name.toLowerCase()
}

// ✅ Better
const lowercase = user.name?.toLowerCase()

// ❌ Bad
const lowercase = user.name.toLowerCase()
```

---

## ❌ Error: "Firebase CLI not found"

### **Error Message:**
```
firebase: command not found
```

### **Solution:**
```bash
npm install -g firebase-tools
```

Verify installation:
```bash
firebase --version
```

---

## ❌ Error: "Build failed"

### **Error Message:**
```
Error: Build failed with errors
```

### **Solution:**

**1. Clean and rebuild:**
```bash
rm -rf dist node_modules
npm install
npm run build
```

**2. Check for syntax errors:**
- Open browser console (F12)
- Look for error messages
- Fix any JavaScript/React errors

**3. Verify environment variables:**
```bash
cat .env
```
Make sure all Firebase credentials are correct.

---

## ❌ Error: "Project not found"

### **Error Message:**
```
Error: Project vibelockchat not found
```

### **Solution:**

**1. Check `.firebaserc`:**
```bash
cat .firebaserc
```

Should show:
```json
{
  "projects": {
    "default": "vibelockchat"
  }
}
```

**2. Verify project exists:**
```bash
firebase projects:list
```

**3. If project ID is different, update `.firebaserc`:**
```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

---

## ❌ Error: "Permission denied"

### **Error Message:**
```
Error: HTTP Error: 403, Permission denied
```

### **Solution:**

**1. Check you're logged in:**
```bash
firebase login --reauth
```

**2. Verify you have access to the project:**
- Go to Firebase Console
- Check you're listed as an owner/editor

**3. Check Firestore rules are valid:**
```bash
firebase deploy --only firestore:rules --debug
```

---

## ❌ Error: "Deployment failed"

### **Error Message:**
```
Error: Deploy failed
```

### **Solution:**

**1. Check internet connection**

**2. Try deploying step by step:**
```bash
# Deploy rules first
firebase deploy --only firestore:rules

# Then deploy hosting
firebase deploy --only hosting
```

**3. Check Firebase status:**
Visit: https://status.firebase.google.com

---

## ❌ WebRTC Not Working

### **Symptoms:**
- Typing indicator doesn't show
- Console shows WebRTC errors

### **Solution:**

**1. Check browser console (F12):**
Look for WebRTC-related errors

**2. Verify both users are online:**
WebRTC requires both users to be active

**3. Check Firestore rules:**
```bash
firebase deploy --only firestore:rules
```

**4. Test on different network:**
Some firewalls block WebRTC

**5. Fallback is automatic:**
If WebRTC fails, app uses Firestore (slightly slower but works)

---

## ❌ Message Deletion Not Working

### **Symptoms:**
- Delete option not showing
- Deletion fails

### **Solution:**

**1. Check if you're the sender:**
Only sender can "delete for everyone"

**2. Check time limit:**
"Delete for everyone" only works within 1 hour

**3. Verify Firestore rules:**
```bash
firebase deploy --only firestore:rules
```

**4. Check browser console:**
Look for error messages

---

## ❌ App Not Loading After Deployment

### **Symptoms:**
- Blank page
- 404 error

### **Solution:**

**1. Check deployment succeeded:**
```bash
firebase hosting:channel:list
```

**2. Clear browser cache:**
- Press Ctrl+Shift+R (Windows/Linux)
- Press Cmd+Shift+R (Mac)

**3. Check Firebase Console:**
Visit: https://console.firebase.google.com/project/vibelockchat/hosting

**4. Verify build folder:**
```bash
ls -la dist/
```
Should contain index.html and assets/

**5. Redeploy:**
```bash
npm run deploy:hosting
```

---

## ❌ Environment Variables Not Working

### **Symptoms:**
- Firebase connection fails
- "undefined" errors

### **Solution:**

**1. Check `.env` file exists:**
```bash
cat .env
```

**2. Verify all variables are set:**
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ENCRYPTION_SECRET=...
```

**3. Rebuild after changing `.env`:**
```bash
npm run build
```

**4. For production:**
Environment variables are bundled during build, not read at runtime.

---

## ❌ Permission Denied Error

### **Error Message:**
```
FirebaseError: [code=permission-denied]: Missing or insufficient permissions
```

### **Cause:**
Firestore security rules are blocking access. This usually happens when:
- Rules are too restrictive
- User is not authenticated
- Trying to access data they don't own

### **Solution:**
✅ **Already Fixed!** The Firestore rules have been updated and deployed.

**If you still see this error:**

**1. Make sure you're logged in:**
- Check if user is authenticated
- Try logging out and back in

**2. Redeploy rules:**
```bash
firebase deploy --only firestore:rules
```

**3. Check browser console:**
- Open DevTools (F12)
- Look for specific permission errors
- Check which collection is failing

**4. Verify rules in Firebase Console:**
Visit: https://console.firebase.google.com/project/vibelockchat/firestore/rules

---

## ❌ Index Not Necessary Error

### **Error Message:**
```
Error: HTTP Error: 400, this index is not necessary
```

### **Cause:**
The index defined in `firestore.indexes.json` is not needed. Firestore handles simple single-field indexes automatically.

### **Solution:**
✅ **Already Fixed!** The `firestore.indexes.json` has been updated to remove unnecessary indexes.

Just deploy again:
```bash
npm run deploy
```

---

## ❌ Firestore Rules Deployment Failed

### **Error Message:**
```
Error: Firestore rules deployment failed
```

### **Solution:**

**1. Check rules syntax:**
```bash
cat firestore.rules
```

**2. Test rules locally:**
```bash
firebase emulators:start --only firestore
```

**3. Deploy with debug:**
```bash
firebase deploy --only firestore:rules --debug
```

**4. Check Firebase Console:**
Visit: https://console.firebase.google.com/project/vibelockchat/firestore/rules

---

## ❌ "npm run deploy" Not Working

### **Error Message:**
```
npm ERR! Missing script: "deploy"
```

### **Solution:**

**1. Check package.json:**
```bash
cat package.json | grep -A 3 "scripts"
```

Should include:
```json
"scripts": {
  "deploy": "npm run build && firebase deploy",
  "deploy:hosting": "npm run build && firebase deploy --only hosting",
  "deploy:rules": "firebase deploy --only firestore:rules"
}
```

**2. If missing, add them manually:**
Edit `package.json` and add the scripts above.

**3. Alternative:**
```bash
npm run build
firebase deploy
```

---

## ❌ Messages Not Decrypting

### **Symptoms:**
- Messages show as "[Unable to decrypt]"
- Garbled text

### **Solution:**

**1. Check encryption secret:**
All users must have the same `VITE_ENCRYPTION_SECRET` in `.env`

**2. Verify sender ID:**
Messages are decrypted using sender's key

**3. Check browser console:**
Look for decryption errors

**4. Test encryption:**
```javascript
// In browser console
import { testEncryption } from './src/utils/encryption.js'
testEncryption()
```

---

## ❌ Typing Indicator Stuck

### **Symptoms:**
- Typing indicator doesn't disappear
- Shows "typing..." forever

### **Solution:**

**1. Refresh the page:**
Press F5 or Ctrl+R

**2. Check WebRTC connection:**
Open browser console, look for WebRTC errors

**3. Timeout is automatic:**
Indicator should disappear after 5 seconds

**4. Clear browser cache:**
Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

---

## 🔍 Debug Mode

### **Enable Verbose Logging:**

**1. Browser Console:**
```javascript
// Add to ChatScreen.jsx temporarily
console.log('WebRTC state:', webrtcManager.isChannelReady(chatId))
console.log('Typing state:', isOtherUserTyping)
```

**2. Firebase Debug:**
```bash
firebase deploy --debug
```

**3. Network Tab:**
- Open DevTools (F12)
- Go to Network tab
- Filter by "firestore" or "webrtc"
- Check for failed requests

---

## 📞 Still Having Issues?

### **Check These:**

1. **Browser Console (F12):**
   - Look for error messages
   - Check Network tab for failed requests

2. **Firebase Console:**
   - https://console.firebase.google.com/project/vibelockchat
   - Check for errors in Firestore, Auth, Hosting

3. **Documentation:**
   - Read `🔥_DEPLOY_NOW.md`
   - Read `FIREBASE_DEPLOYMENT_GUIDE.md`
   - Read `IMPLEMENTATION_GUIDE.md`

4. **Test Locally First:**
   ```bash
   npm run dev
   ```
   Make sure everything works locally before deploying.

5. **Check Firebase Status:**
   - https://status.firebase.google.com
   - Verify Firebase services are operational

---

## 🎯 Quick Fixes

### **Reset Everything:**
```bash
# Clean install
rm -rf node_modules package-lock.json dist
npm install

# Rebuild
npm run build

# Logout and login to Firebase
firebase logout
firebase login

# Redeploy
firebase deploy
```

### **Test Locally:**
```bash
# Build and preview
npm run build
npm run preview
```

### **Check Deployment:**
```bash
# List deployments
firebase hosting:channel:list

# View project info
firebase projects:list
```

---

## ✅ Verification Checklist

Before asking for help, verify:

- [ ] Firebase CLI installed (`firebase --version`)
- [ ] Logged in to Firebase (`firebase login`)
- [ ] `.env` file configured correctly
- [ ] App builds successfully (`npm run build`)
- [ ] No errors in browser console
- [ ] Firestore rules deployed
- [ ] Internet connection working
- [ ] Firebase project exists
- [ ] Correct project ID in `.firebaserc`

---

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)
- [WebRTC Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

---

**Most issues are solved by:**
1. Logging in to Firebase (`firebase login`)
2. Rebuilding the app (`npm run build`)
3. Clearing browser cache (Ctrl+Shift+R)

---

Happy troubleshooting! 🔧✨
