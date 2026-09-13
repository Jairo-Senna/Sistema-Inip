import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Briefcase, 
  Users, 
  Network, 
  Compass, 
  FileText, 
  Clock, 
  DollarSign, 
  Printer, 
  Edit, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Lock,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { 
  CaseData, 
  InvolvedEntity, 
  CaseConnection, 
  Diligence, 
  CaseFileItem, 
  CaseStatus, 
  CasePriority 
} from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  getCaseById, 
  deleteCase,
  subscribeToCaseDetail
} from '../services/casesService';

import { OverviewTab } from '../components/cases/tabs/OverviewTab';
import { InvolvedTab } from '../components/cases/tabs/InvolvedTab';
import { ConnectionsGraphTab } from '../components/cases/tabs/ConnectionsGraphTab';
import { DiligencesTab } from '../components/cases/tabs/DiligencesTab';
import { FilesTab } from '../components/cases/tabs/FilesTab';
import { TimelineTab } from '../components/cases/tabs/TimelineTab';
import { FinancialTab } from '../components/cases/tabs/FinancialTab';
import { ReportTab } from '../components/cases/tabs/ReportTab';
import { EditCaseModal } from '../components/cases/EditCaseModal';

interface CaseDetailPageProps {
  caseId: string;
  initialTab?: string;
  onBackToDashboard: () => void;
  customLogoUrl?: string;
}

