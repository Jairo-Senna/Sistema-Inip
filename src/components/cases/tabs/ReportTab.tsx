import React, { useState } from 'react';
import { 
  Printer, 
  FileText, 
  ShieldCheck, 
  Download, 
  CheckCircle, 
  Calendar, 
  User, 
  Building2,
  Lock
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

  return (
    <div className="space-y-6">
      {/* Top Action Bar (hidden on print) */}
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
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition cursor-pointer"
          id="btn-print-report"
        >
          <Printer className="w-4 h-4" />
          <span>Gerar / Imprimir PDF Oficial</span>
        </button>
      </div>

      {/* Printable Paper Canvas */}
      <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-4xl mx-auto print:p-0 print:border-0 print:shadow-none print:m-0 print:w-full print:max-w-none">
        {/* Formal Institutional Header */}
        <div className="border-b-2 border-slate-900 pb-6 mb-6">
          <div className="flex items-center justify-between">
            <InipLogo size="lg" customLogoUrl={customLogoUrl} />
            <div className="text-right">
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 rounded border border-slate-300">
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
        <div className="mb-6 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
            1. QUALIFICAÇÃO DO PROCEDIMENTO
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <p><strong>Nome do Caso:</strong> {caseData.title}</p>
            <p><strong>Código Interno:</strong> {caseData.code}</p>
            <p><strong>Cliente / Solicitante:</strong> {caseData.clientName}</p>
            <p><strong>Data de Autuação:</strong> {new Date(caseData.openingDate).toLocaleDateString('pt-BR')}</p>
            <p><strong>Status Operacional:</strong> {caseData.status.toUpperCase()}</p>
            <p><strong>Grau de Prioridade:</strong> {caseData.priority.toUpperCase()}</p>
          </div>
          {caseData.objective && (
            <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200 mt-2">
              <strong>Objetivo da Perícia:</strong> {caseData.objective}
            </div>
          )}
          {caseData.description && (
            <div className="text-xs text-slate-700 leading-relaxed mt-2">
              <strong>Síntese dos Fatos:</strong> {caseData.description}
            </div>
          )}
        </div>

        {/* Section 2: Envolvidos */}
        <div className="mb-6 space-y-3">
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
                  <tr key={inv.id}>
                    <td className="p-2 border border-slate-300 font-semibold">{inv.name}</td>
                    <td className="p-2 border border-slate-300 capitalize">{inv.type}</td>
                    <td className="p-2 border border-slate-300 uppercase font-semibold text-[10px]">
                      {inv.classification.replace('_', ' ')}
                    </td>
                    <td className="p-2 border border-slate-300 font-mono text-[11px]">
                      {inv.cnpj || inv.phone || inv.occupation || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 3: Diligências */}
        <div className="mb-6 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            3. DILIGÊNCIAS DE CAMPO & ATOS PERICIAIS ({diligences.length})
          </h2>
          {diligences.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Nenhuma diligência formalizada nos autos.</p>
          ) : (
            <div className="space-y-3">
              {diligences.map((dil) => (
                <div key={dil.id} className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
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

        {/* Section 4: Evidências */}
        <div className="mb-6 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            4. INVENTÁRIO DE EVIDÊNCIAS & CADEIA DE CUSTÓDIA ({files.length})
          </h2>
          {files.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Sem peças de evidência anexadas.</p>
          ) : (
            <ul className="text-xs space-y-1 list-disc pl-5">
              {files.map((f) => (
                <li key={f.id} className="text-slate-700">
                  <strong>[{f.category.toUpperCase()}]</strong> {f.name} — ({f.description || 'Registro custodiado'})
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Section 5: Conclusão Pericial */}
        <div className="mb-8 space-y-2">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            5. CONCLUSÃO TÉCNICA DO LAUDO PERICIAL
          </h2>
          <div className="print:hidden">
            <textarea
              rows={3}
              value={reportConclusion}
              onChange={(e) => setReportConclusion(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-300 rounded bg-slate-50 font-serif leading-relaxed"
            />
          </div>
          <p className="hidden print:block text-xs font-serif leading-relaxed text-slate-800 text-justify">
            {reportConclusion}
          </p>
        </div>

        {/* Signature Section */}
        <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
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
        <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[9px] text-slate-400">
          Documento gerado pelo Sistema Integrado do INIP • Autenticidade verificável nos arquivos centrais • Uso restrito
        </div>
      </div>
    </div>
  );
};
