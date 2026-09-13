import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Users, 
  Compass, 
  DollarSign, 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  Eye, 
  Edit, 
  ArrowRight,
  Database,
  Loader2,
  Calendar,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { CaseData, CaseStatus, CasePriority } from '../types';
import { useAuth } from '../context/AuthContext';
import { getAllCases, subscribeToCases } from '../services/casesService';
import { getEffectiveLogoUrl, DEFAULT_INIP_LOGO } from '../utils/logo';

interface DashboardPageProps {
  onSelectCase: (caseId: string, initialTab?: string) => void;
  onOpenNewCase: () => void;
  customLogoUrl?: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onSelectCase,
  onOpenNewCase,
  customLogoUrl,
}) => {
  const { userProfile, isAdmin, canEditFinances } = useAuth();
  const [cases, setCases] = useState<CaseData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [priorityFilter, setPriorityFilter] = useState<string>('todos');
  const [viewLayout, setViewLayout] = useState<'table' | 'cards'>('table');
  const [logoSrc, setLogoSrc] = useState<string>(() => getEffectiveLogoUrl(customLogoUrl));
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoSrc(getEffectiveLogoUrl(customLogoUrl));
    setLogoFailed(false);
  }, [customLogoUrl]);

  const handleHeroLogoError = () => {
    if (logoSrc !== DEFAULT_INIP_LOGO) {
      setLogoSrc(DEFAULT_INIP_LOGO);
    } else {
      setLogoFailed(true);
    }
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToCases((list) => {
      setCases(list);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Metrics calculation
  const totalCases = cases.length;
  const inProgressCases = cases.filter((c) => c.status === 'em_andamento').length;
  const concludedCases = cases.filter((c) => c.status === 'concluido').length;
  const waitingOrAnalysisCases = cases.filter(
    (c) => c.status === 'aguardando_info' || c.status === 'em_analise'
  ).length;

  const totalContracted = cases.reduce((sum, c) => sum + (c.contractedValue || 0), 0);
  const totalReceived = cases.reduce((sum, c) => sum + (c.receivedValue || 0), 0);
  const totalPending = cases.reduce((sum, c) => sum + (c.pendingValue || 0), 0);

  // Filtered cases
  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      c.createdByName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;
    const matchesPriority = priorityFilter === 'todos' || c.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadge = (st: CaseStatus) => {
    switch (st) {
      case 'em_andamento':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 uppercase tracking-wide">
            Em Andamento
          </span>
        );
      case 'aguardando_info':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wide">
            Aguardando Info
          </span>
        );
      case 'em_analise':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wide">
            Em Análise
          </span>
        );
      case 'suspenso':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-500 uppercase tracking-wide">
            Suspenso
          </span>
        );
      case 'concluido':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wide flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Concluído
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
            {st}
          </span>
        );
    }
  };

  const getPriorityBadge = (pr: CasePriority) => {
    switch (pr) {
      case 'urgente':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white uppercase tracking-wider">
            Urgente
          </span>
        );
      case 'alta':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 uppercase">
            Alta
          </span>
        );
      case 'media':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 uppercase">
            Média
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
            Baixa
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Institutional Mission & Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        <div className="flex items-center gap-4.5 z-10 w-full sm:w-auto">
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex items-center justify-center p-1.5 bg-slate-950/80 rounded-2xl border border-amber-500/30 shadow-lg shadow-black/40 overflow-hidden">
            {!logoFailed ? (
              <img 
                src={logoSrc} 
                alt="INIP – Instituto de Investigação e Perícia" 
                className="w-full h-full object-contain filter drop-shadow-md"
                referrerPolicy="no-referrer"
                onError={handleHeroLogoError}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 via-yellow-700 to-amber-900 p-2">
                <svg viewBox="0 0 48 48" fill="none" className="w-full h-full text-amber-200">
                  <path d="M24 4L40 10V22C40 33 33 41 24 44C15 41 8 33 8 22V10L24 4Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="24" cy="23" r="9" stroke="#fef08a" strokeWidth="2" strokeDasharray="4 2" />
                  <circle cx="24" cy="23" r="4.5" fill="#ca8a04" />
                  <line x1="24" y1="11" x2="24" y2="35" stroke="#fef9c3" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="12" y1="23" x2="36" y2="23" stroke="#fef9c3" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="24" cy="23" r="1.5" fill="#ffffff" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                Sistema Oficial INIP
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                • Divisão Integrada de Inteligência Forense
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              Instituto de Investigação e Perícia
            </h1>
            <p className="text-xs text-slate-300 max-w-xl mt-0.5 leading-relaxed">
              Painel operacional de gestão de casos, análise pericial forense, cadeia de custódia e inteligência relacional.
            </p>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 z-10 border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
          {isAdmin && (
            <button
              onClick={onOpenNewCase}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition transform active:scale-95 uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Caso</span>
            </button>
          )}
          <span className="text-[10px] text-slate-400 font-mono">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Strategic Operational Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Cases */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total de Casos
            </span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            {totalCases}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Base institucional unificada
          </span>
        </div>

        {/* Em Andamento */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              Em Andamento
            </span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 mt-2">
            {inProgressCases}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Diligências ativas
          </span>
        </div>

        {/* Aguardando / Em Análise */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Aguardando / Análise
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {waitingOrAnalysisCases}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Laudos em elaboração
          </span>
        </div>

        {/* Concluídos */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Concluídos
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {concludedCases}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Peças arquivadas
          </span>
        </div>
      </div>

      {/* Financial Overview Banner (Admin or Authorized) */}
      {canEditFinances && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 rounded-2xl p-5 sm:p-6 text-white border border-sky-950/60 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                  Consolidado Financeiro Institucional
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cálculo em tempo real de honorários periciais contratados e pendentes
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-left">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Total Faturado
                </span>
                <span className="text-lg font-bold text-white">
                  R$ {totalContracted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-700 hidden sm:block" />
              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider block">
                  Total Recebido
                </span>
                <span className="text-lg font-bold text-emerald-400">
                  R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-700 hidden sm:block" />
              <div>
                <span className="text-[10px] text-amber-400 uppercase tracking-wider block">
                  Total a Receber
                </span>
                <span className="text-lg font-bold text-amber-400">
                  R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Primary Action, Search and Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por caso, código, cliente ou responsável..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 shadow-xs">
              <button
                onClick={() => setViewLayout('table')}
                className={`p-1.5 rounded transition ${
                  viewLayout === 'table'
                    ? 'bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Visualização em Lista"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewLayout('cards')}
                className={`p-1.5 rounded transition ${
                  viewLayout === 'cards'
                    ? 'bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* New Case Button (Exclusively Admin) */}
            {isAdmin && (
              <button
                onClick={onOpenNewCase}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm hover:shadow transition"
                id="btn-main-new-case"
              >
                <Plus className="w-4 h-4" />
                <span>NOVO CASO</span>
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter Tags */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filtros:
          </span>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="todos">Todos os status</option>
            <option value="em_andamento">Em andamento</option>
            <option value="aguardando_info">Aguardando informação</option>
            <option value="em_analise">Em análise pericial</option>
            <option value="suspenso">Suspenso</option>
            <option value="concluido">Concluído</option>
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="todos">Todas prioridades</option>
            <option value="urgente">Urgente</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>

          {(statusFilter !== 'todos' || priorityFilter !== 'todos' || search) && (
            <button
              onClick={() => {
                setStatusFilter('todos');
                setPriorityFilter('todos');
                setSearch('');
              }}
              className="text-[11px] text-rose-500 hover:underline px-1.5"
            >
              Limpar filtros
            </button>
          )}

          <div className="ml-auto text-[11px] text-slate-400">
            Exibindo {filteredCases.length} de {cases.length} procedimentos
          </div>
        </div>
      </div>

      {/* Main Cases Display */}
      {loading ? (
        <div className="py-24 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500 mx-auto mb-2" />
          <p className="text-xs">Consultando banco de dados unificado do INIP...</p>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <Briefcase className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Nenhum procedimento investigativo localizado
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não foram encontrados casos correspondentes aos filtros selecionados ou ainda não há casos cadastrados.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            {isAdmin ? (
              <button
                onClick={onOpenNewCase}
                className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition"
              >
                + Cadastrar Primeiro Caso
              </button>
            ) : (
              <span className="text-xs text-slate-400 italic">
                Abertura e autuação de novos casos restrita ao Administrador do INIP.
              </span>
            )}
          </div>
        </div>
      ) : viewLayout === 'table' ? (
        /* Table Layout */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-semibold">Código</th>
                  <th className="py-3 px-4 font-semibold">Caso / Denominação</th>
                  <th className="py-3 px-4 font-semibold">Cliente</th>
                  <th className="py-3 px-4 font-semibold">Abertura</th>
                  <th className="py-3 px-4 font-semibold">Responsável</th>
                  <th className="py-3 px-4 font-semibold">Prioridade</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCases.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectCase(item.id)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                      {item.code}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 dark:text-white block group-hover:text-sky-600 transition">
                        {item.title}
                      </span>
                      {item.description && (
                        <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {item.description}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {item.clientName}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(item.openingDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {item.createdByName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getPriorityBadge(item.priority)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCase(item.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded transition"
                        title="Abrir Caso"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectCase(item.id)}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    {item.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {getPriorityBadge(item.priority)}
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-sky-600 transition leading-snug mt-1">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                  {item.description || item.objective || 'Procedimento investigativo registrado.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <div>
                  <span className="text-[10px] uppercase tracking-wider block text-slate-400">Cliente</span>
                  <strong className="text-slate-800 dark:text-slate-200 truncate block max-w-[140px]">
                    {item.clientName}
                  </strong>
                </div>

                <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-bold group-hover:translate-x-0.5 transition">
                  <span>Acessar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
