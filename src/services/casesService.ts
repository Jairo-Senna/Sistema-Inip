import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, DEFAULT_ORG_ID, cleanFirestoreData } from './firebase';
import {
  CaseData,
  InvolvedEntity,
  CaseConnection,
  Diligence,
  CaseFileItem,
  PaymentRecord,
  ActivityLogItem,
  UserProfile,
  CaseStatus,
} from '../types';

// Constants
export const CATALOG_DOC_ID = 'index_catalog';
const LOCAL_CATALOG_KEY = 'inip_cases_catalog_v2';
const LOCAL_CASE_PREFIX = 'inip_case_detail_v2_';

// Helper paths
const getCaseDocRef = (caseId: string) => doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId);
const getCatalogDocRef = () => doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', CATALOG_DOC_ID);

// ─── Local Storage Helpers ──────────────────────────────────────────────────
export function getLocalCatalog(): CaseData[] {
  try {
    const raw = localStorage.getItem(LOCAL_CATALOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to read local catalog:', e);
    return [];
  }
}

export function saveLocalCatalog(cases: CaseData[]) {
  try {
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(cases));
  } catch (e) {
    console.warn('Failed to save local catalog:', e);
  }
}

export function getLocalCase(caseId: string): CaseData | null {
  try {
    const raw = localStorage.getItem(LOCAL_CASE_PREFIX + caseId);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to read local case ${caseId}:`, e);
  }
  // Fallback to catalog
  const catalog = getLocalCatalog();
  return catalog.find((c) => c.id === caseId) || null;
}

export function saveLocalCase(caseData: CaseData) {
  try {
    localStorage.setItem(LOCAL_CASE_PREFIX + caseData.id, JSON.stringify(caseData));
  } catch (e) {
    console.warn(`Failed to save local case ${caseData.id}:`, e);
  }
}

export function removeLocalCase(caseId: string) {
  try {
    localStorage.removeItem(LOCAL_CASE_PREFIX + caseId);
  } catch (e) {
    console.warn(`Failed to remove local case ${caseId}:`, e);
  }
}

// ─── Catalog Firestore Sync ─────────────────────────────────────────────────
async function updateCatalogInFirestore(updater: (current: CaseData[]) => CaseData[]): Promise<CaseData[]> {
  let currentList = getLocalCatalog();
  try {
    const catalogSnap = await getDoc(getCatalogDocRef());
    if (catalogSnap.exists() && Array.isArray(catalogSnap.data()?.cases)) {
      currentList = catalogSnap.data()?.cases as CaseData[];
    }
  } catch (err) {
    console.warn('Could not read remote catalog, using local:', err);
  }

  const updated = updater(currentList);
  saveLocalCatalog(updated);

  // Keep catalog payload clean (exclude heavy files/base64 from index)
  const leanCatalog = updated.map((c) => ({
    id: c.id,
    title: c.title,
    code: c.code,
    clientName: c.clientName,
    openingDate: c.openingDate,
    priority: c.priority,
    status: c.status,
    description: c.description || '',
    objective: c.objective || '',
    contractedValue: c.contractedValue || 0,
    receivedValue: c.receivedValue || 0,
    pendingValue: c.pendingValue || 0,
    paymentMethod: c.paymentMethod || '',
    financialNotes: c.financialNotes || '',
    createdByUid: c.createdByUid || '',
    createdByName: c.createdByName || '',
    updatedByUid: c.updatedByUid || '',
    updatedByName: c.updatedByName || '',
    createdAt: c.createdAt || new Date().toISOString(),
    updatedAt: c.updatedAt || new Date().toISOString(),
  }));

  try {
    await setDoc(getCatalogDocRef(), {
      cases: cleanFirestoreData(leanCatalog),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not write remote catalog:', err);
  }

  return updated;
}

// ─── Activity Logger ────────────────────────────────────────────────────────
export async function logCaseActivity(
  caseId: string,
  userProfile: UserProfile,
  actionType: string,
  description: string,
  affectedRecord?: string,
  previousValue?: string,
  newValue?: string
) {
  const logId = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const logItem: ActivityLogItem = {
    id: logId,
    userUid: userProfile.uid,
    userName: userProfile.displayName || 'Agente INIP',
    userEmail: userProfile.email,
    actionType,
    description,
    affectedRecord: affectedRecord || '',
    previousValue: previousValue || '',
    newValue: newValue || '',
    timestamp: new Date().toISOString(),
  };

  try {
    // Append to case document activityLog
    const current = await getCaseById(caseId);
    if (current) {
      const logs = [logItem, ...(current.activityLog || [])].slice(0, 100);
      current.activityLog = logs;
      saveLocalCase(current);
      await updateDoc(getCaseDocRef(caseId), {
        activityLog: cleanFirestoreData(logs),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Audit log write to case doc warning:', err);
  }

  // Also write to subcollection in background
  try {
    const logDoc = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'activityLog', logId);
    setDoc(logDoc, cleanFirestoreData(logItem)).catch(() => {});
  } catch {
    // ignore
  }
}

// ─── 1. Cases Subscription (Dashboard) ───────────────────────────────────────
export function subscribeToCases(callback: (cases: CaseData[]) => void) {
  // 1. Immediately emit local catalog for instantaneous UX
  const localList = getLocalCatalog();
  if (localList.length > 0) {
    callback(localList);
  }

  // 2. Attach real-time listener to the catalog document
  const unsub = onSnapshot(
    getCatalogDocRef(),
    (snapshot) => {
      if (snapshot.exists()) {
        const raw = snapshot.data();
        if (Array.isArray(raw?.cases)) {
          const list = raw.cases as CaseData[];
          list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          saveLocalCatalog(list);
          callback(list);
          return;
        }
      }
      // If catalog document doesn't exist yet, emit local or empty
      callback(getLocalCatalog());
    },
    (error) => {
      console.warn('Catalog subscription error, using local catalog:', error);
      callback(getLocalCatalog());
    }
  );

  return unsub;
}

// ─── 2. Single Case Operations ──────────────────────────────────────────────
export async function getCaseById(caseId: string): Promise<CaseData | null> {
  // Try local first for speed
  const local = getLocalCase(caseId);

  try {
    const snap = await getDoc(getCaseDocRef(caseId));
    if (snap.exists()) {
      const remoteData = { id: snap.id, ...snap.data() } as CaseData;
      // Merge local collections if remote arrays are missing
      const merged: CaseData = {
        ...remoteData,
        involved: remoteData.involved || local?.involved || [],
        connections: remoteData.connections || local?.connections || [],
        diligences: remoteData.diligences || local?.diligences || [],
        files: remoteData.files || local?.files || [],
        payments: remoteData.payments || local?.payments || [],
        activityLog: remoteData.activityLog || local?.activityLog || [],
      };
      saveLocalCase(merged);
      return merged;
    }
  } catch (error) {
    console.warn(`Error getting case by id ${caseId} from Firestore:`, error);
  }

  return local;
}

export async function getAllCases(): Promise<CaseData[]> {
  try {
    const snap = await getDoc(getCatalogDocRef());
    if (snap.exists() && Array.isArray(snap.data()?.cases)) {
      const list = snap.data()?.cases as CaseData[];
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      saveLocalCatalog(list);
      return list;
    }
  } catch (err) {
    console.warn('Failed to fetch catalog from Firestore:', err);
  }
  return getLocalCatalog();
}

// ─── Real-time Case Detail Subscription ─────────────────────────────────────
export function subscribeToCaseDetail(
  caseId: string,
  callback: (
    caseData: CaseData,
    involved: InvolvedEntity[],
    connections: CaseConnection[],
    diligences: Diligence[],
    files: CaseFileItem[]
  ) => void,
  onError?: (err: any) => void
) {
  // Emit local cache immediately
  const local = getLocalCase(caseId);
  if (local) {
    callback(
      local,
      local.involved || [],
      local.connections || [],
      local.diligences || [],
      local.files || []
    );
  }

  const unsub = onSnapshot(
    getCaseDocRef(caseId),
    (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as CaseData;
        const involved = data.involved || local?.involved || [];
        const connections = data.connections || local?.connections || [];
        const diligences = data.diligences || local?.diligences || [];
        const files = data.files || local?.files || [];

        const fullCase: CaseData = {
          ...data,
          involved,
          connections,
          diligences,
          files,
        };

        saveLocalCase(fullCase);
        callback(fullCase, involved, connections, diligences, files);
      } else if (local) {
        callback(
          local,
          local.involved || [],
          local.connections || [],
          local.diligences || [],
          local.files || []
        );
      }
    },
    (err) => {
      console.warn(`Case detail subscription error for ${caseId}:`, err);
      if (onError) onError(err);
      if (local) {
        callback(
          local,
          local.involved || [],
          local.connections || [],
          local.diligences || [],
          local.files || []
        );
      }
    }
  );

  return unsub;
}

export function subscribeToActivityLog(caseId: string, callback: (items: ActivityLogItem[]) => void) {
  const local = getLocalCase(caseId);
  if (local?.activityLog) {
    callback(local.activityLog);
  }
  return onSnapshot(
    getCaseDocRef(caseId),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as CaseData;
        const logs = data.activityLog || local?.activityLog || [];
        callback(logs);
      }
    },
    () => {
      if (local?.activityLog) callback(local.activityLog);
    }
  );
}

// Backward compatibility helpers
export async function getInvolvedByCase(caseId: string): Promise<InvolvedEntity[]> {
  const c = await getCaseById(caseId);
  return c?.involved || [];
}

export async function getConnectionsByCase(caseId: string): Promise<CaseConnection[]> {
  const c = await getCaseById(caseId);
  return c?.connections || [];
}

export async function getDiligencesByCase(caseId: string): Promise<Diligence[]> {
  const c = await getCaseById(caseId);
  return c?.diligences || [];
}

export async function getFilesByCase(caseId: string): Promise<CaseFileItem[]> {
  const c = await getCaseById(caseId);
  return c?.files || [];
}

// ─── 3. Create Case ──────────────────────────────────────────────────────────
export async function createCase(
  caseInput: Omit<CaseData, 'id' | 'createdAt' | 'updatedAt' | 'pendingValue' | 'createdByUid' | 'createdByName' | 'updatedByUid' | 'updatedByName'>,
  userProfile: UserProfile
): Promise<string> {
  const caseId = `case-${Date.now()}`;
  const contracted = Number(caseInput.contractedValue) || 0;
  const received = Number(caseInput.receivedValue) || 0;
  const pending = Math.max(0, contracted - received);
  const now = new Date().toISOString();

  const newCase: CaseData = {
    ...caseInput,
    id: caseId,
    contractedValue: contracted,
    receivedValue: received,
    pendingValue: pending,
    createdByUid: userProfile.uid,
    createdByName: userProfile.displayName || 'Agente INIP',
    updatedByUid: userProfile.uid,
    updatedByName: userProfile.displayName || 'Agente INIP',
    createdAt: now,
    updatedAt: now,
    involved: [],
    connections: [],
    diligences: [],
    files: [],
    payments: [],
    activityLog: [],
  };

  // 1. Save local immediately
  saveLocalCase(newCase);

  // 2. Write to Firestore case doc
  try {
    await setDoc(getCaseDocRef(caseId), cleanFirestoreData(newCase));
  } catch (error) {
    console.error('Error writing case doc to Firestore:', error);
  }

  // 3. Update catalog in Firestore & local
  await updateCatalogInFirestore((current) => [newCase, ...current.filter((c) => c.id !== caseId)]);

  // 4. Log activity
  await logCaseActivity(
    caseId,
    userProfile,
    'CASO_CRIADO',
    `${userProfile.displayName} criou o caso "${newCase.title}" (${newCase.code}).`,
    'Geral'
  );

  return caseId;
}

// ─── 4. Update Case ──────────────────────────────────────────────────────────
export async function updateCase(
  caseId: string,
  updates: Partial<CaseData>,
  userProfile: UserProfile,
  previousCase?: CaseData
): Promise<void> {
  const current = (await getCaseById(caseId)) || previousCase;
  const contracted = updates.contractedValue !== undefined ? Number(updates.contractedValue) : (current?.contractedValue ?? 0);
  const received = updates.receivedValue !== undefined ? Number(updates.receivedValue) : (current?.receivedValue ?? 0);
  const pending = Math.max(0, contracted - received);

  const finalUpdates: Partial<CaseData> = {
    ...updates,
    contractedValue: contracted,
    receivedValue: received,
    pendingValue: pending,
    updatedByUid: userProfile.uid,
    updatedByName: userProfile.displayName || 'Agente INIP',
    updatedAt: new Date().toISOString(),
  };

  if (current) {
    const updatedFull: CaseData = {
      ...current,
      ...finalUpdates,
    };
    saveLocalCase(updatedFull);
  }

  try {
    await updateDoc(getCaseDocRef(caseId), cleanFirestoreData(finalUpdates));
  } catch (error) {
    console.error('Error updating case in Firestore:', error);
  }

  await updateCatalogInFirestore((currentList) =>
    currentList.map((c) => (c.id === caseId ? { ...c, ...finalUpdates } : c))
  );

  await logCaseActivity(
    caseId,
    userProfile,
    'CASO_EDITADO',
    `${userProfile.displayName} atualizou as informações do caso.`,
    'Geral'
  );
}

// ─── 5. Update Status ────────────────────────────────────────────────────────
export async function updateCaseStatus(
  caseId: string,
  newStatus: CaseStatus,
  userProfile: UserProfile,
  reason?: string
): Promise<void> {
  await updateCase(caseId, { status: newStatus }, userProfile);
  await logCaseActivity(
    caseId,
    userProfile,
    'STATUS_ALTERADO',
    `${userProfile.displayName} alterou status para "${newStatus.toUpperCase()}". ${reason ? `Motivo: ${reason}` : ''}`,
    'Status'
  );
}

// ─── 6. Delete Case ──────────────────────────────────────────────────────────
export async function deleteCase(caseId: string): Promise<void> {
  removeLocalCase(caseId);

  try {
    await deleteDoc(getCaseDocRef(caseId));
  } catch (error) {
    console.warn(`Failed to delete case doc ${caseId} from Firestore:`, error);
  }

  await updateCatalogInFirestore((current) => current.filter((c) => c.id !== caseId));
}

// ─── 7. INVOLVED (Envolvidos) ────────────────────────────────────────────────
export function subscribeToInvolved(caseId: string, callback: (items: InvolvedEntity[]) => void) {
  const local = getLocalCase(caseId);
  if (local?.involved) {
    callback(local.involved);
  }

  const unsub = onSnapshot(
    getCaseDocRef(caseId),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const list: InvolvedEntity[] = data?.involved || [];
        callback(list);
      }
    },
    (error) => {
      console.warn(`Involved subscription warning on case ${caseId}:`, error);
      const c = getLocalCase(caseId);
      callback(c?.involved || []);
    }
  );

  return unsub;
}

export async function addInvolved(
  caseId: string,
  involvedInput: Omit<InvolvedEntity, 'id' | 'createdAt' | 'updatedAt'>,
  userProfile: UserProfile
): Promise<string> {
  const id = `inv-${Date.now()}`;
  const now = new Date().toISOString();

  const newEntity: InvolvedEntity = {
    ...involvedInput,
    id,
    createdAt: now,
    updatedAt: now,
  };

  const current = await getCaseById(caseId);
  const updatedInvolved = [...(current?.involved || []), newEntity];

  if (current) {
    current.involved = updatedInvolved;
    saveLocalCase(current);
  }

  try {
    await updateDoc(getCaseDocRef(caseId), {
      involved: cleanFirestoreData(updatedInvolved),
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error updating involved on case doc:', error);
  }

  // Also write to subcollection in background
  try {
    const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'involved', id);
    setDoc(docRef, cleanFirestoreData(newEntity)).catch(() => {});
  } catch {}

  await logCaseActivity(
    caseId,
    userProfile,
    'ENVOLVIDO_ADICIONADO',
    `${userProfile.displayName} adicionou o envolvido "${newEntity.name}" (${newEntity.classification}).`,
    'Envolvidos'
  );

  return id;
}

export async function updateInvolved(
  caseId: string,
  involvedId: string,
  updates: Partial<InvolvedEntity>,
  userProfile: UserProfile
): Promise<void> {
  const now = new Date().toISOString();
  const current = await getCaseById(caseId);
  const updatedInvolved = (current?.involved || []).map((inv) =>
    inv.id === involvedId ? { ...inv, ...updates, updatedAt: now } : inv
  );

  if (current) {
    current.involved = updatedInvolved;
    saveLocalCase(current);
  }

  try {
    await updateDoc(getCaseDocRef(caseId), {
      involved: cleanFirestoreData(updatedInvolved),
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error updating involved on case doc:', error);
  }

  // Subcollection update in background
  try {
    const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'involved', involvedId);
    updateDoc(docRef, cleanFirestoreData({ ...updates, updatedAt: now })).catch(() => {});
  } catch {}

  await logCaseActivity(
    caseId,
    userProfile,
    'ENVOLVIDO_EDITADO',
    `${userProfile.displayName} atualizou dados do envolvido "${updates.name || involvedId}".`,
    'Envolvidos'
  );
}

export async function deleteInvolved(
  caseId: string,
  involvedId: string,
  involvedName: string,
  userProfile: UserProfile
): Promise<void> {
  const now = new Date().toISOString();
  const current = await getCaseById(caseId);
  const updatedInvolved = (current?.involved || []).filter((inv) => inv.id !== involvedId);

  if (current) {
    current.involved = updatedInvolved;
    saveLocalCase(current);
  }

  try {
    await updateDoc(getCaseDocRef(caseId), {
      involved: cleanFirestoreData(updatedInvolved),
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error removing involved from case doc:', error);
  }

  // Subcollection delete in background
  try {
    const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'involved', involvedId);
    deleteDoc(docRef).catch(() => {});
  } catch {}

  await logCaseActivity(
    caseId,
    userProfile,
    'ENVOLVIDO_REMOVIDO',
    `${userProfile.displayName} removeu o envolvido "${involvedName}".`,
    'Envolvidos'
  );
}

// ─── 8. CONNECTIONS (Mapa de Conexões) ───────────────────────────────────────
export function subscribeToConnections(caseId: string, callback: (items: CaseConnection[]) => void) {
  const local = getLocalCase(caseId);
  if (local?.connections) callback(local.connections);

  const unsub = onSnapshot(
    getCaseDocRef(caseId),
    (snapshot) => {
      if (snapshot.exists()) {
        const list: CaseConnection[] = snapshot.data()?.connections || [];
        callback(list);
      }
    },
    (error) => {
      console.warn(`Connections subscription warning on case ${caseId}:`, error);
      callback(getLocalCase(caseId)?.connections || []);
    }
  );

  return unsub;
}

export async function addConnection(
  caseId: string,
  connectionInput: Omit<CaseConnection, 'id' | 'createdAt'>,
  userProfile: UserProfile
): Promise<string> {
  const id = `conn-${Date.now()}`;
  const now = new Date().toISOString();
  const data: CaseConnection = {
    ...connectionInput,
    id,
    createdAt: now,
  };

  const current = await getCaseById(caseId);
  const updatedConnections = [...(current?.connections || []), data];

  if (current) {
    current.connections = updatedConnections;
    saveLocalCase(current);
  }

  try {
    await updateDoc(getCaseDocRef(caseId), {
      connections: cleanFirestoreData(updatedConnections),
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error updating connections on case doc:', error);
  }

  // Subcollection in background
  try {
    const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'connections', id);
    setDoc(docRef, cleanFirestoreData(data)).catch(() => {});
  } catch {}

  await logCaseActivity(
    caseId,
    userProfile,
    'CONEXAO_CRIADA',
    `${userProfile.displayName} estabeleceu conexão: "${data.label}" (${data.type}).`,
    'Mapa de Conexões'
  );

  return id;
}

export async function deleteConnection(
  caseId: string,
  connectionId: string,
  userProfile: UserProfile
): Promise<void> {
  const now = new Date().toISOString();
  const current = await getCaseById(caseId);
  const updatedConnections = (current?.connections || []).filter((c) => c.id !== connectionId);

  if (current) {
    current.connections = updatedConnections;
    saveLocalCase(current);
  }

  try {
    await updateDoc(getCaseDocRef(caseId), {
      connections: cleanFirestoreData(updatedConnections),
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error removing connection from case doc:', error);
  }

  // Subcollection in background
  try {
    const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'connections', connectionId);
    deleteDoc(docRef).catch(() => {});
  } catch {}

  await logCaseActivity(
    caseId,
    userProfile,
    'CONEXAO_REMOVIDA',
    `${userProfile.displayName} removeu vínculo de relacionamento.`,
    'Mapa de Conexões'
  );
}

// ─── 9. DILIGENCES (Diligências) ─────────────────────────────────────────────
export function subscribeToDiligences(caseId: string, callback: (items: Diligence[]) => void) {
  const local = getLocalCase(caseId);
  if (local?.diligences) callback(local.diligences);

  const unsub = onSnapshot(
    getCaseDocRef(caseId),
    (snapshot) => {
      if (snapshot.exists()) {
        const list: Diligence[] = snapshot.data()?.diligences || [];
        callback(list);
      }
    },
    (error) => {
      console.warn(`Diligences subscription warning on case ${caseId}:`, error);
      callback(getLocalCase(caseId)?.diligences || []);
    }
  );

  return unsub;
}

export async function addDiligence(
  caseId: string,
  diligenceInput: Omit<Diligence, 'id' | 'createdAt' | 'createdByUid' | 'createdByName'>,
  userProfile: UserProfile
): Promise<string> {
  const id = `dil-${Date.now()}`;
  const now = new Date().toISOString();
  const data: Diligence = {
    ...diligenceInput,
    id,
    createdByUid: userProfile.uid,
    createdByName: userProfile.displayName,
    createdAt: now,
  };

  const current = await getCaseById(caseId);
  const updatedDiligences = [data, ...(current?.diligences || [])];

  if (current) {
    current.diligences = updatedDiligences;
    saveLocalCase(current);
  }

  try {
    await updateDoc(getCaseDocRef(caseId), {
      diligences: cleanFirestoreData(updatedDiligences),
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error adding diligence to case doc:', error);
  }

  // Subcollection in background
  try {
    const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'diligences', id);
    setDoc(docRef, cleanFirestoreData(data)).catch(() => {});
  } catch {}

  await logCaseActivity(
    caseId,
    userProfile,
    'DILIGENCIA_REGISTRADA',
    `${userProfile.displayName} realizou a Diligência #${data.number}: "${data.type}".`,
    'Diligências'
  );

  return id;
}

