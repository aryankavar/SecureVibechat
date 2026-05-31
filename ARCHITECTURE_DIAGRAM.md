# 🏗️ Architecture Diagram

## 📊 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     ENCRYPTED CHAT APP                          │
│                  (React + Firebase + WebRTC)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Firebase   │    │   WebRTC     │    │  Encryption  │
│   Firestore  │    │  Data Chan.  │    │   (AES-GCM)  │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 🔄 WebRTC Live Typing Flow

```
User A (Browser 1)                    User B (Browser 2)
─────────────────                    ─────────────────

1. Open Chat
   │
   ├─► webrtcManager.initConnection()
   │
   ├─► Create RTCPeerConnection
   │
   ├─► Create DataChannel
   │
   ├─► Create Offer
   │
   └─► Send to Firestore ──────────────────┐
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │  Firestore Signaling    │
                              │  /webrtc-signals/       │
                              │  {chatId}/signals/      │
                              └─────────────────────────┘
                                            │
                                            │
                              ┌─────────────┘
                              │
                              ▼
                         Listen for Offer
                              │
                              ├─► Receive Offer
                              │
                              ├─► Create Answer
                              │
                              └─► Send to Firestore ────┐
                                                         │
                                                         ▼
                                            ┌────────────────────┐
                                            │  Firestore         │
                                            │  (Answer + ICE)    │
                                            └────────────────────┘
                                                         │
   ┌─────────────────────────────────────────────────────┘
   │
   ▼
Receive Answer
   │
   ├─► Exchange ICE Candidates
   │
   └─► DataChannel OPEN ✅
         │
         │
2. User Types
   │
   ├─► handleTyping()
   │
   ├─► sendTypingStart()
   │
   └─► Send via DataChannel ────────────────────────────┐
                                                         │
                                                         ▼
                                            ┌────────────────────┐
                                            │  WebRTC DataChan   │
                                            │  (Peer-to-Peer)    │
                                            └────────────────────┘
                                                         │
                                                         │
                                            ┌────────────┘
                                            │
                                            ▼
                                   Receive Typing Event
                                            │
                                            ├─► handleTypingUpdate()
                                            │
                                            ├─► setIsOtherUserTyping(true)
                                            │
                                            └─► Show Indicator 🎨

3. User Stops Typing
   │
   ├─► sendTypingStop()
   │
   └─► Send via DataChannel ────────────────────────────┐
                                                         │
                                                         ▼
                                            ┌────────────────────┐
                                            │  WebRTC DataChan   │
                                            └────────────────────┘
                                                         │
                                                         │
                                            ┌────────────┘
                                            │
                                            ▼
                                   Receive Stop Event
                                            │
                                            ├─► setIsOtherUserTyping(false)
                                            │
                                            └─► Hide Indicator ❌
```

---

## 🗑️ Message Deletion Flow

```
User A (Sender)                          User B (Receiver)
───────────────                          ─────────────────

1. Right-click Message
   │
   ├─► handleContextMenu()
   │
   └─► Show Menu
         │
         ├─► Delete for Me
         │     │
         │     ├─► deleteMessageForMe()
         │     │
         │     └─► Update Firestore ──────────────────┐
         │                                             │
         │                                             ▼
         │                               ┌──────────────────────────┐
         │                               │  Firestore Update        │
         │                               │  deletedFor: [userId]    │
         │                               └──────────────────────────┘
         │                                             │
         │                                             │
         │                               ┌─────────────┘
         │                               │
         │                               ▼
         │                          Listen to Changes
         │                               │
         │                               ├─► filterDeletedMessages()
         │                               │
         │                               └─► Message still visible ✅
         │
         └─► Delete for Everyone
               │
               ├─► deleteMessageForEveryone()
               │
               └─► Update Firestore ──────────────────┐
                                                       │
                                                       ▼
                                         ┌──────────────────────────┐
                                         │  Firestore Update        │
                                         │  isDeleted: true         │
                                         │  deletedBy: userId       │
                                         └──────────────────────────┘
                                                       │
                                                       │
                                         ┌─────────────┴─────────────┐
                                         │                           │
                                         ▼                           ▼
                                   User A Sees:              User B Sees:
                                   "You deleted              "This message
                                   this message"             was deleted"
```

