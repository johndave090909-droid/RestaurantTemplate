import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth, Role } from '../../../context/AuthContext';
import { UserPlus, Trash2, Shield } from 'lucide-react';

interface StaffUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  photoURL?: string;
}

const ROLES: Role[] = ['admin', 'manager', 'staff'];
const ROLE_COLORS: Record<Role, string> = {
  superAdmin: 'text-gold border-gold/30 bg-gold/10',
  admin: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  manager: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  staff: 'text-white/40 border-white/10 bg-white/5',
};

export default function StaffTab() {
  const { user: currentUser, role: currentRole } = useAuth();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>('staff');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffUser)));
    });
  }, []);

  const addStaff = async () => {
    if (!newEmail.trim() || !newName.trim()) return;
    const id = `invite_${Date.now()}`;
    await setDoc(doc(db, 'users', id), {
      email: newEmail.trim().toLowerCase(),
      displayName: newName.trim(),
      role: newRole,
      invited: true,
    });
    setNewEmail('');
    setNewName('');
    setNewRole('staff');
    setAdding(false);
  };

  const changeRole = async (id: string, role: Role) => {
    await updateDoc(doc(db, 'users', id), { role });
  };

  const remove = async (id: string) => {
    if (confirm('Remove this staff member?')) await deleteDoc(doc(db, 'users', id));
  };

  const inputCls = "bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-serif text-2xl">Staff Access</h2>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-2 bg-gold hover:bg-gold/80 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <UserPlus size={14} /> Add Staff
        </button>
      </div>

      {adding && (
        <div className="bg-white/3 border border-gold/30 p-5 mb-6 space-y-3">
          <p className="text-gold text-[10px] uppercase tracking-widest font-mono">New Staff Member</p>
          <p className="text-white/30 text-xs font-mono">They must sign in with this Google account to gain access.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-white/30 text-[9px] uppercase tracking-widest font-mono block mb-1">Full Name</label>
              <input className={inputCls + " w-full"} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="text-white/30 text-[9px] uppercase tracking-widest font-mono block mb-1">Google Email</label>
              <input type="email" className={inputCls + " w-full"} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="jane@gmail.com" />
            </div>
            <div>
              <label className="text-white/30 text-[9px] uppercase tracking-widest font-mono block mb-1">Role</label>
              <select className={inputCls + " w-full cursor-pointer"} value={newRole} onChange={e => setNewRole(e.target.value as Role)}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addStaff} className="bg-gold text-white px-4 py-2 text-xs font-bold uppercase tracking-widest">Save</button>
            <button onClick={() => setAdding(false)} className="border border-white/10 text-white/40 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:text-white">Cancel</button>
          </div>
        </div>
      )}

      {/* Role legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {([['superAdmin', 'Full access + site settings'], ['admin', 'Staff mgmt + all ops'], ['manager', 'Orders, reservations, menu'], ['staff', 'View orders & reservations']] as const).map(([r, desc]) => (
          <div key={r} className={`p-3 border text-[10px] font-mono ${ROLE_COLORS[r]}`}>
            <div className="uppercase tracking-widest font-bold mb-1 flex items-center gap-1"><Shield size={10} /> {r}</div>
            <div className="opacity-70">{desc}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {staff.map(member => (
          <div key={member.id} className="flex items-center justify-between gap-4 bg-white/3 border border-white/10 p-4 flex-wrap">
            <div className="flex items-center gap-3">
              {member.photoURL
                ? <img src={member.photoURL} className="w-8 h-8 rounded-full" alt="" />
                : <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/40 text-xs font-bold">{member.displayName?.[0] ?? '?'}</div>
              }
              <div>
                <p className="text-white text-sm font-medium">{member.displayName || '—'}</p>
                <p className="text-white/30 text-xs font-mono">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {member.role === 'superAdmin' || member.id === currentUser?.uid ? (
                <span className={`text-[10px] uppercase tracking-widest font-mono px-2 py-1 border ${ROLE_COLORS[member.role]}`}>
                  {member.role}
                </span>
              ) : (
                <select
                  value={member.role}
                  onChange={e => changeRole(member.id, e.target.value as Role)}
                  className="bg-white/5 border border-white/10 px-2 py-1 text-white text-xs font-mono focus:outline-none focus:border-gold/50 cursor-pointer"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
              {member.role !== 'superAdmin' && member.id !== currentUser?.uid && (
                <button onClick={() => remove(member.id)} className="p-1.5 text-white/20 hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
