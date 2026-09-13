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
import { auth, db, googleProvider, DEFAULT_ORG_ID, handleFirestoreError, OperationType, cleanFirestoreData } from '../services/firebase';
import { UserProfile, UserRole } from '../types';
import { syncUserToDirectory, getOrganizationMembers, SUPER_ADMIN_EMAIL } from '../services/userService';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrCreateProfile = async (user: User): Promise<UserProfile> => {
    const userDocRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'users', user.uid);
    const path = `organizations/${DEFAULT_ORG_ID}/users/${user.uid}`;
    
    try {
      const snap = await getDoc(userDocRef);
      // Also check directory to honor administrative promotions
      let directoryRole: UserRole | undefined;
      let directoryActive: boolean | undefined;
      try {
        const directoryMembers = await getOrganizationMembers();
        const found = directoryMembers.find(
          (m) => (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase()) || m.uid === user.uid
        );
        if (found) {
          directoryRole = found.role;
          directoryActive = found.active;
        }
      } catch {
        // Safe fallback
      }

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
        const effectiveRole: UserRole = isSuperAdmin ? 'admin' : (directoryRole || data.role || 'investigator');
        const effectiveActive = directoryActive !== undefined ? directoryActive : (data.active !== false);

        const mergedProfile: UserProfile = {
          ...data,
          uid: user.uid,
          email: user.email || data.email,
          displayName: user.displayName || data.displayName || 'Agente INIP',
          role: effectiveRole,
          active: effectiveActive,
        };

        // If changed, persist back
        if (data.role !== effectiveRole || data.active !== effectiveActive) {
          try {
            await setDoc(userDocRef, cleanFirestoreData(mergedProfile), { merge: true });
          } catch {
            // non-fatal
          }
        }

        // Sync with central directory
        syncUserToDirectory(mergedProfile).catch(() => {});
        return mergedProfile;
      } else {
        const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Agente INIP',
          photoURL: user.photoURL || '',
          role: isSuperAdmin ? 'admin' : (directoryRole || 'investigator'),
          badgeNumber: `INIP-${Math.floor(1000 + Math.random() * 9000)}`,
          department: 'Divisão de Investigações e Perícias',
          active: directoryActive !== undefined ? directoryActive : true,
          createdAt: new Date().toISOString(),
        };

        try {
          await setDoc(userDocRef, {
            ...newProfile,
            serverCreatedAt: serverTimestamp(),
          });
        } catch {
          // non-fatal
        }

        // Also record in admins collection if super admin
        if (newProfile.role === 'admin') {
          try {
            await setDoc(doc(db, 'admins', user.uid), {
              email: user.email,
              grantedAt: new Date().toISOString(),
            }, { merge: true });
          } catch {
            // non-fatal if rules handle via email
          }
        }

        // Sync with central directory
        syncUserToDirectory(newProfile).catch(() => {});
        return newProfile;
      }
    } catch (err) {
      console.warn('Erro ao carregar perfil do usuário:', err);
      const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
      const fallbackProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Agente INIP',
        role: isSuperAdmin ? 'admin' : 'investigator',
        badgeNumber: 'INIP-OPERACIONAL',
        department: 'Divisão de Investigações e Perícias',
        active: true,
        createdAt: new Date().toISOString(),
      };
      syncUserToDirectory(fallbackProfile).catch(() => {});
      return fallbackProfile;
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

      try {
        await setDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'users', result.user.uid), newProfile);
      } catch {
        // non-fatal
      }
      await syncUserToDirectory(newProfile);
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
