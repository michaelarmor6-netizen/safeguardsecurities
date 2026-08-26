import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification as firebaseSendEmailVerification,
  updateProfile as firebaseUpdateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User, UserRole, AuthContextType, SignupForm } from '../types';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? 'User signed in' : 'User signed out');
      
      if (firebaseUser) {
        try {
          console.log('Fetching user document for UID:', firebaseUser.uid);
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            console.log('User document found:', userData);
            console.log('🆔 USER ID for Admin Creation:', firebaseUser.uid);
            const updatedUser = {
              ...userData,
              uid: firebaseUser.uid,
              emailVerified: firebaseUser.emailVerified,
            };
            setUser(updatedUser);
            console.log('User state updated:', updatedUser);
          } else {
            console.log('User document not found, creating new one');
            // Create user document if it doesn't exist
            const newUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              firstName: firebaseUser.displayName?.split(' ')[0] || '',
              lastName: firebaseUser.displayName?.split(' ')[1] || '',
              role: UserRole.CLIENT,
              emailVerified: firebaseUser.emailVerified,
              twoFactorEnabled: false,
              createdAt: new Date() as any,
              updatedAt: new Date() as any,
              isActive: true,
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
            console.log('New user created and state updated:', newUser);
          }
        } catch (error: any) {
          console.error('Error fetching user data:', error);
          
          // If Firestore is offline or unavailable, create a temporary user from Firebase Auth data
          if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
            console.log('Firestore unavailable, creating temporary user from Auth data');
            const tempUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              firstName: firebaseUser.displayName?.split(' ')[0] || 'User',
              lastName: firebaseUser.displayName?.split(' ')[1] || '',
              role: UserRole.CLIENT, // Default to client role
              emailVerified: firebaseUser.emailVerified,
              twoFactorEnabled: false,
              createdAt: new Date() as any,
              updatedAt: new Date() as any,
              isActive: true,
            };
            setUser(tempUser);
            console.log('Temporary user created:', tempUser);
            toast.error('Database connection issue. Some features may be limited.');
          } else {
            toast.error('Error loading user data');
          }
        }
      } else {
        console.log('No user, setting user state to null');
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Attempting sign in with email:', email);
      
      // Clear any cached authentication state
      if (auth.currentUser) {
        console.log('Clearing existing auth state before new sign in');
        await firebaseSignOut(auth);
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful for user:', userCredential.user.uid);
      toast.success('Successfully signed in!');
    } catch (error: any) {
      console.error('Sign in error:', error);
      let message = 'Failed to sign in';
      
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password';
          break;
        case 'auth/invalid-credential':
          message = 'Invalid credentials. Please check your email and password.';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later';
          break;
        case 'auth/api-key-not-valid':
          message = 'Firebase configuration error. Please check your API key in .env file';
          break;
        case 'auth/project-not-found':
          message = 'Firebase project not found. Please check your project ID in .env file';
          break;
        case 'auth/operation-not-allowed':
          message = 'Email/Password authentication is not enabled. Please enable it in Firebase Console';
          break;
        default:
          if (error.message.includes('api-key-not-valid')) {
            message = 'Invalid Firebase API key. Please update your .env file with valid Firebase credentials';
          }
          break;
      }
      
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (userData: SignupForm) => {
    try {
      setLoading(true);
      const { email, password, firstName, lastName, phoneNumber } = userData;
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update Firebase Auth profile
      await firebaseUpdateProfile(firebaseUser, {
        displayName: `${firstName} ${lastName}`,
      });

      // Create user document in Firestore
      const newUser: User = {
        uid: firebaseUser.uid,
        email,
        firstName,
        lastName,
        phoneNumber,
        role: UserRole.CLIENT,
        emailVerified: false,
        twoFactorEnabled: false,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
        isActive: true,
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      
      // Send email verification
      await firebaseSendEmailVerification(firebaseUser);
      
      toast.success('Account created successfully! Please check your email for verification.');
    } catch (error: any) {
      console.error('Sign up error:', error);
      let message = 'Failed to create account';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'An account with this email already exists';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address';
          break;
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters';
          break;
        case 'auth/api-key-not-valid':
          message = 'Firebase configuration error. Please check your API key in .env file';
          break;
        case 'auth/project-not-found':
          message = 'Firebase project not found. Please check your project ID in .env file';
          break;
        case 'auth/operation-not-allowed':
          message = 'Email/Password authentication is not enabled. Please enable it in Firebase Console';
          break;
        default:
          if (error.message.includes('api-key-not-valid')) {
            message = 'Invalid Firebase API key. Please update your .env file with valid Firebase credentials';
          }
          break;
      }
      
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Clear user state immediately
      setUser(null);
      setLoading(false);
      
      // Clear Firebase auth
      await firebaseSignOut(auth);
      
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      // Still clear user state even if Firebase signout fails
      setUser(null);
      setLoading(false);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      let message = 'Failed to send password reset email';
      
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address';
          break;
      }
      
      toast.error(message);
      throw error;
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) throw new Error('No authenticated user');
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...data,
        updatedAt: new Date(),
      });
      
      setUser(prev => prev ? { ...prev, ...data } : null);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  const sendEmailVerification = async () => {
    if (!auth.currentUser) throw new Error('No authenticated user');
    
    try {
      await firebaseSendEmailVerification(auth.currentUser);
      toast.success('Verification email sent! Check your inbox.');
    } catch (error) {
      console.error('Email verification error:', error);
      toast.error('Failed to send verification email');
      throw error;
    }
  };

  const enableTwoFactor = async () => {
    // This would be implemented with a proper 2FA service
    // For now, we'll just update the user document
    if (!user) throw new Error('No authenticated user');
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        twoFactorEnabled: true,
        updatedAt: new Date(),
      });
      
      setUser(prev => prev ? { ...prev, twoFactorEnabled: true } : null);
      toast.success('Two-factor authentication enabled');
    } catch (error) {
      console.error('2FA enable error:', error);
      toast.error('Failed to enable two-factor authentication');
      throw error;
    }
  };

  const disableTwoFactor = async () => {
    if (!user) throw new Error('No authenticated user');
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        twoFactorEnabled: false,
        updatedAt: new Date(),
      });
      
      setUser(prev => prev ? { ...prev, twoFactorEnabled: false } : null);
      toast.success('Two-factor authentication disabled');
    } catch (error) {
      console.error('2FA disable error:', error);
      toast.error('Failed to disable two-factor authentication');
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    sendEmailVerification,
    enableTwoFactor,
    disableTwoFactor,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};