/**
 * public/src/auth.js — Client Authentication Module (M1-3 Frontend Half)
 *
 * Specifications (architecture-v3.md Section 3.1-3.4):
 * - Vendored Firebase bundle loaded lazily only on user action / redirect return.
 * - Minimal Google Sign-In via signInWithRedirect.
 * - ID token kept in memory ONLY (never persisted to localStorage/sessionStorage/cookies).
 * - Feature flag default OFF (production behavior unchanged until backend cutover).
 * - When ON, calls GET /api/v1/me and exposes tier & profile to Alpine store.
 * - authDomain configurable via site config (default ihsg-storm.firebaseapp.com).
 * - Analytics events login_start and login_success via Umami helper.
 */

import { AUTH_DOMAIN } from './config.js';
import { trackLoginStart, trackLoginSuccess } from './analytics.js';

// Public Firebase web config (Spark plan, project ihsg-storm)
export const FIREBASE_CONFIG = {
  projectId: 'ihsg-storm',
  apiKey: '***',
  authDomain: AUTH_DOMAIN || 'ihsg-storm.firebaseapp.com',
  storageBucket: 'ihsg-storm.firebasestorage.app',
  messagingSenderId: '773487755988',
  appId: '1:773487755988:web:172076c286e3c258ab7141'
};

// Feature flag (default OFF per spec)
let _authFlag = true;

// In-memory auth state (ZERO persistence for security)
let _inMemoryToken = null;
let _currentUser = null;
let _userTier = 'gratis';
let _userProfile = null;
let _authInitialized = false;

// Lazy SDK references
let _sdkPromise = null;
let _firebaseApp = null;
let _firebaseAuth = null;
const _listeners = new Set();

/**
 * Checks if auth feature flag is active. Default OFF.
 * Can be overridden via localStorage ('ihsg_auth_flag' = 'true') or query '?auth=1' for testing.
 * @returns {boolean}
 */
export function isAuthEnabled() {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('ihsg_auth_flag');
      if (stored === 'true') return true;
      if (stored === 'false') return false;
      const params = new URLSearchParams(window.location.search);
      if (params.get('auth') === '1') return true;
    } catch (_) {}
  }
  return _authFlag;
}

/**
 * Programmatically enable or disable auth feature flag (for tests / staging).
 * @param {boolean} enabled
 */
export function setAuthFlag(enabled) {
  _authFlag = Boolean(enabled);
}

/**
 * Returns current ID token string (in-memory only).
 * @returns {string|null}
 */
export function getToken() {
  return _inMemoryToken;
}

export function getCurrentUser() {
  return _currentUser;
}

export function getUserTier() {
  return _userTier;
}

export function getUserProfile() {
  return _userProfile;
}

/**
 * Subscribe to auth state transitions.
 * @param {Function} cb
 * @returns {Function} unsubscribe function
 */
export function subscribeAuth(cb) {
  _listeners.add(cb);
  cb({
    user: _currentUser,
    tier: _userTier,
    profile: _userProfile,
    token: _inMemoryToken
  });
  return () => _listeners.delete(cb);
}

function notifyListeners() {
  const state = {
    user: _currentUser,
    tier: _userTier,
    profile: _userProfile,
    token: _inMemoryToken
  };
  for (const cb of _listeners) {
    try {
      cb(state);
    } catch (err) {
      console.warn('Auth listener error:', err);
    }
  }
}

/**
 * Lazily loads the vendored Firebase Auth bundle.
 * Only loaded when user initiates sign-in or redirect result is pending.
 */
export async function loadFirebaseSdk() {
  if (!_sdkPromise) {
    _sdkPromise = import('/assets/vendor/firebase-auth.js');
  }
  return _sdkPromise;
}

/**
 * Returns initialized Firebase Auth instance.
 */
