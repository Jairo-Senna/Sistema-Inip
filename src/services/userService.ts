import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { db, DEFAULT_ORG_ID, cleanFirestoreData } from './firebase';
import { UserProfile, UserRole } from '../types';

export const SUPER_ADMIN_EMAIL = 'jairosenna14@gmail.com';

/**
 * Cria um novo integrante (Usuário Normal ou Administrador)
 * Utiliza uma instância secundária do Firebase Auth para NÃO desconectar o administrador logado.
 */
export async function createMemberUser(params: {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  badgeNumber?: string;
  department?: string;
}): Promise<UserProfile> {
  const secondaryAppName = 'SecondaryAuthApp';
  let secondaryApp = getApps().find((a) => a.name === secondaryAppName);
  if (!secondaryApp) {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  }
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      params.email.trim(),
      params.password
    );
    const uid = cred.user.uid;

    const newProfile: UserProfile = {
      uid,
      email: params.email.toLowerCase().trim(),
      displayName: params.displayName.trim(),
      role: params.role,
      badgeNumber: params.badgeNumber?.trim() || 'INIP-OPERACIONAL',
      department: params.department?.trim() || 'Divisão de Investigação & Perícia',
      active: true,
      createdAt: new Date().toISOString(),
    };

    // Salva perfil no Firestore da organização
    await setDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'users', uid), cleanFirestoreData(newProfile));

    // Se for administrador, adiciona também na coleção de segurança /admins
    if (params.role === 'admin') {
      await setDoc(doc(db, 'admins', uid), {
        email: params.email.toLowerCase().trim(),
        displayName: params.displayName.trim(),
        role: 'admin',
        promotedAt: new Date().toISOString(),
      });
    }

    return newProfile;
  } finally {
    // Garante o encerramento da sessão temporária na instância secundária
    try {
      await signOut(secondaryAuth);
    } catch {
      // Ignora erro de sign out se já estiver deslogado
    }
  }
}

/**
 * Atualiza o papel/perfil de um usuário
 */
export async function updateUserRole(uid: string, newRole: UserRole, userEmail?: string): Promise<void> {
  if (userEmail && userEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && newRole !== 'admin') {
    throw new Error('O Super Administrador soberano não pode ser rebaixado.');
  }

  await updateDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'users', uid), {
    role: newRole,
    updatedAt: new Date().toISOString(),
  });

  if (newRole === 'admin') {
    await setDoc(doc(db, 'admins', uid), {
      role: 'admin',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } else {
    try {
      await deleteDoc(doc(db, 'admins', uid));
    } catch {
      // Se não existia na coleção admins, segue normalmente
    }
  }
}

/**
 * Ativa ou desativa um usuário
 */
export async function toggleUserStatus(uid: string, currentActive: boolean, userEmail?: string): Promise<boolean> {
  if (userEmail && userEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && currentActive) {
    throw new Error('O Super Administrador não pode ser desativado.');
  }

  const nextActive = !currentActive;
  await updateDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'users', uid), {
    active: nextActive,
    updatedAt: new Date().toISOString(),
  });

  return nextActive;
}
