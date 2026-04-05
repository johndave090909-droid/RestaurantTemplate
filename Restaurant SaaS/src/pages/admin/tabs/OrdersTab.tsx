import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth, can } from '../../../context/AuthContext';
import { Clock, CheckCircle, XCircle, ChefHat } from 'lucide-react';

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
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  preparing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ready: 'bg-green-500/10 text-green-400 border-green-500/20',
  completed: 'bg-white/5 text-white/30 border-white/10',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const STATUS_OPTIONS: Order['status'][] = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

export default function OrdersTab() {
  const { role } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | Order['status']>('all');

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-serif text-2xl">Orders</h2>
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
          {filtered.map(order => (
            <div key={order.id} className="bg-white/3 border border-white/10 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-white font-medium">{order.customerName}</span>
                    <span className={`text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 border ${STATUS_STYLES[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-white/30 text-xs font-mono">{order.phone}</p>
                  {order.notes && <p className="text-white/30 text-xs mt-1 italic">"{order.notes}"</p>}
                </div>
                <div className="text-right">
                  <p className="text-gold font-mono font-bold">${order.total?.toFixed(2)}</p>
                  <p className="text-white/20 text-[10px] font-mono mt-1">
                    {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : '—'}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="space-y-1">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-white/50">{item.qty}× {item.name}</span>
                      <span className="text-white/30">${(item.qty * item.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
