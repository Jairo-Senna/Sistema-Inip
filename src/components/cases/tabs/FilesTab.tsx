import React, { useState } from 'react';
import { 
  FileText, 
  UploadCloud, 
  Search, 
  Download, 
  Trash2, 
  Eye, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Paperclip, 
  DollarSign
} from 'lucide-react';
import { CaseFileItem, FileCategory, CaseData, InvolvedEntity, Diligence } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { addCaseFile, deleteCaseFile } from '../../../services/casesService';

interface FilesTabProps {
  caseData: CaseData;
  files: CaseFileItem[];
  involved: InvolvedEntity[];
  diligences: Diligence[];
  onRefresh: () => void;
}

export const FilesTab: React.FC<FilesTabProps> = ({
  caseData,
  files,
  involved,
  diligences,
  onRefresh,
}) => {
  const { userProfile, canModifyCase, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('todos');

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<CaseFileItem | null>(null);
  const [loading, setLoading] = useState(false);

  // Upload Form states
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [category, setCategory] = useState<FileCategory>('documento');
  const [description, setDescription] = useState('');
  const [relatedInvolvedId, setRelatedInvolvedId] = useState('');
  const [relatedDiligenceId, setRelatedDiligenceId] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const allowedToEdit = canModifyCase(caseData.status);

  const handleFileSelect = (file: File) => {
    setSelectedFileObj(file);
    setFileName(file.name);
    // Guess category from extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext || '')) {
      setCategory('foto');
    } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext || '')) {
      setCategory('audio');
    } else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) {
      setCategory('video');
    } else if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'].includes(ext || '')) {
      setCategory('documento');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSaveUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setLoading(true);
    try {
      let fileDataString = '';

      if (selectedFileObj) {
        // Read as Data URL
        fileDataString = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve((ev.target?.result as string) || '');
          reader.readAsDataURL(selectedFileObj);
        });
      } else {
        fileDataString = 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800';
      }

      await addCaseFile(
        caseData.id,
        {
          name: fileName.trim() || selectedFileObj?.name || 'Arquivo_Evidencia',
          category,
          description: description.trim(),
          fileData: fileDataString,
          size: selectedFileObj ? selectedFileObj.size : 204800,
          type: selectedFileObj ? selectedFileObj.type : 'application/octet-stream',
          relatedInvolvedId: relatedInvolvedId || undefined,
          relatedDiligenceId: relatedDiligenceId || undefined,
        },
        userProfile
      );

      setUploadModalOpen(false);
      setSelectedFileObj(null);
      setFileName('');
      setDescription('');
      onRefresh();
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileItem: CaseFileItem) => {
    if (!userProfile) return;
    if (!isAdmin) {
      alert('Apenas o Administrador possui permissão para apagar evidências dos autos. Para correções, solicite ao Administrador.');
      return;
    }
    if (confirm(`ADMINISTRADOR: Confirmar remoção definitiva da evidência "${fileItem.name}"?`)) {
      try {
        await deleteCaseFile(caseData.id, fileItem.id, fileItem.name, userProfile);
        onRefresh();
      } catch (err) {
        console.error('Delete file error:', err);
      }
    }
  };

  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.description?.toLowerCase().includes(search.toLowerCase());

    const matchesCat = filterCat === 'todos' || f.category === filterCat;
    return matchesSearch && matchesCat;
  });

  const getCategoryIcon = (cat: FileCategory) => {
    switch (cat) {
      case 'foto':
      case 'print':
        return <ImageIcon className="w-4 h-4 text-sky-500" />;
      case 'audio':
        return <Music className="w-4 h-4 text-purple-500" />;
      case 'video':
        return <Video className="w-4 h-4 text-rose-500" />;
      case 'documento':
      case 'relatorio':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'financeiro':
        return <DollarSign className="w-4 h-4 text-amber-500" />;
      default:
        return <Paperclip className="w-4 h-4 text-slate-400" />;
    }
  };

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
              placeholder="Buscar evidência por nome ou descrição..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="todos">Todas as categorias</option>
            <option value="foto">Fotos / Imagens</option>
            <option value="documento">Documentos em PDF/Office</option>
            <option value="audio">Gravações de Áudio</option>
            <option value="video">Vídeos</option>
            <option value="print">Capturas de Tela (Prints)</option>
            <option value="relatorio">Relatórios Parciais</option>
            <option value="financeiro">Comprovantes Financeiros</option>
            <option value="outro">Outros</option>
          </select>
        </div>

        {allowedToEdit && (
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition"
            id="btn-new-file"
          >
            <UploadCloud className="w-4 h-4" />
            <span>+ ANEXAR EVIDÊNCIA</span>
          </button>
        )}
      </div>

      {/* Files Grid */}
      {filteredFiles.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <UploadCloud className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhuma evidência ou arquivo anexado aos autos.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Clique em &quot;+ ANEXAR EVIDÊNCIA&quot; para registrar fotos, áudios e laudos periciais.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => {
            const isImage = file.category === 'foto' || (file.type && file.type.startsWith('image/'));
            const fileUrl = file.fileData || '';
            return (
              <div
                key={file.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between"
              >
                {/* Thumbnail Preview if Image */}
                {isImage && fileUrl ? (
                  <div
                    onClick={() => setPreviewFile(file)}
                    className="h-36 bg-slate-950 flex items-center justify-center overflow-hidden cursor-pointer group relative"
                  >
                    <img
                      src={fileUrl}
                      alt={file.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1">
                      <Eye className="w-4 h-4" /> Visualizar
                    </div>
                  </div>
                ) : (
                  <div className="h-24 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 shadow-xs border border-slate-200/80 dark:border-slate-700/80">
                      {getCategoryIcon(file.category)}
                    </div>
                  </div>
                )}

                {/* File Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate" title={file.name}>
                        {file.name}
                      </h4>
                      <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {file.category}
                      </span>
                    </div>

                    {file.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {file.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 space-y-0.5">
                    <p>Enviado por: {file.uploadedByName}</p>
                    <p>{new Date(file.uploadedAt).toLocaleDateString('pt-BR')} • {((file.size || 0) / 1024).toFixed(1)} KB</p>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  {fileUrl ? (
                    <a
                      href={fileUrl}
                      download={file.name}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400">Custodiado</span>
                  )}

                  {isAdmin && allowedToEdit ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(file)}
                      className="p-1 text-rose-400 hover:text-rose-600 rounded transition"
                      title="Excluir Evidência (Administrador)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span 
                      className="p-1 text-slate-300 dark:text-slate-600 cursor-help" 
                      title="Exclusão restrita ao Administrador para garantir integridade e custódia da prova"
                    >
                      <Trash2 className="w-3.5 h-3.5 opacity-30" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
          onClick={() => setUploadModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Anexar Documento ou Evidência Pericial
              </h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUpload} className="p-6 space-y-4">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`p-6 border-2 border-dashed rounded-xl text-center transition cursor-pointer ${
                  isDragOver
                    ? 'border-sky-500 bg-sky-500/10'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                onClick={() => document.getElementById('file-input-hidden')?.click()}
              >
                <input
                  id="file-input-hidden"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
                <UploadCloud className="w-8 h-8 mx-auto text-sky-500 mb-2" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {selectedFileObj ? selectedFileObj.name : 'Arraste o arquivo aqui ou clique para selecionar'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Suporta Fotos, PDFs, Áudios, Vídeos, Planilhas e Documentos
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome / Título da Evidência *
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  required
                  placeholder="Ex: Foto_Placa_Veiculo_Alvo.jpg"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Categoria da Evidência *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FileCategory)}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="foto">Foto / Registro Fotográfico</option>
                  <option value="documento">Documento PDF / Contrato</option>
                  <option value="audio">Áudio / Oitiva Gravada</option>
                  <option value="video">Vídeo de Monitoramento</option>
                  <option value="print">Captura de Tela (Print)</option>
                  <option value="relatorio">Relatório Pericial</option>
                  <option value="financeiro">Comprovante de Pagamento</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vínculo com Envolvido
                  </label>
                  <select
                    value={relatedInvolvedId}
                    onChange={(e) => setRelatedInvolvedId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="">Nenhum</option>
                    {involved.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vínculo com Diligência
                  </label>
                  <select
                    value={relatedDiligenceId}
                    onChange={(e) => setRelatedDiligenceId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="">Nenhuma</option>
                    {diligences.map((dil) => (
                      <option key={dil.id} value={dil.id}>
                        #{dil.number} - {dil.type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição / Cadeia de Custódia
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informações sobre o contexto da obtenção, integridade do arquivo..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm"
                >
                  {loading ? 'Processando envio...' : 'Salvar Arquivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="max-w-3xl w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                {previewFile.name}
              </h4>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] flex items-center justify-center overflow-hidden bg-slate-950 rounded-lg">
              <img
                src={previewFile.fileData}
                alt={previewFile.name}
                referrerPolicy="no-referrer"
                className="max-h-[65vh] object-contain"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Categoria: {previewFile.category}</span>
              {previewFile.fileData && (
                <a
                  href={previewFile.fileData}
                  download={previewFile.name}
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded"
                >
                  Download
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
