# SecureVibe Chat — Agent Guidelines

## Monorepo Structure

- `apps/web/` — Next.js web app (TypeScript, Tailwind CSS) — **PRIMARY production app**
- `apps/functions/` — Firebase Cloud Functions (TypeScript)
- `apps/mobile/` — React Native / Expo app (scaffold, not production)
- `packages/shared/` — `@securevibechat/shared` — libsodium encryption library
- `src/` — **Legacy** Vite React SPA — DO NOT MODIFY unless explicitly requested

## Key Files

- `apps/web/src/services/userService.ts` — Key management, device registration
- `apps/web/src/services/groupService.ts` — Group key initialization & rotation
- `packages/shared/src/index.ts` — XChaCha20-Poly1305 + X25519 encryption
- `packages/shared/src/groupEncryption.ts` — Group key wrapping (Web Crypto ECDH P-256)
- `packages/shared/src/keyStorage.ts` — IndexedDB key storage (non-extractable CryptoKey)
- `packages/shared/src/keyBackup.ts` — PIN-encrypted key backup
- `apps/web/src/components/chat/MessageList.tsx` — Message rendering & decryption
- `apps/web/src/components/chat/MessageInput.tsx` — Message composition & encryption
- `firestore.rules` — Firestore security rules
- `storage.rules` — Firebase Storage security rules
- `database.rules.json` — Realtime Database security rules

## Coding Rules

- Always use **TypeScript strict mode**
- Never touch `src/` (legacy) unless a prompt explicitly says so
- Firestore calls go through **service files**, never directly in components
- All crypto operations must use `packages/shared` — never raw Web Crypto in components
- Private keys must be stored in **IndexedDB** via `keyStorage.ts` — NEVER in localStorage
- Message deletion: use `updateDoc` with `{ isDeleted: true }` — `deleteDoc` is blocked by Firestore rules
- State updates in async callbacks: always use functional updater `setState(prev => ({ ...prev, key: value }))`
- Build command: `npm run build --workspace=apps/web`

## Encryption Systems

- **1:1 messages**: libsodium X25519 ECDH → XChaCha20-Poly1305
- **Group key wrapping**: Web Crypto ECDH P-256 (non-extractable keys in IndexedDB)
- **Group messages**: XChaCha20-Poly1305 with epoch-based group key
- **Key backup**: Argon2id KDF via `libsodium.crypto_pwhash`
