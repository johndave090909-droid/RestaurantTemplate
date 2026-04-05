import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  available: boolean;
}

const CATEGORIES = ['Starters', 'Mains', 'Desserts', 'Drinks', 'Specials'];

const empty = (): Omit<MenuItem, 'id'> => ({
  name: '', category: 'Mains', price: 0, description: '', available: true,
});

export default function MenuTab() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());
  const [adding, setAdding] = useState(false);
  const [filterCat, setFilterCat] = useState('All');

  useEffect(() => {
    return onSnapshot(collection(db, 'menuItems'), (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
    });
  }, []);

  const save = async () => {
    if (!form.name.trim()) return;
    if (editId) {
      await updateDoc(doc(db, 'menuItems', editId), { ...form });
      setEditId(null);
    } else {
      await addDoc(collection(db, 'menuItems'), { ...form, createdAt: serverTimestamp() });
      setAdding(false);
    }
    setForm(empty());
  };

  const remove = async (id: string) => {
    if (confirm('Delete this menu item?')) await deleteDoc(doc(db, 'menuItems', id));
  };

  const startEdit = (item: MenuItem) => {
    setEditId(item.id);
    setForm({ name: item.name, category: item.category, price: item.price, description: item.description, available: item.available });
    setAdding(false);
  };

  const cancel = () => { setEditId(null); setAdding(false); setForm(empty()); };

  const filtered = filterCat === 'All' ? items : items.filter(i => i.category === filterCat);
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const g = filtered.filter(i => i.category === cat);
    if (g.length) acc[cat] = g;
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="text-white/30 text-[9px] uppercase tracking-widest font-mono block mb-1">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-serif text-2xl">Menu & Prices</h2>
        <button
          onClick={() => { setAdding(true); setEditId(null); setForm(empty()); }}
          className="flex items-center gap-2 bg-gold hover:bg-gold/80 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <Plus size={14} /> Add Item
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {(['All', ...CATEGORIES]).map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={`text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border transition-all ${
              filterCat === c ? 'bg-gold border-gold text-white' : 'border-white/10 text-white/40 hover:border-white/30'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white/3 border border-gold/30 p-5 mb-4 space-y-3">
          <p className="text-gold text-[10px] uppercase tracking-widest font-mono mb-3">New Item</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name"><input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Grilled Salmon" /></Field>
            <Field label="Category">
              <select className={inputCls + " cursor-pointer"} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Price ($)"><input type="number" min={0} step={0.01} className={inputCls} value={form.price} onChange={e => setForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} /></Field>
            <Field label="Available">
              <select className={inputCls + " cursor-pointer"} value={form.available ? 'yes' : 'no'} onChange={e => setForm(p => ({ ...p, available: e.target.value === 'yes' }))}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>
          </div>
          <Field label="Description"><input className={inputCls} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Short description" /></Field>
          <div className="flex gap-2 pt-1">
            <button onClick={save} className="flex items-center gap-2 bg-gold text-white px-4 py-2 text-xs font-bold uppercase tracking-widest"><Check size={13} /> Save</button>
            <button onClick={cancel} className="flex items-center gap-2 border border-white/10 text-white/40 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:text-white"><X size={13} /> Cancel</button>
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} className="mb-6">
          <h3 className="text-gold text-[10px] uppercase tracking-widest font-mono mb-2 flex items-center gap-3">
            {cat} <span className="h-[1px] flex-1 bg-gold/20" />
          </h3>
          <div className="space-y-2">
            {catItems.map(item => (
              <div key={item.id}>
                {editId === item.id ? (
                  <div className="bg-white/3 border border-gold/30 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Name"><input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Field>
                      <Field label="Category">
                        <select className={inputCls + " cursor-pointer"} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </Field>
                      <Field label="Price ($)"><input type="number" min={0} step={0.01} className={inputCls} value={form.price} onChange={e => setForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} /></Field>
                      <Field label="Available">
                        <select className={inputCls + " cursor-pointer"} value={form.available ? 'yes' : 'no'} onChange={e => setForm(p => ({ ...p, available: e.target.value === 'yes' }))}>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </Field>
                    </div>
                    <Field label="Description"><input className={inputCls} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></Field>
                    <div className="flex gap-2">
                      <button onClick={save} className="flex items-center gap-2 bg-gold text-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest"><Check size={12} /> Save</button>
                      <button onClick={cancel} className="flex items-center gap-2 border border-white/10 text-white/40 px-3 py-1.5 text-xs font-bold uppercase tracking-widest hover:text-white"><X size={12} /> Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className={`flex items-center justify-between gap-4 p-4 border ${item.available ? 'bg-white/3 border-white/10' : 'bg-white/1 border-white/5 opacity-50'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{item.name}</span>
                        {!item.available && <span className="text-[9px] uppercase tracking-widest font-mono text-white/30 border border-white/10 px-1.5 py-0.5">Unavailable</span>}
                      </div>
                      {item.description && <p className="text-white/30 text-xs mt-0.5 truncate">{item.description}</p>}
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-gold font-mono font-bold">${item.price.toFixed(2)}</span>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(item)} className="p-1.5 text-white/30 hover:text-gold transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => remove(item.id)} className="p-1.5 text-white/30 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && !adding && (
        <div className="text-center py-20 text-white/20 font-mono text-sm">No menu items yet. Add one above.</div>
      )}
    </div>
  );
}
