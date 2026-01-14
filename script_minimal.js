// Minimal script for testing
console.log('[MINIMAL] Script loaded at', new Date().toISOString());

// Firebase imports (minimal)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCN-rP6F_nvVtC3r0D7KstwKKn80diJf4Q",
  authDomain: "sitegaming-firebase.firebaseapp.com",
  projectId: "sitegaming-firebase",
  storageBucket: "sitegaming-firebase.firebasestorage.app",
  messagingSenderId: "865972284818",
  appId: "1:865972284818:web:bab288277f4d70d449254b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Helper functions
function getBaseTeamSafe() {
  console.log('[MINIMAL] getBaseTeamSafe called');
  if (typeof BASE_TEAM !== "undefined" && Array.isArray(BASE_TEAM)) {
    console.log('[MINIMAL] Using BASE_TEAM');
    return BASE_TEAM;
  }
  if (Array.isArray(window.TEAM)) {
    console.log('[MINIMAL] Using window.TEAM');
    return window.TEAM;
  }
  if (Array.isArray(window.AUTHORS)) {
    console.log('[MINIMAL] Using window.AUTHORS');
    return window.AUTHORS;
  }
  console.log('[MINIMAL] Returning empty array');
  return [];
}

function getTeamData() {
  console.log('[MINIMAL] getTeamData called');
  try {
    const raw = localStorage.getItem('team_data');
    if (raw) {
      const stored = JSON.parse(raw);
      console.log('[MINIMAL] Using localStorage data');
      return stored;
    }
  } catch (e) {
    console.log('[MINIMAL] localStorage error, using fallback');
  }
  return getBaseTeamSafe();
}

// Expose functions globally
window.fb = {
  app,
  auth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
};

window.getBaseTeamSafe = getBaseTeamSafe;
window.getTeamData = getTeamData;

console.log('[MINIMAL] Functions exposed globally');