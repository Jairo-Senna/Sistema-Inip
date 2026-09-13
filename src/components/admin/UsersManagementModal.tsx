import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  Shield, 
  UserCheck, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle,
  UserPlus,
  Lock,
  Mail,
  KeyRound,
  BadgeAlert,
  Search,
  Check,
  Briefcase,
  RefreshCw
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db, DEFAULT_ORG_ID } from '../../services/firebase';
import { UserProfile, UserRole } from '../../types';
import { createMemberUser, updateUserRole, toggleUserStatus, SUPER_ADMIN_EMAIL } from '../../services/userService';

interface UsersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UsersManagementModal: React.FC<UsersManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New user form states
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newBadge, setNewBadge] = useState('');
  const [newDepartment, setNewDepartment] = useState('Divisão de Investigação & Perícia');
  const [newRole, setNewRole] = useState<UserRole>('investigator'); // Default to normal user!
  const [creatingUser, setCreatingUser] = useState(false);
  const [createdCredential, setCreatedCredential] = useState<{ email: string; pass: string; role: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'organizations', DEFAULT_ORG_ID, 'users'));
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        list.push({ uid: d.id, ...(d.data() as Omit<UserProfile, 'uid'>) });
      });
      // Sort: Admins first, then by name
      list.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return (a.displayName || '').localeCompare(b.displayName || '');
      });
      setUsers(list);
    } catch (err: any) {
      console.error('Fetch users error:', err);
      setErrorMsg('Falha ao carregar relação de integrantes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setErrorMsg(null);
      setSuccessMsg(null);
      setCreatedCredential(null);
    }
  }, [isOpen]);

  const handleRoleChange = async (uid: string, newRole: UserRole, userEmail?: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await updateUserRole(uid, newRole, userEmail);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
      );
      setSuccessMsg(`Perfil de acesso atualizado para "${newRole === 'admin' ? 'Administrador' : newRole === 'investigator' ? 'Usuário Normal' : 'Consulta'}".`);
    } catch (err: any) {
      setErrorMsg('Falha ao alterar perfil: ' + err.message);
    }
  };

  const handleToggleActive = async (uid: string, currentActive: boolean, userEmail?: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const updatedActive = await toggleUserStatus(uid, currentActive, userEmail);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, active: updatedActive } : u))
      );
      setSuccessMsg(`Usuário ${updatedActive ? 'ativado' : 'desativado'} com sucesso.`);
    } catch (err: any) {
      setErrorMsg('Falha ao alterar status do usuário: ' + err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setCreatedCredential(null);

    if (newPassword.length < 6) {
      setErrorMsg('A senha inicial deve conter no mínimo 6 caracteres.');
      return;
    }

    setCreatingUser(true);
    try {
      const created = await createMemberUser({
        displayName: newDisplayName,
        email: newEmail,
        password: newPassword,
        role: 'investigator',
        badgeNumber: newBadge || undefined,
        department: newDepartment || undefined,
      });

      setUsers((prev) => [created, ...prev]);
      setCreatedCredential({
        email: newEmail,
        pass: newPassword,
        role: 'Usuário Normal (Operacional)',
      });

      setSuccessMsg(`Usuário "${newDisplayName}" cadastrado com sucesso como Usuário Normal! Se desejar ativá-lo como Administrador, utilize a aba "Relação de Integrantes".`);

      // Reset fields
      setNewDisplayName('');
      setNewEmail('');
      setNewPassword('');
      setNewBadge('');
      setNewRole('investigator');
    } catch (err: any) {
      console.error('Error creating user:', err);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('Este e-mail já está cadastrado no sistema.');
      } else {
        setErrorMsg('Erro ao cadastrar usuário: ' + (err.message || err));
      }
    } finally {
      setCreatingUser(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.displayName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.badgeNumber?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Controle de Usuários & Níveis de Acesso
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-bold">
                  RBAC INIP
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie quem é Administrador e quem é Usuário Normal com permissões operacionais restritas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/40 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'list'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Relação de Integrantes ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'create'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Novo Usuário</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="m-6 mb-0 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={fetchUsers}
              className="px-2.5 py-1 text-[11px] font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 dark:text-rose-300 rounded-lg transition whitespace-nowrap"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {successMsg && (
          <div className="m-6 mb-0 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab 1: User List */}
        {activeTab === 'list' && (
          <div className="p-6 space-y-4">
            {/* Direct Workflow Guide for the Administrator */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-transparent border border-amber-500/20 dark:border-amber-500/30 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Shield className="w-4 h-4 text-amber-500" />
                <span>Fluxo de Credenciamento de Administradores:</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                <strong>1.</strong> Peça para o novo integrante se cadastrar na tela inicial (ele entrará automaticamente como <strong>Usuário Normal</strong>).<br />
                <strong>2.</strong> Localize o integrante na lista abaixo e clique em <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">Ativar Administrador</span>.<br />
                <strong>3.</strong> O integrante passará a ter acesso total (registro de novos casos, finanças e exclusão de itens incorretos).
              </p>
            </div>

            {/* Rule explanation banner */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1 flex-shrink-0" />
                <div>
                  <strong className="text-slate-800 dark:text-slate-200 font-bold block text-xs">
                    Perfil Administrador
                  </strong>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed block">
                    Acesso pleno: cadastra novos casos, gerencia finanças e é o <strong>único autorizado a apagar dados</strong>.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-sky-500 mt-1 flex-shrink-0" />
                <div>
                  <strong className="text-slate-800 dark:text-slate-200 font-bold block text-xs">
                    Perfil Usuário Normal (Investigador Operacional)
                  </strong>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed block">
                    Alimenta diligências e evidências. <strong>Não cadastra novos casos, não mexe em finanças e não pode apagar informações</strong>.
                  </span>
                </div>
              </div>
            </div>

            {/* Search Input & Refresh */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, e-mail, matrícula ou perfil..."
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <button
                type="button"
                onClick={fetchUsers}
                disabled={loading}
                title="Atualizar lista de integrantes"
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500 mb-2" />
                <span className="text-xs">Carregando integrantes do INIP...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhum integrante localizado com os critérios informados.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4 font-semibold">Integrante</th>
                      <th className="py-3 px-4 font-semibold">Matrícula / Lotação</th>
                      <th className="py-3 px-4 font-semibold">Nível Atual</th>
                      <th className="py-3 px-4 font-semibold text-center">Permissão Administrador</th>
                      <th className="py-3 px-4 font-semibold text-right">Acesso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {filteredUsers.map((u) => {
                      const isSuper = u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                      const isAdmin = u.role === 'admin' || isSuper;

                      return (
                        <tr key={u.uid} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sky-400 font-bold text-xs border border-slate-700 flex-shrink-0">
                                {u.displayName?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-slate-900 dark:text-white truncate">
                                    {u.displayName || 'Sem nome'}
                                  </p>
                                  {isSuper && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                      SUPER ADMIN
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {u.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">
                              {u.badgeNumber || 'INIP-OPER'}
                            </span>
                            <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                              {u.department || 'Perícia Oficial'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isSuper ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Shield className="w-3 h-3" /> Administrador Soberano
                              </span>
                            ) : isAdmin ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                <Shield className="w-3 h-3 text-amber-500" /> Administrador
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                                <Users className="w-3 h-3 text-sky-500" /> Usuário Normal
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isSuper ? (
                              <span className="text-[11px] text-slate-400 italic">
                                Conta Master Permanente
                              </span>
                            ) : isAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleRoleChange(u.uid, 'investigator', u.email)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-500/10 border border-slate-300 dark:border-slate-700 transition"
                                title="Revogar acesso de administrador e retornar para Usuário Normal"
                              >
                                <X className="w-3 h-3" /> Revogar Admin (Voltar p/ Normal)
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRoleChange(u.uid, 'admin', u.email)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 rounded-lg shadow-xs transition transform active:scale-95"
                                title="Conceder acesso de Administrador a este integrante"
                              >
                                <Shield className="w-3.5 h-3.5 fill-slate-950" /> Ativar Administrador
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isSuper && (
                              <button
                                type="button"
                                onClick={() => handleToggleActive(u.uid, u.active !== false, u.email)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                  u.active !== false
                                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                {u.active !== false ? 'Desativar' : 'Reativar'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Create User Form */}
        {activeTab === 'create' && (
          <div className="p-6 space-y-6">
            {createdCredential && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                  <Check className="w-4 h-4" />
                  <span>Credenciais de Acesso Geradas com Sucesso:</span>
                </div>
                <div className="bg-white dark:bg-slate-950 p-3 rounded-lg border border-emerald-500/20 text-xs font-mono space-y-1">
                  <p><span className="text-slate-400">E-mail:</span> <strong className="text-slate-800 dark:text-slate-100">{createdCredential.email}</strong></p>
                  <p><span className="text-slate-400">Senha Provisória:</span> <strong className="text-slate-800 dark:text-slate-100">{createdCredential.pass}</strong></p>
                  <p><span className="text-slate-400">Nível Definido:</span> <strong className="text-sky-600 dark:text-sky-400">Usuário Normal (Operacional)</strong></p>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Repasse estes dados ao integrante. Caso queira que ele seja Administrador, acesse a aba &quot;Relação de Integrantes&quot; e clique em &quot;Ativar Administrador&quot;.
                </p>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo do Integrante *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Ex: Carlos Roberto Alencar"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail Institucional *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="agente@inip.org.br"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Senha Provisória */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Senha de Acesso Provisória * (mínimo 6 dígitos)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Defina uma senha provisória"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Matrícula / Lotação */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Matrícula INIP
                  </label>
                  <input
                    type="text"
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    placeholder="Ex: INIP-7734"
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Notice: Role is strictly Normal User on Creation */}
              <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-500/10 dark:bg-sky-950/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-900 dark:text-sky-200">
                  <Users className="w-4 h-4 text-sky-500" />
                  <span>Nível de Acesso Inicial: Usuário Normal (Investigador Operacional)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Por protocolo de segurança e integridade das investigações, novos integrantes entram obrigatoriamente como <strong>Usuário Normal</strong> (com permissão para alimentar diligências e evidências, sem acesso a finanças e sem permissão para apagar registros).
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 font-semibold pt-1 border-t border-sky-200/50 dark:border-sky-800/40">
                  <Shield className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span>
                    Caso deseje que este integrante seja Administrador, você poderá ativá-lo imediatamente na aba &quot;Relação de Integrantes&quot; pelo botão &quot;Ativar Administrador&quot;.
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Voltar para Lista
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition"
                >
                  {creatingUser ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cadastrando no INIP...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Criar Usuário Normal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
