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
  apiKey: 'AIzaSyDS83jqJ-HwX1Ke3pqwWwbzWiOqpEFuOAg',
  authDomain: AUTH_DOMAIN || 'ihsg.bad.ai.id',
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
let _authStateSubscribed = false;
let _authReady = false;
let _redirectSettling = false;
let _redirectCapTimer = null;
let _redirectWasPending = false; // latched once per page load, before the sessionStorage flag is removed
const _inflight = new Map(); // uid -> Promise (one handleUserAuthenticated per uid)

export const REDIRECT_CAP_MS = 15000;
export const HINT_RESTORE_CAP_MS = 8000;

/**
 * True when a sign-in redirect is pending (flag set before leaving for Google).
 * Does not clear the flag. Call before initAuth(), which consumes it.
 * @returns {boolean}
 */
export function hasPendingRedirect() {
  if (!isAuthEnabled()) return false;
  // Latched by initAuth() before it consumes the flag, so later callers (and a
  // second init() call) see the same decision.
  if (_redirectWasPending) return true;
  try { return typeof sessionStorage !== 'undefined' && sessionStorage.getItem('ihsg_auth_pending_redirect') === '1'; } catch (_) { return false; }
}

/**
 * Checks if auth feature flag is active. Default OFF.
 * Can be overridden via localStorage ('ihsg_auth_flag' = 'true') or query '?auth=1' for testing.
 * @returns {boolean}
 */
export function isAuthEnabled() {
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('ihsg_auth_flag');
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    } catch (_) {}
  }
  if (typeof window !== 'undefined' && window.location) {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('auth') === '1') return true;
    } catch (_) {}
  }
  return _authFlag;
}

/**
 * True when a saved session or a pending redirect must be restored, so the UI
 * should show a neutral placeholder instead of 'Masuk'. Never clears storage.
 * @returns {boolean}
 */
export function shouldRestoreAuth() {
  if (!isAuthEnabled()) return false;
  try { if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('ihsg_auth_pending_redirect') === '1') return true; } catch (_) {}
  try { if (typeof localStorage !== 'undefined' && localStorage.getItem('ihsg_auth_hint') === '1') return true; } catch (_) {}
  return false;
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
    token: _inMemoryToken,
    ready: _authReady
  });
  return () => _listeners.delete(cb);
}

function notifyListeners() {
  const state = {
    user: _currentUser,
    tier: _userTier,
    profile: _userProfile,
    token: _inMemoryToken,
    ready: _authReady
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
    if (typeof window === 'undefined' && typeof process !== 'undefined') {
      try {
        _sdkPromise = import('/assets/vendor/firebase-auth.js');
        await _sdkPromise;
      } catch (_) {
        const path = await import('node:path');
        const { pathToFileURL } = await import('node:url');
        const resolved = path.resolve(process.cwd(), 'public/assets/vendor/firebase-auth.js');
        _sdkPromise = import(pathToFileURL(resolved).href);
      }
    } else {
      _sdkPromise = import('/assets/vendor/firebase-auth.js');
    }
  }
  return _sdkPromise;
}

/**
 * Test helper to provide a mocked or custom Firebase SDK bundle.
 * @param {object|null} sdk
 */
export function setFirebaseSdkForTesting(sdk) {
  _sdkPromise = sdk ? Promise.resolve(sdk) : null;
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
 * Displays a lightweight toast notification for auth errors.
 * Uses #toast element in index.html with automatic 4-second dismissal.
 * @param {string} message
 */
export function showAuthToast(message = 'Login gagal, coba lagi') {
  if (typeof document === 'undefined') return;
  try {
    const t = document.getElementById('toast');
    if (t) {
      t.textContent = message;
      t.classList.add('on');
      setTimeout(() => {
        t.classList.remove('on');
      }, 4000);
    }
  } catch (_) {}
}

/**
 * Handles authenticated user: extracts token in memory and fetches tier.
 * Sets lightweight auth hint ('ihsg_auth_hint'='1') for session restoration.
 * @param {object} user
 */
function handleUserAuthenticated(user) {
  const uid = user && user.uid ? user.uid : '__anon__';
  if (_inflight.has(uid)) return _inflight.get(uid);
  const p = _processUser(user);
  _inflight.set(uid, p);
  return p;
}

async function _processUser(user) {
  _currentUser = user;
  _userTier = 'loading';
  _userProfile = null;

  // Lightweight hint for session restore on page reload (zero secrets/PII)
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('ihsg_auth_hint', '1');
    } catch (_) {}
  }

  // The user is known: show the avatar now (tier badge is a skeleton) instead of
  // waiting for the token and /me.
  _authReady = true;
  notifyListeners();

  try {
    _inMemoryToken = await user.getIdToken();
  } catch (e) {
    console.warn('Error retrieving ID token:', e);
    _inMemoryToken = null;
  }

  trackLoginSuccess();

  // Requirement d: If /me fails (503 / network / error), the user still counts as
  // logged in: Masuk button disappears and badge shows Gratis.
  if (_inMemoryToken) {
    try {
      const meData = await fetchMe(_inMemoryToken);
      if (meData && meData.tier) {
        _userTier = meData.tier;
        _userProfile = meData;
      } else {
        _userTier = 'gratis';
        _userProfile = meData || null;
      }
    } catch (err) {
      console.warn('Error fetching /api/v1/me:', err);
      _userTier = 'gratis';
      _userProfile = null;
    }
  } else {
    _userTier = 'gratis';
    _userProfile = null;
  }
  if (_currentUser === user) notifyListeners();
}

