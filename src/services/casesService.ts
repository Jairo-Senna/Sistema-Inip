import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, DEFAULT_ORG_ID, handleFirestoreError, OperationType, cleanFirestoreData } from './firebase';
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

// Helper paths
const getCasesRef = () => collection(db, 'organizations', DEFAULT_ORG_ID, 'cases');
const getCaseDocRef = (caseId: string) => doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId);

// Activity Logger
export async function logCaseActivity(
  caseId: string,
  userProfile: UserProfile,
  actionType: string,
  description: string,
  affectedRecord?: string,
  previousValue?: string,
  newValue?: string
) {
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/activityLog`;
  try {
    const logCol = collection(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'activityLog');
    const logId = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const logDoc = doc(logCol, logId);
    
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

    await setDoc(logDoc, cleanFirestoreData(logItem));
  } catch (err) {
    console.error('Audit log write error:', err);
    // don't break flow on audit error
  }
}

// 1. Cases Subscription
export function subscribeToCases(callback: (cases: CaseData[]) => void) {
  const q = query(getCasesRef(), orderBy('createdAt', 'desc'));
  const path = `organizations/${DEFAULT_ORG_ID}/cases`;

  return onSnapshot(
    q,
    (snapshot) => {
      const cases: CaseData[] = [];
      snapshot.forEach((docSnap) => {
        cases.push({ id: docSnap.id, ...(docSnap.data() as Omit<CaseData, 'id'>) });
      });
      callback(cases);
    },
    (error) => {
      console.warn(`Cases subscription error on ${path}:`, error);
    }
  );
}

// 2. Single Case Get
export async function getCaseById(caseId: string): Promise<CaseData | null> {
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}`;
  try {
    const snap = await getDoc(getCaseDocRef(caseId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<CaseData, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getAllCases(): Promise<CaseData[]> {
  const path = `organizations/${DEFAULT_ORG_ID}/cases`;
  try {
    const q = query(getCasesRef(), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const list: CaseData[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<CaseData, 'id'>) });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function getInvolvedByCase(caseId: string): Promise<InvolvedEntity[]> {
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/involved`;
  try {
    const colRef = collection(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'involved');
    const snap = await getDocs(colRef);
    const list: InvolvedEntity[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<InvolvedEntity, 'id'>) });
    });
    return list;
  } catch (error) {
    console.warn(`Error getting involved on ${path}:`, error);
    return [];
  }
}

export async function getConnectionsByCase(caseId: string): Promise<CaseConnection[]> {
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/connections`;
  try {
    const colRef = collection(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'connections');
    const snap = await getDocs(colRef);
    const list: CaseConnection[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<CaseConnection, 'id'>) });
    });
    return list;
  } catch (error) {
    console.warn(`Error getting connections on ${path}:`, error);
    return [];
  }
}

export async function getDiligencesByCase(caseId: string): Promise<Diligence[]> {
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/diligences`;
  try {
    const colRef = collection(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'diligences');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const list: Diligence[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<Diligence, 'id'>) });
    });
    return list;
  } catch (error) {
    console.warn(`Error getting diligences on ${path}:`, error);
    return [];
  }
}

export async function getFilesByCase(caseId: string): Promise<CaseFileItem[]> {
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/files`;
  try {
    const colRef = collection(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'files');
    const q = query(colRef, orderBy('uploadedAt', 'desc'));
    const snap = await getDocs(q);
    const list: CaseFileItem[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<CaseFileItem, 'id'>) });
    });
    return list;
  } catch (error) {
    console.warn(`Error getting files on ${path}:`, error);
    return [];
  }
}

