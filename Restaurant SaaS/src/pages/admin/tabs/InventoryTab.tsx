import React, { useEffect, useState } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy, getDoc, setDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import {
  Plus, Pencil, Trash2, Check, X, Package, AlertTriangle, TrendingDown,
  Settings2, ClipboardList, ArrowLeftRight, Bell, BarChart2, RefreshCw, Printer,
  Truck, Phone, Mail, MapPin, Globe, User,
} from 'lucide-react';
import { useAuth, can } from '../../../context/AuthContext';
import SeedInventoryButton from './SeedInventoryButton';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  minThreshold: number;
  supplier: string;
  notes: string;
  lastOrdered?: any;
}

const BASE_CATEGORIES = ['Produce', 'Dairy', 'Meat & Poultry', 'Seafood', 'Pantry', 'Beverages', 'Dry Goods'];
const BASE_UNITS = ['kg', 'g', 'L', 'mL', 'pcs', 'boxes', 'bottles', 'cans'];
const STATUS_FILTERS = ['All', 'In Stock', 'Low Stock', 'Out of Stock'];

type PanelMode = 'customize' | 'count' | 'convert' | 'remind' | 'report' | 'update' | 'suppliers' | null;

interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  notes: string;
}

const emptySupplier = (): Omit<Supplier, 'id'> => ({
  name: '', contact: '', phone: '', email: '', address: '', website: '', notes: '',
});

// Supported conversions (factor = how many [toUnit] per 1 [fromUnit])
const CONVERSION: Record<string, Record<string, number>> = {
  kg:  { kg: 1,     g: 1000  },
  g:   { g: 1,      kg: 0.001 },
  L:   { L: 1,      mL: 1000 },
  mL:  { mL: 1,     L: 0.001 },
};

function stockStatus(item: InventoryItem): 'In Stock' | 'Low Stock' | 'Out of Stock' {
  if (item.quantity === 0) return 'Out of Stock';
  if (item.quantity <= item.minThreshold) return 'Low Stock';
  return 'In Stock';
}

const STATUS_BADGE: Record<string, string> = {
  'In Stock':     'bg-green-500/10 text-green-400 border-green-500/20',
  'Low Stock':    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'Out of Stock': 'bg-red-500/10 text-red-400 border-red-500/20',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-white/30 text-[9px] uppercase tracking-widest font-mono block mb-1">{label}</label>
      {children}
    </div>
  );
}

const emptyForm = (): Omit<InventoryItem, 'id'> => ({
  name: '', category: 'Produce', quantity: 0, unit: 'kg',
  costPerUnit: 0, minThreshold: 5, supplier: '', notes: '',
});

