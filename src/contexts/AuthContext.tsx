import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { firebaseAuth } from '../lib/firebase';

interface AuthContextValue {
  currentUser:      User | null;
  isAuthLoading:    boolean;
  isGuest:          boolean;
  signInWithGoogle: () => Promise<User>;
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
    if (Capacitor.isNativePlatform()) {
      // signInWithPopup opens a real browser popup — inside the Android
      // WebView there is no such thing, and Google actively blocks
      // sign-in inside embedded/WebView browsers anyway. The native plugin
      // instead drives the OS-level Google account picker.
      //
      // That sign-in only reaches the plugin's own native Firebase Auth
      // layer, though — every other screen in this app (Firestore/Storage
      // reads and writes, all gated by request.auth.uid) goes through the
      // Firebase JS SDK's `firebaseAuth`, which is a separate runtime the
      // native layer does not automatically update. So the returned Google
      // ID token is exchanged for a JS-SDK credential and signed in here
      // too — without this, currentUser would stay null after a
      // "successful" native sign-in and every Rules-gated call would keep
      // failing as an unauthenticated guest.
      const { credential } = await FirebaseAuthentication.signInWithGoogle();
      if (!credential?.idToken) {
        throw new Error('Google sign-in did not return an ID token');
      }
      const jsCredential = GoogleAuthProvider.credential(credential.idToken);
      const result = await signInWithCredential(firebaseAuth, jsCredential);
      return result.user;
    }

    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(firebaseAuth, provider);
    return result.user;
  };

  const signOut = (): Promise<void> => firebaseSignOut(firebaseAuth);

  const value: AuthContextValue = {
    currentUser,
    isAuthLoading,
    isGuest: !isAuthLoading && currentUser === null,
    signInWithGoogle,
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
