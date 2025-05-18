
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

// TEMPORARY DIAGNOSTIC STEP: Hardcoding Firebase config
// If this works, the issue is with how environment variables are being loaded.
// REMEMBER TO REVERT THIS and fix your .env.local setup.
const firebaseConfig = {
  apiKey: "AIzaSyD-S4U04FIUdUfXxm_a1pai35XseQ40sDA",
  authDomain: "fintrack-mobile-d2vmo.firebaseapp.com",
  projectId: "fintrack-mobile-d2vmo",
  storageBucket: "fintrack-mobile-d2vmo.firebasestorage.app",
  messagingSenderId: "553647569008",
  appId: "1:553647569008:web:826e35c1de6a396c0e1cb5",
};

// --- CRUCIAL DEBUGGING STEP ---
// This log will show in your BROWSER'S developer console.
// It should now show the hardcoded values above.
console.log("DEBUG: Firebase Config Loaded in src/lib/firebase.ts (TEMPORARILY HARDCODED):", firebaseConfig);

// Initialize Firebase
// Check if Firebase has already been initialized to prevent re-initialization errors.
let app;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // You might want to display an error to the user or handle this state
    throw error; // Re-throw to see the error overlay if initialization fails
  }
} else {
  app = getApp();
}

let auth;
try {
  auth = getAuth(app); // This line will throw if firebaseConfig.apiKey is invalid or undefined
} catch (error) {
  console.error("Firebase getAuth error:", error);
  // Handle the error appropriately, e.g., by not rendering authenticated content
  throw error; // Re-throw to see the error overlay
}

export { app, auth };
