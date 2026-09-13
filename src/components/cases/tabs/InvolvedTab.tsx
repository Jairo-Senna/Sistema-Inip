import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  User, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Car, 
  Globe, 
  HelpCircle, 
  Edit, 
  Trash2, 
  AlertCircle,
  Eye,
  FileCheck,
  ShieldAlert
} from 'lucide-react';
import { InvolvedEntity, InvolvedType, InvolvedClassification, CaseData } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { addInvolved, updateInvolved, deleteInvolved } from '../../../services/casesService';

interface InvolvedTabProps {
  caseData: CaseData;
  involved: InvolvedEntity[];
  onRefresh: () => void;
}

export const InvolvedTab: React.FC<InvolvedTabProps> = ({
  caseData,
  involved,
  onRefresh,
}) => {
  const { userProfile, canModifyCase, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterClass, setFilterClass] = useState<string>('todos');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InvolvedEntity | null>(null);
  const [detailItem, setDetailItem] = useState<InvolvedEntity | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [type, setType] = useState<InvolvedType>('pessoa');
  const [classification, setClassification] = useState<InvolvedClassification>('em_analise');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  const [company, setCompany] = useState('');
  const [corporateName, setCorporateName] = useState('');
  const [fantasyName, setFantasyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [legalReps, setLegalReps] = useState('');
  const [notes, setNotes] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const calculateAge = (bdate?: string): number | undefined => {
    if (!bdate) return undefined;
    const diff = Date.now() - new Date(bdate).getTime();
    const ageDt = new Date(diff);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  const openNewModal = () => {
    setEditingItem(null);
    setType('pessoa');
    setClassification('em_analise');
    setName('');
    setNickname('');
    setBirthDate('');
    setPhone('');
    setEmail('');
    setAddress('');
    setOccupation('');
    setCompany('');
    setCorporateName('');
    setFantasyName('');
    setCnpj('');
    setLegalReps('');
    setNotes('');
    setAdditionalInfo('');
    setModalOpen(true);
  };

  const openEditModal = (item: InvolvedEntity) => {
    setEditingItem(item);
    setType(item.type);
    setClassification(item.classification);
    setName(item.name);
    setNickname(item.nickname || '');
    setBirthDate(item.birthDate || '');
    setPhone(item.phone || '');
    setEmail(item.email || '');
    setAddress(item.address || '');
    setOccupation(item.occupation || '');
    setCompany(item.company || '');
    setCorporateName(item.corporateName || '');
    setFantasyName(item.fantasyName || '');
    setCnpj(item.cnpj || '');
    setLegalReps(item.legalReps || '');
    setNotes(item.notes || '');
    setAdditionalInfo(item.additionalInfo || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setLoading(true);

    const calculatedAge = birthDate ? calculateAge(birthDate) : undefined;

    try {
      if (editingItem) {
        await updateInvolved(
          caseData.id,
          editingItem.id,
          {
            type,
            classification,
            name: name.trim(),
            nickname: nickname.trim(),
            birthDate,
            ...(calculatedAge !== undefined ? { age: calculatedAge } : {}),
            phone: phone.trim(),
            email: email.trim(),
            address: address.trim(),
            occupation: occupation.trim(),
            company: company.trim(),
            corporateName: corporateName.trim(),
            fantasyName: fantasyName.trim(),
            cnpj: cnpj.trim(),
            legalReps: legalReps.trim(),
            notes: notes.trim(),
            additionalInfo: additionalInfo.trim(),
          },
          userProfile
        );
      } else {
        await addInvolved(
          caseData.id,
          {
            type,
            classification,
            name: name.trim(),
            nickname: nickname.trim(),
            birthDate,
            ...(calculatedAge !== undefined ? { age: calculatedAge } : {}),
            phone: phone.trim(),
            email: email.trim(),
            address: address.trim(),
            occupation: occupation.trim(),
            company: company.trim(),
            corporateName: corporateName.trim(),
            fantasyName: fantasyName.trim(),
            cnpj: cnpj.trim(),
            legalReps: legalReps.trim(),
            notes: notes.trim(),
            additionalInfo: additionalInfo.trim(),
          },
          userProfile
        );
      }
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Save involved error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: InvolvedEntity) => {
    if (!userProfile) return;
    if (!isAdmin) {
      alert('Apenas o Administrador possui permissão para apagar envolvidos dos autos. Para exclusão de registros, comunique a Administração.');
      return;
    }
    if (confirm(`ADMINISTRADOR: Confirmar exclusão do envolvido "${item.name}" dos autos do caso?`)) {
      try {
        await deleteInvolved(caseData.id, item.id, item.name, userProfile);
        onRefresh();
      } catch (err) {
        console.error('Delete involved error:', err);
      }
    }
  };

  // Filtered List
  const filteredInvolved = involved.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.nickname?.toLowerCase().includes(search.toLowerCase()) ||
      item.cnpj?.includes(search) ||
      item.phone?.includes(search) ||
      item.email?.toLowerCase().includes(search.toLowerCase());

    const matchesType = filterType === 'todos' || item.type === filterType;
    const matchesClass = filterClass === 'todos' || item.classification === filterClass;

    return matchesSearch && matchesType && matchesClass;
  });

  const getClassificationBadge = (cls: InvolvedClassification) => {
    switch (cls) {
      case 'principal':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase tracking-wide">
            Principal Envolvido
          </span>
        );
      case 'possivel':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wide">
            Possível Envolvido
          </span>
        );
      case 'em_analise':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 uppercase tracking-wide">
            Em Análise
          </span>
        );
      case 'vitima':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wide">
            Vítima
          </span>
        );
      case 'testemunha':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
            Testemunha
          </span>
        );
      case 'informante':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-wide">
            Informante
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 uppercase tracking-wide">
            Outro
          </span>
        );
    }
  };

  const getTypeIcon = (t: InvolvedType) => {
    switch (t) {
      case 'pessoa':
        return <User className="w-4 h-4 text-sky-500" />;
      case 'empresa':
      case 'instituicao':
        return <Building2 className="w-4 h-4 text-indigo-500" />;
      case 'veiculo':
        return <Car className="w-4 h-4 text-amber-500" />;
      case 'perfil_digital':
        return <Globe className="w-4 h-4 text-emerald-500" />;
      case 'local':
        return <MapPin className="w-4 h-4 text-rose-500" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const allowedToEdit = canModifyCase(caseData.status);

  return (
    <div className="space-y-6">
      {/* Legal Hypothesis Disclaimer (Mandated) */}
      <div className="p-3.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Aviso de Sigilo Pericial:</strong> As classificações e apontamentos aqui lançados configuram hipóteses de trabalho estritamente internas e reservadas da investigação, não constituindo prejulgamento nem imputação formal de culpa.
        </p>
      </div>

      {/* Control Bar: Search, Filters and New Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 flex flex-wrap items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar envolvido por nome, apelido, CNPJ, telefone..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="todos">Todos os tipos</option>
            <option value="pessoa">Pessoa Física</option>
            <option value="empresa">Empresa</option>
            <option value="instituicao">Instituição</option>
            <option value="contato">Contato</option>
            <option value="local">Local</option>
            <option value="veiculo">Veículo</option>
            <option value="perfil_digital">Perfil Digital</option>
            <option value="outro">Outro</option>
          </select>

          {/* Classification Filter */}
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="todos">Todas classificações</option>
            <option value="principal">Principal Envolvido</option>
            <option value="possivel">Possível Envolvido</option>
            <option value="em_analise">Em Análise</option>
            <option value="vitima">Vítima</option>
            <option value="testemunha">Testemunha</option>
            <option value="informante">Informante</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        {allowedToEdit && (
          <button
            onClick={openNewModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition"
            id="btn-new-involved"
          >
            <Plus className="w-4 h-4" />
            <span>NOVO ENVOLVIDO</span>
          </button>
        )}
      </div>

      {/* Cards Grid */}
      {filteredInvolved.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhum envolvido localizado com os filtros atuais.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre pessoas, empresas, veículos ou perfis de interesse pericial.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvolved.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs flex flex-col justify-between transition group"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                        {item.name}
                      </h4>
                      {item.nickname && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Apelido: &quot;{item.nickname}&quot;
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  {getClassificationBadge(item.classification)}
                </div>

                {/* Details snippet */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  {item.type === 'empresa' && item.cnpj && (
                    <p className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="font-mono">CNPJ: {item.cnpj}</span>
                    </p>
                  )}
                  {item.occupation && (
                    <p className="truncate">
                      Profissão: <strong>{item.occupation}</strong>
                    </p>
                  )}
                  {item.company && (
                    <p className="truncate">
                      Vínculo: {item.company}
                    </p>
                  )}
                  {item.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{item.phone}</span>
                    </p>
                  )}
                  {item.email && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{item.email}</span>
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-[11px] text-slate-500 italic mt-2 line-clamp-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                      &quot;{item.notes}&quot;
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDetailItem(item)}
                  className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Dossiê Completo
                </button>

                {allowedToEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Editar"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-rose-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        title="Excluir Envolvido (Administrador)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span
                        className="p-1.5 text-slate-300 dark:text-slate-600 cursor-help"
                        title="Exclusão restrita ao Administrador para resguardo da integridade pericial"
                      >
                        <Trash2 className="w-3.5 h-3.5 opacity-30" />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create or Edit Involved */}
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
                {editingItem ? 'Editar Registro de Envolvido' : 'Adicionar Novo Envolvido aos Autos'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Envolvido *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as InvolvedType)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="pessoa">Pessoa Física</option>
                    <option value="empresa">Empresa / Pessoa Jurídica</option>
                    <option value="instituicao">Instituição Pública / Órgão</option>
                    <option value="contato">Contato de Interesse</option>
                    <option value="local">Imóvel / Local</option>
                    <option value="veiculo">Veículo</option>
                    <option value="perfil_digital">Perfil / Conta Digital</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Classificação Investigativa *
                  </label>
                  <select
                    value={classification}
                    onChange={(e) => setClassification(e.target.value as InvolvedClassification)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="principal">Principal Envolvido</option>
                    <option value="possivel">Possível Envolvido</option>
                    <option value="em_analise">Em Análise Preliminar</option>
                    <option value="vitima">Vítima</option>
                    <option value="testemunha">Testemunha</option>
                    <option value="informante">Informante / Colaborador</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo / Razão Social *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Ex: João da Silva ou Alpha Tecnologia Ltda"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                {type === 'pessoa' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nome Social / Apelido
                      </label>
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Ex: Betinho"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Data de Nascimento {birthDate && `(${calculateAge(birthDate)} anos)`}
                      </label>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Profissão / Ocupação
                      </label>
                      <input
                        type="text"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        placeholder="Ex: Diretor Financeiro"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Empresa Onde Trabalha
                      </label>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Ex: Grupo Soluções"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                  </>
                )}

                {(type === 'empresa' || type === 'instituicao') && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nome Fantasia
                      </label>
                      <input
                        type="text"
                        value={fantasyName}
                        onChange={(e) => setFantasyName(e.target.value)}
                        placeholder="Ex: Alfa Cloud"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        CNPJ
                      </label>
                      <input
                        type="text"
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        placeholder="00.000.000/0001-00"
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Sócios / Representantes Legais
                      </label>
                      <input
                        type="text"
                        value={legalReps}
                        onChange={(e) => setLegalReps(e.target.value)}
                        placeholder="Ex: Carlos Drummond e Fernando Mendes"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Telefone de Contato
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+55 11 99999-9999"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@dominio.com"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Logradouro, número, bairro, cidade/UF"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Observações & Apontamentos Investigativos
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Hipóteses e dados preliminares..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Informações Complementares / Fontes
                  </label>
                  <textarea
                    rows={2}
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="Dados de cruzamento, redes sociais, bens identificados..."
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
                  {loading ? 'Gravando...' : 'Salvar Envolvido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dossiê Detail Modal */}
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
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                    {detailItem.name}
                  </h3>
                  {getClassificationBadge(detailItem.classification)}
                </div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">
                  Tipo: {detailItem.type} {detailItem.nickname && `• Apelido: "${detailItem.nickname}"`}
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
              {detailItem.cnpj && (
                <p><strong>CNPJ:</strong> <span className="font-mono">{detailItem.cnpj}</span></p>
              )}
              {detailItem.birthDate && (
                <p><strong>Data de Nascimento:</strong> {new Date(detailItem.birthDate).toLocaleDateString('pt-BR')} ({detailItem.age} anos)</p>
              )}
              {detailItem.occupation && (
                <p><strong>Profissão:</strong> {detailItem.occupation}</p>
              )}
              {detailItem.company && (
                <p><strong>Empresa Vinculada:</strong> {detailItem.company}</p>
              )}
              {detailItem.legalReps && (
                <p><strong>Sócios / Representantes:</strong> {detailItem.legalReps}</p>
              )}
              {detailItem.phone && (
                <p><strong>Telefone:</strong> {detailItem.phone}</p>
              )}
              {detailItem.email && (
                <p><strong>E-mail:</strong> {detailItem.email}</p>
              )}
              {detailItem.address && (
                <p><strong>Endereço:</strong> {detailItem.address}</p>
              )}
              {detailItem.notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <strong className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Apontamentos Investigativos
                  </strong>
                  <p className="whitespace-pre-wrap">{detailItem.notes}</p>
                </div>
              )}
              {detailItem.additionalInfo && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <strong className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Informações Complementares & Rastreamento
                  </strong>
                  <p className="whitespace-pre-wrap">{detailItem.additionalInfo}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 transition"
              >
                Fechar Dossiê
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