---

## 🔐 Encryption Flow

```
User A                                   User B
──────                                   ──────

1. Type Message
   │
   ├─► "Hello World"
   │
   └─► encryptMessage(text, userId)
         │
         ├─► Generate Key (SHA-256)
         │     │
         │     └─► userId + SECRET_PHRASE
         │
         ├─► Generate IV (random)
         │
         ├─► Encrypt (AES-GCM)
         │
         └─► Base64 Encode
               │
               └─► "a8f3d9e2..." ──────────────────┐
                                                    │
                                                    ▼
                                      ┌──────────────────────────┐
                                      │  Firestore               │
                                      │  encryptedMessage        │
                                      └──────────────────────────┘
                                                    │
                                                    │
                                      ┌─────────────┘
                                      │
                                      ▼
                              Receive Encrypted
                                      │
                                      ├─► decryptMessage(encrypted, senderId)
                                      │
                                      ├─► Generate Key (SHA-256)
                                      │     │
                                      │     └─► senderId + SECRET_PHRASE
                                      │
                                      ├─► Extract IV
                                      │
                                      ├─► Decrypt (AES-GCM)
                                      │
                                      └─► "Hello World" ✅
```

---

## 📁 Component Hierarchy

```
App
│
├─── ChatScreen
│    │
│    ├─── Chat Header
│    │    ├─── Back Button
│    │    ├─── Avatar
│    │    └─── User Info
│    │
│    ├─── Messages Container
│    │    ├─── Message Bubbles
│    │    │    ├─── Own Messages (right)
│    │    │    └─── Other Messages (left)
│    │    │
│    │    ├─── Deleted Messages
│    │    │    └─── Placeholder Text
│    │    │
│    │    └─── TypingIndicator
│    │         ├─── Avatar
│    │         ├─── Bouncing Dots
│    │         └─── "User is typing..."
│    │
│    ├─── MessageContextMenu
│    │    ├─── Reply Option
│    │    ├─── Delete for Me
│    │    └─── Delete for Everyone
│    │
│    └─── Message Input
│         ├─── Emoji Picker
│         ├─── Text Input
│         └─── Send Button
│
└─── Other Components...
```

---

## 🔄 State Management

```
ChatScreen Component State
──────────────────────────

┌─────────────────────────────────────────┐
│  messages: []                           │  ← Firestore listener
│  newMessage: ""                         │  ← Input value
│  otherUser: {}                          │  ← User data
│  showEmojiPicker: false                 │  ← UI state
│  isTyping: false                        │  ← Current user typing
│  isOtherUserTyping: false               │  ← Other user typing
│  typingPreview: ""                      │  ← Text preview
│  contextMenu: null                      │  ← Menu state
│  longPressTimer: null                   │  ← Touch timer
└─────────────────────────────────────────┘
         │
         │
         ▼
┌─────────────────────────────────────────┐
│  WebRTC Manager                         │
│  ─────────────────                      │
│  peerConnections: Map                   │
│  dataChannels: Map                      │
│  signalingUnsubscribers: Map            │
│  typingCallbacks: Map                   │
└─────────────────────────────────────────┘
```

---

## 🗄️ Firestore Structure

