// Paste YOUR values from Firebase Console > Project settings > General > Your apps.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR-PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR-PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR-PROJECT",
  appId: "YOUR_APP_ID"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getDatabase(app);
