import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Lock, 
  Receipt,
  Calendar,
  UserCheck
} from 'lucide-react';
import { CaseData, CaseFileItem, PaymentRecord } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { addPayment, subscribeToPayments } from '../../../services/casesService';

interface FinancialTabProps {
  caseData: CaseData;
  files: CaseFileItem[];
  onRefresh: () => void;
}

export const FinancialTab: React.FC<FinancialTabProps> = ({
  caseData,
  files,
  onRefresh,
}) => {
  const { userProfile, canEditFinances } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Form states
  const [value, setValue] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Transferência Bancária / PIX');
  const [observation, setObservation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeToPayments(caseData.id, (items) => {
      setPayments(items);
    });
    return () => unsub();
  }, [caseData.id]);

  const contracted = caseData.contractedValue || 0;
  const received = caseData.receivedValue || 0;
  const pending = Math.max(0, contracted - received);

  const percentageReceived = contracted > 0
    ? Math.min(100, Math.round((received / contracted) * 100))
    : 0;

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !canEditFinances) return;

    if (value <= 0) {
      alert('Informe um valor de pagamento válido.');
      return;
    }

    setLoading(true);
    try {
      await addPayment(
        caseData.id,
        {
          date,
          value,
          paymentMethod,
          observation: observation.trim(),
        },
        userProfile,
        caseData
      );

      setPaymentModalOpen(false);
      setValue(0);
      setObservation('');
      onRefresh();
    } catch (err) {
      console.error('Error adding payment:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Contracted */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Valor Contratado
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            R$ {contracted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Método: {caseData.paymentMethod || 'A combinar'}
          </div>
        </div>

        {/* Received */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-emerald-600 tracking-wider">
              Total Liquidado / Recebido
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            R$ {received.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{percentageReceived}% liquidado</span>
            <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${percentageReceived}%` }}
              />
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-amber-600 tracking-wider">
              Saldo Devedor / Pendente
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            R$ {pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {pending === 0 ? 'Honorários 100% quitados' : 'Aguardando liquidação'}
          </div>
        </div>
      </div>

      {/* Action and Records */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Histórico de Lançamentos Financeiros
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Registro de quitações parciais, comprovantes e conciliação pericial.
            </p>
          </div>

          {canEditFinances ? (
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition"
              id="btn-register-payment"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Pagamento</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>Acesso restrito a Administradores / Gestão</span>
            </div>
          )}
        </div>

        {/* Payments Table */}
        {payments.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nenhum pagamento registrado neste caso até o momento.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Utilize o botão acima para registrar parcelas liquidadas pelo cliente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3">Data</th>
                  <th className="pb-3">Forma de Pagamento</th>
                  <th className="pb-3">Observação / Detalhes</th>
                  <th className="pb-3">Registrado Por</th>
                  <th className="pb-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 font-mono text-slate-700 dark:text-slate-300">
                      {new Date(p.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">
                      {p.paymentMethod}
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">
                      {p.observation || '—'}
                    </td>
                    <td className="py-3 text-slate-500">
                      {p.recordedByName}
                    </td>
                    <td className="py-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      + R$ {p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Observations note */}
        {caseData.financialNotes && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60 text-xs">
            <span className="block font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider mb-1">
              Notas Contratuais e Financeiras Gerais
            </span>
            <p className="text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
              {caseData.financialNotes}
            </p>
          </div>
        )}
      </div>

      {/* Modal: Register Payment */}
      {paymentModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
          onClick={() => setPaymentModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Registrar Quitação de Honorários
              </h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valor Recebido (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={value || ''}
                  onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                  required
                  placeholder="0,00"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Data do Pagamento *
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
                  Método / Canal de Pagamento *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="Transferência Bancária / PIX">PIX / Transferência Instantânea</option>
                  <option value="TED / DOC">TED Bancária</option>
                  <option value="Boleto Bancário">Boleto Bancário</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Espécie / Depósito Identificado">Espécie / Depósito Identificado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observações / Número do Comprovante
                </label>
                <input
                  type="text"
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="Ex: Quitação 2ª parcela contratual, comprovante nº 88291"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm"
                >
                  {loading ? 'Processando...' : 'Confirmar Recebimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
