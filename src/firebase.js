// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";


export const firebaseConfig = {
  apiKey: "AIzaSyDNxH0SFv-tkC-VcMopvvQjwFGjs41zXGQ",
  authDomain: "bicsa-consumo-reportes.firebaseapp.com",
  projectId: "bicsa-consumo-reportes",
  storageBucket: "bicsa-consumo-reportes.firebasestorage.app",
  messagingSenderId: "629142460768",
  appId: "1:629142460768:web:439075ade535a66c23a605",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;