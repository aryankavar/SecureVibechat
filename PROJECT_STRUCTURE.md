# 📁 Project Structure - SecureVibe Chat

Complete overview of the project architecture and file organization.

## 🌳 Directory Tree

```
securevibe-chat/
├── 📄 index.html                    # Main HTML entry point
├── 📄 package.json                  # Dependencies and scripts
├── 📄 vite.config.js                # Vite configuration
├── 📄 .env.example                  # Environment variables template
├── 📄 .gitignore                    # Git ignore rules
├── 📄 README.md                     # Main documentation
├── 📄 QUICKSTART.md                 # Quick start guide
├── 📄 FIREBASE_SETUP.md             # Firebase setup guide
├── 📄 DEPLOYMENT.md                 # Deployment instructions
├── 📄 PROJECT_STRUCTURE.md          # This file
│
└── 📁 src/
    ├── 📄 main.jsx                  # Application entry point
    ├── 📄 App.jsx                   # Main app component with routing
    │
    ├── 📁 config/
    │   └── 📄 firebase.js           # Firebase initialization & config
    │
    ├── 📁 context/
    │   └── 📄 ThemeContext.jsx      # Dark mode theme context
    │
    ├── 📁 pages/
    │   ├── 📄 AuthScreen.jsx        # Login/Signup page
    │   ├── 📄 ChatListScreen.jsx    # Chat list with contacts
    │   ├── 📄 ChatScreen.jsx        # Individual chat conversation
    │   └── 📄 ProfileScreen.jsx     # User profile settings
    │
    ├── 📁 services/
    │   ├── 📄 authService.js        # Authentication functions
    │   └── 📄 chatService.js        # Chat & messaging functions
    │
    ├── 📁 styles/
    │   ├── 📄 global.css            # Global styles & CSS variables
    │   ├── 📄 AuthScreen.css        # Auth page styles
    │   ├── 📄 ChatListScreen.css    # Chat list styles
    │   ├── 📄 ChatScreen.css        # Chat screen styles
    │   └── 📄 ProfileScreen.css     # Profile page styles
    │
    └── 📁 utils/
        └── 📄 encryption.js         # E2E encryption utilities
```

## 📦 Core Files Explained

### Root Level

#### `index.html`
- Main HTML template
- Loads Google Fonts (Poppins)
- Mounts React app to `#root`

#### `package.json`
- Project dependencies
- Scripts: `dev`, `build`, `preview`
- React, Firebase, React Router, Emoji Picker

#### `vite.config.js`
- Vite build configuration
- React plugin setup
- Dev server port (3000)

#### `.env.example`
- Template for environment variables
- Firebase credentials
- Encryption secret

### Source Directory (`src/`)

#### `main.jsx`
- React app entry point
- Renders `<App />` component
- Imports global CSS

#### `App.jsx`
- Main application component
- Authentication state management
- React Router setup
- Route protection
- Theme provider wrapper

### Configuration (`src/config/`)

#### `firebase.js`
- Firebase SDK initialization
- Exports: `auth`, `db`, `storage`
- Reads config from environment variables

### Context (`src/context/`)

#### `ThemeContext.jsx`
- Dark mode state management
- Theme toggle function
- Persists theme to localStorage
- Provides theme to all components

### Pages (`src/pages/`)

#### `AuthScreen.jsx`
**Purpose**: User authentication
- Login/Signup toggle
- Form validation
- Error handling
- Beautiful gradient background

**Features**:
- Email/password authentication
- Display name for signup
- Real-time error messages
- Smooth animations

#### `ChatListScreen.jsx`
**Purpose**: Display all user chats
- List of active conversations
- Search users
- Start new chats
- Online status indicators

**Features**:
- Real-time chat updates
- Last message preview (decrypted)
- Relative timestamps
- User search functionality
- Dark mode toggle
- Profile navigation

#### `ChatScreen.jsx`
**Purpose**: Individual chat conversation
- Send/receive messages
- Real-time updates
- Message encryption/decryption

**Features**:
- Chat bubbles (left/right)
- Message timestamps
- Delivered/seen indicators
- Emoji picker
- Typing indicator
- Auto-scroll to latest
- Message animations

#### `ProfileScreen.jsx`
**Purpose**: User profile management
- Update display name
- Change avatar URL
- View account info
- Logout

**Features**:
- Profile picture preview
- Form validation
- Success/error messages
- Security information display
- User UID display

### Services (`src/services/`)

#### `authService.js`
**Functions**:
- `createUser(email, password, name)` - Register new user
- `loginUser(email, password)` - Authenticate user
- `logoutUser()` - Sign out user

**Features**:
- Creates Firestore user document
- Updates online status
- Error handling

#### `chatService.js`
**Functions**:
- `getUsersList(currentUserId)` - Get all users
- `generateChatId(userId1, userId2)` - Create consistent chat ID
- `startChatBetweenUsers(userId1, userId2)` - Initialize chat
- `sendEncryptedMessage(senderId, receiverId, plainMessage)` - Send message
- `listenToMessages(chatId, callback)` - Real-time message listener
- `listenToUserChats(userId, callback)` - Real-time chat list listener
- `markMessageDelivered(chatId, messageId)` - Update delivery status
- `markMessageSeen(chatId, messageId)` - Update seen status