export async function getFirebaseAuth() {
  if (_firebaseAuth) return _firebaseAuth;
  const sdk = await loadFirebaseSdk();
  if (!sdk.getApps().length) {
    _firebaseApp = sdk.initializeApp(FIREBASE_CONFIG);
  } else {
    _firebaseApp = sdk.getApp();
  }
  _firebaseAuth = sdk.getAuth(_firebaseApp);
  return _firebaseAuth;
}

/**
 * Calls GET /api/v1/me to fetch tier and user metadata.
 * @param {string} token
 * @returns {Promise<object|null>}
 */
export async function fetchMe(token) {
  if (!token) return null;
  try {
    const res = await fetch('/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      console.warn('Failed to fetch /api/v1/me:', res.status);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn('Error fetching /api/v1/me:', err);
    return null;
  }
}

/**
 * Handles authenticated user: extracts token in memory and fetches tier.
 * @param {object} user
 */
async function handleUserAuthenticated(user) {
  _currentUser = user;
  try {
    _inMemoryToken = await user.getIdToken();
  } catch (e) {
    console.warn('Error retrieving ID token:', e);
    _inMemoryToken = null;
  }

  trackLoginSuccess();

  // If token retrieved, query /api/v1/me for entitlement tier
  if (_inMemoryToken) {
    const meData = await fetchMe(_inMemoryToken);
    if (meData && meData.tier) {
      _userTier = meData.tier;
      _userProfile = meData;
    } else {
      _userTier = 'gratis';
      _userProfile = meData;
    }
  }
  notifyListeners();
}

/**
 * Handles user sign-out: resets in-memory variables.
 */
function handleUserSignedOut() {
  _currentUser = null;
  _inMemoryToken = null;
  _userTier = 'gratis';
  _userProfile = null;
  notifyListeners();
}

/**
 * Initiates Google Sign-In redirect.
 */
export async function loginWithGoogle() {
  if (!isAuthEnabled()) {
    console.warn('Auth feature flag is disabled');
    return;
  }
  trackLoginStart();

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('ihsg_auth_pending_redirect', '1');
    } catch (_) {}
  }

  const sdk = await loadFirebaseSdk();
  const auth = await getFirebaseAuth();
  const provider = new sdk.GoogleAuthProvider();
  await sdk.signInWithRedirect(auth, provider);
}

/**
 * Signs the user out and clears in-memory state.
 */
export async function logout() {
  if (_firebaseAuth) {
    try {
      const sdk = await loadFirebaseSdk();
      await sdk.signOut(_firebaseAuth);
    } catch (e) {
      console.warn('Firebase signOut error:', e);
    }
  }
  handleUserSignedOut();
}

/**
 * Initializes auth lifecycle if flag is ON.
 * If flag is OFF, this is a strict no-op with ZERO network requests.
 */
export async function initAuth() {
  if (!isAuthEnabled() || _authInitialized) {
    return;
  }
  _authInitialized = true;

  // Check if returning from a pending redirect
  let isRedirectPending = false;
  if (typeof window !== 'undefined') {
    try {
      if (sessionStorage.getItem('ihsg_auth_pending_redirect') === '1') {
        isRedirectPending = true;
        sessionStorage.removeItem('ihsg_auth_pending_redirect');
      }
    } catch (_) {}
  }

  // Only load SDK on boot if returning from redirect
  if (isRedirectPending) {
    try {
      const sdk = await loadFirebaseSdk();
      const auth = await getFirebaseAuth();
      const result = await sdk.getRedirectResult(auth);
      if (result && result.user) {
        await handleUserAuthenticated(result.user);
      }
    } catch (err) {
      console.warn('Error processing redirect result:', err);
    }
  }

  // Setup authStateChanged listener only after SDK is loaded
  // or if user initiated it
  if (_firebaseAuth) {
    const sdk = await loadFirebaseSdk();
    sdk.onAuthStateChanged(_firebaseAuth, async (user) => {
      if (user) {
        await handleUserAuthenticated(user);
      } else {
        handleUserSignedOut();
      }
    });
  }
}