```
firestore
│
├─── users/
│    └─── {userId}
│         ├─── name
│         ├─── email
│         ├─── photoURL
│         └─── isOnline
│
├─── chats/
│    └─── {chatId}
│         ├─── participants: []
│         ├─── lastMessage
│         ├─── lastMessageTime
│         ├─── unreadCount: {}
│         │
│         └─── messages/
│              └─── {messageId}
│                   ├─── senderId
│                   ├─── receiverId
│                   ├─── encryptedMessage
│                   ├─── timestamp
│                   ├─── seen
│                   ├─── delivered
│                   ├─── isDeleted ✨ NEW
│                   ├─── deletedBy ✨ NEW
│                   ├─── deletedAt ✨ NEW
│                   └─── deletedFor: [] ✨ NEW
│
└─── webrtc-signals/ ✨ NEW
     └─── {chatId}
          └─── signals/
               └─── {signalId}
                    ├─── from
                    ├─── signal: {}
                    └─── timestamp
```

---

## 🎯 Event Flow Timeline

```
Time    User A                  WebRTC/Firestore           User B
────    ──────                  ────────────────           ──────

0ms     Open Chat
        │
        └─► Init WebRTC ──────► Signaling ──────────────► Receive Offer
                                                           │
100ms                                                      └─► Send Answer
                                                                 │
200ms   Receive Answer ◄────── Signaling ◄──────────────────────┘
        │
        └─► DataChannel OPEN ✅
                                                           DataChannel OPEN ✅

500ms   Start Typing
        │
        └─► TYPING_START ─────► DataChannel ────────────► Show Indicator 🎨

1000ms  Type "H"
        │
        └─► TYPING_UPDATE ────► DataChannel ────────────► Update Preview

1500ms  Type "He"
        │
        └─► TYPING_UPDATE ────► DataChannel ────────────► Update Preview

2000ms  Type "Hello"
        │
        └─► TYPING_UPDATE ────► DataChannel ────────────► Update Preview

3000ms  Send Message
        │
        ├─► TYPING_STOP ──────► DataChannel ────────────► Hide Indicator ❌
        │
        └─► Encrypt + Send ───► Firestore ──────────────► Receive Message
                                                           │
                                                           └─► Decrypt + Show ✅
```

---

## 🔧 Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                       │
│  ─────────────────────────────────────────────────────  │
│  React 18 + React Router + Hooks                        │
│  Emoji Picker React                                     │
│  CSS3 (Animations, Gradients, Flexbox)                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Communication Layer                   │
│  ─────────────────────────────────────────────────────  │
│  WebRTC (RTCPeerConnection, RTCDataChannel)            │
│  Firebase SDK (Firestore, Auth)                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Security Layer                       │
│  ─────────────────────────────────────────────────────  │
│  Web Crypto API (AES-GCM, SHA-256)                     │
│  Firestore Security Rules                              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend Layer                        │
│  ─────────────────────────────────────────────────────  │
│  Firebase Firestore (NoSQL Database)                   │
│  Firebase Authentication                                │
│  STUN/TURN Servers (Google)                            │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Performance Metrics

```
Feature              Latency      Bandwidth      Cost
───────              ───────      ─────────      ────

WebRTC Typing        10-50ms      ~100 bytes     Free
Firestore Typing     100-500ms    ~500 bytes     $$$
Message Send         200-800ms    ~2KB           $$$
Message Receive      100-500ms    ~2KB           $$$
Encryption           <10ms        N/A            Free
Decryption           <10ms        N/A            Free
```

---

## 🎨 UI State Transitions

```
Message State Machine
─────────────────────

┌─────────┐
│ Normal  │
│ Message │
└────┬────┘
     │
     │ Right-click / Long-press
     │
     ▼
┌─────────┐
│ Context │
│  Menu   │
└────┬────┘
     │
     ├─► Delete for Me
     │   │
     │   ▼
     │ ┌──────────┐
     │ │ Hidden   │
     │ │ (for me) │
     │ └──────────┘
     │
     └─► Delete for Everyone
         │
         ▼
       ┌──────────┐
       │ Deleted  │
       │Placeholder│
       └──────────┘
```

---

This architecture diagram shows how all the pieces fit together! 🏗️
