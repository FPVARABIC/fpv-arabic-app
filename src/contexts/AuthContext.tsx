import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase';

interface AuthContextValue {
  currentUser:      User | null;
  isAuthLoading:    boolean;
  isGuest:          boolean;
  signInWithGoogle: () => Promise<User>;
  signUpWithEmail:  (displayName: string, email: string, password: string, photoURL: string | null) => Promise<User>;
  signInWithEmail:  (email: string, password: string) => Promise<User>;
  resetPassword:    (email: string) => Promise<void>;
  signOut:          () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, user => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(firebaseAuth, provider);
    return result.user;
  };

  // Native-only (email/password isn't gated on platform the way Google's
  // signInWithGoogle historically was — it's a plain JS SDK call, no popup,
  // no native bridge — but the UI only offers it on native, see
  // SplashView.tsx). createUserWithEmailAndPassword itself never sets
  // displayName/photoURL, so updateProfile is awaited HERE, before this
  // function's promise resolves — SplashView.tsx's caller awaits this whole
  // function before navigating, and HomeView's useEnsureCommunityUser only
  // reads currentUser.displayName/photoURL after that navigation, so it
  // always sees the fully-updated profile, never the momentary nameless one
  // Firebase creates first. (See SplashView.tsx's own comment on the
  // "returning signed-in user" effect for the other half of this ordering
  // guarantee — that effect must not race ahead of this one.)
  const signUpWithEmail = async (
    displayName: string,
    email: string,
    password: string,
    photoURL: string | null,
  ): Promise<User> => {
    const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    await updateProfile(result.user, { displayName, photoURL });
    return result.user;
  };

  const signInWithEmail = async (email: string, password: string): Promise<User> => {
    const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
    return result.user;
  };

  const resetPassword = (email: string): Promise<void> => sendPasswordResetEmail(firebaseAuth, email);

  const signOut = (): Promise<void> => firebaseSignOut(firebaseAuth);

  const value: AuthContextValue = {
    currentUser,
    isAuthLoading,
    isGuest: !isAuthLoading && currentUser === null,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    resetPassword,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
};

export type { AuthContextValue };