**Features**:
- Real-time Firestore listeners
- Message encryption before sending
- Chat metadata updates
- Snapshot listeners for live updates

### Utilities (`src/utils/`)

#### `encryption.js`
**Functions**:
- `generateEncryptionKey(uid)` - Create AES-GCM key from UID
- `encryptMessage(plainText, uid)` - Encrypt message
- `decryptMessage(encryptedText, uid)` - Decrypt message
- `testEncryption()` - Test encryption/decryption

**Algorithm**: AES-GCM (256-bit)
**Key Derivation**: SHA-256(UID + Secret Phrase)

**Features**:
- Web Crypto API
- Random IV generation
- Base64 encoding
- Error handling

### Styles (`src/styles/`)

#### `global.css`
- CSS variables for theming
- Light/dark mode colors
- Pastel color palette
- Loading screen styles
- Global resets

#### Component-specific CSS
Each page has its own CSS file with:
- Responsive layouts
- Smooth animations
- Hover effects
- Mobile-first design
- Pastel aesthetic

## 🎨 Design System

### Color Palette

**Light Mode**:
- Background Primary: `#FFF5F8` (soft pink)
- Background Secondary: `#FFFFFF` (white)
- Gradient: Pink to Blue
- Text Primary: `#2D3748` (dark gray)
- Text Secondary: `#718096` (medium gray)

**Dark Mode**:
- Background Primary: `#1A202C` (dark blue-gray)
- Background Secondary: `#2D3748` (medium gray)
- Gradient: Purple to Blue
- Text Primary: `#F7FAFC` (off-white)
- Text Secondary: `#CBD5E0` (light gray)

**Accent Colors**:
- Pastel Pink: `#FFB6D9`
- Pastel Blue: `#A8D8EA`
- Pastel Purple: `#D4A5FF`
- Pastel Peach: `#FFCBA4`
- Pastel Mint: `#B4E7CE`

### Typography

- Font Family: Poppins (Google Fonts)
- Weights: 300, 400, 500, 600, 700
- Base Size: 15px
- Line Height: 1.5

### Spacing

- Small: 10px
- Medium: 20px
- Large: 40px
- Border Radius: 12-25px (rounded)

## 🔄 Data Flow

### Authentication Flow

```
User Input → authService → Firebase Auth → Update Firestore → Update UI
```

### Message Flow

```
1. User types message
2. Encrypt with sender's key (encryption.js)
3. Send to Firestore (chatService.js)
4. Firestore triggers snapshot listener
5. Decrypt with sender's key
6. Display in UI
```

### Real-time Updates

```
Firestore onSnapshot → Service callback → React state update → UI re-render
```

## 🔐 Security Architecture

### Encryption

1. **Key Generation**: SHA-256(UID + Secret)
2. **Encryption**: AES-GCM with random IV
3. **Storage**: Only encrypted data in Firestore
4. **Decryption**: Local decryption with sender's key

### Firestore Rules

- Users can only write their own profile
- Only chat participants can read/write messages
- Authentication required for all operations

## 📱 Responsive Design

### Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Mobile Optimizations

- Touch-friendly buttons (min 44px)
- Simplified navigation
- Optimized chat bubbles (75% width)
- Collapsible emoji picker

## 🚀 Performance

### Optimizations

- Code splitting with React Router
- Lazy loading of emoji picker
- Efficient Firestore queries
- Indexed queries for chat list
- Optimistic UI updates

### Bundle Size

- React: ~140KB
- Firebase: ~200KB
- Total: ~400KB (gzipped)

## 🧪 Testing Strategy

### Manual Testing

1. Authentication (signup/login/logout)
2. Message sending/receiving
3. Encryption/decryption
4. Real-time updates
5. Dark mode toggle
6. Profile updates
7. Responsive design

### Browser Testing

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 📈 Future Enhancements

### Planned Features

- [ ] Group chats
- [ ] Image/file sharing
- [ ] Voice messages
- [ ] Video calls
- [ ] Message reactions
- [ ] Message search
- [ ] Push notifications
- [ ] Read receipts
- [ ] Message editing/deletion
- [ ] User blocking
- [ ] Chat archiving

### Technical Improvements

- [ ] Unit tests (Jest)
- [ ] E2E tests (Cypress)
- [ ] PWA support
- [ ] Offline mode
- [ ] Service workers
- [ ] Performance monitoring
- [ ] Error tracking (Sentry)
- [ ] Analytics (Firebase Analytics)

## 🤝 Contributing

### Code Style

- Use functional components
- Follow React hooks best practices
- Use async/await for promises
- Add comments for complex logic
- Keep functions small and focused

### Git Workflow

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Commit with descriptive message
5. Create pull request

## 📞 Support

For questions or issues:
- Check documentation files
- Review Firebase Console logs
- Check browser console
- Open GitHub issue

---

**Project Structure Documentation Complete! 📚**
