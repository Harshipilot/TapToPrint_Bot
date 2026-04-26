import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Printers from './components/Printers';
import Payments from './components/Payments';
import RetrieveFiles from './components/RetrieveFiles';

function App() {
  // This state controls which "page" is visible
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex h-screen w-full bg-slate-50">
      {/* We pass setActiveTab to the sidebar so buttons work */}
      <Sidebar activePage={activeTab} setActivePage={setActiveTab} />
      
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'printers' && <Printers />}
        {activeTab === 'payments' && <Payments />}
        {activeTab === 'files' && <RetrieveFiles />}
      </main>
    </div>
  );
}

export default App;