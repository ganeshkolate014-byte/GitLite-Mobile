import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { auth, githubProvider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged, GithubAuthProvider } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for token restoration on reload
    // Note: Firebase Auth persists session, but OAuth access token is only returned on sign-in event.
    // For a real app, you might refresh it or store it encrypted. 
    // Here we rely on the initial sign-in or re-auth if token is missing from memory.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // We need the GitHub token. If it's not in memory (page reload), we might need to prompt re-login 
        // or store it in sessionStorage (less secure but functional for demo).
        const storedToken = sessionStorage.getItem('gh_token');
        const storedUsername = sessionStorage.getItem('gh_username');

        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          githubToken: storedToken || undefined,
          githubUsername: storedUsername || undefined,
        });
      } else {
        setUser(null);
        sessionStorage.removeItem('gh_token');
        sessionStorage.removeItem('gh_username');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      const username = (result.user as any).reloadUserInfo?.screenName; // Hacky way to get GitHub username

      if (token && result.user) {
        // Persist for page reloads in this demo context
        sessionStorage.setItem('gh_token', token);
        if(username) sessionStorage.setItem('gh_username', username);

        setUser({
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          githubToken: token,
          githubUsername: username,
        });
      }
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    sessionStorage.removeItem('gh_token');
    sessionStorage.removeItem('gh_username');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
