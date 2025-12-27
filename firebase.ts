import { initializeApp } from "firebase/app";
import { getAuth, GithubAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAp40OGptD8ozPyp5dfqxGuLfFEIKv2Wz8",
  authDomain: "github-project-update.firebaseapp.com",
  projectId: "github-project-update",
  storageBucket: "github-project-update.firebasestorage.app",
  messagingSenderId: "353379091272",
  appId: "1:353379091272:web:bb8b4b6cc48a901b9aa97d",
  measurementId: "G-BBM6G7E03D"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const githubProvider = new GithubAuthProvider();

// Scopes for repo access
githubProvider.addScope('repo');
githubProvider.addScope('user');
