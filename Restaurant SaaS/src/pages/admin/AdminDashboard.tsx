import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, ShoppingBag, Calendar, UtensilsCrossed, Users, Settings,
  Menu as MenuIcon, X, MonitorSmartphone, BarChart2, ChefHat, Package,
  FileText, Download, Bell, AlertTriangle,
} from 'lucide-react';
import {
  collection, onSnapshot, query, where, doc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth, can } from '../../context/AuthContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';

import OrdersTab from './tabs/OrdersTab';
import ReservationsTab from './tabs/ReservationsTab';
import MenuTab from './tabs/MenuTab';
import StaffTab from './tabs/StaffTab';
import SiteSettingsTab from './tabs/SiteSettingsTab';
import SalesTab from './tabs/SalesTab';
import InventoryTab from './tabs/InventoryTab';
import InvoiceTab from './tabs/InvoiceTab';

type Tab = 'sales' | 'orders' | 'reservations' | 'menu' | 'inventory' | 'invoices' | 'staff' | 'site';

interface StockNotif {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  threshold: number;
  read: boolean;
}

export default function AdminDashboard() {
  const { user, role, tabPermissions, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('sales');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { canInstall, install } = usePWAInstall();

  // ── Notifications ─────────────────────────────────────
  const [notifs, setNotifs] = useState<StockNotif[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), where('read', '==', false));
    return onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockNotif)));
    });
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  const markRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const markAllRead = async () => {
    if (notifs.length === 0) return;
    const batch = writeBatch(db);
    notifs.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }));
    await batch.commit();
  };

  const goToInventory = () => {
    setActiveTab('inventory');
    setNotifOpen(false);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin');
  };

  const tabs = ([
    { id: 'sales' as Tab,        label: 'Sales Report',  icon: <BarChart2 size={16} />      },
    { id: 'orders' as Tab,       label: 'Orders',        icon: <ShoppingBag size={16} />    },
    { id: 'reservations' as Tab, label: 'Reservations',  icon: <Calendar size={16} />       },
    { id: 'menu' as Tab,         label: 'Menu & Prices', icon: <UtensilsCrossed size={16} />},
    { id: 'inventory' as Tab,    label: 'Inventory',     icon: <Package size={16} />        },
    { id: 'invoices' as Tab,     label: 'Invoices',      icon: <FileText size={16} />       },
    { id: 'staff' as Tab,        label: 'Staff',         icon: <Users size={16} />          },
    { id: 'site' as Tab,         label: 'Site Settings', icon: <Settings size={16} />       },
  ]).filter(t => tabPermissions.includes(t.id));

  const ROLE_BADGE: Record<string, string> = {
    superAdmin: 'bg-gold/10 text-gold border-gold/20',
    admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    manager: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    staff: 'bg-white/5 text-white/40 border-white/10',
  };

  // Shared bell button + dropdown
  const BellButton = () => (
    <div className="relative" ref={notifRef}>
      <button
        onClick={() => setNotifOpen(o => !o)}
        className={`relative flex items-center justify-center w-8 h-8 border transition-all ${
          notifOpen
            ? 'border-gold/50 text-gold bg-gold/10'
            : 'border-white/10 text-white/40 hover:border-yellow-400/40 hover:text-yellow-400'
        }`}
      >
        <Bell size={15} />
        {notifs.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 text-black text-[9px] font-bold flex items-center justify-center font-mono">
            {notifs.length > 9 ? '9+' : notifs.length}
          </span>
        )}
      </button>

      {notifOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-80 bg-[#0a0a0a] border border-white/10 shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-white/40 text-[9px] uppercase tracking-widest font-mono">
              Low Stock Alerts {notifs.length > 0 && `(${notifs.length})`}
            </span>
            {notifs.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-white/30 hover:text-white text-[9px] uppercase tracking-widest font-mono transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {notifs.length === 0 ? (
            <div className="px-4 py-6 text-center text-white/20 font-mono text-xs">
              No alerts — all stock levels OK
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {notifs.map(n => (
                <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/3 transition-colors">
                  <AlertTriangle size={13} className="text-yellow-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium">{n.itemName}</p>
                    <p className="text-white/30 text-[10px] mt-0.5 font-mono">
                      {n.quantity} {n.unit} left · threshold {n.threshold} {n.unit}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={goToInventory}
                      className="text-gold/60 hover:text-gold text-[9px] uppercase tracking-widest font-mono transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => markRead(n.id)}
                      className="text-white/20 hover:text-white/50 text-[9px] uppercase tracking-widest font-mono transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

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
        {canInstall && (
          <button
            onClick={install}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-gold/30 text-gold/80 hover:text-gold py-2.5 text-xs font-bold uppercase tracking-widest transition-all"
          >
            <Download size={14} /> Install App
          </button>
        )}
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
          <BellButton />
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
          <div className="flex items-center gap-2">
            <BellButton />
            <button onClick={handleLogout} className="text-white/40 hover:text-red-400 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <main className="flex-1 p-6 lg:p-8 max-w-5xl w-full">
          {activeTab === 'sales' && <SalesTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'reservations' && <ReservationsTab />}
          {activeTab === 'menu' && <MenuTab />}
          {activeTab === 'inventory' && <InventoryTab />}
          {activeTab === 'invoices' && <InvoiceTab />}
          {activeTab === 'staff' && <StaffTab />}
          {activeTab === 'site' && <SiteSettingsTab />}
        </main>
      </div>
    </div>
  );
}