// 3. Create Case
export async function createCase(
  caseInput: Omit<CaseData, 'id' | 'createdAt' | 'updatedAt' | 'pendingValue' | 'createdByUid' | 'createdByName' | 'updatedByUid' | 'updatedByName'>,
  userProfile: UserProfile
): Promise<string> {
  const caseId = `case-${Date.now()}`;
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}`;

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
  };

  try {
    await setDoc(getCaseDocRef(caseId), cleanFirestoreData(newCase));
    await logCaseActivity(
      caseId,
      userProfile,
      'CASO_CRIADO',
      `${userProfile.displayName} criou o caso "${newCase.title}" (${newCase.code}).`,
      'Geral'
    );
    return caseId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 4. Update Case
export async function updateCase(
  caseId: string,
  updates: Partial<CaseData>,
  userProfile: UserProfile,
  previousCase?: CaseData
): Promise<void> {
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}`;

  const contracted = updates.contractedValue !== undefined ? Number(updates.contractedValue) : previousCase?.contractedValue ?? 0;
  const received = updates.receivedValue !== undefined ? Number(updates.receivedValue) : previousCase?.receivedValue ?? 0;
  const pending = Math.max(0, contracted - received);

  const finalUpdates = {
    ...updates,
    contractedValue: contracted,
    receivedValue: received,
    pendingValue: pending,
    updatedByUid: userProfile.uid,
    updatedByName: userProfile.displayName || 'Agente INIP',
    updatedAt: new Date().toISOString(),
  };

  try {
    await updateDoc(getCaseDocRef(caseId), cleanFirestoreData(finalUpdates));
    await logCaseActivity(
      caseId,
      userProfile,
      'CASO_EDITADO',
      `${userProfile.displayName} atualizou as informações do caso.`,
      'Geral'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// 5. Change Status
export async function updateCaseStatus(
  caseId: string,
  newStatus: CaseStatus,
  userProfile: UserProfile,
  prevStatus?: CaseStatus
): Promise<void> {
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}`;
  try {
    await updateDoc(getCaseDocRef(caseId), {
      status: newStatus,
      updatedByUid: userProfile.uid,
      updatedByName: userProfile.displayName,
      updatedAt: new Date().toISOString(),
    });

    const isConcluded = newStatus === 'concluido';
    const action = isConcluded ? 'CASO_CONCLUIDO' : prevStatus === 'concluido' ? 'CASO_REABERTO' : 'STATUS_ALTERADO';
    const desc = isConcluded
      ? `${userProfile.displayName} concluiu oficialmente este caso.`
      : prevStatus === 'concluido'
      ? `${userProfile.displayName} reabriu este caso.`
      : `${userProfile.displayName} alterou o status para "${newStatus}".`;

    await logCaseActivity(caseId, userProfile, action, desc, 'Status', prevStatus, newStatus);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// 6. Delete Case
export async function deleteCase(caseId: string): Promise<void> {
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}`;
  try {
    await deleteDoc(getCaseDocRef(caseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 7. INVOLVED (Envolvidos)
export function subscribeToInvolved(caseId: string, callback: (items: InvolvedEntity[]) => void) {
  const colRef = collection(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'involved');
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/involved`;

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: InvolvedEntity[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<InvolvedEntity, 'id'>) });
      });
      callback(list);
    },
    (error) => {
      console.warn(`Involved subscription warning on ${path}:`, error);
    }
  );
}

export async function addInvolved(
  caseId: string,
  involvedInput: Omit<InvolvedEntity, 'id' | 'createdAt' | 'updatedAt'>,
  userProfile: UserProfile
): Promise<string> {
  const id = `inv-${Date.now()}`;
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/involved/${id}`;
  const now = new Date().toISOString();

  const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'involved', id);
  const data: InvolvedEntity = {
    ...involvedInput,
    id,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(docRef, cleanFirestoreData(data));
    await logCaseActivity(
      caseId,
      userProfile,
      'ENVOLVIDO_ADICIONADO',
      `${userProfile.displayName} adicionou o envolvido "${data.name}" (${data.classification}).`,
      'Envolvidos'
    );
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateInvolved(
  caseId: string,
  involvedId: string,
  updates: Partial<InvolvedEntity>,
  userProfile: UserProfile
): Promise<void> {
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/involved/${involvedId}`;
  const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'involved', involvedId);

  try {
    await updateDoc(docRef, cleanFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
    await logCaseActivity(
      caseId,
      userProfile,
      'ENVOLVIDO_EDITADO',
      `${userProfile.displayName} atualizou dados do envolvido "${updates.name || involvedId}".`,
      'Envolvidos'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteInvolved(
  caseId: string,
  involvedId: string,
  involvedName: string,
  userProfile: UserProfile
): Promise<void> {
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/involved/${involvedId}`;
  const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'involved', involvedId);

  try {
    await deleteDoc(docRef);
    await logCaseActivity(
      caseId,
      userProfile,
      'ENVOLVIDO_REMOVIDO',
      `${userProfile.displayName} removeu o envolvido "${involvedName}".`,
      'Envolvidos'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 8. CONNECTIONS (Mapa de Conexões)
export function subscribeToConnections(caseId: string, callback: (items: CaseConnection[]) => void) {
  const colRef = collection(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'connections');
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/connections`;

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: CaseConnection[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<CaseConnection, 'id'>) });
      });
      callback(list);
    },
    (error) => {
      console.warn(`Connections subscription warning on ${path}:`, error);
    }
  );
}

export async function addConnection(
  caseId: string,
  connectionInput: Omit<CaseConnection, 'id' | 'createdAt'>,
  userProfile: UserProfile
): Promise<string> {
  const id = `conn-${Date.now()}`;
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/connections/${id}`;
  const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'connections', id);

  const data: CaseConnection = {
    ...connectionInput,
    id,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(docRef, cleanFirestoreData(data));
    await logCaseActivity(
      caseId,
      userProfile,
      'CONEXAO_CRIADA',
      `${userProfile.displayName} estabeleceu conexão: "${data.label}" (${data.type}).`,
      'Mapa de Conexões'
    );
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteConnection(
  caseId: string,
  connectionId: string,
  userProfile: UserProfile
): Promise<void> {
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/connections/${connectionId}`;
  const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'connections', connectionId);

  try {
    await deleteDoc(docRef);
    await logCaseActivity(
      caseId,
      userProfile,
      'CONEXAO_REMOVIDA',
      `${userProfile.displayName} removeu vínculo de relacionamento.`,
      'Mapa de Conexões'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 9. DILIGENCES (Diligências)
export function subscribeToDiligences(caseId: string, callback: (items: Diligence[]) => void) {
  const colRef = collection(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'diligences');
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/diligences`;
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Diligence[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Diligence, 'id'>) });
      });
      callback(list);
    },
    (error) => {
      console.warn(`Diligences subscription warning on ${path}:`, error);
    }
  );
}

export async function addDiligence(
  caseId: string,
  diligenceInput: Omit<Diligence, 'id' | 'createdAt' | 'createdByUid' | 'createdByName'>,
  userProfile: UserProfile
): Promise<string> {
  const id = `dil-${Date.now()}`;
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/diligences/${id}`;
  const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'diligences', id);

  const data: Diligence = {
    ...diligenceInput,
    id,
    createdByUid: userProfile.uid,
    createdByName: userProfile.displayName,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(docRef, cleanFirestoreData(data));
    await logCaseActivity(
      caseId,
      userProfile,
      'DILIGENCIA_REGISTRADA',
      `${userProfile.displayName} realizou a Diligência #${data.number}: "${data.type}".`,
      'Diligências'
    );
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDiligence(
  caseId: string,
  diligenceId: string,
  diligenceNum: string,
  userProfile: UserProfile
): Promise<void> {
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/diligences/${diligenceId}`;
  const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'diligences', diligenceId);

  try {
    await deleteDoc(docRef);
    await logCaseActivity(
      caseId,
      userProfile,
      'DILIGENCIA_REMOVIDA',
      `${userProfile.displayName} removeu a diligência #${diligenceNum}.`,
      'Diligências'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 10. FILES & EVIDENCE (Evidências e Arquivos)
export function subscribeToFiles(caseId: string, callback: (items: CaseFileItem[]) => void) {
  const colRef = collection(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'files');
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/files`;
  const q = query(colRef, orderBy('uploadedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: CaseFileItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<CaseFileItem, 'id'>) });
      });
      callback(list);
    },
    (error) => {
      console.warn(`Files subscription warning on ${path}:`, error);
    }
  );
}

export async function addCaseFile(
  caseId: string,
  fileInput: Omit<CaseFileItem, 'id' | 'uploadedAt' | 'uploadedByUid' | 'uploadedByName'>,
  userProfile: UserProfile
): Promise<string> {
  const id = `file-${Date.now()}`;
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/files/${id}`;
  const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'files', id);

  const data: CaseFileItem = {
    ...fileInput,
    id,
    uploadedByUid: userProfile.uid,
    uploadedByName: userProfile.displayName,
    uploadedAt: new Date().toISOString(),
  };

  try {
    await setDoc(docRef, cleanFirestoreData(data));
    await logCaseActivity(
      caseId,
      userProfile,
      'ARQUIVO_ANEXADO',
      `${userProfile.displayName} anexou o arquivo "${data.name}" (${data.category}).`,
      'Evidências'
    );
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCaseFile(
  caseId: string,
  fileId: string,
  fileName: string,
  userProfile: UserProfile
): Promise<void> {
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/files/${fileId}`;
  const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'files', fileId);

  try {
    await deleteDoc(docRef);
    await logCaseActivity(
      caseId,
      userProfile,
      'ARQUIVO_REMOVIDO',
      `${userProfile.displayName} excluiu o arquivo "${fileName}".`,
      'Evidências'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 11. PAYMENTS (Financeiro)
export function subscribeToPayments(caseId: string, callback: (items: PaymentRecord[]) => void) {
  const colRef = collection(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'payments');
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/payments`;
  const q = query(colRef, orderBy('date', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: PaymentRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<PaymentRecord, 'id'>) });
      });
      callback(list);
    },
    (error) => {
      console.warn(`Payments subscription warning on ${path}:`, error);
    }
  );
}

