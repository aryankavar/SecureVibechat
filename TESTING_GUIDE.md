# 🧪 Testing Guide

## ✅ Complete Testing Checklist

### **Prerequisites**
- [ ] Firebase project configured
- [ ] Firestore rules deployed
- [ ] Two test accounts created
- [ ] App running locally (`npm run dev`)

---

## 🔄 WebRTC Live Typing Tests

### **Test 1: Basic Typing Indicator**
**Steps:**
1. Open app in Browser A (Chrome)
2. Open app in Browser B (Firefox)
3. Log in as User A in Browser A
4. Log in as User B in Browser B
5. Start chat between User A and User B
6. In Browser A, start typing
7. In Browser B, observe typing indicator

**Expected Result:**
- ✅ Typing indicator appears in Browser B
- ✅ Shows "User A is typing..."
- ✅ 3 bouncing dots animation
- ✅ Indicator disappears after 5 seconds of no typing

---

### **Test 2: Text Preview**
**Steps:**
1. Follow Test 1 setup
2. In Browser A, type "Hello World"
3. In Browser B, observe text preview

**Expected Result:**
- ✅ Text preview shows "Hello World" (faded)
- ✅ Updates in real-time as User A types
- ✅ Preview disappears when User A stops typing

---

### **Test 3: Typing Stop on Send**
**Steps:**
1. Follow Test 1 setup
2. In Browser A, start typing
3. In Browser B, verify indicator appears
4. In Browser A, send message
5. In Browser B, observe indicator

**Expected Result:**
- ✅ Indicator disappears immediately when message is sent
- ✅ Message appears in chat
- ✅ No delay between send and indicator disappearing

---

### **Test 4: Multiple Typing Sessions**
**Steps:**
1. Follow Test 1 setup
2. User A types → User B sees indicator
3. User A stops → Indicator disappears
4. User B types → User A sees indicator
5. User B stops → Indicator disappears
6. Repeat 3 times

**Expected Result:**
- ✅ Indicator works in both directions
- ✅ No lag or delay
- ✅ No stuck indicators

---

### **Test 5: WebRTC Connection Failure**
**Steps:**
1. Open browser console (F12)
2. Go to Network tab
3. Throttle to "Offline"
4. Open chat
5. Go back online
6. Start typing

**Expected Result:**
- ✅ App handles offline gracefully
- ✅ WebRTC reconnects when online
- ✅ Typing works after reconnection
- ✅ No errors in console

---

### **Test 6: Concurrent Typing**
**Steps:**
1. Follow Test 1 setup
2. Both users start typing simultaneously
3. Observe indicators in both browsers

**Expected Result:**
- ✅ Both indicators work independently
- ✅ No conflicts or race conditions
- ✅ Both users can see each other typing

---

## 🗑️ Message Deletion Tests

### **Test 7: Delete for Me (Desktop)**
**Steps:**
1. User A sends message "Test Message"
2. User A right-clicks the message
3. User A selects "Delete for me"
4. Check both browsers

**Expected Result:**
- ✅ Context menu appears on right-click
- ✅ Message disappears for User A
- ✅ Message still visible for User B
- ✅ Smooth fade-out animation

---

### **Test 8: Delete for Everyone (Desktop)**
**Steps:**
1. User A sends message "Test Message"
2. User A right-clicks the message
3. User A selects "Delete for everyone"
4. Confirm deletion
5. Check both browsers

**Expected Result:**
- ✅ Confirmation dialog appears
- ✅ Both users see "This message was deleted"
- ✅ User A sees "You deleted this message"
- ✅ Timestamp preserved
- ✅ Smooth fade animation

---

### **Test 9: Delete for Me (Mobile)**
**Steps:**
1. Open app on mobile device
2. User A sends message
3. User A long-presses message (hold 500ms)
4. Bottom sheet appears
5. Tap "Delete for me"

**Expected Result:**
- ✅ Bottom sheet slides up after 500ms
- ✅ Options clearly visible
- ✅ Message deleted after tap
- ✅ Bottom sheet dismisses

---

### **Test 10: Delete for Everyone (Mobile)**
**Steps:**
1. Open app on mobile device
2. User A sends message
3. User A long-presses message
4. Tap "Delete for everyone"
5. Confirm deletion

**Expected Result:**
- ✅ Bottom sheet appears
- ✅ Confirmation dialog shows
- ✅ Message deleted for both users
- ✅ Placeholder shown

---

### **Test 11: Delete Time Limit**
**Steps:**
1. User A sends message
2. Wait 61 minutes
3. User A right-clicks message
4. Check available options

**Expected Result:**
- ✅ "Delete for me" option available
- ✅ "Delete for everyone" option NOT available
- ✅ Time limit enforced correctly

---

### **Test 12: Delete Other User's Message**
**Steps:**
1. User A sends message
2. User B right-clicks User A's message
3. Check available options

