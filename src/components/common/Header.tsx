import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Sun, 
  Moon, 
  LogOut, 
  Shield, 
  UserCheck, 
  Bell, 
  Settings, 
  Users, 
  ChevronDown,
  UploadCloud,
  FileSpreadsheet,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { InipLogo } from './InipLogo';
import { compressImage } from '../../utils/imageCompressor';
import { getEffectiveLogoUrl } from '../../utils/logo';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenNewCase: () => void;
  onOpenUserManagement?: () => void;
  onOpenUsers?: () => void;
  onSelectDashboard?: () => void;
  onNavigateHome?: () => void;
  customLogoUrl?: string;
  onUpdateLogoUrl?: (url: string) => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenNewCase,
  onOpenUserManagement,
  onOpenUsers,
  onSelectDashboard,
  onNavigateHome,
  customLogoUrl,
  onUpdateLogoUrl,
  isDark,
  onToggleTheme,
}) => {
  const { currentUser, userProfile, logout, isAdmin, isInvestigator } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [tempLogoUrl, setTempLogoUrl] = useState(() => getEffectiveLogoUrl(customLogoUrl));

  useEffect(() => {
    setTempLogoUrl(getEffectiveLogoUrl(customLogoUrl));
  }, [customLogoUrl]);

  const handleNavigateDashboard = () => {
    if (onNavigateHome) onNavigateHome();
    else if (onSelectDashboard) onSelectDashboard();
  };

  const handleOpenUsers = () => {
    if (onOpenUsers) onOpenUsers();
    else if (onOpenUserManagement) onOpenUserManagement();
  };

  const currentDark = isDark !== undefined ? isDark : darkMode;

  useEffect(() => {
    if (isDark !== undefined) {
      setDarkMode(isDark);
    }
  }, [isDark]);

  useEffect(() => {
    if (isDark === undefined) {
      const activeDark = document.documentElement.classList.contains('dark') || 
        (!('inip_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
        localStorage.getItem('inip_theme') !== 'light';
      setDarkMode(activeDark);
      if (activeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDark]);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('inip_theme', 'dark');
      localStorage.setItem('inip-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('inip_theme', 'light');
      localStorage.setItem('inip-theme', 'light');
    }
  };

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      toggleTheme();
    }
  };

  const handleSaveLogo = () => {
    if (onUpdateLogoUrl) {
      const cleanUrl = tempLogoUrl.trim();
      onUpdateLogoUrl(cleanUrl);
      localStorage.setItem('inip_custom_logo', cleanUrl);
      localStorage.setItem('inip-custom-logo', cleanUrl);
    }
    setSettingsModalOpen(false);
  };

  const handleFileLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const result = await compressImage(file, {
          maxWidth: 400,
          maxHeight: 400,
          quality: 0.85,
          mimeType: 'image/png',
        });
        setTempLogoUrl(result.dataUrl);
      } catch (err) {
        console.warn('Erro na compressão do logo, usando leitor padrão:', err);
        const reader = new FileReader();
        reader.onload = (ev) => {
          const b64 = ev.target?.result as string;
          setTempLogoUrl(b64);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <Shield className="w-3 h-3" /> Administrador
          </span>
        );
      case 'investigator':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-500 border border-sky-500/20">
            <UserCheck className="w-3 h-3" /> Investigador
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Consulta
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <button
          onClick={handleNavigateDashboard}
          className="flex items-center gap-2 hover:opacity-95 transition text-left focus:outline-none"
          title="Ir para o Dashboard Principal"
        >
          <InipLogo size="md" customLogoUrl={customLogoUrl} />
        </button>

        {/* Global Search Bar (Center) */}
        <div className="flex-1 max-w-lg hidden sm:block">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700/60 transition shadow-inner group"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
              <span>Busca global de casos, envolvidos, diligências...</span>
            </div>
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-xs">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Tools & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Mobile Search Button */}
          <button
            onClick={onOpenSearch}
            className="p-2 sm:hidden text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Buscar"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* User Management Button (Exclusively Admin) */}
          {isAdmin && (
            <button
              onClick={handleOpenUsers}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition"
              title="Gerenciar Integrantes e Níveis de Acesso"
              id="btn-header-users"
            >
              <Users className="w-3.5 h-3.5 text-sky-500" />
              <span>Integrantes</span>
            </button>
          )}

          {/* New Case Button (Exclusively Admin) */}
          {isAdmin && (
            <button
              onClick={onOpenNewCase}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-lg shadow-sm hover:shadow transition"
              id="btn-header-new-case"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NOVO CASO</span>
            </button>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={handleToggleTheme}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title={currentDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            aria-label="Theme toggle"
            id="btn-header-theme-toggle"
          >
            {currentDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
          </button>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 p-1.5 pl-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition"
              id="btn-user-profile-menu"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">
                  {userProfile?.displayName || 'Agente'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize mt-0.5">
                  {userProfile?.role || 'Consulta'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {profileMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setProfileMenuOpen(false)}
              >
                {/* User Header */}
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {userProfile?.displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {userProfile?.email || currentUser?.email}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    {getRoleBadge(userProfile?.role)}
                    {userProfile?.badgeNumber && (
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                        {userProfile.badgeNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-1 space-y-0.5">
                  {isAdmin && (
                    <button
                      onClick={handleOpenUsers}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                    >
                      <Users className="w-4 h-4 text-sky-500" />
                      Gerenciar Usuários & Acessos
                    </button>
                  )}

                  <button
                    onClick={() => setSettingsModalOpen(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Identidade Visual & Configurações
                  </button>

                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Encerrar Sessão Segura
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal (Logo replacement & visual identity) */}
      {settingsModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          onClick={() => setSettingsModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Identidade Visual do INIP
                </h3>
              </div>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              O sistema utiliza o brasão padrão com insígnia forense do INIP. Você pode carregar a imagem oficial do logotipo da sua unidade pericial ou fornecer uma URL direta.
            </p>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 flex flex-col items-center gap-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pré-visualização
              </span>
              <InipLogo size="lg" customLogoUrl={tempLogoUrl} />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Upload de Arquivo de Logo (PNG, JPG, SVG, WEBP)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileLogoUpload}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 dark:file:bg-sky-950 dark:file:text-sky-300 hover:file:bg-sky-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ou URL externa da imagem do logo
                </label>
                <input
                  type="url"
                  value={tempLogoUrl}
                  onChange={(e) => setTempLogoUrl(e.target.value)}
                  placeholder="https://exemplo.com/logo-inip.png"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTempLogoUrl('')}
                className="text-xs text-rose-500 hover:underline"
              >
                Restaurar brasão padrão
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSettingsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveLogo}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm"
                >
                  Salvar Identidade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
