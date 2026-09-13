import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, DEFAULT_ORG_ID } from './firebase';
import { ToolLink } from '../types';

export const TOOLS_STORAGE_KEY = 'inip_tools_directory';
export const TOOLS_DOC_ID = 'index_tools';

// Document reference under cases to guarantee Firestore permissions compatibility
const getToolsDocRef = () => doc(db, 'organizations', DEFAULT_ORG_ID, 'cases', TOOLS_DOC_ID);

/**
 * Normaliza e sanitiza a URL inserida pelo usuário, garantindo protocolo https:// ou http://
 */
export function normalizeUrl(rawUrl: string): string {
  let trimmed = rawUrl.trim();
  if (!trimmed) return '';

  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Lê ferramentas armazenadas em cache local
 */
export function getLocalTools(): ToolLink[] {
  try {
    const raw = localStorage.getItem(TOOLS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Erro ao carregar ferramentas locais:', err);
    return [];
  }
}

/**
 * Salva ferramentas em cache local
 */
export function saveLocalTools(tools: ToolLink[]): void {
  try {
    localStorage.setItem(TOOLS_STORAGE_KEY, JSON.stringify(tools));
  } catch (err) {
    console.warn('Erro ao salvar ferramentas locais:', err);
  }
}

/**
 * Consulta todas as ferramentas/links no Firestore com fallback resiliente
 */
export async function getAllTools(): Promise<ToolLink[]> {
  try {
    const snap = await getDoc(getToolsDocRef());
    if (snap.exists() && Array.isArray(snap.data()?.tools)) {
      const remoteTools = snap.data()?.tools as ToolLink[];
      saveLocalTools(remoteTools);
      return remoteTools;
    }
    return getLocalTools();
  } catch (err) {
    console.warn('Aviso ao consultar ferramentas remotas, usando cache local:', err);
    return getLocalTools();
  }
}

/**
 * Escuta atualizações em tempo real da lista de ferramentas
 */
export function subscribeToTools(onUpdate: (tools: ToolLink[]) => void): () => void {
  // Retorno imediato do cache local para resposta instantânea
  onUpdate(getLocalTools());

  const unsubscribe = onSnapshot(
    getToolsDocRef(),
    (docSnap) => {
      if (docSnap.exists() && Array.isArray(docSnap.data()?.tools)) {
        const remoteTools = docSnap.data()?.tools as ToolLink[];
        saveLocalTools(remoteTools);
        onUpdate(remoteTools);
      } else {
        onUpdate(getLocalTools());
      }
    },
    (err) => {
      console.warn('Aviso no monitoramento de ferramentas:', err);
      onUpdate(getLocalTools());
    }
  );

  return unsubscribe;
}

/**
 * Adiciona ou edita um link de ferramenta
 */
export async function saveToolLink(
  data: {
    name: string;
    url: string;
    category?: string;
    description?: string;
    createdByUid: string;
    createdByName: string;
  },
  existingId?: string
): Promise<ToolLink> {
  const currentTools = await getAllTools();
  const validUrl = normalizeUrl(data.url);
  const now = new Date().toISOString();

  let savedItem: ToolLink;

  if (existingId) {
    const index = currentTools.findIndex((t) => t.id === existingId);
    if (index >= 0) {
      savedItem = {
        ...currentTools[index],
        name: data.name.trim(),
        url: validUrl,
        category: data.category?.trim() || 'Geral',
        description: data.description?.trim() || '',
        updatedAt: now,
      };
      currentTools[index] = savedItem;
    } else {
      savedItem = {
        id: existingId,
        name: data.name.trim(),
        url: validUrl,
        category: data.category?.trim() || 'Geral',
        description: data.description?.trim() || '',
        createdByUid: data.createdByUid,
        createdByName: data.createdByName,
        createdAt: now,
      };
      currentTools.push(savedItem);
    }
  } else {
    savedItem = {
      id: `tool-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: data.name.trim(),
      url: validUrl,
      category: data.category?.trim() || 'Geral',
      description: data.description?.trim() || '',
      createdByUid: data.createdByUid,
      createdByName: data.createdByName,
      createdAt: now,
    };
    currentTools.unshift(savedItem);
  }

  // Ordena por data mais recente ou nome
  saveLocalTools(currentTools);

  try {
    await setDoc(
      getToolsDocRef(),
      {
        tools: currentTools,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Erro ao salvar ferramentas no Firestore:', err);
  }

  return savedItem;
}

/**
 * Remove um link de ferramenta
 */
export async function deleteToolLink(toolId: string): Promise<void> {
  const currentTools = await getAllTools();
  const filtered = currentTools.filter((t) => t.id !== toolId);

  saveLocalTools(filtered);

  try {
    await setDoc(
      getToolsDocRef(),
      {
        tools: filtered,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Erro ao excluir ferramenta no Firestore:', err);
  }
}
