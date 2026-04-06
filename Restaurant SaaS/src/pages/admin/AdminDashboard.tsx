import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShoppingBag, Calendar, UtensilsCrossed, Users, Settings, Menu as MenuIcon, X, MonitorSmartphone, BarChart2, ChefHat } from 'lucide-react';
import { useAuth, can } from '../../context/AuthContext';
import OrdersTab from './tabs/OrdersTab';
import ReservationsTab from './tabs/ReservationsTab';
import MenuTab from './tabs/MenuTab';
import StaffTab from './tabs/StaffTab';
import SiteSettingsTab from './tabs/SiteSettingsTab';
import SalesTab from './tabs/SalesTab';

type Tab = 'sales' | 'orders' | 'reservations' | 'menu' | 'staff' | 'site';

export default function AdminDashboard() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('sales');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin');
  };

  const tabs = ([
    { id: 'sales' as Tab, label: 'Sales Report', icon: <BarChart2 size={16} />, show: can.manageMenu(role) },
    { id: 'orders' as Tab, label: 'Orders', icon: <ShoppingBag size={16} />, show: can.viewOrders(role) },
    { id: 'reservations' as Tab, label: 'Reservations', icon: <Calendar size={16} />, show: can.viewReservations(role) },
    { id: 'menu' as Tab, label: 'Menu & Prices', icon: <UtensilsCrossed size={16} />, show: can.manageMenu(role) },
    { id: 'staff' as Tab, label: 'Staff', icon: <Users size={16} />, show: can.manageStaff(role) },
    { id: 'site' as Tab, label: 'Site Settings', icon: <Settings size={16} />, show: can.manageSite(role) },
  ]).filter(t => t.show);

  const ROLE_BADGE: Record<string, string> = {
    superAdmin: 'bg-gold/10 text-gold border-gold/20',
    admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    manager: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    staff: 'bg-white/5 text-white/40 border-white/10',
  };

  const Sidebar = () => (
    <aside className="w-60 shrink-0 bg-[#0a0a0a] border-r border-white/10 flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <a href="/" className="block">
          <h1 className="font-serif italic text-white text-2xl">Unwind</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="h-[1px] flex-1 bg-gold/30" />
            <span className="text-gold/50 font-mono text-[9px] uppercase tracking-widest">Admin</span>
            <div className="h-[1px] flex-1 bg-gold/30" />
          </div>
        </a>
      </div>

      {/* Quick launch buttons */}
      <div className="px-3 pt-3 space-y-2">
        <button
          onClick={() => navigate('/pos')}
          className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold/80 text-white py-2.5 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <MonitorSmartphone size={14} /> Open POS
        </button>
        <button
          onClick={() => navigate('/kitchen')}
          className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white py-2.5 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <ChefHat size={14} /> Kitchen Display
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all text-left ${
              activeTab === tab.id
                ? 'bg-gold/10 text-gold border-l-2 border-gold pl-[10px]'
                : 'text-white/40 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          {user?.photoURL
            ? <img src={user.photoURL} className="w-8 h-8 rounded-full" alt="" />
            : <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/40 text-xs">{user?.displayName?.[0]}</div>
          }
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-medium truncate">{user?.displayName}</p>
            <span className={`text-[9px] uppercase tracking-widest font-mono px-1.5 py-0.5 border ${role ? ROLE_BADGE[role] : ''}`}>{role}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 border border-white/10 text-white/30 hover:text-red-400 hover:border-red-400/30 py-2 text-xs font-mono uppercase tracking-widest transition-all"
        >
          <LogOut size={12} /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-60 fixed inset-y-0 left-0 z-20">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-60 flex flex-col">
            <Sidebar />
          </div>
          <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white z-40">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0a0a0a]">
          <button onClick={() => setSidebarOpen(true)} className="text-white/40 hover:text-white">
            <MenuIcon size={20} />
          </button>
          <h1 className="font-serif italic text-white text-xl">Unwind</h1>
          <button onClick={handleLogout} className="text-white/40 hover:text-red-400 transition-colors">
            <LogOut size={18} />
          </button>
        </div>

        <main className="flex-1 p-6 lg:p-8 max-w-5xl w-full">
          {activeTab === 'sales' && <SalesTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'reservations' && <ReservationsTab />}
          {activeTab === 'menu' && <MenuTab />}
          {activeTab === 'staff' && <StaffTab />}
          {activeTab === 'site' && <SiteSettingsTab />}
        </main>
      </div>
    </div>
  );
}