export const CaseDetailPage: React.FC<CaseDetailPageProps> = ({
  caseId,
  initialTab = 'overview',
  onBackToDashboard,
  customLogoUrl,
}) => {
  const { userProfile, canModifyCase, canEditFinances, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [involved, setInvolved] = useState<InvolvedEntity[]>([]);
  const [connections, setConnections] = useState<CaseConnection[]>([]);
  const [diligences, setDiligences] = useState<Diligence[]>([]);
  const [files, setFiles] = useState<CaseFileItem[]>([]);

  const [editModalOpen, setEditModalOpen] = useState(false);

  const handleDeleteCase = async () => {
    if (!isAdmin) {
      alert('Apenas o Administrador possui permissão para apagar um caso.');
      return;
    }
    if (!caseData) return;
    const confirmName = prompt(
      `ATENÇÃO ADMINISTRADOR: Esta ação apagará definitivamente o caso "${caseData.title}" e todos os seus autos.\n\nPara confirmar, digite o código do caso (${caseData.code}):`
    );
    if (confirmName === caseData.code) {
      try {
        await deleteCase(caseData.id);
        onBackToDashboard();
      } catch (err: any) {
        alert('Falha ao excluir caso: ' + (err?.message || 'Erro desconhecido'));
      }
    }
  };

  const refreshData = async () => {
    try {
      const c = await getCaseById(caseId);
      if (c) {
        setCaseData(c);
        setInvolved(c.involved || []);
        setConnections(c.connections || []);
        setDiligences(c.diligences || []);
        setFiles(c.files || []);
      }
    } catch (e) {
      console.warn('Refresh error:', e);
    }
  };

  useEffect(() => {
    setLoading(true);
    setErrorMsg(null);

    const unsub = subscribeToCaseDetail(
      caseId,
      (c, inv, conn, dil, fil) => {
        setCaseData(c);
        setInvolved(inv);
        setConnections(conn);
        setDiligences(dil);
        setFiles(fil);
        setLoading(false);
      },
      (err) => {
        console.warn('Real-time subscription notice:', err);
      }
    );

    // Initial explicit fetch to ensure immediate display
    getCaseById(caseId)
      .then((c) => {
        if (c) {
          setCaseData(c);
          setInvolved(c.involved || []);
          setConnections(c.connections || []);
          setDiligences(c.diligences || []);
          setFiles(c.files || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Initial load error:', err);
      });

    return () => {
      unsub();
    };
  }, [caseId]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500 mb-3" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Carregando autos do procedimento pericial...
        </p>
      </div>
    );
  }

  if (errorMsg || !caseData) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          {errorMsg || 'Caso não encontrado'}
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          O registro solicitado pode ter sido arquivado ou o identificador é inválido.
        </p>
        <button
          onClick={onBackToDashboard}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg"
        >
          Retornar ao Painel Geral
        </button>
      </div>
    );
  }

  const getStatusBadge = (st: CaseStatus) => {
    switch (st) {
      case 'em_andamento':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 uppercase tracking-wide">
            Em Andamento
          </span>
        );
      case 'aguardando_info':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wide">
            Aguardando Informação
          </span>
        );
      case 'em_analise':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wide">
            Em Análise Pericial
          </span>
        );
      case 'suspenso':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 uppercase tracking-wide">
            Suspenso
          </span>
        );
      case 'concluido':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wide flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-500 uppercase tracking-wide">
            {st}
          </span>
        );
    }
  };

  const getPriorityBadge = (pr: CasePriority) => {
    switch (pr) {
      case 'urgente':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500 text-white uppercase tracking-wider">
            URGENTE
          </span>
        );
      case 'alta':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 uppercase">
            Alta
          </span>
        );
      case 'media':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 uppercase">
            Média
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
            Baixa
          </span>
        );
    }
  };

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Briefcase, count: null },
    { id: 'involved', label: 'Envolvidos', icon: Users, count: involved.length },
    { id: 'graph', label: 'Mapa de Conexões', icon: Network, count: connections.length },
    { id: 'diligences', label: 'Diligências', icon: Compass, count: diligences.length },
    { id: 'files', label: 'Evidências & Anexos', icon: FileText, count: files.length },
    { id: 'timeline', label: 'Linha do Tempo', icon: Clock, count: caseData.auditTrail?.length || null },
    ...(canEditFinances ? [{ id: 'financial', label: 'Financeiro', icon: DollarSign, count: null }] : []),
    { id: 'report', label: 'Laudo / Relatório', icon: Printer, count: null },
  ];

  const allowedToEdit = canModifyCase(caseData.status);

  return (
    <div className="space-y-6 pb-16">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 print:hidden">
        <button
          onClick={onBackToDashboard}
          className="hover:text-sky-600 dark:hover:text-sky-400 transition flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Casos de Investigação</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{caseData.code}</span>
      </div>

      {/* Case Master Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                {caseData.code}
              </span>
              {getStatusBadge(caseData.status)}
              {getPriorityBadge(caseData.priority)}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {caseData.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
              <p>
                Cliente: <strong className="text-slate-700 dark:text-slate-200">{caseData.clientName}</strong>
              </p>
              <span>•</span>
              <p>
                Autuação: <strong>{new Date(caseData.openingDate).toLocaleDateString('pt-BR')}</strong>
              </p>
              <span>•</span>
              <p>
                Perito Relator: <strong>{caseData.createdByName}</strong>
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5">
            {allowedToEdit && (
              <button
                onClick={() => setEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                id="btn-edit-case-header"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Editar Caso</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={handleDeleteCase}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/40 rounded-lg transition"
                title="Exclusão de caso restrita ao Administrador"
                id="btn-delete-case-header"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Excluir Caso</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('report')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-slate-800 hover:bg-slate-700 rounded-lg shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Gerar Laudo</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  id={`tab-${tab.id}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== null && tab.count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab
            caseData={caseData}
            involved={involved}
            diligences={diligences}
            files={files}
            onRefresh={refreshData}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'involved' && (
          <InvolvedTab
            caseData={caseData}
            involved={involved}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'graph' && (
          <ConnectionsGraphTab
            caseData={caseData}
            involved={involved}
            connections={connections}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'diligences' && (
          <DiligencesTab
            caseData={caseData}
            diligences={diligences}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'files' && (
          <FilesTab
            caseData={caseData}
            files={files}
            involved={involved}
            diligences={diligences}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineTab caseData={caseData} />
        )}

        {activeTab === 'financial' && (
          <FinancialTab
            caseData={caseData}
            files={files}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'report' && (
          <ReportTab
            caseData={caseData}
            involved={involved}
            diligences={diligences}
            files={files}
            customLogoUrl={customLogoUrl}
          />
        )}
      </div>

      {/* Edit Case Modal */}
      {editModalOpen && (
        <EditCaseModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          caseData={caseData}
          onUpdated={refreshData}
        />
      )}
    </div>
  );
};
