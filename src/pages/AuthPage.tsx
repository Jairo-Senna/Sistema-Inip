import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  ShieldCheck, 
  KeyRound, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  UserPlus, 
  LogIn, 
  CheckCircle2,
  FileCheck2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { InipLogo } from '../components/common/InipLogo';
import { UserRole } from '../types';

interface AuthPageProps {
  customLogoUrl?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({ customLogoUrl }) => {
  const { loginWithEmail, loginWithGoogle, registerWithEmail, resetPassword } = useAuth();
  
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('investigator');
  const [badgeNumber, setBadgeNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email) {
      setErrorMsg('Informe o seu endereço de e-mail institucional.');
      return;
    }

    if (isResetMode) {
      setLoading(true);
      try {
        await resetPassword(email);
        setSuccessMsg('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
      } catch (err: any) {
        console.error('Password reset error:', err);
        setErrorMsg('Falha ao enviar e-mail de recuperação. Verifique o endereço digitado.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('Informe sua senha de acesso.');
      return;
    }

    if (isRegisterMode) {
      if (!name) {
        setErrorMsg('Informe o nome completo do integrante.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('A senha deve possuir no mínimo 6 caracteres.');
        return;
      }

      setLoading(true);
      try {
        await registerWithEmail(email, password, name, role, badgeNumber);
      } catch (err: any) {
        console.error('Register error:', err);
        if (err.code === 'auth/email-already-in-use') {
          setErrorMsg('Este e-mail já está cadastrado. Realize o login ou recupere sua senha.');
        } else {
          setErrorMsg('Erro no cadastramento: ' + (err.message || 'Verifique as informações.'));
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Login mode
      setLoading(true);
      try {
        await loginWithEmail(email, password);
      } catch (err: any) {
        console.error('Login error:', err);
        if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          setErrorMsg('Credenciais incorretas. Verifique seu e-mail e senha.');
        } else if (err.code === 'auth/too-many-requests') {
          setErrorMsg('Muitas tentativas sem sucesso. Aguarde alguns instantes antes de tentar novamente.');
        } else {
          setErrorMsg('Falha na autenticação: ' + (err.message || 'Erro de conexão com o servidor.'));
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('Falha no login com Google: ' + (err.message || 'Tente novamente.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-950 text-slate-100 relative overflow-hidden selection:bg-sky-500 selection:text-white px-4 py-8">
      {/* Background Decorative Tech Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10">
        {/* INIP Header Card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3.5 mb-3 bg-gradient-to-b from-slate-900/95 to-slate-950/95 rounded-2xl border border-amber-500/30 shadow-2xl shadow-amber-950/30 backdrop-blur-md group">
            <img 
              src="/logo.png" 
              alt="INIP – Instituto de Investigação e Perícia" 
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] transform group-hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white uppercase">
            INIP
          </h1>
          <p className="text-xs font-bold tracking-widest text-amber-400 uppercase mt-0.5">
            Inteligência em Investigação e Perícia
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-slate-900/80 text-slate-300 border border-slate-800 shadow-inner">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Terminal Privado de Autenticação Segura</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-slate-900/95 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* Tabs: Entrar vs Cadastrar */}
          {!isResetMode && (
            <div className="flex rounded-lg bg-slate-950 p-1 mb-6 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition ${
                  !isRegisterMode
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Acessar Sistema</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(true);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition ${
                  isRegisterMode
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Novo Integrante</span>
              </button>
            </div>
          )}

          {isResetMode && (
            <div className="mb-5 pb-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Recuperação de Credencial</h2>
                <p className="text-xs text-slate-400">Informe seu e-mail cadastrado no INIP.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-sky-400 hover:underline"
              >
                Voltar ao login
              </button>
            </div>
          )}

          {/* Alert Messages */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && !isResetMode && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome Completo do Perito/Investigador
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Dr. Roberto Alencar"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nível de Acesso Inicial
                    </label>
                    <div className="w-full px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-lg text-xs flex items-center justify-between">
                      <span className="text-sky-400 font-bold">Investigador Operacional</span>
                      <span className="text-[10px] text-slate-400">Padrão</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Acesso operacional. Administrador é ativado pela chefia após o cadastro.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Matrícula / Distintivo (Opcional)
                    </label>
                    <input
                      type="text"
                      value={badgeNumber}
                      onChange={(e) => setBadgeNumber(e.target.value)}
                      placeholder="Ex: INIP-4081"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                E-mail Institucional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agente@inip.org.br"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>
            </div>

            {!isResetMode && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Senha de Segurança
                  </label>
                  {!isRegisterMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(true);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition cursor-pointer mt-2"
              id="btn-auth-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando credenciais...</span>
                </>
              ) : isResetMode ? (
                <span>Enviar Link de Recuperação</span>
              ) : isRegisterMode ? (
                <>
                  <span>Criar Credencial INIP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Autenticar e Entrar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Social Divider */}
          {!isResetMode && (
            <>
              <div className="flex items-center my-5">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="px-3 text-[11px] text-slate-500 uppercase tracking-widest font-mono">
                  ou
                </span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-950 hover:bg-slate-800 active:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition shadow-xs"
                id="btn-google-login"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 10.5 0 12s.6 2.8 1.6 4.8l3.7-2.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5.1L1.6 16.1C3.5 20 7.4 23 12 23z"
                  />
                </svg>
                <span>Entrar com Conta Google</span>
              </button>
            </>
          )}

          {/* Secrecy Warning Footer */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
            <span>Acesso reservado e monitorado sob sigilo profissional do INIP</span>
          </div>
        </div>

        {/* Database Organization Notice */}
        <p className="text-center text-[11px] text-slate-500 mt-4 max-w-sm mx-auto leading-relaxed">
          Base de dados centralizada: todos os integrantes autorizados visualizam e colaboram sobre os mesmos procedimentos periciais da instituição.
        </p>
      </div>
    </div>
  );
};
