import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, remove, push, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    databaseURL: "https://survival-pvp-game-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Bağlantı testi ve global aktarım
window.FB = { db, ref, set, get, onValue, remove, push, update };
console.log("Firebase başarıyla yüklendi ve bağlandı.");
