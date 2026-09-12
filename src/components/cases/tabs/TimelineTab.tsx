import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  History, 
  UserCheck, 
  Briefcase, 
  Users, 
  Compass, 
  FileText, 
  Network, 
  CheckCircle2, 
  Search,
  Filter
} from 'lucide-react';
import { CaseData, ActivityLogItem } from '../../../types';
import { subscribeToActivityLog } from '../../../services/casesService';

interface TimelineTabProps {
  caseData: CaseData;
}

export const TimelineTab: React.FC<TimelineTabProps> = ({ caseData }) => {
  const [events, setEvents] = useState<ActivityLogItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');

  useEffect(() => {
    const unsub = subscribeToActivityLog(caseData.id, (list) => {
      setEvents(list);
    });
    return () => unsub();
  }, [caseData.id]);

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.description.toLowerCase().includes(search.toLowerCase()) ||
      ev.userName.toLowerCase().includes(search.toLowerCase()) ||
      ev.actionType.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filterType === 'todos' || ev.actionType.toLowerCase().includes(filterType.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CRIADO') || act.includes('CASO')) {
      return (
        <span className="p-2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <Briefcase className="w-4 h-4" />
        </span>
      );
    }
    if (act.includes('ENVOLVIDO')) {
      return (
        <span className="p-2 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
          <Users className="w-4 h-4" />
        </span>
      );
    }
    if (act.includes('DILIGENCIA')) {
      return (
        <span className="p-2 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <Compass className="w-4 h-4" />
        </span>
      );
    }
    if (act.includes('ARQUIVO') || act.includes('FILE')) {
      return (
        <span className="p-2 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20">
          <FileText className="w-4 h-4" />
        </span>
      );
    }
    if (act.includes('CONEXAO')) {
      return (
        <span className="p-2 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
          <Network className="w-4 h-4" />
        </span>
      );
    }
    if (act.includes('CONCLUIDO')) {
      return (
        <span className="p-2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4" />
        </span>
      );
    }
    return (
      <span className="p-2 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
        <Clock className="w-4 h-4" />
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar histórico por perito, ação ou termo..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="todos">Todos os eventos de auditoria</option>
            <option value="CASO">Criação / Edição do Caso</option>
            <option value="ENVOLVIDO">Envolvidos</option>
            <option value="DILIGENCIA">Diligências</option>
            <option value="ARQUIVO">Evidências / Arquivos</option>
            <option value="CONEXAO">Conexões / Vínculos</option>
            <option value="STATUS">Mudanças de Status</option>
            <option value="PAGAMENTO">Financeiro</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          {filteredEvents.length} registro(s) auditado(s)
        </div>
      </div>

      {/* Timeline view */}
      {filteredEvents.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <History className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhum evento registrado nesta filtragem.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {filteredEvents.map((ev, index) => {
            const dateObj = new Date(ev.timestamp);
            return (
              <div key={ev.id || index} className="relative group">
                {/* Node icon */}
                <div className="absolute -left-6 sm:-left-8 top-1 flex items-center justify-center bg-white dark:bg-slate-950">
                  {getActionBadge(ev.actionType)}
                </div>

                {/* Event Card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs group-hover:border-slate-300 dark:group-hover:border-slate-700 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                      {ev.actionType.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {dateObj.toLocaleDateString('pt-BR')} às {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {ev.description}
                  </p>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
                      <UserCheck className="w-3.5 h-3.5 text-sky-500" />
                      {ev.userName} {ev.userEmail && `(${ev.userEmail})`}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {ev.id.substring(0, 12)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
