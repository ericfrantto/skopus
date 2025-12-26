
import React, { useState, useEffect } from 'react';
import { Theme, AppSection } from '../types';
import { ICONS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeSection, onSectionChange }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('skopus-theme');
    // Forçamos o padrão inicial como LIGHT se não houver preferência salva
    return (saved as Theme) || Theme.LIGHT;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (currentTheme: Theme) => {
      let isDark = false;
      if (currentTheme === Theme.SYSTEM) {
        isDark = mediaQuery.matches;
      } else {
        isDark = currentTheme === Theme.DARK;
      }

      if (isDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    };

    applyTheme(theme);
    localStorage.setItem('skopus-theme', theme);

    const handleSystemChange = () => {
      if (theme === Theme.SYSTEM) {
        applyTheme(Theme.SYSTEM);
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === Theme.LIGHT) return Theme.DARK;
      if (prev === Theme.DARK) return Theme.SYSTEM;
      return Theme.LIGHT;
    });
  };

  const getThemeLabel = () => {
    switch (theme) {
      case Theme.LIGHT: return 'Modo Claro';
      case Theme.DARK: return 'Modo Escuro';
      case Theme.SYSTEM: return 'Sistema';
      default: return 'Tema';
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case Theme.LIGHT: return <ICONS.Sun className="w-4 h-4" />;
      case Theme.DARK: return <ICONS.Moon className="w-4 h-4" />;
      case Theme.SYSTEM: return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row transition-colors duration-500 bg-[#E7E7E7] dark:bg-[#131313]" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-[#F7F7F7] dark:bg-[#121218] border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col justify-between z-20 transition-all duration-500">
        <div>
          <div className="flex items-center mb-12 select-none">
            <span className="text-3xl font-bold tracking-tighter dark:text-white">skópus</span>
            <span className="text-3xl font-bold text-[#FE7317] ml-1">•</span>
          </div>

          <nav className="space-y-2">
            {[
              { id: AppSection.SDR, label: 'Busca de Leads', icon: ICONS.SDR },
              { id: AppSection.COPY, label: 'Gerador de Copy', icon: ICONS.Copy },
              { id: AppSection.CONTRACT, label: 'Contratos', icon: ICONS.Contract },
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  activeSection === item.id 
                    ? 'bg-[#FE7317] text-white shadow-lg shadow-[#FE7317]/20 scale-[1.02]' 
                    : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-bold text-sm tracking-tight">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-widest"
          >
            {getThemeIcon()}
            {getThemeLabel()}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto max-h-screen transition-colors duration-500">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
