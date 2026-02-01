// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA7z7xLpWzGyjfz2zvgXVRjCPVvWBw_40o",
  authDomain: "church-project-tool.firebaseapp.com",
  projectId: "church-project-tool",
  storageBucket: "church-project-tool.firebasestorage.app",
  messagingSenderId: "868274001967",
  appId: "1:868274001967:web:6ab48dde83a7f433f7ceda",
  measurementId: "G-HBZNZYPJZ5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, app };
