import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { isInvestorAdmin, isSuperAdminEmail, resolveInvestorRole } from '../lib/investorRoles';
import { normalizeAuthEmail } from '../lib/firebaseAuthErrors';
import {
  ensureInvestorProfile,
  getInvestorProfile,
  type InvestorProfile,
} from '../services/investor/profileService';
import { getUserWallet } from '../services/investor/walletService';

interface InvestorAuthContextValue {
  user: FirebaseUser | null;
  profile: InvestorProfile | null;
  loading: boolean;
  isAdmin: boolean;
  accountStatus: InvestorProfile['accountStatus'];
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
  canBrowseWorkspace: boolean;
  walletBalance: number;
  isFunded: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const InvestorAuthContext = createContext<InvestorAuthContextValue | undefined>(undefined);

export function InvestorAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);

  const loadWallet = (uid: string) => {
    getUserWallet(uid)
      .then((w) => setWalletBalance(w?.balance ?? 0))
      .catch(() => setWalletBalance(0));
  };

  const loadProfile = async (firebaseUser: FirebaseUser) => {
    try {
      let next = await getInvestorProfile(firebaseUser.uid);
      if (!next) {
        next = await ensureInvestorProfile(firebaseUser.uid, firebaseUser.email ?? '');
      } else if (isSuperAdminEmail(firebaseUser.email)) {
        // Re-run ensure so allowlisted admins get healed even when a profile already exists.
        next = await ensureInvestorProfile(firebaseUser.uid, firebaseUser.email ?? '');
      }
      setProfile(next);
    } catch (error) {
      console.error('Failed to load investor profile:', error);
      const email = firebaseUser.email ?? '';
      setProfile({
        id: firebaseUser.uid,
        email,
        role: resolveInvestorRole(email),
        accountStatus: 'active',
        displayName: email.split('@')[0],
        onboardingCompleted: true,
      });
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      try {
        if (firebaseUser) {
          await loadProfile(firebaseUser);
          loadWallet(firebaseUser.uid);
        } else {
          setProfile(null);
          setWalletBalance(0);
        }
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const value = useMemo<InvestorAuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAdmin: profile ? isInvestorAdmin(profile.role) : false,
      accountStatus: profile?.accountStatus ?? 'pending',
      onboardingCompleted: profile?.onboardingCompleted ?? false,
      onboardingSkipped: profile?.onboardingSkipped ?? false,
      canBrowseWorkspace: Boolean(profile?.onboardingCompleted || profile?.onboardingSkipped),
      walletBalance,
      isFunded: walletBalance > 0,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, normalizeAuthEmail(email), password);
      },
      signUp: async (email, password) => {
        const normalized = normalizeAuthEmail(email);
        const cred = await createUserWithEmailAndPassword(auth, normalized, password);
        await ensureInvestorProfile(cred.user.uid, normalized);
      },
      signOut: () => firebaseSignOut(auth),
      resetPassword: (email) => sendPasswordResetEmail(auth, normalizeAuthEmail(email)),
      refreshProfile: async () => {
        if (user) {
          await loadProfile(user);
          loadWallet(user.uid);
        }
      },
    }),
    [user, profile, loading, walletBalance],
  );

  return <InvestorAuthContext.Provider value={value}>{children}</InvestorAuthContext.Provider>;
}

export function useInvestorAuth() {
  const ctx = useContext(InvestorAuthContext);
  if (!ctx) throw new Error('useInvestorAuth must be used within InvestorAuthProvider');
  return ctx;
}
