import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth, can } from '../../../context/AuthContext';
import { Users, Calendar } from 'lucide-react';

interface Reservation {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  notes: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: { seconds: number } | null;
}

const STATUS_STYLES: Record<Reservation['status'], string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  completed: 'bg-white/5 text-white/30 border-white/10',
};

export default function ReservationsTab() {
  const { role } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<'all' | Reservation['status']>('all');

  useEffect(() => {
    const q = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setReservations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reservation)));
    });
  }, []);

  const updateStatus = async (id: string, status: Reservation['status']) => {
    await updateDoc(doc(db, 'reservations', id), { status });
  };

  const filtered = filter === 'all' ? reservations : reservations.filter(r => r.status === filter);
  const statusOptions: Reservation['status'][] = ['pending', 'confirmed', 'cancelled', 'completed'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-serif text-2xl">Reservations</h2>
        <div className="flex gap-2 flex-wrap">
          {(['all', ...statusOptions] as const).map(s => (
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
        <div className="text-center py-20 text-white/20 font-mono text-sm">No reservations found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-white/3 border border-white/10 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-white font-medium">{r.name}</span>
                    <span className={`text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 border ${STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-white/30 text-xs font-mono mt-1">
                    <span>{r.email}</span>
                    <span>{r.phone}</span>
                  </div>
                  {r.notes && <p className="text-white/30 text-xs mt-1 italic">"{r.notes}"</p>}
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-2 justify-end text-white/60 text-sm">
                    <Calendar size={13} className="text-gold" />
                    <span>{r.date} at {r.time}</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end text-white/40 text-xs">
                    <Users size={12} className="text-gold/60" />
                    <span>{r.guests} guest{r.guests !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              {can.manageReservations(role) && (
                <div className="mt-4 flex gap-2 flex-wrap">
                  {statusOptions.filter(s => s !== r.status).map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(r.id, s)}
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
