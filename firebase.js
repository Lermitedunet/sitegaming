// Firebase CDN imports (v10.12.5)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCN-rP6F_nwVtC3r0D7KstwKKn80diJf4Q",
  authDomain: "sitegaming-firebase.firebaseapp.com",
  projectId: "sitegaming-firebase",
  storageBucket: "sitegaming-firebase.firebasestorage.app",
  messagingSenderId: "865972284818",
  appId: "1:865972284818:web:bab288277f4d70d449254b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Expose Firebase helpers globally
window.fb = {
  app,
  auth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
};