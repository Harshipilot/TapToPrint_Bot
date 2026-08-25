import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Printers from './components/Printers';
import Payments from './components/Payments';
import RetrieveFiles from './components/RetrieveFiles';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const AppShell = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 antialiased transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar activePage={activeTab} setActivePage={setActiveTab} theme={theme} onToggleTheme={toggleTheme} />

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'printers' && <Printers />}
        {activeTab === 'payments' && <Payments />}
        {activeTab === 'files' && <RetrieveFiles />}
      </main>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

export default App;