export default function InventoryTab() {
  const { role } = useAuth();
  const canManage = can.manageInventory(role);

  // ── Core state ──────────────────────────────────────
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [filterCat, setFilterCat] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // ── Panel state ──────────────────────────────────────
  const [activePanel, setActivePanel] = useState<PanelMode>(null);

  // Customize
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customUnits, setCustomUnits] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newUnit, setNewUnit] = useState('');

  // Count
  const [countInputs, setCountInputs] = useState<Record<string, string>>({});
  const [countSaving, setCountSaving] = useState(false);

  // Convert
  const [convAmount, setConvAmount] = useState('');
  const [convFrom, setConvFrom] = useState('kg');
  const [convTo, setConvTo] = useState('g');

  // Update
  const [updateInputs, setUpdateInputs] = useState<Record<string, string>>({});
  const [updateSaving, setUpdateSaving] = useState(false);

  // Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierForm, setSupplierForm] = useState(emptySupplier());
  const [supplierEditId, setSupplierEditId] = useState<string | null>(null);
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>(null);

  const CATEGORIES = [...BASE_CATEGORIES, ...customCategories];
  const UNITS = [...BASE_UNITS, ...customUnits];

  // ── Effects ──────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'inventoryItems'), orderBy('name'));
    return onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'suppliers'), orderBy('name'));
    return onSnapshot(q, snap => {
      setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier)));
    });
  }, []);

  useEffect(() => {
    getDoc(doc(db, 'inventorySettings', 'main')).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setCustomCategories(data.customCategories ?? []);
        setCustomUnits(data.customUnits ?? []);
      }
    });
  }, []);

  // Seed count & update inputs for newly-loaded items (preserve existing edits)
  useEffect(() => {
    setCountInputs(prev => {
      const next = { ...prev };
      items.forEach(i => { if (!(i.id in next)) next[i.id] = ''; });
      return next;
    });
    setUpdateInputs(prev => {
      const next = { ...prev };
      items.forEach(i => { if (!(i.id in next)) next[i.id] = String(i.quantity); });
      return next;
    });
  }, [items]);

  const togglePanel = (p: PanelMode) => {
    setActivePanel(prev => prev === p ? null : p);
    setAdding(false);
    setEditId(null);
  };

  // ── CRUD ─────────────────────────────────────────────
  const save = async () => {
    if (!form.name.trim()) return;
    if (editId) {
      await updateDoc(doc(db, 'inventoryItems', editId), { ...form, updatedAt: serverTimestamp() });
      setEditId(null);
    } else {
      await addDoc(collection(db, 'inventoryItems'), { ...form, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      setAdding(false);
    }
    setForm(emptyForm());
  };
  const remove = async (id: string) => {
    if (confirm('Delete this inventory item?')) await deleteDoc(doc(db, 'inventoryItems', id));
  };
  const startEdit = (item: InventoryItem) => {
    setEditId(item.id);
    setForm({ name: item.name, category: item.category, quantity: item.quantity, unit: item.unit, costPerUnit: item.costPerUnit, minThreshold: item.minThreshold, supplier: item.supplier, notes: item.notes });
    setAdding(false);
    setActivePanel(null);
  };
  const cancel = () => { setEditId(null); setAdding(false); setForm(emptyForm()); };
  const adjustQty = async (item: InventoryItem, delta: number) => {
    const next = Math.max(0, item.quantity + delta);
    await updateDoc(doc(db, 'inventoryItems', item.id), { quantity: next, updatedAt: serverTimestamp() });
  };

  // ── Suppliers ────────────────────────────────────────
  const saveSupplier = async () => {
    if (!supplierForm.name.trim()) return;
    if (supplierEditId) {
      await updateDoc(doc(db, 'suppliers', supplierEditId), { ...supplierForm, updatedAt: serverTimestamp() });
      setSupplierEditId(null);
    } else {
      await addDoc(collection(db, 'suppliers'), { ...supplierForm, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      setAddingSupplier(false);
    }
    setSupplierForm(emptySupplier());
  };
  const removeSupplier = async (id: string) => {
    if (confirm('Delete this supplier?')) await deleteDoc(doc(db, 'suppliers', id));
  };
  const startEditSupplier = (s: Supplier) => {
    setSupplierEditId(s.id);
    setSupplierForm({ name: s.name, contact: s.contact, phone: s.phone, email: s.email, address: s.address, website: s.website, notes: s.notes });
    setAddingSupplier(false);
    setExpandedSupplierId(null);
  };
  const cancelSupplier = () => { setSupplierEditId(null); setAddingSupplier(false); setSupplierForm(emptySupplier()); };

  // ── Customize ─────────────────────────────────────────
  const saveSettings = async (cats: string[], units: string[]) =>
    setDoc(doc(db, 'inventorySettings', 'main'), { customCategories: cats, customUnits: units });

  const addCategory = async () => {
    const t = newCategory.trim();
    if (!t || CATEGORIES.includes(t)) return;
    const updated = [...customCategories, t];
    setCustomCategories(updated); setNewCategory('');
    await saveSettings(updated, customUnits);
  };
  const removeCategory = async (cat: string) => {
    const updated = customCategories.filter(c => c !== cat);
    setCustomCategories(updated);
    await saveSettings(updated, customUnits);
  };
  const addUnit = async () => {
    const t = newUnit.trim();
    if (!t || UNITS.includes(t)) return;
    const updated = [...customUnits, t];
    setCustomUnits(updated); setNewUnit('');
    await saveSettings(customCategories, updated);
  };
  const removeUnit = async (u: string) => {
    const updated = customUnits.filter(x => x !== u);
    setCustomUnits(updated);
    await saveSettings(customCategories, updated);
  };

  // ── Count ─────────────────────────────────────────────
  const saveCount = async () => {
    setCountSaving(true);
    const batch = writeBatch(db);
    items.forEach(item => {
      const val = parseFloat(countInputs[item.id] ?? '');
      if (!isNaN(val) && countInputs[item.id] !== '') {
        batch.update(doc(db, 'inventoryItems', item.id), { quantity: val, updatedAt: serverTimestamp() });
      }
    });
    await batch.commit();
    setCountSaving(false);
    const reset: Record<string, string> = {};
    items.forEach(i => { reset[i.id] = ''; });
    setCountInputs(reset);
  };

  // ── Convert ───────────────────────────────────────────
  const convResult = (() => {
    const amount = parseFloat(convAmount);
    if (isNaN(amount) || convAmount === '') return null;
    const factor = CONVERSION[convFrom]?.[convTo];
    return factor !== undefined ? amount * factor : null;
  })();
  const canConvert = CONVERSION[convFrom]?.[convTo] !== undefined;

  // ── Remind ────────────────────────────────────────────
  const needsReorder = items.filter(i => stockStatus(i) !== 'In Stock');
  const markOrdered = async (id: string) =>
    updateDoc(doc(db, 'inventoryItems', id), { lastOrdered: serverTimestamp() });

  // ── Update ────────────────────────────────────────────
  const saveUpdates = async () => {
    setUpdateSaving(true);
    const batch = writeBatch(db);
    items.forEach(item => {
      const val = parseFloat(updateInputs[item.id] ?? '');
      if (!isNaN(val) && val !== item.quantity) {
        batch.update(doc(db, 'inventoryItems', item.id), { quantity: val, updatedAt: serverTimestamp() });
      }
    });
    await batch.commit();
    setUpdateSaving(false);
  };

  // ── Report ────────────────────────────────────────────
  const categoryReport = CATEGORIES.map(cat => {
    const catItems = items.filter(i => i.category === cat);
    return {
      cat,
      count: catItems.length,
      value: catItems.reduce((s, i) => s + i.quantity * i.costPerUnit, 0),
      alertCount: catItems.filter(i => stockStatus(i) !== 'In Stock').length,
    };
  }).filter(r => r.count > 0);

  // ── Filtering ─────────────────────────────────────────
  const filtered = items.filter(item => {
    const catMatch = filterCat === 'All' || item.category === filterCat;
    const statusMatch = filterStatus === 'All' || stockStatus(item) === filterStatus;
    return catMatch && statusMatch;
  });
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const g = filtered.filter(i => i.category === cat);
    if (g.length) acc[cat] = g;
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  // ── Stats ─────────────────────────────────────────────
  const totalItems   = items.length;
  const inStockCount = items.filter(i => stockStatus(i) === 'In Stock').length;
  const lowCount     = items.filter(i => stockStatus(i) === 'Low Stock').length;
  const outCount     = items.filter(i => stockStatus(i) === 'Out of Stock').length;
  const totalValue   = items.reduce((s, i) => s + i.quantity * i.costPerUnit, 0);

  // ── Styles ────────────────────────────────────────────
  const inputCls  = "w-full bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors";
  const selectCls = "w-full bg-zinc-900 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors cursor-pointer [&>option]:bg-zinc-900 [&>option]:text-white";

  const PANEL_BUTTONS: { id: PanelMode; label: string; icon: React.ReactNode }[] = [
    { id: 'customize', label: 'Customize',  icon: <Settings2 size={13} />     },
    { id: 'count',     label: 'Count',      icon: <ClipboardList size={13} /> },
    { id: 'convert',   label: 'Convert',    icon: <ArrowLeftRight size={13} />},
    { id: 'remind',    label: 'Remind',     icon: <Bell size={13} />          },
    { id: 'report',    label: 'Report',     icon: <BarChart2 size={13} />     },
    { id: 'update',    label: 'Update',     icon: <RefreshCw size={13} />     },
    { id: 'suppliers', label: 'Suppliers',  icon: <Truck size={13} />         },
  ];

  // ─────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-white font-serif text-2xl">Inventory</h2>
        {canManage && (
          <div className="flex items-center gap-2">
            <SeedInventoryButton />
            <button
              onClick={() => { setAdding(true); setEditId(null); setForm(emptyForm()); setActivePanel(null); }}
              className="flex items-center gap-2 bg-gold hover:bg-gold/80 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all"
            >
              <Plus size={14} /> Add Item
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Items',  value: totalItems,   icon: <Package size={16} />,      cls: 'text-white/60'  },
          { label: 'In Stock',     value: inStockCount, icon: <Check size={16} />,         cls: 'text-green-400' },
          { label: 'Low Stock',    value: lowCount,     icon: <AlertTriangle size={16} />, cls: 'text-yellow-400'},
          { label: 'Out of Stock', value: outCount,     icon: <TrendingDown size={16} />,  cls: 'text-red-400'   },
        ].map(stat => (
          <div key={stat.label} className="bg-white/3 border border-white/10 p-4">
            <div className={`flex items-center gap-2 mb-1 ${stat.cls}`}>
              {stat.icon}
              <span className="text-[10px] uppercase tracking-widest font-mono">{stat.label}</span>
            </div>
            <p className="text-white font-serif text-2xl">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Stock value */}
      <div className="bg-white/3 border border-white/10 px-4 py-3 mb-6 flex items-center justify-between">
        <span className="text-white/40 text-[10px] uppercase tracking-widest font-mono">Estimated Stock Value</span>
        <span className="text-gold font-mono font-bold text-lg">${totalValue.toFixed(2)}</span>
      </div>

      {/* ── Action panel buttons ── */}
      <div className="flex gap-2 flex-wrap mb-6">
        {PANEL_BUTTONS.map(p => (
          <button
            key={p.id}
            onClick={() => togglePanel(p.id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all ${
              activePanel === p.id
                ? 'bg-gold border-gold text-white'
                : 'border-white/10 text-white/40 hover:border-gold/50 hover:text-gold'
            }`}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════
          CUSTOMIZE PANEL
      ════════════════════════════════════════════════════ */}
      {activePanel === 'customize' && (
        <div className="bg-white/3 border border-gold/30 p-5 mb-6 space-y-6">
          <p className="text-gold text-[10px] uppercase tracking-widest font-mono">Customize Categories & Units</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Categories */}
            <div>
              <p className="text-white/40 text-[9px] uppercase tracking-widest font-mono mb-3">Categories</p>
              <div className="flex gap-2 mb-3">
                <input
                  className={inputCls}
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCategory()}
                  placeholder="New category name"
                />
                <button onClick={addCategory} className="shrink-0 bg-gold hover:bg-gold/80 text-white px-3 py-2 transition-all">
                  <Plus size={14} />
                </button>
              </div>
              <div className="space-y-1">
                {BASE_CATEGORIES.map(c => (
                  <div key={c} className="flex items-center justify-between px-3 py-1.5 border border-white/5">
                    <span className="text-white/30 text-xs font-mono">{c}</span>
                    <span className="text-white/20 text-[9px] uppercase tracking-widest font-mono">default</span>
                  </div>
                ))}
                {customCategories.map(c => (
                  <div key={c} className="flex items-center justify-between px-3 py-1.5 border border-gold/20 bg-gold/5">
                    <span className="text-white text-xs font-mono">{c}</span>
                    <button onClick={() => removeCategory(c)} className="text-white/30 hover:text-red-400 transition-colors"><X size={12} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Units */}
            <div>
              <p className="text-white/40 text-[9px] uppercase tracking-widest font-mono mb-3">Units</p>
              <div className="flex gap-2 mb-3">
                <input
                  className={inputCls}
                  value={newUnit}
                  onChange={e => setNewUnit(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addUnit()}
                  placeholder="New unit (e.g. trays)"
                />
                <button onClick={addUnit} className="shrink-0 bg-gold hover:bg-gold/80 text-white px-3 py-2 transition-all">
                  <Plus size={14} />
                </button>
              </div>
              <div className="space-y-1">
                {BASE_UNITS.map(u => (
                  <div key={u} className="flex items-center justify-between px-3 py-1.5 border border-white/5">
                    <span className="text-white/30 text-xs font-mono">{u}</span>
                    <span className="text-white/20 text-[9px] uppercase tracking-widest font-mono">default</span>
                  </div>
                ))}
                {customUnits.map(u => (
                  <div key={u} className="flex items-center justify-between px-3 py-1.5 border border-gold/20 bg-gold/5">
                    <span className="text-white text-xs font-mono">{u}</span>
                    <button onClick={() => removeUnit(u)} className="text-white/30 hover:text-red-400 transition-colors"><X size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          COUNT PANEL
      ════════════════════════════════════════════════════ */}
      {activePanel === 'count' && (
        <div className="bg-white/3 border border-gold/30 p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <p className="text-gold text-[10px] uppercase tracking-widest font-mono">Stock Count</p>
              <p className="text-white/30 text-xs mt-0.5">Enter actual counts. Leave blank to skip an item.</p>
            </div>
            <button
              onClick={saveCount}
              disabled={countSaving}
              className="flex items-center gap-2 bg-gold hover:bg-gold/80 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
            >
              <Check size={13} /> {countSaving ? 'Saving…' : 'Save Count'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[480px]">
              {/* Header */}
              <div className="grid grid-cols-[1fr_90px_110px_90px] gap-3 px-3 pb-2 border-b border-white/10">
                <span className="text-white/30 text-[9px] uppercase tracking-widest font-mono">Item</span>
                <span className="text-white/30 text-[9px] uppercase tracking-widest font-mono text-right">Current</span>
                <span className="text-white/30 text-[9px] uppercase tracking-widest font-mono text-center">New Count</span>
                <span className="text-white/30 text-[9px] uppercase tracking-widest font-mono text-right">Variance</span>
              </div>
              {items.map(item => {
                const newVal = parseFloat(countInputs[item.id] ?? '');
                const hasInput = countInputs[item.id] !== '' && !isNaN(newVal);
                const variance = hasInput ? newVal - item.quantity : null;
                return (
                  <div key={item.id} className="grid grid-cols-[1fr_90px_110px_90px] gap-3 items-center px-3 py-2 border-b border-white/5">
                    <div>
                      <span className="text-white text-sm">{item.name}</span>
                      <span className="text-white/30 text-xs ml-2 font-mono">{item.unit}</span>
                    </div>
                    <span className="text-white/50 font-mono text-sm text-right">{item.quantity}</span>
                    <input
                      type="number" min={0} step={0.1}
                      placeholder={String(item.quantity)}
                      className="bg-white/5 border border-white/10 px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-gold/50 w-full"
                      value={countInputs[item.id] ?? ''}
                      onChange={e => setCountInputs(p => ({ ...p, [item.id]: e.target.value }))}
                    />
                    <span className={`font-mono text-sm text-right ${
                      variance === null ? 'text-white/20' :
                      variance > 0 ? 'text-green-400' :
                      variance < 0 ? 'text-red-400' : 'text-white/40'
                    }`}>
                      {variance === null ? '—' : variance > 0 ? `+${variance.toFixed(1)}` : variance.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          CONVERT PANEL
      ════════════════════════════════════════════════════ */}
      {activePanel === 'convert' && (
        <div className="bg-white/3 border border-gold/30 p-5 mb-6">
          <p className="text-gold text-[10px] uppercase tracking-widest font-mono mb-4">Unit Converter</p>
          <div className="grid grid-cols-3 gap-4 max-w-lg mb-4">
            <Field label="Amount">
              <input
                type="number" min={0} step={0.01}
                className={inputCls}
                value={convAmount}
                onChange={e => setConvAmount(e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="From">
              <select className={selectCls} value={convFrom} onChange={e => setConvFrom(e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="To">
              <select className={selectCls} value={convTo} onChange={e => setConvTo(e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>

          <div className="inline-flex items-center gap-3 border border-white/10 bg-white/3 px-5 py-3">
            {convFrom === convTo ? (
              <span className="text-white/50 font-mono">{convAmount || '0'} {convFrom}</span>
            ) : canConvert ? (
              <>
                <span className="text-white/50 font-mono text-sm">{convAmount || '0'} {convFrom}</span>
                <span className="text-white/30">=</span>
                <span className="text-gold font-mono font-bold text-lg">
                  {convResult !== null
                    ? convResult.toLocaleString(undefined, { maximumFractionDigits: 4 })
                    : '—'} {convTo}
                </span>
              </>
            ) : (
              <span className="text-red-400 text-xs font-mono">Cannot convert {convFrom} → {convTo}</span>
            )}
          </div>
          <p className="text-white/20 text-[10px] font-mono mt-3 uppercase tracking-widest">Supported: kg ↔ g · L ↔ mL</p>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          REMIND PANEL
      ════════════════════════════════════════════════════ */}
      {activePanel === 'remind' && (
        <div className="bg-white/3 border border-gold/30 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gold text-[10px] uppercase tracking-widest font-mono">Reorder Reminders</p>
              <p className="text-white/30 text-xs mt-0.5">
                {needsReorder.length} item{needsReorder.length !== 1 ? 's' : ''} need{needsReorder.length === 1 ? 's' : ''} attention
              </p>
            </div>
          </div>

          {needsReorder.length === 0 ? (
            <div className="text-center py-10 text-white/20 font-mono text-sm">
              All items are sufficiently stocked.
            </div>
          ) : (
            <div className="space-y-2">
              {needsReorder.map(item => {
                const status = stockStatus(item);
                const suggestedQty = Math.max(item.minThreshold * 2, item.minThreshold - item.quantity + item.minThreshold);
                return (
                  <div key={item.id} className={`flex items-center gap-4 p-4 border flex-wrap ${
                    status === 'Out of Stock' ? 'bg-red-500/5 border-red-500/20' : 'bg-yellow-500/5 border-yellow-500/20'
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">{item.name}</span>
                        <span className={`text-[9px] uppercase tracking-widest font-mono px-1.5 py-0.5 border ${STATUS_BADGE[status]}`}>{status}</span>
                      </div>
                      <p className="text-white/30 text-xs mt-0.5">
                        {item.quantity} {item.unit} left · threshold: {item.minThreshold} {item.unit}
                        {item.supplier ? ` · ${item.supplier}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white/40 text-[9px] uppercase tracking-widest font-mono">Suggested reorder</p>
                      <p className="text-gold font-mono font-bold">{suggestedQty} {item.unit}</p>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => markOrdered(item.id)}
                        className="shrink-0 flex items-center gap-1.5 border border-white/10 text-white/40 hover:border-green-400/40 hover:text-green-400 px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all"
                      >
                        <Check size={12} /> Ordered
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          REPORT PANEL
      ════════════════════════════════════════════════════ */}
      {activePanel === 'report' && (
        <div className="bg-white/3 border border-gold/30 p-5 mb-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-gold text-[10px] uppercase tracking-widest font-mono">Inventory Report</p>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 border border-white/10 text-white/40 hover:border-gold/50 hover:text-gold px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all"
            >
              <Printer size={13} /> Print
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Total Items',     value: totalItems },
              { label: 'Total Value',     value: `$${totalValue.toFixed(2)}` },
              { label: 'Needs Reorder',   value: needsReorder.length },
            ].map(s => (
              <div key={s.label} className="border border-white/10 px-4 py-3">
                <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono mb-1">{s.label}</p>
                <p className="text-gold font-mono font-bold text-xl">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Category breakdown */}
          <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono mb-2">By Category</p>
          <div className="space-y-1 mb-6">
            {categoryReport.map(r => (
              <div key={r.cat} className="flex items-center gap-4 px-3 py-2.5 border border-white/5">
                <span className="text-white text-sm flex-1">{r.cat}</span>
                <span className="text-white/40 font-mono text-xs">{r.count} item{r.count !== 1 ? 's' : ''}</span>
                {r.alertCount > 0 && (
                  <span className="text-yellow-400 text-[9px] font-mono uppercase tracking-widest">{r.alertCount} low/out</span>
                )}
                <span className="text-gold font-mono font-bold text-sm min-w-[80px] text-right">${r.value.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Needs reorder list */}
          {needsReorder.length > 0 && (
            <>
              <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono mb-2">Needs Reorder</p>
              <div className="space-y-1">
                {needsReorder.map(item => (
                  <div key={item.id} className="flex items-center gap-4 px-3 py-2 border border-white/5">
                    <span className="text-white text-sm flex-1">{item.name}</span>
                    <span className={`text-[9px] uppercase tracking-widest font-mono px-1.5 py-0.5 border ${STATUS_BADGE[stockStatus(item)]}`}>{stockStatus(item)}</span>
                    <span className="text-white/40 font-mono text-xs">{item.quantity}/{item.minThreshold} {item.unit}</span>
                    {item.supplier && <span className="text-white/30 text-xs">{item.supplier}</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          UPDATE PANEL
      ════════════════════════════════════════════════════ */}
      {activePanel === 'update' && (
        <div className="bg-white/3 border border-gold/30 p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <p className="text-gold text-[10px] uppercase tracking-widest font-mono">Bulk Quantity Update</p>
              <p className="text-white/30 text-xs mt-0.5">Edit multiple quantities and save all at once.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const reset: Record<string, string> = {};
                  items.forEach(i => { reset[i.id] = String(i.quantity); });
                  setUpdateInputs(reset);
                }}
                className="flex items-center gap-2 border border-white/10 text-white/40 hover:text-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all"
              >
                <RefreshCw size={12} /> Reset
              </button>
              <button
                onClick={saveUpdates}
                disabled={updateSaving}
                className="flex items-center gap-2 bg-gold hover:bg-gold/80 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
              >
                <Check size={13} /> {updateSaving ? 'Saving…' : 'Save All'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              <div className="grid grid-cols-[1fr_130px_70px] gap-3 px-3 pb-2 border-b border-white/10">
                <span className="text-white/30 text-[9px] uppercase tracking-widest font-mono">Item</span>
                <span className="text-white/30 text-[9px] uppercase tracking-widest font-mono text-center">Quantity</span>
                <span className="text-white/30 text-[9px] uppercase tracking-widest font-mono text-right">Unit</span>
              </div>
              {items.map(item => {
                const newVal = parseFloat(updateInputs[item.id] ?? '');
                const changed = !isNaN(newVal) && newVal !== item.quantity;
                return (
                  <div key={item.id} className={`grid grid-cols-[1fr_130px_70px] gap-3 items-center px-3 py-2 border-b border-white/5 ${changed ? 'bg-gold/5' : ''}`}>
                    <span className="text-white text-sm">{item.name}</span>
                    <input
                      type="number" min={0} step={0.1}
                      className={`bg-white/5 border px-2 py-1.5 text-white text-sm text-center focus:outline-none transition-colors w-full ${
                        changed ? 'border-gold/40 focus:border-gold' : 'border-white/10 focus:border-gold/50'
                      }`}
                      value={updateInputs[item.id] ?? ''}
                      onChange={e => setUpdateInputs(p => ({ ...p, [item.id]: e.target.value }))}
                    />
                    <span className="text-white/40 text-xs font-mono text-right">{item.unit}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          SUPPLIERS PANEL
      ════════════════════════════════════════════════════ */}
      {activePanel === 'suppliers' && (
        <div className="bg-white/3 border border-gold/30 p-5 mb-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <p className="text-gold text-[10px] uppercase tracking-widest font-mono">Suppliers & Vendors</p>
              <p className="text-white/30 text-xs mt-0.5">{suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} on record</p>
            </div>
            {canManage && !addingSupplier && !supplierEditId && (
              <button
                onClick={() => { setAddingSupplier(true); setSupplierForm(emptySupplier()); }}
                className="flex items-center gap-2 bg-gold hover:bg-gold/80 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all"
              >
                <Plus size={14} /> Add Supplier
              </button>
            )}
          </div>

          {/* Add form */}
          {addingSupplier && canManage && (
            <div className="bg-white/3 border border-gold/20 p-4 mb-4 space-y-3">
              <p className="text-gold text-[10px] uppercase tracking-widest font-mono mb-2">New Supplier</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Company Name *">
                  <input className={inputCls} value={supplierForm.name} onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Ocean Fresh Co." />
                </Field>
                <Field label="Contact Person">
                  <input className={inputCls} value={supplierForm.contact} onChange={e => setSupplierForm(p => ({ ...p, contact: e.target.value }))} placeholder="e.g. John Smith" />
                </Field>
                <Field label="Phone">
                  <input className={inputCls} value={supplierForm.phone} onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
                </Field>
                <Field label="Email">
                  <input type="email" className={inputCls} value={supplierForm.email} onChange={e => setSupplierForm(p => ({ ...p, email: e.target.value }))} placeholder="orders@supplier.com" />
                </Field>
                <Field label="Website">
                  <input className={inputCls} value={supplierForm.website} onChange={e => setSupplierForm(p => ({ ...p, website: e.target.value }))} placeholder="https://supplier.com" />
                </Field>
                <Field label="Address">
                  <input className={inputCls} value={supplierForm.address} onChange={e => setSupplierForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Market St, City" />
                </Field>
              </div>
              <Field label="Notes">
                <input className={inputCls} value={supplierForm.notes} onChange={e => setSupplierForm(p => ({ ...p, notes: e.target.value }))} placeholder="Payment terms, delivery schedule, etc." />
              </Field>
              <div className="flex gap-2 pt-1">
                <button onClick={saveSupplier} className="flex items-center gap-2 bg-gold text-white px-4 py-2 text-xs font-bold uppercase tracking-widest"><Check size={13} /> Save</button>
                <button onClick={cancelSupplier} className="flex items-center gap-2 border border-white/10 text-white/40 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:text-white"><X size={13} /> Cancel</button>
              </div>
            </div>
          )}

          {/* Supplier list */}
          {suppliers.length === 0 && !addingSupplier ? (
            <div className="text-center py-10 text-white/20 font-mono text-sm">No suppliers yet. Add one above.</div>
          ) : (
            <div className="space-y-2">
              {suppliers.map(s => (
                <div key={s.id}>
                  {supplierEditId === s.id && canManage ? (
                    <div className="bg-white/3 border border-gold/20 p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Company Name *">
                          <input className={inputCls} value={supplierForm.name} onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))} />
                        </Field>
                        <Field label="Contact Person">
                          <input className={inputCls} value={supplierForm.contact} onChange={e => setSupplierForm(p => ({ ...p, contact: e.target.value }))} />
                        </Field>
                        <Field label="Phone">
                          <input className={inputCls} value={supplierForm.phone} onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))} />
                        </Field>
                        <Field label="Email">
                          <input type="email" className={inputCls} value={supplierForm.email} onChange={e => setSupplierForm(p => ({ ...p, email: e.target.value }))} />
                        </Field>
                        <Field label="Website">
                          <input className={inputCls} value={supplierForm.website} onChange={e => setSupplierForm(p => ({ ...p, website: e.target.value }))} />
                        </Field>
                        <Field label="Address">
                          <input className={inputCls} value={supplierForm.address} onChange={e => setSupplierForm(p => ({ ...p, address: e.target.value }))} />
                        </Field>
                      </div>
                      <Field label="Notes">
                        <input className={inputCls} value={supplierForm.notes} onChange={e => setSupplierForm(p => ({ ...p, notes: e.target.value }))} />
                      </Field>
                      <div className="flex gap-2">
                        <button onClick={saveSupplier} className="flex items-center gap-2 bg-gold text-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest"><Check size={12} /> Save</button>
                        <button onClick={cancelSupplier} className="flex items-center gap-2 border border-white/10 text-white/40 px-3 py-1.5 text-xs font-bold uppercase tracking-widest hover:text-white"><X size={12} /> Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-white/10 bg-white/3">
                      {/* Collapsed row */}
                      <button
                        onClick={() => setExpandedSupplierId(prev => prev === s.id ? null : s.id)}
                        className="w-full flex items-center gap-4 p-4 text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                          <Truck size={14} className="text-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{s.name}</p>
                          {s.contact && (
                            <p className="text-white/30 text-xs mt-0.5 flex items-center gap-1">
                              <User size={10} /> {s.contact}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {s.phone && <span className="text-white/30 text-xs font-mono hidden sm:block">{s.phone}</span>}
                          {/* Items supplied count */}
                          {(() => {
                            const count = items.filter(i => i.supplier === s.name).length;
                            return count > 0 ? (
                              <span className="text-[9px] uppercase tracking-widest font-mono px-1.5 py-0.5 border border-gold/20 text-gold/60">{count} item{count !== 1 ? 's' : ''}</span>
                            ) : null;
                          })()}
                          <span className={`text-white/30 transition-transform ${expandedSupplierId === s.id ? 'rotate-90' : ''}`}>›</span>
                        </div>
                      </button>

                      {/* Expanded details */}
                      {expandedSupplierId === s.id && (
                        <div className="px-4 pb-4 border-t border-white/5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                            {s.phone && (
                              <a href={`tel:${s.phone}`} className="flex items-center gap-2 text-white/50 hover:text-white text-xs transition-colors">
                                <Phone size={12} className="text-gold/60 shrink-0" /> {s.phone}
                              </a>
                            )}
                            {s.email && (
                              <a href={`mailto:${s.email}`} className="flex items-center gap-2 text-white/50 hover:text-white text-xs transition-colors">
                                <Mail size={12} className="text-gold/60 shrink-0" /> {s.email}
                              </a>
                            )}
                            {s.website && (
                              <a href={s.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/50 hover:text-white text-xs transition-colors">
                                <Globe size={12} className="text-gold/60 shrink-0" /> {s.website}
                              </a>
                            )}
                            {s.address && (
                              <p className="flex items-start gap-2 text-white/50 text-xs">
                                <MapPin size={12} className="text-gold/60 shrink-0 mt-0.5" /> {s.address}
                              </p>
                            )}
                          </div>
                          {s.notes && (
                            <p className="text-white/30 text-xs italic mt-3 border-t border-white/5 pt-3">{s.notes}</p>
                          )}
                          {/* Items from this supplier */}
                          {(() => {
                            const suppliedItems = items.filter(i => i.supplier === s.name);
                            return suppliedItems.length > 0 ? (
                              <div className="mt-3 border-t border-white/5 pt-3">
                                <p className="text-white/20 text-[9px] uppercase tracking-widest font-mono mb-2">Items from this supplier</p>
                                <div className="flex flex-wrap gap-1">
                                  {suppliedItems.map(i => (
                                    <span key={i.id} className={`text-[9px] uppercase tracking-widest font-mono px-1.5 py-0.5 border ${STATUS_BADGE[stockStatus(i)]}`}>{i.name}</span>
                                  ))}
                                </div>
                              </div>
                            ) : null;
                          })()}
                          {canManage && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                              <button onClick={() => startEditSupplier(s)} className="flex items-center gap-1.5 text-white/30 hover:text-gold text-xs transition-colors">
                                <Pencil size={12} /> Edit
                              </button>
                              <button onClick={() => removeSupplier(s.id)} className="flex items-center gap-1.5 text-white/30 hover:text-red-400 text-xs transition-colors ml-2">
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="space-y-2 mb-6">
        <div className="flex gap-2 flex-wrap">
          {(['All', ...CATEGORIES]).map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border transition-all ${
                filterCat === c ? 'bg-gold border-gold text-white' : 'border-white/10 text-white/40 hover:border-white/30'
              }`}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border transition-all ${
                filterStatus === s
                  ? s === 'In Stock'     ? 'bg-green-500/20 border-green-500/40 text-green-400'
                  : s === 'Low Stock'    ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                  : s === 'Out of Stock' ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-gold border-gold text-white'
                  : 'border-white/10 text-white/40 hover:border-white/30'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Add form ── */}
      {adding && canManage && (
        <div className="bg-white/3 border border-gold/30 p-5 mb-4 space-y-3">
          <p className="text-gold text-[10px] uppercase tracking-widest font-mono mb-3">New Item</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Salmon Fillet" />
            </Field>
            <Field label="Category">
              <select className={selectCls} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Quantity">
              <input type="number" min={0} step={0.1} className={inputCls} value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))} />
            </Field>
            <Field label="Unit">
              <select className={selectCls} value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Cost per Unit ($)">
              <input type="number" min={0} step={0.01} className={inputCls} value={form.costPerUnit} onChange={e => setForm(p => ({ ...p, costPerUnit: parseFloat(e.target.value) || 0 }))} />
            </Field>
            <Field label="Low Stock Threshold">
              <input type="number" min={0} step={0.1} className={inputCls} value={form.minThreshold} onChange={e => setForm(p => ({ ...p, minThreshold: parseFloat(e.target.value) || 0 }))} />
            </Field>
          </div>
          <Field label="Supplier">
            <select className={selectCls} value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))}>
              <option value="">— None —</option>
              {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Notes">
            <input className={inputCls} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
          </Field>
          <div className="flex gap-2 pt-1">
            <button onClick={save} className="flex items-center gap-2 bg-gold text-white px-4 py-2 text-xs font-bold uppercase tracking-widest"><Check size={13} /> Save</button>
            <button onClick={cancel} className="flex items-center gap-2 border border-white/10 text-white/40 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:text-white"><X size={13} /> Cancel</button>
          </div>
        </div>
      )}

      {/* ── Items list ── */}
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} className="mb-6">
          <h3 className="text-gold text-[10px] uppercase tracking-widest font-mono mb-2 flex items-center gap-3">
            {cat} <span className="h-[1px] flex-1 bg-gold/20" />
          </h3>
          <div className="space-y-2">
            {catItems.map(item => {
              const status = stockStatus(item);
              return (
                <div key={item.id}>
                  {editId === item.id && canManage ? (
                    <div className="bg-white/3 border border-gold/30 p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Name">
                          <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                        </Field>
                        <Field label="Category">
                          <select className={selectCls} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </Field>
                        <Field label="Quantity">
                          <input type="number" min={0} step={0.1} className={inputCls} value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))} />
                        </Field>
                        <Field label="Unit">
                          <select className={selectCls} value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </Field>
                        <Field label="Cost per Unit ($)">
                          <input type="number" min={0} step={0.01} className={inputCls} value={form.costPerUnit} onChange={e => setForm(p => ({ ...p, costPerUnit: parseFloat(e.target.value) || 0 }))} />
                        </Field>
                        <Field label="Low Stock Threshold">
                          <input type="number" min={0} step={0.1} className={inputCls} value={form.minThreshold} onChange={e => setForm(p => ({ ...p, minThreshold: parseFloat(e.target.value) || 0 }))} />
                        </Field>
                      </div>
                      <Field label="Supplier">
                        <select className={selectCls} value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))}>
                          <option value="">— None —</option>
                          {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </Field>
                      <Field label="Notes">
                        <input className={inputCls} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                      </Field>
                      <div className="flex gap-2">
                        <button onClick={save} className="flex items-center gap-2 bg-gold text-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest"><Check size={12} /> Save</button>
                        <button onClick={cancel} className="flex items-center gap-2 border border-white/10 text-white/40 px-3 py-1.5 text-xs font-bold uppercase tracking-widest hover:text-white"><X size={12} /> Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-4 p-4 border ${
                      status === 'Out of Stock' ? 'bg-red-500/5 border-red-500/10 opacity-60' :
                      status === 'Low Stock'    ? 'bg-yellow-500/5 border-yellow-500/10' :
                      'bg-white/3 border-white/10'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white text-sm font-medium">{item.name}</span>
                          <span className={`text-[9px] uppercase tracking-widest font-mono px-1.5 py-0.5 border ${STATUS_BADGE[status]}`}>{status}</span>
                        </div>
                        {item.supplier && <p className="text-white/30 text-xs mt-0.5">{item.supplier}</p>}
                        {item.notes && <p className="text-white/20 text-xs italic mt-0.5">{item.notes}</p>}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {canManage && (
                          <button onClick={() => adjustQty(item, -1)} className="w-6 h-6 flex items-center justify-center border border-white/10 text-white/40 hover:border-red-400/40 hover:text-red-400 transition-colors text-sm font-bold">−</button>
                        )}
                        <div className="text-center min-w-[60px]">
                          <span className="text-white font-mono font-bold">{item.quantity}</span>
                          <span className="text-white/40 text-xs ml-1">{item.unit}</span>
                        </div>
                        {canManage && (
                          <button onClick={() => adjustQty(item, 1)} className="w-6 h-6 flex items-center justify-center border border-white/10 text-white/40 hover:border-green-400/40 hover:text-green-400 transition-colors text-sm font-bold">+</button>
                        )}
                      </div>

                      <div className="text-right shrink-0 min-w-[80px]">
                        <p className="text-gold font-mono font-bold text-sm">${item.costPerUnit.toFixed(2)}<span className="text-white/30 font-normal text-xs">/{item.unit}</span></p>
                        <p className="text-white/30 text-xs">Value: ${(item.quantity * item.costPerUnit).toFixed(2)}</p>
                      </div>

                      {canManage && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => startEdit(item)} className="p-1.5 text-white/30 hover:text-gold transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => remove(item.id)} className="p-1.5 text-white/30 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && !adding && (
        <div className="text-center py-20 text-white/20 font-mono text-sm">No inventory items yet. Add one above.</div>
      )}
    </div>
  );
}
