
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- CRUCIAL DEBUGGING STEP ---
// This log will show in your BROWSER'S developer console.
// Check if NEXT_PUBLIC_FIREBASE_API_KEY (and others) are undefined or incorrect here.
// If they are, your .env.local file is not being read correctly OR you haven't restarted the dev server.
console.log("DEBUG: Firebase Config Loaded in src/lib/firebase.ts:", firebaseConfig);

// Initialize Firebase
// Check if Firebase has already been initialized to prevent re-initialization errors.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app); // This line will throw if firebaseConfig.apiKey is invalid or undefined

export { app, auth };
