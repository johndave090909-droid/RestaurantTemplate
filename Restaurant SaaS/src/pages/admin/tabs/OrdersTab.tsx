import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth, can } from '../../../context/AuthContext';
import { Clock, Flame } from 'lucide-react';

interface Order {
  id: string;
  customerName: string;
  phone: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  notes: string;
  createdAt: { seconds: number } | null;
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
  const [filter, setFilter] = useState<'all' | Order['status']>('all');

  useElapsedTick();

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });
  }, []);

  const updateStatus = async (id: string, status: Order['status']) => {
    await updateDoc(doc(db, 'orders', id), { status });
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  // Count active (non-completed, non-cancelled)
  const activeCount = orders.filter(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-serif text-2xl">Orders</h2>
          {activeCount > 0 && (
            <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 font-mono uppercase tracking-widest">
              {activeCount} active
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', ...STATUS_OPTIONS] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border transition-all ${
                filter === s ? 'bg-gold border-gold text-white' : 'border-white/10 text-white/40 hover:border-white/30'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
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
                  {/* Left: status + info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 border ${STATUS_STYLES[order.status]}`}>
                        {isJustOrdered ? '🔔 Just Ordered' : order.status}
                      </span>
                      {/* Elapsed time — only for active orders */}
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

                  {/* Right: total + date */}
                  <div className="text-right shrink-0">
                    <p className="text-gold font-mono font-bold text-lg">${order.total?.toFixed(2)}</p>
                    <p className="text-white/20 text-[10px] font-mono mt-0.5">
                      {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : '—'}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-white/60">{item.qty}× {item.name}</span>
                      <span className="text-white/30">${(item.qty * item.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
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
