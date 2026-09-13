export type UserRole = 'admin' | 'investigator' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  badgeNumber?: string;
  department?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type CasePriority = 'baixa' | 'media' | 'alta' | 'urgente';

export type CaseStatus = 
  | 'em_andamento'
  | 'aguardando_info'
  | 'em_analise'
  | 'suspenso'
  | 'concluido';

export interface CaseData {
  id: string;
  title: string;
  code: string;
  clientName: string;
  openingDate: string;
  priority: CasePriority;
  status: CaseStatus;
  description: string;
  objective: string;
  observations?: string;
  contractedValue: number;
  receivedValue: number;
  pendingValue: number;
  paymentMethod?: string;
  financialNotes?: string;
  createdByUid: string;
  createdByName: string;
  updatedByUid: string;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
  involved?: InvolvedEntity[];
  connections?: CaseConnection[];
  diligences?: Diligence[];
  files?: CaseFileItem[];
  payments?: PaymentRecord[];
  activityLog?: ActivityLogItem[];
  auditTrail?: any[];
}

export type InvolvedType = 
  | 'pessoa'
  | 'empresa'
  | 'instituicao'
  | 'contato'
  | 'local'
  | 'veiculo'
  | 'perfil_digital'
  | 'outro';

export type InvolvedClassification = 
  | 'principal'
  | 'possivel'
  | 'em_analise'
  | 'vitima'
  | 'testemunha'
  | 'informante'
  | 'outro';

export interface InvolvedEntity {
  id: string;
  type: InvolvedType;
  name: string;
  nickname?: string;
  classification: InvolvedClassification;
  birthDate?: string;
  age?: number;
  phone?: string;
  email?: string;
  address?: string;
  occupation?: string;
  company?: string;
  corporateName?: string;
  fantasyName?: string;
  cnpj?: string;
  legalReps?: string;
  notes?: string;
  additionalInfo?: string;
  photos?: string[];
  documents?: string[];
  createdAt: string;
  updatedAt?: string;
}

export type ConnectionType = 
  | 'trabalha_com'
  | 'socio_de'
  | 'familiar_de'
  | 'contato_de'
  | 'associado_a'
  | 'relacionado_ao_caso'
  | 'vinculo_com'
  | 'telefone_relacionado'
  | 'endereco_relacionado'
  | 'veiculo_relacionado'
  | 'perfil_relacionado'
  | 'personalizado';

export interface CaseConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: ConnectionType;
  label: string;
  notes?: string;
  createdAt: string;
}

export interface Diligence {
  id: string;
  number: string;
  date: string;
  time: string;
  type: string;
  location: string;
  participants: string;
  description: string;
  objective: string;
  result: string;
  observations?: string;
  attachments?: string[];
  createdByUid: string;
  createdByName?: string;
  createdAt: string;
}

export type FileCategory = 
  | 'documento'
  | 'foto'
  | 'print'
  | 'audio'
  | 'video'
  | 'relatorio'
  | 'financeiro'
  | 'outro';

export interface CaseFileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  fileData?: string; // base64 or URL
  category: FileCategory;
  description?: string;
  relatedInvolvedId?: string;
  relatedDiligenceId?: string;
  uploadedByUid: string;
  uploadedByName: string;
  uploadedAt: string;
}

export interface PaymentRecord {
  id: string;
  date: string;
  value: number;
  paymentMethod: string;
  observation?: string;
  recordedByUid: string;
  recordedByName: string;
  createdAt: string;
}

export interface ActivityLogItem {
  id: string;
  userUid: string;
  userName: string;
  userEmail?: string;
  actionType: string;
  description: string;
  affectedRecord?: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface GlobalSearchResult {
  type: 'caso' | 'envolvido' | 'diligencia' | 'arquivo';
  id: string;
  caseId: string;
  title: string;
  subtitle: string;
  categoryBadge?: string;
}

export interface ToolLink {
  id: string;
  name: string;
  url: string;
  category?: string;
  description?: string;
  createdByUid: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
}
