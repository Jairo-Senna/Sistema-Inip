import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { setDoc, doc, deleteDoc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { db, DEFAULT_ORG_ID, cleanFirestoreData } from './firebase';
import { UserProfile, UserRole } from '../types';

export const SUPER_ADMIN_EMAIL = 'jairosenna14@gmail.com';
export const DIRECTORY_DOC_ID = 'index_directory';
const MEMBERS_STORAGE_KEY = 'inip_directory_members';

// Default master admin profile template
const DEFAULT_SUPER_ADMIN_PROFILE: UserProfile = {
  uid: 'xMORZ64gvHO1276nywiD2FZdcEh1',
  email: SUPER_ADMIN_EMAIL,
  displayName: '02 (Administrador Geral)',
  role: 'admin',
  badgeNumber: 'INIP-6838',
  department: 'Divisão de Investigações e Perícias',
  active: true,
  createdAt: '2026-09-13T01:23:42.879Z',
};

function getCachedMembers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(MEMBERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCachedMembers(members: UserProfile[]): void {
  try {
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members));
  } catch {
    // Ignore localStorage quota errors
  }
}

function sortMembers(members: UserProfile[]): UserProfile[] {
  return [...members].sort((a, b) => {
    // Super admin first
    const aIsSuper = a.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    const bIsSuper = b.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    if (aIsSuper && !bIsSuper) return -1;
    if (!aIsSuper && bIsSuper) return 1;

    // Then admins
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;

    // Then alphabetically by name or email
    const nameA = a.displayName || a.email || '';
    const nameB = b.displayName || b.email || '';
    return nameA.localeCompare(nameB);
  });
}

function normalizeMemberList(list: UserProfile[]): UserProfile[] {
  const map = new Map<string, UserProfile>();

  // Ensure default super admin is initially seeded
  map.set(DEFAULT_SUPER_ADMIN_PROFILE.email.toLowerCase(), { ...DEFAULT_SUPER_ADMIN_PROFILE });

  // Add cached members
  const cached = getCachedMembers();
  for (const c of cached) {
    if (c.email) {
      map.set(c.email.toLowerCase(), c);
    }
  }

  // Add provided list
  for (const item of list) {
    if (!item || !item.email) continue;
    const key = item.email.toLowerCase();
    const existing = map.get(key);
    map.set(key, {
      ...existing,
      ...item,
      role: key === SUPER_ADMIN_EMAIL.toLowerCase() ? 'admin' : (item.role || existing?.role || 'investigator'),
      active: item.active !== undefined ? item.active : existing?.active !== undefined ? existing.active : true,
    });
  }

  return sortMembers(Array.from(map.values()));
}

/**
 * Consulta a relação completa de integrantes do INIP
 * Utiliza o documento central index_directory com tolerância a falhas e cache local.
 */