export async function addPayment(
  caseId: string,
  paymentInput: Omit<PaymentRecord, 'id' | 'createdAt' | 'recordedByUid' | 'recordedByName'>,
  userProfile: UserProfile,
  currentCase: CaseData
): Promise<string> {
  const id = `pay-${Date.now()}`;
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/payments/${id}`;
  const docRef = doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'payments', id);

  const data: PaymentRecord = {
    ...paymentInput,
    id,
    recordedByUid: userProfile.uid,
    recordedByName: userProfile.displayName,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(docRef, cleanFirestoreData(data));

    // Recalculate received & pending value on the parent case
    const newReceived = (currentCase.receivedValue || 0) + Number(data.value);
    const newPending = Math.max(0, (currentCase.contractedValue || 0) - newReceived);

    await updateDoc(getCaseDocRef(caseId), cleanFirestoreData({
      receivedValue: newReceived,
      pendingValue: newPending,
      updatedByUid: userProfile.uid,
      updatedByName: userProfile.displayName,
      updatedAt: new Date().toISOString(),
    }));

    await logCaseActivity(
      caseId,
      userProfile,
      'PAGAMENTO_REGISTRADO',
      `${userProfile.displayName} registrou pagamento de R$ ${data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} via ${data.paymentMethod}.`,
      'Financeiro'
    );
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 12. AUDIT TIMELINE (Linha do Tempo / Auditoria)
export function subscribeToActivityLog(caseId: string, callback: (items: ActivityLogItem[]) => void) {
  const colRef = collection(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'activityLog');
  const path = `organizations/${DEFAULT_ORG_ID}/cases/${caseId}/activityLog`;
  const q = query(colRef, orderBy('timestamp', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ActivityLogItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<ActivityLogItem, 'id'>) });
      });
      callback(list);
    },
    (error) => {
      console.warn(`ActivityLog subscription warning on ${path}:`, error);
    }
  );
}

// 13. GLOBAL SEARCH
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

  // Fetch all cases in org
  const casesSnap = await getDocs(getCasesRef());
  const cases: CaseData[] = [];
  casesSnap.forEach((docSnap) => {
    cases.push({ id: docSnap.id, ...(docSnap.data() as Omit<CaseData, 'id'>) });
  });

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

  // Search in subcollections of cases (parallelized batches)
  await Promise.all(
    cases.slice(0, 30).map(async (c) => {
      try {
        const invSnap = await getDocs(collection(db, 'organizations', DEFAULT_ORG_ID, 'cases', c.id, 'involved'));
        invSnap.forEach((ds) => {
          const inv = { id: ds.id, ...(ds.data() as Omit<InvolvedEntity, 'id'>) };
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

        const dilSnap = await getDocs(collection(db, 'organizations', DEFAULT_ORG_ID, 'cases', c.id, 'diligences'));
        dilSnap.forEach((ds) => {
          const dil = { id: ds.id, ...(ds.data() as Omit<Diligence, 'id'>) };
          if (
            dil.number?.toLowerCase().includes(cleanTerm) ||
            dil.type?.toLowerCase().includes(cleanTerm) ||
            dil.description?.toLowerCase().includes(cleanTerm) ||
            dil.location?.toLowerCase().includes(cleanTerm)
          ) {
            matchedDiligences.push({ caseId: c.id, caseCode: c.code, diligence: dil });
          }
        });

        const fileSnap = await getDocs(collection(db, 'organizations', DEFAULT_ORG_ID, 'cases', c.id, 'files'));
        fileSnap.forEach((ds) => {
          const f = { id: ds.id, ...(ds.data() as Omit<CaseFileItem, 'id'>) };
          if (
            f.name?.toLowerCase().includes(cleanTerm) ||
            f.description?.toLowerCase().includes(cleanTerm) ||
            f.category?.toLowerCase().includes(cleanTerm)
          ) {
            matchedFiles.push({ caseId: c.id, caseCode: c.code, file: f });
          }
        });
      } catch {
        // continue
      }
    })
  );

  return {
    cases: matchedCases,
    involved: matchedInvolved,
    diligences: matchedDiligences,
    files: matchedFiles,
  };
}

// 14. SEED DEMO DATA
export async function seedDemoData(userProfile: UserProfile): Promise<string> {
  const caseId = 'case-demo-lelo-001';
  const now = new Date().toISOString();

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
  };

  await setDoc(getCaseDocRef(caseId), demoCase);

  // Add Involved 1: João da Silva
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
  await setDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'involved', inv1.id), inv1);

  // Add Involved 2: Maria Oliveira
  const inv2: InvolvedEntity = {
    id: 'inv-demo-2',
    type: 'pessoa',
    name: 'Maria Oliveira',
    nickname: 'Mari',
    classification: 'testemunha',
    birthDate: '1991-09-20',
    age: 34,
    phone: '+55 11 97654-3210',
    email: 'maria.oliveira@contabilsp.com.br',
    address: 'Rua Bela Cintra, 450, Ap 12 - São Paulo/SP',
    occupation: 'Supervisora Contábil',
    company: 'Assessoria Contábil Prime',
    notes: 'Ex-prestadora de serviços contábeis da Lelo Tecnologia entre 2024 e 2025. Cooperou voluntariamente.',
    additionalInfo: 'Apresentou cópias de e-mails com ordens diretas de emissão de notas com descritivo genérico.',
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'involved', inv2.id), inv2);

  // Add Involved 3: Lelo Tecnologia Ltda.
  const inv3: InvolvedEntity = {
    id: 'inv-demo-3',
    type: 'empresa',
    name: 'Lelo Tecnologia Ltda.',
    fantasyName: 'Lelo Cloud Systems',
    corporateName: 'Lelo Tecnologia e Soluções Digitais Ltda.',
    cnpj: '42.109.876/0001-55',
    classification: 'principal',
    address: 'Av. Engenheiro Luís Carlos Berrini, 105, 14º Andar - São Paulo/SP',
    phone: '+55 11 3200-9900',
    email: 'contato@lelotec.com.br',
    legalReps: 'João da Silva e Roberto Farias',
    notes: 'Pessoa jurídica intermediária utilizada para faturamento de consultorias técnicas não comprovadas.',
    additionalInfo: 'Capital social integralizado de R$ 500.000 com histórico de alteração contratual recente.',
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'involved', inv3.id), inv3);

  // Add Connections
  const conn1: CaseConnection = {
    id: 'conn-demo-1',
    sourceId: inv1.id,
    targetId: inv3.id,
    type: 'socio_de',
    label: 'Sócio Administrador (60% quotas)',
    notes: 'Contrato Social arquivado na JUCESP sob nº 35.221.098.',
    createdAt: now,
  };
  await setDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'connections', conn1.id), conn1);

  const conn2: CaseConnection = {
    id: 'conn-demo-2',
    sourceId: inv2.id,
    targetId: inv3.id,
    type: 'trabalha_com',
    label: 'Supervisão Contábil Terceirizada',
    notes: 'Atuou diretamente na conciliação bancária das contas correntes.',
    createdAt: now,
  };
  await setDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'connections', conn2.id), conn2);

  const conn3: CaseConnection = {
    id: 'conn-demo-3',
    sourceId: inv1.id,
    targetId: inv2.id,
    type: 'contato_de',
    label: 'Comunicação Direta via Aplicativo',
    notes: 'Histórico de trocas de mensagens sobre agendamentos de repasses.',
    createdAt: now,
  };
  await setDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'connections', conn3.id), conn3);

  // Add Diligences
  const dil1: Diligence = {
    id: 'dil-demo-1',
    number: '001',
    date: '2026-08-18',
    time: '14:30',
    type: 'Perícia Forense Computacional',
    location: 'Laboratório Forense Digital INIP',
    participants: 'Perito Dr. Carlos Miranda, Agente Silva',
    description: 'Extração e espelhamento forense bit-a-bit de imagem de disco de servidor em nuvem.',
    objective: 'Identificar logs de acesso e integridade de registros de transferências bancárias.',
    result: 'Localizados 34 registros com timestamps modificados e discrepância de hashes MD5.',
    observations: 'Cadeia de custódia documental preservada com lacre físico nº INIP-9921.',
    createdByUid: userProfile.uid,
    createdByName: userProfile.displayName,
    createdAt: now,
  };
  await setDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'diligences', dil1.id), dil1);

  const dil2: Diligence = {
    id: 'dil-demo-2',
    number: '002',
    date: '2026-08-25',
    time: '10:00',
    type: 'Oitiva de Testemunha',
    location: 'Sede INIP - Sala de Audiências Reservada',
    participants: 'Investigador Líder, Advogado da Testemunha',
    description: 'Colhimento de depoimento formal da testemunha Maria Oliveira.',
    objective: 'Confirmar metodologia de emissão de faturas e identificação de ordens diretas.',
    result: 'Testemunha confirmou que recebia planilhas semanais via e-mail criptografado.',
    observations: 'Termo de depoimento lavrado e assinado digitalmente.',
    createdByUid: userProfile.uid,
    createdByName: userProfile.displayName,
    createdAt: now,
  };
  await setDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'diligences', dil2.id), dil2);

  // Add Sample Files
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
  await setDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'files', file1.id), file1);

  const file2: CaseFileItem = {
    id: 'file-demo-2',
    name: 'Contrato_Social_Lelo_JUCESP.pdf',
    type: 'application/pdf',
    size: 1180000,
    category: 'documento',
    description: 'Contrato social consolidado e 4ª alteração societária.',
    relatedInvolvedId: inv3.id,
    uploadedByUid: userProfile.uid,
    uploadedByName: userProfile.displayName,
    uploadedAt: now,
  };
  await setDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'files', file2.id), file2);

  // Add Payment
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
  await setDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', caseId, 'payments', pay1.id), pay1);

  // Add Activity Logs
  await logCaseActivity(caseId, userProfile, 'CASO_CRIADO', 'Caso cadastrado no sistema INIP.', 'Geral');
  await logCaseActivity(caseId, userProfile, 'ENVOLVIDO_ADICIONADO', 'João da Silva cadastrado como investigado/em análise.', 'Envolvidos');
  await logCaseActivity(caseId, userProfile, 'ENVOLVIDO_ADICIONADO', 'Maria Oliveira cadastrada como testemunha.', 'Envolvidos');
  await logCaseActivity(caseId, userProfile, 'ENVOLVIDO_ADICIONADO', 'Lelo Tecnologia Ltda cadastrada como empresa envolvida.', 'Envolvidos');
  await logCaseActivity(caseId, userProfile, 'CONEXAO_CRIADA', 'Mapeamento de vínculo societário e profissional concluído.', 'Mapa de Conexões');
  await logCaseActivity(caseId, userProfile, 'DILIGENCIA_REGISTRADA', 'Diligência #001 (Perícia Forense Computacional) executada.', 'Diligências');
  await logCaseActivity(caseId, userProfile, 'PAGAMENTO_REGISTRADO', 'Entrada de R$ 20.000,00 computada no financeiro do caso.', 'Financeiro');

  return caseId;
}