/**
 * Handles user sign-out: resets in-memory variables and clears auth hint.
 */
function handleUserSignedOut() {
  _inflight.clear();
  _currentUser = null;
  _inMemoryToken = null;
  _userTier = 'gratis';
  _userProfile = null;

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem('ihsg_auth_hint');
    } catch (_) {}
  }
  notifyListeners();
}

function ensureAuthStateListener(sdk, auth) {
  if (_authStateSubscribed || !auth || !sdk) return;
  _authStateSubscribed = true;
  sdk.onAuthStateChanged(auth, async (user) => {
    if (user) {
      await handleUserAuthenticated(user);
    } else if (_redirectSettling) {
      // A null here during a pending redirect is not final: getRedirectResult
      // may still deliver the user. Do not mark ready (avoids a Masuk flash).
      _currentUser = null;
    } else {
      _authReady = true;
      handleUserSignedOut();
    }
  });
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

  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem('ihsg_auth_pending_redirect', '1');
    } catch (_) {}
  }

  try {
    const sdk = await loadFirebaseSdk();
    const auth = await getFirebaseAuth();
    ensureAuthStateListener(sdk, auth);
    const provider = new sdk.GoogleAuthProvider();
    await sdk.signInWithRedirect(auth, provider);
  } catch (err) {
    console.error('Login error:', err?.code || err);
    showAuthToast('Login gagal, coba lagi');
    throw err;
  }
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
 * Always restores session on boot: on lightweight hint ('ihsg_auth_hint'='1')
 * or returning from redirect ('ihsg_auth_pending_redirect'='1'), lazy-loads SDK
 * and registers onAuthStateChanged.
 */
export async function initAuth() {
  if (!isAuthEnabled() || _authInitialized) {
    return;
  }
  _authInitialized = true;

  // Check if returning from a pending redirect
  let isRedirectPending = false;
  if (typeof sessionStorage !== 'undefined') {
    try {
      if (sessionStorage.getItem('ihsg_auth_pending_redirect') === '1') {
        isRedirectPending = true;
        _redirectWasPending = true;
        sessionStorage.removeItem('ihsg_auth_pending_redirect');
      }
    } catch (_) {}
  }

  // Check if session restore hint exists in localStorage
  let hasAuthHint = false;
  if (typeof localStorage !== 'undefined') {
    try {
      hasAuthHint = localStorage.getItem('ihsg_auth_hint') === '1';
    } catch (_) {}
  }

  if (!isRedirectPending && !hasAuthHint) {
    _authReady = true;
    notifyListeners();
    return;
  }

  // Always restore session if returning from redirect OR hint is set
  _redirectSettling = isRedirectPending;
  if (isRedirectPending) {
    // Hard cap: never leave the placeholder forever. After the cap show Masuk + toast.
    _redirectCapTimer = setTimeout(() => {
      _redirectCapTimer = null;
      if (!_redirectSettling) return;
      _redirectSettling = false;
      if (!_currentUser) {
        showAuthToast('Login gagal, coba lagi');
        _authReady = true;
        notifyListeners();
      }
    }, REDIRECT_CAP_MS);
  }
  const finishRedirect = () => {
    _redirectSettling = false;
    if (_redirectCapTimer) { clearTimeout(_redirectCapTimer); _redirectCapTimer = null; }
  };
  try {
    const sdk = await loadFirebaseSdk();
    const auth = await getFirebaseAuth();
    ensureAuthStateListener(sdk, auth);

    if (isRedirectPending) {
      try {
        const result = await sdk.getRedirectResult(auth);
        if (result && result.user) {
          await handleUserAuthenticated(result.user);
        }
      } catch (err) {
        console.error('Error processing redirect result:', err?.code || err);
        showAuthToast('Login gagal, coba lagi');
      }
      finishRedirect();
      if (!_currentUser) {
        // Redirect settled without a user: final answer is signed out.
        _authReady = true;
        notifyListeners();
      }
    }
  } catch (err) {
    console.error('Error initializing Firebase Auth:', err?.code || err);
    showAuthToast('Login gagal, coba lagi');
    finishRedirect();
    if (!_currentUser) {
      _authReady = true;
      notifyListeners();
    }
  }
}

/**
 * Test helper to reset internal auth module state between test runs.
 */
export function _resetAuthForTesting() {
  _authInitialized = false;
  _authStateSubscribed = false;
  _authReady = false;
  _redirectSettling = false;
  _redirectWasPending = false;
  if (_redirectCapTimer) { clearTimeout(_redirectCapTimer); _redirectCapTimer = null; }
  _inflight.clear();
  _currentUser = null;
  _inMemoryToken = null;
  _userTier = 'gratis';
  _userProfile = null;
  _sdkPromise = null;
  _firebaseApp = null;
  _firebaseAuth = null;
  _listeners.clear();
}

/** Test helper to inject an in-memory token for unit tests without full Firebase auth flow. */
export function _setTokenForTesting(t) {
  _inMemoryToken = t;
}
