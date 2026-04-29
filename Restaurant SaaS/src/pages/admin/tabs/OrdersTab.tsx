import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth, can } from '../../../context/AuthContext';
import { Clock, Flame, Search } from 'lucide-react';

interface Order {
  id: string;
  receiptNo?: string;
  customerName: string;
  phone: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  notes: string;
  createdAt: { seconds: number } | null;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
}

const STATUS_STYLES: Record<Order['status'], string> = {
  pending:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  preparing: 'bg-blue-500/10   text-blue-400   border-blue-500/20',
  ready:     'bg-green-500/10  text-green-400  border-green-500/20',
  completed: 'bg-cyan-500/10   text-cyan-400   border-cyan-500/20',
  cancelled: 'bg-red-500/10    text-red-400    border-red-500/20',
};

const CARD_STYLES: Record<Order['status'], string> = {
  pending:   'bg-yellow-500/5  border-yellow-500/30',
  preparing: 'bg-blue-500/5    border-blue-500/20',
  ready:     'bg-green-500/5   border-green-500/20',
  completed: 'bg-cyan-500/5    border-cyan-500/30',
  cancelled: 'bg-red-500/5     border-red-500/20',
};

const STATUS_OPTIONS: Order['status'][] = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

type DateRange = 'all' | 'today' | 'week' | 'month';

function startOfRange(range: DateRange): number | null {
  if (range === 'all') return null;
  const d = new Date();
  if (range === 'today') d.setHours(0, 0, 0, 0);
  else if (range === 'week') { d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); }
  else { d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0); }
  return d.getTime() / 1000;
}

function elapsedLabel(seconds: number): { label: string; urgent: boolean } {
  const secs = Math.floor(Date.now() / 1000 - seconds);
  if (secs < 60) return { label: 'Just ordered', urgent: false };
  const mins = Math.floor(secs / 60);
  if (mins < 10) return { label: `${mins}m ago`, urgent: false };
  if (mins < 30) return { label: `${mins}m ago`, urgent: true };
  const hrs = Math.floor(mins / 60);
  if (hrs < 1) return { label: `${mins}m ago`, urgent: true };
  return { label: `${hrs}h ${mins % 60}m ago`, urgent: true };
}

function useElapsedTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 10000);
    return () => clearInterval(t);
  }, []);
}

export default function OrdersTab() {
  const { role } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | Order['status']>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [itemSearch, setItemSearch] = useState('');

  useElapsedTick();

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'menuItems'), snap => {
      setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
    });
  }, []);

  const updateStatus = async (id: string, status: Order['status']) => {
    await updateDoc(doc(db, 'orders', id), { status });
  };

  // Build name → category map
  const nameToCategory = Object.fromEntries(
    menuItems.map(m => [m.name.toLowerCase(), m.category.toLowerCase()])
  );

  // Unique categories from menu
  const categories = ['all', ...Array.from(new Set(menuItems.map(m => m.category.toLowerCase()))).sort()];

  // Apply all filters
  const filtered = orders.filter(order => {
    // Status
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;

    // Date range
    const cutoff = startOfRange(dateRange);
    if (cutoff !== null) {
      if (!order.createdAt || order.createdAt.seconds < cutoff) return false;
    }

    // Category
    if (categoryFilter !== 'all') {
      const hasCategory = order.items?.some(
        item => nameToCategory[item.name.toLowerCase()] === categoryFilter
      );
      if (!hasCategory) return false;
    }

    // Item name search
    if (itemSearch.trim()) {
      const term = itemSearch.trim().toLowerCase();
      const hasItem = order.items?.some(item => item.name.toLowerCase().includes(term));
      if (!hasItem) return false;
    }

    return true;
  });

  const activeCount = orders.filter(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready').length;

  const filterBtn = (active: boolean) =>
    `text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border transition-all ${
      active ? 'bg-gold border-gold text-white' : 'border-white/10 text-white/40 hover:border-white/30'
    }`;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-serif text-2xl">Orders</h2>
          {activeCount > 0 && (
            <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 font-mono uppercase tracking-widest">
              {activeCount} active
            </span>
          )}
        </div>

        {/* Item name search */}
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            type="text"
            value={itemSearch}
            onChange={e => setItemSearch(e.target.value)}
            placeholder="Search item..."
            className="bg-white/5 border border-white/10 text-white text-xs font-mono pl-8 pr-3 py-1.5 w-44 placeholder:text-white/20 focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      {/* Filter rows */}
      <div className="space-y-2 mb-6">
        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', ...STATUS_OPTIONS] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={filterBtn(statusFilter === s)}>
              {s}
            </button>
          ))}
        </div>

        {/* Date range filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'today', 'week', 'month'] as DateRange[]).map(r => (
            <button key={r} onClick={() => setDateRange(r)} className={filterBtn(dateRange === r)}>
              {r === 'all' ? 'All Time' : r === 'today' ? 'Today' : r === 'week' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>

        {/* Category filter */}
        {categories.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {categories.map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)} className={filterBtn(categoryFilter === c)}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-white/20 font-mono text-sm">No orders found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const elapsed = order.createdAt ? elapsedLabel(order.createdAt.seconds) : null;
            const isActive = order.status === 'pending' || order.status === 'preparing' || order.status === 'ready';
            const isJustOrdered = order.createdAt && (Date.now() / 1000 - order.createdAt.seconds) < 60;

            return (
              <div
                key={order.id}
                className={`border p-5 transition-all ${CARD_STYLES[order.status]} ${isJustOrdered ? 'ring-1 ring-yellow-400/50' : ''}`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 border ${STATUS_STYLES[order.status]}`}>
                        {isJustOrdered ? '🔔 Just Ordered' : order.status}
                      </span>
                      {order.receiptNo && (
                        <span className="text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 border border-white/10 text-white/40">
                          #{order.receiptNo}
                        </span>
                      )}
                      {isActive && elapsed && (
                        <span className={`flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-widest ${
                          elapsed.urgent ? 'text-red-400' : 'text-white/40'
                        }`}>
                          {elapsed.urgent ? <Flame size={11} /> : <Clock size={11} />}
                          {elapsed.label}
                        </span>
                      )}
                    </div>
                    {order.notes && <p className="text-white/30 text-xs italic">"{order.notes}"</p>}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-gold font-mono font-bold text-lg">${order.total?.toFixed(2)}</p>
                    <p className="text-white/20 text-[10px] font-mono mt-0.5">
                      {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-white/60">{item.qty}× {item.name}</span>
                      <span className="text-white/30">${(item.qty * item.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {can.manageOrders(role) && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {STATUS_OPTIONS.filter(s => s !== order.status).map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(order.id, s)}
                        className="text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border border-white/10 text-white/40 hover:border-gold/50 hover:text-gold transition-all"
                      >
                        Mark {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
