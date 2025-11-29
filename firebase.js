// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB3L2OaeYJrQ73Z2_GzRnr0T10tE5DEXyw",
  authDomain: "letdoit-dd8c7.firebaseapp.com",
  projectId: "letdoit-dd8c7",
  storageBucket: "letdoit-dd8c7.firebasestorage.app",
  messagingSenderId: "373938930026",
  appId: "1:373938930026:web:f2de7a168ecbd449d36513",
  measurementId: "G-SBJNY6P9H6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Generate local user ID (unique)
if (!localStorage.getItem("localUserId")) {
  localStorage.setItem("localUserId", crypto.randomUUID());
}

export const localUserId = localStorage.getItem("localUserId");
