import React, { useState } from 'react';
import { 
  Briefcase, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Users, 
  ShieldAlert,
  ArrowUpRight,
  RotateCcw
} from 'lucide-react';
import { CaseData, InvolvedEntity, Diligence, CaseFileItem } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { updateCaseStatus } from '../../../services/casesService';

interface OverviewTabProps {
  caseData: CaseData;
  involved: InvolvedEntity[];
  diligences: Diligence[];
  files: CaseFileItem[];
  onRefresh: () => void;
  onNavigateTab: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  caseData,
  involved,
  diligences,
  files,
  onRefresh,
  onNavigateTab,
}) => {
  const { userProfile, isAdmin, canConcludeOrReopen, canEditFinances } = useAuth();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'conclude' | 'reopen'>('conclude');
  const [processing, setProcessing] = useState(false);

  const isConcluded = caseData.status === 'concluido';

  const handleStatusToggle = async () => {
    if (!userProfile) return;
    setProcessing(true);
    try {
      const nextStatus = actionType === 'conclude' ? 'concluido' : 'em_andamento';
      await updateCaseStatus(caseData.id, nextStatus, userProfile, caseData.status);
      setConfirmModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to change status:', err);
    } finally {
      setProcessing(false);
    }
  };

  const percentageReceived = caseData.contractedValue > 0 
    ? Math.min(100, Math.round((caseData.receivedValue / caseData.contractedValue) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Notice if concluded */}
      {isConcluded && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">
                Procedimento Investigativo Concluído e Arquivado
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Os autos permanecem íntegros para consulta e auditoria. Edições de registros críticos são restritas a Administradores.
              </p>
            </div>
          </div>
          {canConcludeOrReopen && (
            <button
              onClick={() => {
                setActionType('reopen');
                setConfirmModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-white dark:bg-slate-800 rounded-lg border border-sky-300 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reabrir Caso
            </button>
          )}
        </div>
      )}

      {/* Grid: Synopsis & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Case Synopsis (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Objetivo da Investigação & Perícia
              </span>
              <p className="text-sm text-slate-800 dark:text-slate-200 font-medium mt-1 leading-relaxed">
                {caseData.objective || 'Nenhum objetivo específico registrado.'}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Descrição dos Fatos
              </span>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">
                {caseData.description || 'Sem descrição fática preliminar.'}
              </p>
            </div>

            {caseData.observations && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Observações Gerais & Classificação de Sigilo
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {caseData.observations}
                </p>
              </div>
            )}
          </div>

          {/* Quick Envolvidos Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Envolvidos Recentes no Caso ({involved.length})
                </h4>
              </div>
              <button
                onClick={() => onNavigateTab('involved')}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold"
              >
                Ver todos <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {involved.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Nenhum envolvido cadastrado neste procedimento.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {involved.slice(0, 4).map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => onNavigateTab('involved')}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-sky-500/50 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {inv.name}
                      </span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex-shrink-0">
                        {inv.classification.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {inv.type === 'empresa' ? (inv.cnpj || 'Pessoa Jurídica') : (inv.occupation || 'Pessoa Física')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Case Ledger & Stats */}
        <div className="space-y-6">
          {canEditFinances ? (
            /* Financial Summary Card */
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Financeiro do Procedimento
                  </h4>
                </div>
                <button
                  onClick={() => onNavigateTab('financial')}
                  className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold"
                >
                  Detalhes
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-500">Valor Contratado</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    R$ {caseData.contractedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-500">Valor Recebido ({percentageReceived}%)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    R$ {caseData.receivedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-500">Saldo Pendente</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    R$ {caseData.pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${percentageReceived}%` }}
                  />
                </div>
              </div>

              {caseData.paymentMethod && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Condição: </span>
                  {caseData.paymentMethod}
                </div>
              )}
            </div>
          ) : (
            /* Custody & Integrity Notice for Non-Admin / Operational Users */
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                <ShieldAlert className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Cadeia de Custódia e Integridade
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Neste perfil operacional, você tem autonomia para anexar arquivos, qualificar envolvidos e registrar diligências.
              </p>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5">
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  Política de Imutabilidade e Correções:
                </p>
                <p>
                  Para garantir a idoneidade do inquérito e impedir descarte indevido de provas, os registros não podem ser apagados por usuários operacionais.
                </p>
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  Havendo erro material em lançamento, solicite a intervenção do Administrador para exclusão do registro.
                </p>
              </div>
            </div>
          )}

          {/* Activity Metrics */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Atos & Documentação
            </h4>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div
                onClick={() => onNavigateTab('diligences')}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100 transition"
              >
                <span className="block text-xl font-black text-amber-500">
                  {diligences.length}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Diligências
                </span>
              </div>

              <div
                onClick={() => onNavigateTab('files')}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100 transition"
              >
                <span className="block text-xl font-black text-sky-500">
                  {files.length}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Evidências / Anexos
                </span>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-500 space-y-1">
              <p>Cadastrado por: <strong className="text-slate-700 dark:text-slate-300">{caseData.createdByName}</strong></p>
              <p>Abertura: {new Date(caseData.openingDate).toLocaleDateString('pt-BR')}</p>
              <p>Última alteração: {caseData.updatedByName || 'Sistema'}</p>
            </div>
          </div>

          {/* Case Conclusion Action Button */}
          {!isConcluded && canConcludeOrReopen && (
            <button
              onClick={() => {
                setActionType('conclude');
                setConfirmModalOpen(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-600/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Concluir Procedimento Pericial</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
              <ShieldAlert className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {actionType === 'conclude'
                  ? 'Tem certeza que deseja concluir este caso?'
                  : 'Confirmar reabertura do procedimento pericial?'}
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {actionType === 'conclude'
                ? 'Ao concluir, o caso será arquivado como concluído, todas as peças e evidências permanecem preservadas para auditoria, e novas alterações de dados passam a exigir nível Administrador.'
                : 'O caso retornará para a fila de procedimentos em andamento, permitindo que investigadores registrem novas diligências e atos.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleStatusToggle}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition uppercase tracking-wider shadow-sm ${
                  actionType === 'conclude'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-sky-600 hover:bg-sky-500'
                }`}
              >
                {processing ? 'Processando...' : actionType === 'conclude' ? 'Sim, Concluir Caso' : 'Sim, Reabrir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
