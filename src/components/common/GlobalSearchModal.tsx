import React, { useState, useEffect } from 'react';
import { Search, X, Briefcase, Users, FileText, Compass, ExternalLink, Loader2 } from 'lucide-react';
import { executeGlobalSearch } from '../../services/casesService';
import { CaseData, InvolvedEntity, Diligence, CaseFileItem } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCase: (caseId: string, targetTab?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectCase,
}) => {
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    cases: CaseData[];
    involved: { caseId: string; caseCode: string; entity: InvolvedEntity }[];
    diligences: { caseId: string; caseCode: string; diligence: Diligence }[];
    files: { caseId: string; caseCode: string; file: CaseFileItem }[];
  }>({
    cases: [],
    involved: [],
    diligences: [],
    files: [],
  });

  useEffect(() => {
    if (!isOpen) {
      setQueryText('');
      setResults({ cases: [], involved: [], diligences: [], files: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!queryText.trim() || queryText.trim().length < 2) {
      setResults({ cases: [], involved: [], diligences: [], files: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await executeGlobalSearch(queryText);
        setResults(res);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [queryText]);

  if (!isOpen) return null;

  const totalResults =
    results.cases.length +
    results.involved.length +
    results.diligences.length +
    results.files.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      id="modal-global-search"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Pesquisar por caso, código, pessoa, empresa, telefone, diligência..."
            autoFocus
            className="flex-1 bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none text-sm sm:text-base"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-sky-500" />}
          {queryText && (
            <button
              onClick={() => setQueryText('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
          >
            ESC
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {queryText.trim().length < 2 && (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-sky-500" />
              Digite pelo menos 2 caracteres para iniciar a varredura nos autos.
            </div>
          )}

          {queryText.trim().length >= 2 && !loading && totalResults === 0 && (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
              Nenhum registro localizado correspondente a &quot;{queryText}&quot;.
            </div>
          )}

          {/* Cases */}
          {results.cases.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Briefcase className="w-3.5 h-3.5 text-sky-500" />
                Casos ({results.cases.length})
              </div>
              <div className="space-y-1.5">
                {results.cases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCase(c.id, 'overview');
                      onClose();
                    }}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          {c.title}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-mono bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                          {c.code}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Cliente: {c.clientName} • Status: {c.status.replace('_', ' ')}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Involved */}
          {results.involved.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                Envolvidos ({results.involved.length})
              </div>
              <div className="space-y-1.5">
                {results.involved.map((item) => (
                  <button
                    key={item.entity.id}
                    onClick={() => {
                      onSelectCase(item.caseId, 'involved');
                      onClose();
                    }}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          {item.entity.name}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 capitalize">
                          {item.entity.classification.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Caso: {item.caseCode} • {item.entity.phone || item.entity.email || item.entity.occupation || 'Registro geral'}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Diligences */}
          {results.diligences.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Compass className="w-3.5 h-3.5 text-amber-500" />
                Diligências ({results.diligences.length})
              </div>
              <div className="space-y-1.5">
                {results.diligences.map((item) => (
                  <button
                    key={item.diligence.id}
                    onClick={() => {
                      onSelectCase(item.caseId, 'diligences');
                      onClose();
                    }}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          Diligência #{item.diligence.number}: {item.diligence.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Caso: {item.caseCode} • Data: {item.diligence.date} • Local: {item.diligence.location}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {results.files.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                Evidências & Anexos ({results.files.length})
              </div>
              <div className="space-y-1.5">
                {results.files.map((item) => (
                  <button
                    key={item.file.id}
                    onClick={() => {
                      onSelectCase(item.caseId, 'files');
                      onClose();
                    }}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          {item.file.name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          {item.file.category}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Caso: {item.caseCode} • {(item.file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
