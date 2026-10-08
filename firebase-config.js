import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, push, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 🔥 BURAYA KENDİ FIREBASE REALTIME DATABASE URL ADRESİNİ YAZ 🔥
const firebaseConfig = {
    databaseURL: "https://survival-pvp-game-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Oyunda kullanılmak üzere global olarak dışa aktarıyoruz
window.FB = { db, ref, set, onValue, remove, push, update };
