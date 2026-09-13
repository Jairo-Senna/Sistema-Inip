import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  ExternalLink, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  Bookmark, 
  AlertCircle,
  X,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { ToolLink } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
  subscribeToTools, 
  saveToolLink, 
  deleteToolLink, 
  normalizeUrl 
} from '../../services/toolsService';

const SUGGESTED_CATEGORIES = [
  'Geral',
  'Processos Judiciais',
  'Pessoas & Empresas',
  'Veículos & Bens',
  'Diários & Jurisprudência',
  'Segurança & Inteligência',
];

interface ToolsManagementViewProps {
  onBackToDashboard?: () => void;
}

export const ToolsManagementView: React.FC<ToolsManagementViewProps> = ({
  onBackToDashboard,
}) => {
  const { userProfile, isAdmin } = useAuth();
  const [tools, setTools] = useState<ToolLink[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolLink | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState('Geral');
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToTools((list) => {
      setTools(list);
    });

    return () => unsubscribe();
  }, []);

  const openCreateModal = () => {
    setEditingTool(null);
    setFormName('');
    setFormUrl('');
    setFormCategory('Geral');
    setFormCustomCategory('');
    setFormDescription('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tool: ToolLink) => {
    setEditingTool(tool);
    setFormName(tool.name);
    setFormUrl(tool.url);
    if (SUGGESTED_CATEGORIES.includes(tool.category || 'Geral')) {
      setFormCategory(tool.category || 'Geral');
      setFormCustomCategory('');
    } else {
      setFormCategory('Outro');
      setFormCustomCategory(tool.category || '');
    }
    setFormDescription(tool.description || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCopyLink = (tool: ToolLink) => {
    navigator.clipboard.writeText(tool.url);
    setCopiedId(tool.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = formName.trim();
    const rawUrl = formUrl.trim();

    if (!name) {
      setFormError('Informe o nome da plataforma.');
      return;
    }

    if (!rawUrl) {
      setFormError('Informe o link da plataforma.');
      return;
    }

    const finalCategory = formCategory === 'Outro' 
      ? (formCustomCategory.trim() || 'Geral') 
      : formCategory;

    setSaving(true);
    try {
      await saveToolLink(
        {
          name,
          url: rawUrl,
          category: finalCategory,
          description: formDescription.trim(),
          createdByUid: userProfile?.uid || 'anon',
          createdByName: userProfile?.displayName || 'Agente INIP',
        },
        editingTool?.id
      );

      setIsModalOpen(false);
      setEditingTool(null);
    } catch (err: any) {
      setFormError('Erro ao salvar ferramenta: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (toolId: string) => {
    try {
      await deleteToolLink(toolId);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Erro ao excluir ferramenta:', err);
    }
  };

  // Filtered tools
  const filteredTools = tools.filter((tool) => {
    const matchesSearch = 
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.url.toLowerCase().includes(search.toLowerCase()) ||
      (tool.description && tool.description.toLowerCase().includes(search.toLowerCase())) ||
      (tool.category && tool.category.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = 
      selectedCategory === 'todas' || 
      (tool.category || 'Geral').toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Extract unique categories for filter
  const existingCategories: string[] = Array.from(
    new Set(tools.map((t) => t.category || 'Geral'))
  ).filter((c): c is string => Boolean(c));

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-sky-500/10 to-transparent pointer-events-none" />
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-inner flex-shrink-0">
            <Globe className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded border border-sky-400/20">
                Repositório Operacional
              </span>
              <span className="text-xs text-slate-400">
                • {tools.length} {tools.length === 1 ? 'Plataforma Cadastrada' : 'Plataformas Cadastradas'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              Ferramentas & Plataformas de Pesquisa
            </h1>
            <p className="text-xs text-slate-300 max-w-xl mt-0.5 leading-relaxed">
              Diretório de links para plataformas de consulta processual, pesquisa de pessoas, dados cadastrais e inteligência investigativa.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="z-10 w-full md:w-auto flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-sky-600/20 transition group"
            id="btn-add-tool-link"
          >
            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Adicionar Link</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome da plataforma, link ou finalidade..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 self-end sm:self-center">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Clique no link para abrir a plataforma diretamente em nova aba.</span>
          </div>
        </div>

        {/* Categories Chips */}
        {existingCategories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Categoria:
            </span>
            <button
              onClick={() => setSelectedCategory('todas')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                selectedCategory === 'todas'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todas ({tools.length})
            </button>
            {existingCategories.map((cat) => {
              const count = tools.filter((t) => (t.category || 'Geral') === cat).length;
              const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                    isSelected
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tools Listing */}
      {filteredTools.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 max-w-xl mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 dark:bg-sky-950/50 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
            <Globe className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {search || selectedCategory !== 'todas'
                ? 'Nenhuma plataforma encontrada com os filtros atuais'
                : 'Nenhuma plataforma ou ferramenta cadastrada'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {search || selectedCategory !== 'todas'
                ? 'Tente ajustar sua busca ou selecionar outra categoria.'
                : 'Cadastre os links das plataformas que a equipe utiliza no dia a dia (ex: Jusbrasil, Escavador, Tribunais de Justiça, etc). Os investigadores poderão clicar nos links e abrir as ferramentas rapidamente.'}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Primeira Plataforma</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => {
            const isDeleting = deleteConfirmId === tool.id;
            const isCopied = copiedId === tool.id;
            const validHref = normalizeUrl(tool.url);

            return (
              <div
                key={tool.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 dark:hover:border-sky-500/40 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-2.5">
                  {/* Card Header: Category badge & Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <Bookmark className="w-2.5 h-2.5 text-sky-500" />
                      {tool.category || 'Geral'}
                    </span>

                    {/* Edit / Delete Buttons */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(tool)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Copiar link"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(tool)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Editar plataforma"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(isDeleting ? null : tool.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Excluir plataforma"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Platform Name in prominent display */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      <span className="truncate">{tool.name}</span>
                    </h3>

                    {/* The URL right below the name as requested by the user */}
                    <div className="mt-1">
                      <a
                        href={validHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 font-mono break-all line-clamp-1"
                        title={`Abrir link: ${validHref}`}
                      >
                        <span className="truncate">{tool.url}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  </div>

                  {/* Optional Description */}
                  {tool.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed pt-1">
                      {tool.description}
                    </p>
                  )}

                  {/* Delete confirmation dialog */}
                  {isDeleting && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/60 text-xs space-y-2 mt-2 animate-in fade-in">
                      <p className="text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Confirmar exclusão deste link?
                      </p>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tool.id)}
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer action */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span className="truncate">
                    {tool.createdByName ? `Por ${tool.createdByName}` : 'Cadastrado'}
                  </span>

                  <a
                    href={validHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 rounded-lg font-bold text-xs transition border border-sky-200/60 dark:border-sky-800/60"
                  >
                    <span>Acessar Plataforma</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal to Add / Edit Tool Link */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingTool ? 'Editar Plataforma' : 'Adicionar Nova Plataforma'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Cadastre o nome e o link de acesso da plataforma
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner */}
            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Plataforma <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Jusbrasil, Escavador, TJSP, Receita Federal..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Link / Endereço da Plataforma (URL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="Ex: https://www.jusbrasil.com.br ou jusbrasil.com.br"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Você pode colar o endereço completo ou simplificado; o sistema formata o link automaticamente.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Categoria da Ferramenta
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                >
                  {SUGGESTED_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Outro">Outra (personalizada)</option>
                </select>

                {formCategory === 'Outro' && (
                  <input
                    type="text"
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    placeholder="Digite a categoria personalizada..."
                    className="mt-2 w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição / Finalidade (opcional)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Consulta de processos judiciais, andamentos e jurisprudência..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow transition"
                >
                  {saving ? 'Salvando...' : editingTool ? 'Atualizar Plataforma' : 'Salvar Plataforma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