export async function getOrganizationMembers(): Promise<UserProfile[]> {
  const directoryRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'users', DIRECTORY_DOC_ID);

  try {
    const snap = await getDoc(directoryRef);
    let members: UserProfile[] = [];

    if (snap.exists() && Array.isArray(snap.data().members)) {
      members = snap.data().members;
    }

    const normalized = normalizeMemberList(members);
    saveCachedMembers(normalized);

    // If Firestore directory did not exist or had fewer members, update it safely
    if (!snap.exists() || (snap.data().members?.length || 0) < normalized.length) {
      try {
        await setDoc(directoryRef, {
          members: normalized,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (writeErr) {
        console.warn('Não foi possível persistir directoryRef:', writeErr);
      }
    }

    return normalized;
  } catch (err) {
    console.warn('Aviso ao consultar index_directory, usando cache resiliente:', err);
    return normalizeMemberList([]);
  }
}

/**
 * Escuta em tempo real alterações na relação de integrantes
 */
export function subscribeToOrganizationMembers(onUpdate: (members: UserProfile[]) => void): () => void {
  const directoryRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'users', DIRECTORY_DOC_ID);

  // Initial immediate call with current cached list
  const current = normalizeMemberList([]);
  onUpdate(current);

  const unsubscribe = onSnapshot(
    directoryRef,
    (docSnap) => {
      if (docSnap.exists() && Array.isArray(docSnap.data().members)) {
        const normalized = normalizeMemberList(docSnap.data().members);
        saveCachedMembers(normalized);
        onUpdate(normalized);
      } else {
        // First time initialization
        getOrganizationMembers().then(onUpdate).catch(() => {});
      }
    },
    (err) => {
      console.warn('Aviso na sincronização em tempo real de membros:', err);
      // Fallback
      getOrganizationMembers().then(onUpdate).catch(() => {});
    }
  );

  return unsubscribe;
}

/**
 * Sincroniza o perfil de um usuário (ao logar ou se cadastrar) para o diretório central
 */
export async function syncUserToDirectory(profile: UserProfile): Promise<void> {
  if (!profile || !profile.email) return;

  const directoryRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'users', DIRECTORY_DOC_ID);
  const currentMembers = await getOrganizationMembers();

  const isSuper = profile.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const index = currentMembers.findIndex((m) => m.email.toLowerCase() === profile.email.toLowerCase() || m.uid === profile.uid);

  let updatedList: UserProfile[];
  if (index >= 0) {
    const existing = currentMembers[index];
    updatedList = [...currentMembers];
    updatedList[index] = {
      ...existing,
      ...profile,
      // Keep admin role if previously granted by admin, or if super admin
      role: isSuper ? 'admin' : (existing.role === 'admin' ? 'admin' : profile.role || existing.role || 'investigator'),
      active: existing.active !== undefined ? existing.active : profile.active !== false,
      updatedAt: new Date().toISOString(),
    };
  } else {
    updatedList = [
      ...currentMembers,
      {
        ...profile,
        role: isSuper ? 'admin' : profile.role || 'investigator',
        active: profile.active !== false,
      }
    ];
  }

  const normalized = normalizeMemberList(updatedList);
  saveCachedMembers(normalized);

  try {
    await setDoc(directoryRef, {
      members: normalized,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Erro ao atualizar index_directory:', err);
  }
}

/**
 * Adiciona manualmente um integrante já existente pelo e-mail
 */
export async function addExistingMemberToDirectory(params: {
  email: string;
  displayName?: string;
  badgeNumber?: string;
  department?: string;
  role?: UserRole;
}): Promise<UserProfile> {
  const email = params.email.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Informe um e-mail válido.');
  }

  const currentMembers = await getOrganizationMembers();
  const existing = currentMembers.find((m) => m.email.toLowerCase() === email);

  if (existing) {
    return existing;
  }

  const newProfile: UserProfile = {
    uid: `user-ext-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    email,
    displayName: params.displayName?.trim() || email.split('@')[0],
    role: params.role || 'investigator',
    badgeNumber: params.badgeNumber?.trim() || `INIP-${Math.floor(1000 + Math.random() * 9000)}`,
    department: params.department?.trim() || 'Divisão de Investigação & Perícia',
    active: true,
    createdAt: new Date().toISOString(),
  };

  await syncUserToDirectory(newProfile);
  return newProfile;
}

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
    try {
      await setDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'users', uid), cleanFirestoreData(newProfile));
    } catch (err) {
      console.warn('Erro ao salvar documento individual do usuário:', err);
    }

    // Sincroniza imediatamente no diretório de integrantes
    await syncUserToDirectory(newProfile);

    // Se for administrador, adiciona também na coleção de segurança /admins
    if (params.role === 'admin') {
      try {
        await setDoc(doc(db, 'admins', uid), {
          email: params.email.toLowerCase().trim(),
          displayName: params.displayName.trim(),
          role: 'admin',
          promotedAt: new Date().toISOString(),
        });
      } catch {
        // Ignora erro de regras se já registrado
      }
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
 * Atualiza o papel/perfil de um usuário (Administrador <-> Usuário Normal)
 */
export async function updateUserRole(uid: string, newRole: UserRole, userEmail?: string): Promise<void> {
  if (userEmail && userEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && newRole !== 'admin') {
    throw new Error('O Super Administrador soberano não pode ser rebaixado.');
  }

  // 1. Atualiza no diretório central
  const currentMembers = await getOrganizationMembers();
  const updatedMembers = currentMembers.map((m) => {
    if (m.uid === uid || (userEmail && m.email.toLowerCase() === userEmail.toLowerCase())) {
      return { ...m, role: newRole, updatedAt: new Date().toISOString() };
    }
    return m;
  });

  const normalized = normalizeMemberList(updatedMembers);
  saveCachedMembers(normalized);

  const directoryRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'users', DIRECTORY_DOC_ID);
  try {
    await setDoc(directoryRef, {
      members: normalized,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Erro ao atualizar papel no index_directory:', err);
  }

  // 2. Atualiza no documento individual do usuário se acessível
  try {
    await updateDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'users', uid), {
      role: newRole,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Aviso: documento individual do usuário não pôde ser atualizado diretamente:', err);
  }

  // 3. Atualiza coleção /admins para validações de regra
  if (newRole === 'admin') {
    try {
      await setDoc(doc(db, 'admins', uid), {
        role: 'admin',
        email: userEmail || '',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch {
      // Se a coleção admins estiver protegida, segue normalmente
    }
  } else {
    try {
      await deleteDoc(doc(db, 'admins', uid));
    } catch {
      // Se não existia na coleção admins, segue normalmente
    }
  }
}

/**
 * Ativa ou desativa o acesso de um usuário
 */
export async function toggleUserStatus(uid: string, currentActive: boolean, userEmail?: string): Promise<boolean> {
  if (userEmail && userEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && currentActive) {
    throw new Error('O Super Administrador não pode ser desativado.');
  }

  const nextActive = !currentActive;

  // 1. Atualiza no diretório central
  const currentMembers = await getOrganizationMembers();
  const updatedMembers = currentMembers.map((m) => {
    if (m.uid === uid || (userEmail && m.email.toLowerCase() === userEmail.toLowerCase())) {
      return { ...m, active: nextActive, updatedAt: new Date().toISOString() };
    }
    return m;
  });

  const normalized = normalizeMemberList(updatedMembers);
  saveCachedMembers(normalized);

  const directoryRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'users', DIRECTORY_DOC_ID);
  try {
    await setDoc(directoryRef, {
      members: normalized,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Erro ao atualizar status no index_directory:', err);
  }

  // 2. Atualiza no documento individual do usuário se acessível
  try {
    await updateDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'users', uid), {
      active: nextActive,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Aviso: documento individual não pôde ser atualizado diretamente:', err);
  }

  return nextActive;
}

