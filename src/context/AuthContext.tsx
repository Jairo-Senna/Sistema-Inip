import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, DEFAULT_ORG_ID, handleFirestoreError, OperationType } from '../services/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, role?: UserRole, badge?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isInvestigator: boolean;
  isViewer: boolean;
  canManageUsers: boolean;
  canEditFinances: boolean;
  canConcludeOrReopen: boolean;
  canDeleteCases: boolean;
  canModifyCase: (caseStatus?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_EMAIL = 'jairosenna14@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrCreateProfile = async (user: User): Promise<UserProfile> => {
    const userDocRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'users', user.uid);
    const path = `organizations/${DEFAULT_ORG_ID}/users/${user.uid}`;
    
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        // Check if user is super admin email, ensure admin role
        if (user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && data.role !== 'admin') {
          await setDoc(userDocRef, { ...data, role: 'admin' }, { merge: true });
          return { ...data, role: 'admin' };
        }
        return data;
      } else {
        const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Agente INIP',
          photoURL: user.photoURL || '',
          role: isSuperAdmin ? 'admin' : 'investigator',
          badgeNumber: `INIP-${Math.floor(1000 + Math.random() * 9000)}`,
          department: 'Divisão de Investigações Especiais',
          active: true,
          createdAt: new Date().toISOString(),
        };

        await setDoc(userDocRef, {
          ...newProfile,
          serverCreatedAt: serverTimestamp(),
        });

        // Also record in admins collection if super admin
        if (isSuperAdmin) {
          try {
            await setDoc(doc(db, 'admins', user.uid), {
              email: user.email,
              grantedAt: new Date().toISOString(),
            });
          } catch {
            // non-fatal if rules handle via email
          }
        }

        return newProfile;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      try {
        const profile = await fetchOrCreateProfile(currentUser);
        setUserProfile(profile);
      } catch (e) {
        console.error('Failed to refresh profile:', e);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await fetchOrCreateProfile(user);
          setUserProfile(profile);
        } catch (err) {
          console.error('Error fetching profile on auth change:', err);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const profile = await fetchOrCreateProfile(result.user);
      setUserProfile(profile);
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      const profile = await fetchOrCreateProfile(result.user);
      setUserProfile(profile);
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (
    email: string, 
    pass: string, 
    name: string, 
    role: UserRole = 'investigator', 
    badge?: string
  ) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(result.user, { displayName: name });
      
      const isSuperAdmin = email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
      // Segurança: Novos cadastros via tela pública entram exclusivamente como 'investigator'.
      // Apenas o Super Administrador nativo recebe admin na criação.
      const assignedRole: UserRole = isSuperAdmin ? 'admin' : (role === 'admin' ? 'investigator' : role);

      const newProfile: UserProfile = {
        uid: result.user.uid,
        email,
        displayName: name,
        role: assignedRole,
        badgeNumber: badge || `INIP-${Math.floor(1000 + Math.random() * 9000)}`,
        department: 'Divisão de Investigações e Perícias',
        active: true,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'users', result.user.uid), newProfile);
      setUserProfile(newProfile);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  const role = userProfile?.role || 'viewer';
  const isAdmin = role === 'admin' || currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const isInvestigator = isAdmin || role === 'investigator';
  const isViewer = role === 'viewer';

  const canManageUsers = isAdmin;
  const canEditFinances = isAdmin;
  const canConcludeOrReopen = isAdmin;
  const canDeleteCases = isAdmin;

  const canModifyCase = (caseStatus?: string) => {
    if (isAdmin) return true;
    if (caseStatus === 'concluido') return false;
    return isInvestigator;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        logout,
        refreshProfile,
        isAdmin,
        isInvestigator,
        isViewer,
        canManageUsers,
        canEditFinances,
        canConcludeOrReopen,
        canDeleteCases,
        canModifyCase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