**Expected Result:**
- ✅ "Delete for me" option available
- ✅ "Delete for everyone" option NOT available
- ✅ Only sender can delete for everyone

---

### **Test 13: Multiple Deletions**
**Steps:**
1. User A sends 5 messages
2. User A deletes 3 messages for themselves
3. User A deletes 2 messages for everyone
4. Check both browsers

**Expected Result:**
- ✅ 3 messages hidden for User A only
- ✅ 2 messages show placeholder for both
- ✅ All deletions work correctly
- ✅ No conflicts

---

### **Test 14: Delete While Typing**
**Steps:**
1. User A sends message
2. User B starts typing
3. User A deletes message for everyone
4. User B continues typing

**Expected Result:**
- ✅ Message deleted successfully
- ✅ Typing indicator still works
- ✅ No conflicts or errors

---

## 🎨 UI/UX Tests

### **Test 15: Typing Indicator Animation**
**Steps:**
1. Trigger typing indicator
2. Observe animation
3. Check timing and smoothness

**Expected Result:**
- ✅ 3 dots bounce smoothly
- ✅ Animation loops continuously
- ✅ Dots bounce in sequence (not simultaneously)
- ✅ Pastel colors visible

---

### **Test 16: Context Menu Position**
**Steps:**
1. Right-click message near screen edge
2. Check menu position
3. Try all corners of screen

**Expected Result:**
- ✅ Menu never goes off-screen
- ✅ Position adjusts automatically
- ✅ Always fully visible

---

### **Test 17: Long Press Feedback**
**Steps:**
1. On mobile, start long-press
2. Hold for 500ms
3. Release

**Expected Result:**
- ✅ Visual feedback during press
- ✅ Bottom sheet appears after 500ms
- ✅ No accidental triggers

---

### **Test 18: Deleted Message Styling**
**Steps:**
1. Delete message for everyone
2. Check placeholder styling
3. Compare with normal messages

**Expected Result:**
- ✅ Dashed border visible
- ✅ Grey/faded text
- ✅ Icon displayed
- ✅ Timestamp preserved

---

## 🔐 Security Tests

### **Test 19: Encryption Still Works**
**Steps:**
1. Send message
2. Check Firestore console
3. Verify message is encrypted

**Expected Result:**
- ✅ Message encrypted in database
- ✅ Decrypts correctly on receive
- ✅ No plain text visible in Firestore

---

### **Test 20: Firestore Rules**
**Steps:**
1. Try to access other user's messages
2. Try to delete other user's messages
3. Try to modify WebRTC signals

**Expected Result:**
- ✅ Unauthorized access denied
- ✅ Only participants can read messages
- ✅ Only sender can delete for everyone
- ✅ Security rules enforced

---

## 📱 Cross-Platform Tests

### **Test 21: Desktop to Mobile**
**Steps:**
1. User A on desktop (Chrome)
2. User B on mobile (iOS Safari)
3. Test typing and deletion

**Expected Result:**
- ✅ Typing works both ways
- ✅ Deletion works both ways
- ✅ UI adapts to platform

---

### **Test 22: Different Browsers**
**Steps:**
1. Test on Chrome, Firefox, Safari, Edge
2. Test typing and deletion on each
3. Check for compatibility issues

**Expected Result:**
- ✅ Works on all browsers
- ✅ No browser-specific bugs
- ✅ Consistent behavior

---

## 🐛 Edge Case Tests

### **Test 23: Rapid Typing**
**Steps:**
1. Type very fast (10+ chars/second)
2. Observe indicator in other browser
3. Check for lag or errors

**Expected Result:**
- ✅ Indicator updates smoothly
- ✅ No lag or delay
- ✅ No errors in console

---

### **Test 24: Empty Message Delete**
**Steps:**
1. Send message with only spaces
2. Try to delete it
3. Check behavior

**Expected Result:**
- ✅ Message can be deleted
- ✅ Deletion works normally
- ✅ No errors

---

### **Test 25: Network Interruption**
**Steps:**
1. Start typing
2. Disconnect network
3. Reconnect network
4. Continue typing

**Expected Result:**
- ✅ WebRTC reconnects automatically
- ✅ Typing resumes after reconnection
- ✅ No stuck states

---

### **Test 26: Multiple Chats**
**Steps:**
1. Open 3 different chats
2. Type in each chat
3. Check typing indicators

**Expected Result:**
- ✅ Each chat has independent WebRTC connection
- ✅ Typing indicators work in all chats
- ✅ No cross-chat interference

---

### **Test 27: Long Messages**
**Steps:**
1. Send very long message (1000+ chars)
2. Delete it for everyone
3. Check placeholder

**Expected Result:**
- ✅ Long message sends successfully
- ✅ Deletion works normally
- ✅ Placeholder displays correctly

---

### **Test 28: Special Characters**
**Steps:**
1. Type message with emojis, symbols
2. Check typing preview
3. Send and delete message

