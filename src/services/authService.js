import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

/**
 * Create a new user account
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User display name
 */
export async function createUser(email, password, name) {
  try {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    
    // Update profile with display name
    await updateProfile(user, { displayName: name })
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      lastOnline: serverTimestamp(),
      createdAt: serverTimestamp(),
      isOnline: true
    })
    
    return user
  } catch (error) {
    console.error('Create user error:', error)
    throw error
  }
}

/**
 * Login existing user
 * @param {string} email - User email
 * @param {string} password - User password
 */
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    
    // Update online status
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      isOnline: true,
      lastOnline: serverTimestamp()
    }, { merge: true })
    
    return userCredential.user
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

/**
 * Logout current user
 */
export async function logoutUser() {
  try {
    if (auth.currentUser) {
      // Update online status before logout
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        isOnline: false,
        lastOnline: serverTimestamp()
      }, { merge: true })
    }
    
    await signOut(auth)
  } catch (error) {
    console.error('Logout error:', error)
    throw error
  }
}