export async function deleteDiligence(
  caseId: string,
  diligenceId: string,
  diligenceNum: string,
  userProfile: UserProfile
): Promise<void> {
  const now = new Date().toISOString();
  const current = await getCaseById(caseId);
  const updatedDiligences = (current?.diligences || []).filter((d) => d.id !== diligenceId);

  if (current) {
    current.diligences = updatedDiligences;
    saveLocalCase(current);
  }

  try {
    await updateDoc(getCaseDocRef(caseId), {
      diligences: cleanFirestoreData(updatedDiligences),
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error removing diligence from case doc:', error);
  }

  // Subcollection in background
  try {
    const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'diligences', diligenceId);
    deleteDoc(docRef).catch(() => {});
  } catch {}

  await logCaseActivity(
    caseId,
    userProfile,
    'DILIGENCIA_REMOVIDA',
    `${userProfile.displayName} removeu a diligência #${diligenceNum}.`,
    'Diligências'
  );
}

// ─── 10. FILES & EVIDENCE (Evidências e Arquivos) ───────────────────────────
export function subscribeToFiles(caseId: string, callback: (items: CaseFileItem[]) => void) {
  const local = getLocalCase(caseId);
  if (local?.files) callback(local.files);

  const unsub = onSnapshot(
    getCaseDocRef(caseId),
    (snapshot) => {
      if (snapshot.exists()) {
        const list: CaseFileItem[] = snapshot.data()?.files || [];
        callback(list);
      }
    },
    (error) => {
      console.warn(`Files subscription warning on case ${caseId}:`, error);
      callback(getLocalCase(caseId)?.files || []);
    }
  );

  return unsub;
}

export async function addCaseFile(
  caseId: string,
  fileInput: Omit<CaseFileItem, 'id' | 'uploadedAt' | 'uploadedByUid' | 'uploadedByName'>,
  userProfile: UserProfile
): Promise<string> {
  const id = `file-${Date.now()}`;
  const now = new Date().toISOString();
  const data: CaseFileItem = {
    ...fileInput,
    id,
    uploadedByUid: userProfile.uid,
    uploadedByName: userProfile.displayName,
    uploadedAt: now,
  };

  const current = await getCaseById(caseId);
  const updatedFiles = [data, ...(current?.files || [])];

  if (current) {
    current.files = updatedFiles;
    saveLocalCase(current);
  }

  try {
    await updateDoc(getCaseDocRef(caseId), {
      files: cleanFirestoreData(updatedFiles),
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error adding file to case doc:', error);
  }

  // Subcollection in background
  try {
    const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'files', id);
    setDoc(docRef, cleanFirestoreData(data)).catch(() => {});
  } catch {}

  await logCaseActivity(
    caseId,
    userProfile,
    'ARQUIVO_ANEXADO',
    `${userProfile.displayName} anexou o arquivo "${data.name}" (${data.category}).`,
    'Evidências'
  );

  return id;
}

export async function deleteCaseFile(
  caseId: string,
  fileId: string,
  fileName: string,
  userProfile: UserProfile
): Promise<void> {
  const now = new Date().toISOString();
  const current = await getCaseById(caseId);
  const updatedFiles = (current?.files || []).filter((f) => f.id !== fileId);

  if (current) {
    current.files = updatedFiles;
    saveLocalCase(current);
  }

  try {
    await updateDoc(getCaseDocRef(caseId), {
      files: cleanFirestoreData(updatedFiles),
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error removing file from case doc:', error);
  }

  // Subcollection in background
  try {
    const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'files', fileId);
    deleteDoc(docRef).catch(() => {});
  } catch {}

  await logCaseActivity(
    caseId,
    userProfile,
    'ARQUIVO_REMOVIDO',
    `${userProfile.displayName} excluiu o arquivo "${fileName}".`,
    'Evidências'
  );
}

// ─── 11. PAYMENTS (Financeiro) ──────────────────────────────────────────────
export function subscribeToPayments(caseId: string, callback: (items: PaymentRecord[]) => void) {
  const local = getLocalCase(caseId);
  if (local?.payments) callback(local.payments);

  const unsub = onSnapshot(
    getCaseDocRef(caseId),
    (snapshot) => {
      if (snapshot.exists()) {
        const list: PaymentRecord[] = snapshot.data()?.payments || [];
        callback(list);
      }
    },
    (error) => {
      console.warn(`Payments subscription warning on case ${caseId}:`, error);
      callback(getLocalCase(caseId)?.payments || []);
    }
  );

  return unsub;
}

export async function addPayment(
  caseId: string,
  paymentInput: Omit<PaymentRecord, 'id' | 'createdAt' | 'recordedByUid' | 'recordedByName'>,
  userProfile: UserProfile,
  currentCase: CaseData
): Promise<string> {
  const id = `pay-${Date.now()}`;
  const now = new Date().toISOString();
  const data: PaymentRecord = {
    ...paymentInput,
    id,
    recordedByUid: userProfile.uid,
    recordedByName: userProfile.displayName,
    createdAt: now,
  };

  const updatedPayments = [data, ...(currentCase.payments || [])];
  const newReceived = (Number(currentCase.receivedValue) || 0) + Number(data.value);
  const newPending = Math.max(0, (Number(currentCase.contractedValue) || 0) - newReceived);

  const updatedCase: CaseData = {
    ...currentCase,
    payments: updatedPayments,
    receivedValue: newReceived,
    pendingValue: newPending,
    updatedAt: now,
  };

  saveLocalCase(updatedCase);

  try {
    await updateDoc(getCaseDocRef(caseId), {
      payments: cleanFirestoreData(updatedPayments),
      receivedValue: newReceived,
      pendingValue: newPending,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error adding payment to case doc:', error);
  }

  // Update catalog summary
  await updateCatalogInFirestore((list) =>
    list.map((c) =>
      c.id === caseId ? { ...c, receivedValue: newReceived, pendingValue: newPending, updatedAt: now } : c
    )
  );

  // Subcollection in background
  try {
    const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'payments', id);
    setDoc(docRef, cleanFirestoreData(data)).catch(() => {});
  } catch {}

  await logCaseActivity(
    caseId,
    userProfile,
    'PAGAMENTO_REGISTRADO',
    `${userProfile.displayName} registrou recebimento de R$ ${Number(data.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
    'Financeiro'
  );

  return id;
}

export async function deletePayment(
  caseId: string,
  paymentId: string,
  paymentValue: number,
  userProfile: UserProfile,
  currentCase: CaseData
): Promise<void> {
  const now = new Date().toISOString();
  const updatedPayments = (currentCase.payments || []).filter((p) => p.id !== paymentId);
  const newReceived = Math.max(0, (Number(currentCase.receivedValue) || 0) - paymentValue);
  const newPending = Math.max(0, (Number(currentCase.contractedValue) || 0) - newReceived);

  const updatedCase: CaseData = {
    ...currentCase,
    payments: updatedPayments,
    receivedValue: newReceived,
    pendingValue: newPending,
    updatedAt: now,
  };

  saveLocalCase(updatedCase);

  try {
    await updateDoc(getCaseDocRef(caseId), {
      payments: cleanFirestoreData(updatedPayments),
      receivedValue: newReceived,
      pendingValue: newPending,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error deleting payment from case doc:', error);
  }

  // Update catalog
  await updateCatalogInFirestore((list) =>
    list.map((c) =>
      c.id === caseId ? { ...c, receivedValue: newReceived, pendingValue: newPending, updatedAt: now } : c
    )
  );

  // Subcollection in background
  try {
    const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'payments', paymentId);
    deleteDoc(docRef).catch(() => {});
  } catch {}

  await logCaseActivity(
    caseId,
    userProfile,
    'PAGAMENTO_REMOVIDO',
    `${userProfile.displayName} estornou registro de pagamento.`,
    'Financeiro'
  );
}

// ─── 12. ACTIVITY LOGS (Auditoria) ──────────────────────────────────────────
export function subscribeToActivityLogs(caseId: string, callback: (items: ActivityLogItem[]) => void) {
  const local = getLocalCase(caseId);
  if (local?.activityLog) callback(local.activityLog);

  const unsub = onSnapshot(
    getCaseDocRef(caseId),
    (snapshot) => {
      if (snapshot.exists()) {
        const list: ActivityLogItem[] = snapshot.data()?.activityLog || [];
        callback(list);
      }
    },
    (error) => {
      console.warn(`Activity logs subscription warning on case ${caseId}:`, error);
      callback(getLocalCase(caseId)?.activityLog || []);
    }
  );

  return unsub;
}

// ─── 13. GLOBAL SEARCH ──────────────────────────────────────────────────────
export async function executeGlobalSearch(term: string): Promise<{
  cases: CaseData[];
  involved: { caseId: string; caseCode: string; entity: InvolvedEntity }[];
  diligences: { caseId: string; caseCode: string; diligence: Diligence }[];
  files: { caseId: string; caseCode: string; file: CaseFileItem }[];
}> {
  if (!term || term.trim().length < 2) {
    return { cases: [], involved: [], diligences: [], files: [] };
  }

  const cleanTerm = term.toLowerCase().trim();
  const cases = await getAllCases();

  const matchedCases = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(cleanTerm) ||
      c.code.toLowerCase().includes(cleanTerm) ||
      c.clientName.toLowerCase().includes(cleanTerm) ||
      (c.description && c.description.toLowerCase().includes(cleanTerm))
  );

  const matchedInvolved: { caseId: string; caseCode: string; entity: InvolvedEntity }[] = [];
  const matchedDiligences: { caseId: string; caseCode: string; diligence: Diligence }[] = [];
  const matchedFiles: { caseId: string; caseCode: string; file: CaseFileItem }[] = [];

  for (const c of cases.slice(0, 50)) {
    const fullCase = await getCaseById(c.id);
    if (!fullCase) continue;

    (fullCase.involved || []).forEach((inv) => {
      if (
        inv.name?.toLowerCase().includes(cleanTerm) ||
        inv.nickname?.toLowerCase().includes(cleanTerm) ||
        inv.corporateName?.toLowerCase().includes(cleanTerm) ||
        inv.fantasyName?.toLowerCase().includes(cleanTerm) ||
        inv.cnpj?.includes(cleanTerm) ||
        inv.phone?.includes(cleanTerm) ||
        inv.email?.toLowerCase().includes(cleanTerm)
      ) {
        matchedInvolved.push({ caseId: c.id, caseCode: c.code, entity: inv });
      }
    });

    (fullCase.diligences || []).forEach((dil) => {
      if (
        dil.number?.toLowerCase().includes(cleanTerm) ||
        dil.type?.toLowerCase().includes(cleanTerm) ||
        dil.description?.toLowerCase().includes(cleanTerm) ||
        dil.location?.toLowerCase().includes(cleanTerm)
      ) {
        matchedDiligences.push({ caseId: c.id, caseCode: c.code, diligence: dil });
      }
    });

    (fullCase.files || []).forEach((f) => {
      if (
        f.name?.toLowerCase().includes(cleanTerm) ||
        f.description?.toLowerCase().includes(cleanTerm) ||
        f.category?.toLowerCase().includes(cleanTerm)
      ) {
        matchedFiles.push({ caseId: c.id, caseCode: c.code, file: f });
      }
    });
  }

  return {
    cases: matchedCases,
    involved: matchedInvolved,
    diligences: matchedDiligences,
    files: matchedFiles,
  };
}

// ─── 14. SEED DEMO DATA ─────────────────────────────────────────────────────
export async function seedDemoData(userProfile: UserProfile): Promise<string> {
  const caseId = 'case-demo-lelo-001';
  const now = new Date().toISOString();

  const inv1: InvolvedEntity = {
    id: 'inv-demo-1',
    type: 'pessoa',
    name: 'João da Silva',
    nickname: 'Silvinha',
    classification: 'em_analise',
    birthDate: '1984-04-12',
    age: 42,
    phone: '+55 11 98765-4321',
    email: 'joao.silva@lelotec.com.br',
    address: 'Av. Paulista, 1800, Conj. 42 - São Paulo/SP',
    occupation: 'Engenheiro de Sistemas / Sócio Administrador',
    company: 'Lelo Tecnologia Ltda.',
    notes: 'Figura como sócio administrador de 3 empresas ativas no mesmo endereço fiscal.',
    additionalInfo: 'Movimentações financeiras atípicas reportadas pelo COAF.',
    createdAt: now,
    updatedAt: now,
  };

  const inv2: InvolvedEntity = {
    id: 'inv-demo-2',
    type: 'pessoa',
    name: 'Maria Oliveira',
    nickname: 'Mari',
    classification: 'testemunha',
    birthDate: '1991-09-23',
    age: 34,
    phone: '+55 11 91234-5678',
    email: 'maria.oliveira@gmail.com',
    occupation: 'Contadora',
    notes: 'Ex-prestadora de serviços contábeis da Lelo Tecnologia Ltda.',
    createdAt: now,
    updatedAt: now,
  };

  const inv3: InvolvedEntity = {
    id: 'inv-demo-3',
    type: 'empresa',
    name: 'Lelo Tecnologia Ltda.',
    corporateName: 'Lelo Tecnologia e Participações Ltda.',
    fantasyName: 'Lelo Tech',
    cnpj: '33.445.566/0001-77',
    classification: 'principal',
    legalReps: 'João da Silva (Sócio)',
    address: 'Av. Paulista, 1800, Conj. 42 - São Paulo/SP',
    notes: 'Empresa receptora dos aportes simulados.',
    createdAt: now,
    updatedAt: now,
  };

  const conn1: CaseConnection = {
    id: 'conn-demo-1',
    sourceId: inv1.id,
    targetId: inv3.id,
    type: 'socio_de',
    label: 'Sócio Administrador (80% quotas)',
    notes: 'Contrato Social arquivado na JUCESP em 2021.',
    createdAt: now,
  };

  const dil1: Diligence = {
    id: 'dil-demo-1',
    number: '001',
    type: 'pericia_forense',
    date: '2026-08-18',
    time: '14:30',
    location: 'Laboratório Central de Forense Digital INIP',
    participants: 'Equipe Pericial INIP',
    objective: 'Aquisição forense e espelhamento de disco de estação de trabalho corporativa.',
    description: 'Executada imagem bit a bit de SSD 1TB sob hash SHA-256 verificado.',
    result: 'Localizados 44 comprovantes bancários estruturados e planilhas contábeis paralelas.',
    createdByUid: userProfile.uid,
    createdByName: userProfile.displayName,
    createdAt: now,
  };

  const dil2: Diligence = {
    id: 'dil-demo-2',
    number: '002',
    type: 'oitiva',
    date: '2026-08-22',
    time: '10:00',
    location: 'Sede Regional INIP - Sala de Audiências 2',
    participants: 'Investigador Líder e Testemunha',
    objective: 'Oitiva preliminar da testemunha Maria Oliveira.',
    description: 'Tomada de esclarecimentos sobre fluxo de emissão de notas fiscais fraudulentas.',
    result: 'Testemunha confirmou ordens expressas de João da Silva para emissão de NF sem lastro.',
    createdByUid: userProfile.uid,
    createdByName: userProfile.displayName,
    createdAt: now,
  };

  const file1: CaseFileItem = {
    id: 'file-demo-1',
    name: 'Laudo_Forense_Preliminar_01.pdf',
    type: 'application/pdf',
    size: 2450000,
    category: 'relatorio',
    description: 'Laudo pericial com análise de integridade dos registros criptográficos.',
    relatedDiligenceId: dil1.id,
    uploadedByUid: userProfile.uid,
    uploadedByName: userProfile.displayName,
    uploadedAt: now,
  };

  const pay1: PaymentRecord = {
    id: 'pay-demo-1',
    date: '2026-08-16',
    value: 20000,
    paymentMethod: 'TED Bancária',
    observation: 'Pagamento inicial contratual de 50% para despesas periciais.',
    recordedByUid: userProfile.uid,
    recordedByName: userProfile.displayName,
    createdAt: now,
  };

  const demoCase: CaseData = {
    id: caseId,
    title: 'Investigação – Fraude Bancária Lelo',
    code: 'INIP-2026-001',
    clientName: 'Banco Cooperativo Mercantil S.A.',
    openingDate: '2026-08-15',
    priority: 'alta',
    status: 'em_andamento',
    description:
      'Investigação patrimonial e forense computacional para apuração de desvio sistemático de recursos via transações estruturadas simulando pagamentos de serviços de TI.',
    objective:
      'Identificar operadores das contas de repasse, mapear estrutura societária cruzada e rastrear ativos móveis e imóveis dos principais beneficiários.',
    observations:
      'Procedimento classificado sob Sigilo Nível 2. Perícia preliminar detectou acessos com endereços IP vinculados a proxies corporativos.',
    contractedValue: 45000,
    receivedValue: 20000,
    pendingValue: 25000,
    paymentMethod: 'Transferência Bancária (3 parcelas)',
    financialNotes: 'Sinal de R$ 20.000 liquidado na assinatura. 2ª parcela condicionada ao laudo pericial preliminar.',
    createdByUid: userProfile.uid,
    createdByName: userProfile.displayName,
    updatedByUid: userProfile.uid,
    updatedByName: userProfile.displayName,
    createdAt: now,
    updatedAt: now,
    involved: [inv1, inv2, inv3],
    connections: [conn1],
    diligences: [dil1, dil2],
    files: [file1],
    payments: [pay1],
    activityLog: [],
  };

  saveLocalCase(demoCase);

  try {
    await setDoc(getCaseDocRef(caseId), cleanFirestoreData(demoCase));
  } catch (err) {
    console.warn('Seed write to Firestore doc error:', err);
  }

  await updateCatalogInFirestore((current) => [demoCase, ...current.filter((c) => c.id !== caseId)]);

  await logCaseActivity(caseId, userProfile, 'CASO_CRIADO', 'Caso modelo cadastrado no sistema INIP.', 'Geral');

  return caseId;
}