**Expected Result:**
- ✅ Special characters display correctly
- ✅ Preview shows emojis
- ✅ Deletion works with special chars

---

## 🚀 Performance Tests

### **Test 29: Typing Latency**
**Steps:**
1. Type in Browser A
2. Measure time until indicator appears in Browser B
3. Repeat 10 times

**Expected Result:**
- ✅ Average latency < 100ms
- ✅ Consistent performance
- ✅ No significant delays

---

### **Test 30: Memory Leaks**
**Steps:**
1. Open chat
2. Type for 5 minutes continuously
3. Check browser memory usage
4. Close chat
5. Check memory is released

**Expected Result:**
- ✅ Memory usage stable
- ✅ No memory leaks
- ✅ Memory released on cleanup

---

## 📊 Test Results Template

```
Test Date: ___________
Tester: ___________
Environment: ___________

┌─────────────────────────────────────────────────────────┐
│ Test #  │ Feature          │ Status │ Notes            │
├─────────────────────────────────────────────────────────┤
│ 1       │ Basic Typing     │ ✅/❌  │                  │
│ 2       │ Text Preview     │ ✅/❌  │                  │
│ 3       │ Typing Stop      │ ✅/❌  │                  │
│ 4       │ Multiple Sessions│ ✅/❌  │                  │
│ 5       │ Connection Fail  │ ✅/❌  │                  │
│ 6       │ Concurrent Type  │ ✅/❌  │                  │
│ 7       │ Delete for Me    │ ✅/❌  │                  │
│ 8       │ Delete for All   │ ✅/❌  │                  │
│ 9       │ Mobile Delete Me │ ✅/❌  │                  │
│ 10      │ Mobile Delete All│ ✅/❌  │                  │
│ 11      │ Time Limit       │ ✅/❌  │                  │
│ 12      │ Delete Other Msg │ ✅/❌  │                  │
│ 13      │ Multiple Deletes │ ✅/❌  │                  │
│ 14      │ Delete While Type│ ✅/❌  │                  │
│ 15      │ Animation        │ ✅/❌  │                  │
│ 16      │ Menu Position    │ ✅/❌  │                  │
│ 17      │ Long Press       │ ✅/❌  │                  │
│ 18      │ Deleted Styling  │ ✅/❌  │                  │
│ 19      │ Encryption       │ ✅/❌  │                  │
│ 20      │ Security Rules   │ ✅/❌  │                  │
│ 21      │ Desktop to Mobile│ ✅/❌  │                  │
│ 22      │ Cross Browser    │ ✅/❌  │                  │
│ 23      │ Rapid Typing     │ ✅/❌  │                  │
│ 24      │ Empty Message    │ ✅/❌  │                  │
│ 25      │ Network Interrupt│ ✅/❌  │                  │
│ 26      │ Multiple Chats   │ ✅/❌  │                  │
│ 27      │ Long Messages    │ ✅/❌  │                  │
│ 28      │ Special Chars    │ ✅/❌  │                  │
│ 29      │ Typing Latency   │ ✅/❌  │                  │
│ 30      │ Memory Leaks     │ ✅/❌  │                  │
└─────────────────────────────────────────────────────────┘

Overall Status: ___________
Issues Found: ___________
```

---

## 🔍 Debugging Tips

### **WebRTC Issues:**
```javascript
// Add to webrtcManager.js
console.log('Peer connection state:', peerConnection.connectionState)
console.log('Data channel state:', dataChannel.readyState)
console.log('ICE connection state:', peerConnection.iceConnectionState)
```

### **Deletion Issues:**
```javascript
// Add to messageService.js
console.log('Deleting message:', messageId)
console.log('Current user:', userId)
console.log('Message sender:', message.senderId)
console.log('Time since sent:', Date.now() - message.timestamp.toMillis())
```

### **Typing Issues:**
```javascript
// Add to ChatScreen.jsx
console.log('Typing event:', data)
console.log('Is other user typing:', isOtherUserTyping)
console.log('Text preview:', typingPreview)
```

---

## 📝 Bug Report Template

```
Bug Title: ___________
Severity: Critical / High / Medium / Low
Date Found: ___________

Steps to Reproduce:
1. ___________
2. ___________
3. ___________

Expected Behavior:
___________

Actual Behavior:
___________

Browser/Device:
___________

Console Errors:
___________

Screenshots:
[Attach screenshots]

Additional Notes:
___________
```

---

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] All 30 tests passed
- [ ] No console errors
- [ ] Firestore rules deployed
- [ ] Tested on multiple browsers
- [ ] Tested on mobile devices
- [ ] Performance acceptable
- [ ] Memory leaks checked
- [ ] Security verified
- [ ] Documentation updated
- [ ] User guide created

---

## 🎉 Testing Complete!

Once all tests pass, your app is ready for production! 🚀

**Remember:**
- Test regularly during development
- Test on real devices, not just emulators
- Test with real users for feedback
- Monitor production for issues

---

Happy testing! 🧪✨
