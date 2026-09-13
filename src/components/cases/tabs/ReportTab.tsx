import React, { useState } from 'react';
import { 
  Printer, 
  FileText, 
  ShieldCheck, 
  CheckCircle, 
  Calendar, 
  User, 
  Building2,
  Lock,
  Camera
} from 'lucide-react';
import { CaseData, InvolvedEntity, Diligence, CaseFileItem } from '../../../types';
import { InipLogo } from '../../common/InipLogo';

interface ReportTabProps {
  caseData: CaseData;
  involved: InvolvedEntity[];
  diligences: Diligence[];
  files: CaseFileItem[];
  customLogoUrl?: string;
}

export const ReportTab: React.FC<ReportTabProps> = ({
  caseData,
  involved,
  diligences,
  files,
  customLogoUrl,
}) => {
  const [reportConclusion, setReportConclusion] = useState(
    'Com base no conjunto probatório coligido, nos atos de campo e na análise técnica pericial realizada pela equipe do INIP, conclui-se pela fidedignidade dos fatos narrados nos presentes autos, instruindo-se este laudo para os devidos fins de direito e instrução procedimental.'
  );
  const [responsiblePerito, setResponsiblePerito] = useState(caseData.createdByName || 'Dr. Perito Oficial');
  const [crmvBadge, setCrmvBadge] = useState('INIP-PER-0941');

  const handlePrint = () => {
    window.print();
  };

  const photoFiles = files.filter(
    (f) =>
      f.category === 'foto' ||
      f.category === 'print' ||
      (f.fileData && f.fileData.startsWith('data:image'))
  );

  return (
    <div className="space-y-6">
      {/* Top Action Bar (strictly hidden on print) */}
      <div className="print:hidden bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-500" />
            Laudo Técnico / Dossiê Pericial Oficial
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Documento consolidado pronto para impressão física e salvamento em formato PDF oficial
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition cursor-pointer"
          id="btn-print-report"
        >
          <Printer className="w-4 h-4" />
          <span>Gerar / Imprimir PDF Oficial</span>
        </button>
      </div>

      {/* Printable Paper Canvas */}
      <div className="print-paper bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-4xl mx-auto print:p-0 print:border-0 print:shadow-none print:m-0 print:w-full print:max-w-none print:rounded-none">
        {/* Formal Institutional Header */}
        <div className="border-b-2 border-slate-900 pb-6 mb-6 report-section print-avoid-break">
          <div className="flex items-center justify-between">
            <InipLogo size="lg" customLogoUrl={customLogoUrl} />
            <div className="text-right">
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 rounded border border-slate-300 inline-block text-slate-900">
                PROCESSO: {caseData.code}
              </span>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">
                Classificação: Reservado / Sigiloso
              </p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <h1 className="text-lg font-black tracking-wider uppercase text-slate-900">
              RELATÓRIO DE INVESTIGAÇÃO & PERÍCIA TÉCNICA
            </h1>
            <p className="text-xs font-medium text-slate-600">
              Instituto de Investigação e Perícia — Divisão de Assuntos Especiais
            </p>
          </div>
        </div>

        {/* Section 1: Procedimento */}
        <div className="mb-6 space-y-3 report-section print-avoid-break">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
            1. QUALIFICAÇÃO DO PROCEDIMENTO
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-800">
            <p><strong>Nome do Caso:</strong> {caseData.title}</p>
            <p><strong>Código Interno:</strong> {caseData.code}</p>
            <p><strong>Cliente / Solicitante:</strong> {caseData.clientName}</p>
            <p><strong>Data de Autuação:</strong> {new Date(caseData.openingDate).toLocaleDateString('pt-BR')}</p>
            <p><strong>Status Operacional:</strong> {caseData.status.toUpperCase()}</p>
            <p><strong>Grau de Prioridade:</strong> {caseData.priority.toUpperCase()}</p>
          </div>
          {caseData.objective && (
            <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200 mt-2 text-slate-800">
              <strong>Objetivo da Perícia:</strong> {caseData.objective}
            </div>
          )}
          {caseData.description && (
            <div className="text-xs text-slate-700 leading-relaxed mt-2 text-justify">
              <strong>Síntese dos Fatos:</strong> {caseData.description}
            </div>
          )}
        </div>

        {/* Section 2: Envolvidos */}
        <div className="mb-6 space-y-3 report-section print-avoid-break">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            2. ROL DE ENVOLVIDOS & HIPÓTESES INVESTIGATIVAS ({involved.length})
          </h2>
          {involved.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Nenhum envolvido cadastrado nos autos.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700">
                  <th className="p-2 border border-slate-300">Nome / Razão Social</th>
                  <th className="p-2 border border-slate-300">Tipo</th>
                  <th className="p-2 border border-slate-300">Classificação</th>
                  <th className="p-2 border border-slate-300">Documento / Vínculo</th>
                </tr>
              </thead>
              <tbody>
                {involved.map((inv) => (
                  <tr key={inv.id} className="print-avoid-break">
                    <td className="p-2 border border-slate-300 font-semibold text-slate-900">{inv.name}</td>
                    <td className="p-2 border border-slate-300 capitalize text-slate-800">{inv.type}</td>
                    <td className="p-2 border border-slate-300 uppercase font-semibold text-[10px] text-slate-800">
                      {inv.classification.replace('_', ' ')}
                    </td>
                    <td className="p-2 border border-slate-300 font-mono text-[11px] text-slate-700">
                      {inv.cnpj || inv.phone || inv.occupation || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 3: Diligências */}
        <div className="mb-6 space-y-3 report-section print-avoid-break">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            3. DILIGÊNCIAS DE CAMPO & ATOS PERICIAIS ({diligences.length})
          </h2>
          {diligences.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Nenhuma diligência formalizada nos autos.</p>
          ) : (
            <div className="space-y-3">
              {diligences.map((dil) => (
                <div key={dil.id} className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1 print-avoid-break">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Diligência #{dil.number} — {dil.type.replace('_', ' ')}</span>
                    <span className="font-mono text-[11px] text-slate-600">
                      {new Date(dil.date).toLocaleDateString('pt-BR')} {dil.time && `(${dil.time})`}
                    </span>
                  </div>
                  {dil.location && (
                    <p className="text-slate-600 text-[11px]">Local: {dil.location}</p>
                  )}
                  <p className="text-slate-700 leading-relaxed">{dil.description}</p>
                  {dil.result && (
                    <p className="text-slate-900 font-semibold text-[11px] bg-white p-1.5 rounded border border-slate-200">
                      Constatação: {dil.result}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Evidências Documentais */}
        <div className="mb-6 space-y-3 report-section print-avoid-break">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            4. INVENTÁRIO DE EVIDÊNCIAS & CADEIA DE CUSTÓDIA ({files.length})
          </h2>
          {files.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Sem peças de evidência anexadas.</p>
          ) : (
            <ul className="text-xs space-y-1 list-disc pl-5">
              {files.map((f) => (
                <li key={f.id} className="text-slate-700 print-avoid-break">
                  <strong>[{f.category.toUpperCase()}]</strong> {f.name} — ({f.description || 'Registro custodiado no repositório seguro'})
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Section 4.1: Anexo Fotográfico (se houver fotos ou imagens) */}
        {photoFiles.length > 0 && (
          <div className="mb-6 space-y-3 report-section print-avoid-break">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-slate-700" />
              4.1 REGISTROS FOTOGRÁFICOS ANEXOS ({photoFiles.length})
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {photoFiles.map((photo) => (
                <div key={photo.id} className="border border-slate-200 rounded p-2.5 bg-slate-50/70 print-avoid-break">
                  <div className="h-44 w-full bg-slate-100 flex items-center justify-center overflow-hidden rounded mb-2">
                    <img
                      src={photo.fileData}
                      alt={photo.name}
                      referrerPolicy="no-referrer"
                      className="max-h-44 w-auto object-contain"
                    />
                  </div>
                  <p className="text-[11px] font-bold text-slate-900 truncate">{photo.name}</p>
                  {photo.description && (
                    <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-2">{photo.description}</p>
                  )}
                  <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1.5 pt-1 border-t border-slate-200">
                    <span>Categoria: {photo.category.toUpperCase()}</span>
                    <span>{new Date(photo.uploadedAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 5: Conclusão Pericial */}
        <div className="mb-8 space-y-2 report-section print-avoid-break">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            5. CONCLUSÃO TÉCNICA DO LAUDO PERICIAL
          </h2>
          <div className="print:hidden">
            <textarea
              rows={3}
              value={reportConclusion}
              onChange={(e) => setReportConclusion(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-300 rounded bg-slate-50 font-serif leading-relaxed text-slate-900"
            />
          </div>
          <p className="hidden print:block text-xs font-serif leading-relaxed text-slate-800 text-justify whitespace-pre-wrap">
            {reportConclusion}
          </p>
        </div>

        {/* Signature Section */}
        <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs report-section print-avoid-break">
          <div>
            <div className="h-12 border-b border-slate-400 mx-8" />
            <p className="font-bold text-slate-900 mt-2">{responsiblePerito}</p>
            <p className="text-[10px] text-slate-500">Perito Responsável / Investigador Líder</p>
            <p className="text-[10px] font-mono text-slate-400">{crmvBadge}</p>
          </div>

          <div>
            <div className="h-12 border-b border-slate-400 mx-8" />
            <p className="font-bold text-slate-900 mt-2">Diretoria Técnica Pericial</p>
            <p className="text-[10px] text-slate-500">INIP — Instituto de Investigação e Perícia</p>
            <p className="text-[10px] text-slate-400">Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* Institutional Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[9px] text-slate-400 report-section print-avoid-break">
          Documento gerado pelo Sistema Integrado do INIP • Autenticidade verificável nos arquivos centrais • Uso restrito
        </div>
      </div>
    </div>
  );
};
