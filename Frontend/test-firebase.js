import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDkKh7i1m2-y4bMNqrW2BVtIqkRhE9wH2I",
  authDomain: "flowers-shop-19660.firebaseapp.com",
  projectId: "flowers-shop-19660"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function test() {
  try {
    const cred = await createUserWithEmailAndPassword(auth, "testagent1234567@flowershope.com", "password123");
    console.log("Success! Created user.");
  } catch(e) {
    console.error("FIREBASE_ERROR:", e.code, e.message);
  }
  process.exit(0);
}
test();
