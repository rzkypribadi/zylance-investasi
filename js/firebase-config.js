// Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyANSYmNZHRuFE6p6lga3cEkYTCQU67xT7g",
  authDomain: "database-invest.firebaseapp.com",
  databaseURL: "https://database-invest-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "database-invest",
  storageBucket: "database-invest.firebasestorage.app",
  messagingSenderId: "465429517765",
  appId: "1:465429517765:web:de893fc118784569ef67ac",
  measurementId: "G-XW756RZPZJ"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
