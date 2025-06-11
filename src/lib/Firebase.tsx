// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBe2Nty6ZGqutOKD4ZNYYhhLKkNSRSgUZ0",
  authDomain: "calendariomedico-2dbf7.firebaseapp.com",
  projectId: "calendariomedico-2dbf7",
  storageBucket: "calendariomedico-2dbf7.firebasestorage.app",
  messagingSenderId: "50814490333",
  appId: "1:50814490333:web:6b12483dc2b22037066d34",
  measurementId: "G-PJGSLPP00J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
export const db = getFirestore(app);