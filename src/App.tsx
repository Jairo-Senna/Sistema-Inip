import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { Header } from './components/common/Header';
import { NewCaseModal } from './components/cases/NewCaseModal';
import { UsersManagementModal } from './components/admin/UsersManagementModal';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { InstitutionSettingsModal } from './components/admin/InstitutionSettingsModal';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { currentUser, userProfile, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'case-detail'>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('overview');

  // Modals
  const [newCaseModalOpen, setNewCaseModalOpen] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Institution Logo Customization
  const [customLogoUrl, setCustomLogoUrl] = useState<string>(() => {
    return localStorage.getItem('inip_custom_logo') || '/logo.png';
  });

  // Dark mode
  const [isDark, setIsDark] = useState<boolean>(() => {
    return (
      localStorage.getItem('inip_theme') === 'dark' ||
      (!('inip_theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('inip_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('inip_theme', 'light');
    }
  }, [isDark]);

  // Global search shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-sky-500 mb-4" />
        <p className="text-sm font-bold tracking-wider uppercase text-slate-300">
          INIP — Inicializando Plataforma Segura
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Validando credenciais e integridade do sistema...
        </p>
      </div>
    );
  }

  // Not authenticated
  if (!currentUser || !userProfile) {
    return <AuthPage customLogoUrl={customLogoUrl} />;
  }

  const handleSelectCase = (caseId: string, initialTab: string = 'overview') => {
    setSelectedCaseId(caseId);
    setSelectedTab(initialTab);
    setCurrentView('case-detail');
  };

  const handleCaseCreated = (caseId: string) => {
    setNewCaseModalOpen(false);
    setSelectedCaseId(caseId);
    setSelectedTab('overview');
    setCurrentView('case-detail');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <Header
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenNewCase={() => setNewCaseModalOpen(true)}
        onOpenUsers={() => setUsersModalOpen(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        customLogoUrl={customLogoUrl}
        onNavigateHome={() => setCurrentView('dashboard')}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentView === 'dashboard' ? (
          <DashboardPage
            onSelectCase={handleSelectCase}
            onOpenNewCase={() => setNewCaseModalOpen(true)}
            customLogoUrl={customLogoUrl}
          />
        ) : selectedCaseId ? (
          <CaseDetailPage
            caseId={selectedCaseId}
            initialTab={selectedTab}
            onBackToDashboard={() => setCurrentView('dashboard')}
            customLogoUrl={customLogoUrl}
          />
        ) : null}
      </main>

      {/* Modals */}
      <NewCaseModal
        isOpen={newCaseModalOpen}
        onClose={() => setNewCaseModalOpen(false)}
        onCaseCreated={handleCaseCreated}
      />

      <UsersManagementModal
        isOpen={usersModalOpen}
        onClose={() => setUsersModalOpen(false)}
      />

      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectResult={(caseId, tab) => {
          setSearchModalOpen(false);
          handleSelectCase(caseId, tab);
        }}
      />

      <InstitutionSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        currentLogoUrl={customLogoUrl}
        onSaveLogo={(url) => setCustomLogoUrl(url)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
