
import { LayoutDashboard, Printer, CreditCard, FileText } from 'lucide-react';

const Sidebar = ({ activePage, setActivePage }) => {
  const menu = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20}/> },
    { id: 'printers', label: 'Printers', icon: <Printer size={20}/> },
    { id: 'payments', label: 'Payments', icon: <CreditCard size={20}/> },
    { id: 'files', label: 'Files', icon: <FileText size={20}/> },
  ];

  return (
    <div className="w-64 h-screen bg-[#1e293b] text-white flex flex-col p-4 shrink-0">
      <div className="flex items-center gap-2 mb-10 px-2">
        <div className="bg-blue-600 p-1 rounded"><Printer size={24}/></div>
        <h1 className="text-xl font-bold">PrintAdmin</h1>
      </div>
      <nav className="flex-1">
        {menu.map(item => (
          <button 
            key={item.id} 
            onClick={() => setActivePage(item.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition ${activePage === item.id ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
          >
            {item.icon} <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
export default Sidebar;