import React, { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Clock, CheckCheck, Flame, LogOut } from 'lucide-react';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  notes: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  cashier: string;
  createdAt: Timestamp | null;
  total: number;
}

const STATUS_CONFIG = {
  pending:   { label: 'New',       bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', badge: 'bg-yellow-500 text-white',    dot: 'bg-yellow-400' },
  preparing: { label: 'Preparing', bg: 'bg-blue-500/10',   border: 'border-blue-500/40',   badge: 'bg-blue-500 text-white',      dot: 'bg-blue-400'   },
  ready:     { label: 'Ready',     bg: 'bg-green-500/10',  border: 'border-green-500/40',  badge: 'bg-green-500 text-white',     dot: 'bg-green-400'  },
};

function elapsed(ts: Timestamp | null): string {
  if (!ts) return '';
  const secs = Math.floor((Date.now() - ts.toDate().getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function useElapsedTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 10000);
    return () => clearInterval(t);
  }, []);
}

export default function KitchenDisplay() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all');
  const [error, setError] = useState<string | null>(null);
  const prevOrderIds = useRef<Set<string>>(new Set());
  const audioCtx = useRef<AudioContext | null>(null);

  useElapsedTick();

  // ─── Real-time orders (active only) ────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('status', 'in', ['pending', 'preparing', 'ready'])
    );
    return onSnapshot(q, snap => {
      const incoming = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Order))
        .sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return a.createdAt.toMillis() - b.createdAt.toMillis();
        });

      // Beep on new order
      const newIds = new Set(incoming.map(o => o.id));
      const hasNew = incoming.some(o => !prevOrderIds.current.has(o.id));
      if (hasNew && prevOrderIds.current.size > 0) playBeep();
      prevOrderIds.current = newIds;

      setOrders(incoming);
    });
  }, []);

  // ─── Beep ──────────────────────────────────────────────────────────────────
  const playBeep = () => {
    try {
      if (!audioCtx.current) audioCtx.current = new AudioContext();
      const ctx = audioCtx.current;
      [0, 0.15, 0.3].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.1);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.15);
      });
    } catch {}
  };

  const updateStatus = async (id: string, status: Order['status']) => {
    setError(null);
    try {
      await updateDoc(doc(db, 'orders', id), { status });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const counts = {
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col select-none">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-3 bg-[#060606] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <ChefHat size={20} className="text-gold" />
          <h1 className="font-serif italic text-white text-xl">Kitchen Display</h1>
          <div className="h-4 w-[1px] bg-white/10" />
          <span className="text-white/20 font-mono text-[10px] uppercase tracking-widest">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Status counts */}
        <div className="hidden sm:flex items-center gap-3">
          {(['pending', 'preparing', 'ready'] as const).map(s => (
            <div key={s} className={`flex items-center gap-2 px-3 py-1.5 border ${STATUS_CONFIG[s].border} ${STATUS_CONFIG[s].bg}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[s].dot}`} />
              <span className="text-white/50 font-mono text-[10px] uppercase tracking-widest">{s}</span>
              <span className="text-white font-mono font-bold text-sm">{counts[s]}</span>
            </div>
          ))}
        </div>

        <button
          onClick={async () => { await logout(); navigate('/admin'); }}
          className="text-white/20 hover:text-red-400 transition-colors"
        >
          <LogOut size={16} />
        </button>
      </header>

      {/* ── Error bar ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs font-mono">
          Error: {error}
        </div>
      )}

      {/* ── Filter tabs ────────────────────────────────────────────────────── */}
      <div className="flex gap-2 px-4 py-3 border-b border-white/10 bg-[#080808]">
        {(['all', 'pending', 'preparing', 'ready'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border transition-all ${
              filter === f ? 'bg-gold border-gold text-white' : 'border-white/10 text-white/40 hover:border-white/30'
            }`}
          >
            {f === 'all' ? `All (${orders.length})` : `${f} (${counts[f]})`}
          </button>
        ))}
      </div>

      {/* ── Order cards ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-white/10">
            <ChefHat size={48} />
            <p className="font-mono text-sm uppercase tracking-widest">No active orders</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(order => {
              const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];
              const mins = order.createdAt
                ? Math.floor((Date.now() - order.createdAt.toDate().getTime()) / 60000)
                : 0;
              const isUrgent = mins >= 10 && order.status !== 'ready';

              return (
                <div
                  key={order.id}
                  className={`flex flex-col border ${cfg.border} ${cfg.bg} ${isUrgent ? 'ring-1 ring-red-500/50' : ''} transition-all`}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      {isUrgent && <Flame size={13} className="text-red-400 animate-pulse" />}
                    </div>
                    <div className="flex items-center gap-1 text-white/30 font-mono text-xs">
                      <Clock size={11} />
                      <span className={isUrgent ? 'text-red-400 font-bold' : ''}>
                        {elapsed(order.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="flex-1 px-4 py-3 space-y-2">
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className={`shrink-0 w-7 h-7 flex items-center justify-center font-mono font-bold text-sm ${
                          order.status === 'ready' ? 'bg-green-500/20 text-green-400' : 'bg-gold/20 text-gold'
                        }`}>
                          {item.qty}
                        </span>
                        <span className="text-white text-sm leading-tight pt-0.5">{item.name}</span>
                      </div>
                    ))}
                    {order.notes && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <p className="text-yellow-400/70 text-xs italic">"{order.notes}"</p>
                      </div>
                    )}
                  </div>

                  {/* Footer info */}
                  <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-white/20 font-mono text-[10px]">{order.cashier}</span>
                    <span className="text-white/20 font-mono text-[10px]">
                      {order.createdAt ? order.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 border-t border-white/10">
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(order.id, 'cancelled')}
                          className="py-3 text-[10px] uppercase tracking-widest font-mono text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all border-r border-white/10"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => updateStatus(order.id, 'preparing')}
                          className="py-3 text-[10px] uppercase tracking-widest font-mono text-blue-400 hover:bg-blue-500/20 transition-all font-bold"
                        >
                          Start
                        </button>
                      </>
                    )}
                    {order.status === 'preparing' && (
                      <>
                        <button
                          onClick={() => updateStatus(order.id, 'pending')}
                          className="py-3 text-[10px] uppercase tracking-widest font-mono text-white/20 hover:text-white/40 hover:bg-white/5 transition-all border-r border-white/10"
                        >
                          ← Back
                        </button>
                        <button
                          onClick={() => updateStatus(order.id, 'ready')}
                          className="py-3 text-[10px] uppercase tracking-widest font-mono text-green-400 hover:bg-green-500/20 transition-all font-bold flex items-center justify-center gap-1"
                        >
                          <CheckCheck size={12} /> Ready
                        </button>
                      </>
                    )}
                    {order.status === 'ready' && (
                      <button
                        onClick={() => updateStatus(order.id, 'completed')}
                        className="col-span-2 py-3 text-[10px] uppercase tracking-widest font-mono text-white/40 hover:text-white hover:bg-white/5 transition-all"
                      >
                        Mark Collected
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
