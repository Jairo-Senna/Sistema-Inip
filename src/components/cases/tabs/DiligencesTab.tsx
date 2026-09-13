import React, { useState } from 'react';
import { 
  Compass, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle2, 
  Edit, 
  Trash2, 
  Eye, 
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { Diligence, CaseData } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { addDiligence, deleteDiligence } from '../../../services/casesService';

interface DiligencesTabProps {
  caseData: CaseData;
  diligences: Diligence[];
  onRefresh: () => void;
}

export const DiligencesTab: React.FC<DiligencesTabProps> = ({
  caseData,
  diligences,
  onRefresh,
}) => {
  const { userProfile, canModifyCase, isAdmin } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Diligence | null>(null);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');

  // Form states
  const [number, setNumber] = useState(String(diligences.length + 1).padStart(3, '0'));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().substring(0, 5));
  const [location, setLocation] = useState('');
  const [type, setType] = useState('Campana / Vigilância');
  const [participants, setParticipants] = useState(userProfile?.displayName || '');
  const [description, setDescription] = useState('');
  const [objective, setObjective] = useState('');
  const [result, setResult] = useState('');
  const [observations, setObservations] = useState('');

  const allowedToEdit = canModifyCase(caseData.status);

  const openNewModal = () => {
    setNumber(String(diligences.length + 1).padStart(3, '0'));
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().substring(0, 5));
    setLocation('');
    setType('Campana / Vigilância');
    setParticipants(userProfile?.displayName || '');
    setDescription('');
    setObjective('');
    setResult('');
    setObservations('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setLoading(true);

    try {
      await addDiligence(
        caseData.id,
        {
          number: number.trim() || String(diligences.length + 1).padStart(3, '0'),
          date,
          time,
          location: location.trim(),
          type,
          participants: participants.trim() || (userProfile.displayName || 'Perito'),
          description: description.trim(),
          objective: objective.trim(),
          result: result.trim(),
          observations: observations.trim(),
        },
        userProfile
      );
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Save diligence error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: Diligence) => {
    if (!userProfile) return;
    if (!isAdmin) {
      alert('Apenas o Administrador possui permissão para apagar diligências dos autos. Fale com a Administração para excluir este registro.');
      return;
    }
    if (confirm(`ADMINISTRADOR: Confirmar exclusão da Diligência #${item.number} dos autos do caso?`)) {
      try {
        await deleteDiligence(caseData.id, item.id, item.number, userProfile);
        onRefresh();
      } catch (err) {
        console.error('Delete diligence error:', err);
      }
    }
  };

  const filteredDiligences = diligences.filter((d) => {
    const matchesSearch =
      d.description.toLowerCase().includes(search.toLowerCase()) ||
      d.location.toLowerCase().includes(search.toLowerCase()) ||
      d.result?.toLowerCase().includes(search.toLowerCase()) ||
      d.participants?.toLowerCase().includes(search.toLowerCase());

    const matchesType = filterType === 'todos' || d.type.toLowerCase().includes(filterType.toLowerCase());
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar em diligências, locais, agentes ou resultados..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="todos">Todos os tipos de ato</option>
            <option value="Campana">Campana / Vigilância</option>
            <option value="Oitiva">Entrevista / Oitiva</option>
            <option value="Perícia">Perícia Técnica</option>
            <option value="Evidência">Coleta de Evidências</option>
            <option value="Levantamento">Levantamento de Informações</option>
            <option value="Documental">Análise Documental</option>
          </select>
        </div>

        {allowedToEdit && (
          <button
            onClick={openNewModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition"
            id="btn-new-diligence"
          >
            <Plus className="w-4 h-4" />
            <span>NOVA DILIGÊNCIA</span>
          </button>
        )}
      </div>

      {/* Diligences List */}
      {filteredDiligences.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Compass className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhuma diligência registrada nos autos.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Utilize o botão acima para formalizar campanas, vistorias e análises periciais.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDiligences.map((d) => (
            <div
              key={d.id}
              className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs flex items-center justify-center border border-amber-500/20 font-mono">
                    #{d.number}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {d.type}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(d.date).toLocaleDateString('pt-BR')} {d.time && `às ${d.time}`}
                      </span>
                      {d.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {d.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">
                    Peritos: <strong className="text-slate-700 dark:text-slate-300">{d.participants}</strong>
                  </span>
                </div>
              </div>

              {/* Description & Results */}
              <div className="py-3 text-xs space-y-2">
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {d.description}
                </p>

                {d.result && (
                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300">
                    <strong className="block text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
                      Resultados Obtidos:
                    </strong>
                    <p>{d.result}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDetailItem(d)}
                  className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Ver Termo Completo
                </button>

                {isAdmin && allowedToEdit ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(d)}
                    className="p-1.5 text-rose-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    title="Excluir Diligência (Administrador)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span
                    className="p-1.5 text-slate-300 dark:text-slate-600 cursor-help"
                    title="Exclusão restrita ao Administrador para garantir a integridade dos autos"
                  >
                    <Trash2 className="w-3.5 h-3.5 opacity-30" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: New Diligence */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Formalizar Nova Diligência Pericial
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Número Sequencial *
                  </label>
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data da Realização *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Horário (Início)
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Diligência *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Campana / Vigilância">Campana / Vigilância</option>
                    <option value="Entrevista / Oitiva">Entrevista / Oitiva</option>
                    <option value="Reconhecimento de Local / Alvo">Reconhecimento de Local / Alvo</option>
                    <option value="Perícia Técnica Forense">Perícia Técnica Forense</option>
                    <option value="Coleta de Evidências">Coleta de Evidências</option>
                    <option value="Levantamento de Informações">Levantamento de Informações</option>
                    <option value="Análise Documental">Análise Documental</option>
                    <option value="Outro">Outro Procedimento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Local / Endereço
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Av. Paulista, 1000 - SP"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Integrantes / Peritos Encarregados
                  </label>
                  <input
                    type="text"
                    value={participants}
                    onChange={(e) => setParticipants(e.target.value)}
                    placeholder="Ex: Dr. Roberto Alencar, Agente 04"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Objetivo do Ato
                  </label>
                  <input
                    type="text"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Ex: Mapear rotina e veículos utilizados pelo alvo"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Descrição Minuciosa dos Fatos Observados / Procedimentos Realizados *
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    placeholder="Descreva detalhadamente o roteiro percorrido, horários-chave, pessoas avistadas, movimentação..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Resultados Obtidos / Constatações
                  </label>
                  <textarea
                    rows={2}
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    placeholder="Ex: Confirmado o encontro entre os alvos às 14h20, obtidas fotos das placas..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Observações Adicionais
                  </label>
                  <input
                    type="text"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Ex: Recomenda-se nova campana no período noturno..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm"
                >
                  {loading ? 'Salvando...' : 'Formalizar Diligência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Termo de Diligência #{detailItem.number}
                </h3>
                <p className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
                  {detailItem.type}
                </p>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                <p><strong>Data:</strong> {new Date(detailItem.date).toLocaleDateString('pt-BR')}</p>
                <p><strong>Horário:</strong> {detailItem.time || 'Não especificado'}</p>
                <p className="col-span-2"><strong>Local:</strong> {detailItem.location || 'Local reservado'}</p>
                <p className="col-span-2"><strong>Equipe:</strong> {detailItem.participants}</p>
              </div>

              {detailItem.objective && (
                <div>
                  <strong className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                    Objetivo
                  </strong>
                  <p className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    {detailItem.objective}
                  </p>
                </div>
              )}

              <div>
                <strong className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                  Relatório Descritivo
                </strong>
                <p className="whitespace-pre-wrap leading-relaxed p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  {detailItem.description}
                </p>
              </div>

              {detailItem.result && (
                <div>
                  <strong className="block text-[11px] uppercase tracking-wider text-emerald-600 mb-1">
                    Resultados Obtidos
                  </strong>
                  <p className="whitespace-pre-wrap leading-relaxed p-3 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 rounded-lg border border-emerald-200/50 dark:border-emerald-900/30">
                    {detailItem.result}
                  </p>
                </div>
              )}

              {detailItem.observations && (
                <div>
                  <strong className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                    Observações Adicionais
                  </strong>
                  <p className="text-slate-500 italic">
                    {detailItem.observations}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 transition"
              >
                Fechar Termo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
