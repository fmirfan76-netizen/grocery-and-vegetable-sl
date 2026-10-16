import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  signInAnonymously
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  adminEmail: string;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<boolean>;
  signInWithPasskey: (passkey: string) => boolean;
  signOut: () => Promise<void>;
  enableAnonymousUser: () => Promise<void>;
}

const SUPER_ADMIN_EMAIL = 'fmirfan76@gmail.com';
const ADMIN_MASTER_PASSKEY = 'Irfan@5505';
const ADMIN_SESSION_KEY = 'matale_secure_admin_session';

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  adminEmail: SUPER_ADMIN_EMAIL,
  loading: true,
  authError: null,
  clearAuthError: () => {},
  signInWithGoogle: async () => false,
  signInWithPasskey: () => false,
  signOut: async () => {},
  enableAnonymousUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    // Only restore if a verified authenticated admin session token exists
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'verified_admin';
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.email && currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        setIsAdmin(true);
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'verified_admin');
        setAuthError(null);
      } else if (sessionStorage.getItem(ADMIN_SESSION_KEY) === 'verified_admin') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearAuthError = () => setAuthError(null);

  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      setLoading(true);
      setAuthError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email?.toLowerCase();

      if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
        setIsAdmin(true);
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'verified_admin');
        return true;
      } else {
        // Not authorized!
        setIsAdmin(false);
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        setAuthError(`Access Denied: ${result.user.email} is not authorized. Only the designated administrator (${SUPER_ADMIN_EMAIL}) can access this panel.`);
        return false;
      }
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      setAuthError(error instanceof Error ? error.message : 'Google authentication failed.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signInWithPasskey = (passkey: string): boolean => {
    setAuthError(null);
    if (passkey.trim() === ADMIN_MASTER_PASSKEY) {
      setIsAdmin(true);
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'verified_admin');
      return true;
    } else {
      setAuthError('Invalid Admin Passkey. Access is restricted to the administrator.');
      return false;
    }
  };

  const signOut = async () => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      setIsAdmin(false);
      setAuthError(null);
      await fbSignOut(auth);
    } catch (error) {
      console.error('Sign-Out error:', error);
    }
  };

  const enableAnonymousUser = async () => {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    } catch (e) {
      console.warn('Anonymous auth note:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        adminEmail: SUPER_ADMIN_EMAIL,
        loading,
        authError,
        clearAuthError,
        signInWithGoogle,
        signInWithPasskey,
        signOut,
        enableAnonymousUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
