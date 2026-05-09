import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, Timestamp, writeBatch, runTransaction,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import {
  Upload, FileText, Trash2, Eye, X, DollarSign,
  Clock, Save, FileCheck, ExternalLink, Plus, Paperclip,
  LayoutDashboard, List, CheckCircle2, Circle,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  invoiceNo?: string;
  title: string;
  vendor: string;
  amountDue: number;
  amountPaid: number;
  paidDate: Timestamp | null;
  sent: boolean;
  dateReceived: Timestamp | null;
  dueDate: Timestamp | null;
  status: 'unpaid' | 'partial' | 'fully_paid' | 'overpaid' | 'overdue';
  fileURL: string;
  fileName: string;
  fileType: string;
  notes: string;
  uploadedBy: string;
  createdAt: Timestamp;
}

interface Supplier {
  id: string;
  name: string;
}

type InnerTab     = 'dashboard' | 'tracker';
type DateFilter   = 'all' | 'today' | 'week' | 'month';
type StatusFilter = 'all' | 'unpaid' | 'partial' | 'fully_paid' | 'overpaid' | 'overdue';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  unpaid:     { label: 'Unpaid',     cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  partial:    { label: 'Partial',    cls: 'bg-blue-500/10   text-blue-400   border-blue-500/20'   },
  fully_paid: { label: 'Fully Paid', cls: 'bg-green-500/10  text-green-400  border-green-500/20'  },
  overpaid:   { label: 'Overpaid',   cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  overdue:    { label: 'Overdue',    cls: 'bg-red-500/10    text-red-400    border-red-500/20'    },
} as const;

function fmtDate(ts: Timestamp | null): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function tsToInput(ts: Timestamp | null): string {
  if (!ts) return '';
  const d = ts.toDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayInput(): string {
  return tsToInput(Timestamp.now());
}

function startOfRange(range: DateFilter): Date | null {
  if (range === 'all') return null;
  const d = new Date();
  if (range === 'today') { d.setHours(0, 0, 0, 0); return d; }
  if (range === 'week')  { d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; }
  d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0); return d;
}

function computeAutoStatus(
  amountDue: number,
  amountPaid: number,
  dueDate: Timestamp | null,
): Invoice['status'] {
  if (amountPaid > amountDue && amountDue > 0) return 'overpaid';
  if (amountPaid >= amountDue && amountDue > 0) return 'fully_paid';
  if (dueDate && dueDate.toDate() < new Date()) return 'overdue';
  if (amountPaid > 0 && amountPaid < amountDue) return 'partial';
  return 'unpaid';
}

function fmtMonth(date: Date): string {
  return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
}

function stripExt(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}

// Module-level so both InvoiceTab and CreateInvoiceModal can use it
async function nextInvoiceNumber(): Promise<string> {
  try {
    const counterRef = doc(db, 'counters', 'invoices');
    const next = await runTransaction(db, async tx => {
      const snap = await tx.get(counterRef);
      const current = snap.exists() ? (snap.data().value as number) : 0;
      const value = current + 1;
      tx.set(counterRef, { value, updatedAt: serverTimestamp() }, { merge: true });
      return value;
    });
    return `INV-${String(next).padStart(5, '0')}`;
  } catch {
    return `INV-L${Date.now().toString(36).toUpperCase().slice(-5)}`;
  }
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-white/30 text-[9px] uppercase tracking-widest font-mono block mb-1">{label}</label>
      {children}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-white/3 border border-white/10 p-5">
      <div className="flex items-start justify-between mb-3">
        <span className={accent ?? 'text-white/20'}>{icon}</span>
        <span className="text-[9px] uppercase tracking-widest font-mono text-white/30">{label}</span>
      </div>
      <p className="text-white text-2xl font-mono font-bold">{value}</p>
      {sub && <p className="text-white/30 text-xs font-mono mt-1">{sub}</p>}
    </div>
  );
}

// ─── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView({ invoices }: { invoices: Invoice[] }) {
  const year = new Date().getFullYear();

  const totalDue    = invoices.reduce((s, i) => s + i.amountDue,  0);
  const totalPaid   = invoices.reduce((s, i) => s + i.amountPaid, 0);
  const netBalance  = totalPaid - totalDue;
  const unpaidCount = invoices.filter(i => ['unpaid', 'overdue', 'partial'].includes(i.status)).length;

  const statusCounts = {
    fully_paid: invoices.filter(i => i.status === 'fully_paid').length,
    partial:    invoices.filter(i => i.status === 'partial').length,
    unpaid:     invoices.filter(i => i.status === 'unpaid' || i.status === 'overdue').length,
    overpaid:   invoices.filter(i => i.status === 'overpaid').length,
  };

  const monthlyData = useMemo(() => {
    const map = new Map<string, {
      month: string; invoices: number; sent: number; unpaid: number; due: number; paid: number;
    }>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, { month: fmtMonth(d), invoices: 0, sent: 0, unpaid: 0, due: 0, paid: 0 });
    }
    for (const inv of invoices) {
      const d = inv.dateReceived ? inv.dateReceived.toDate() : inv.createdAt?.toDate?.();
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = map.get(key);
      if (!entry) continue;
      entry.invoices++;
      if (inv.sent) entry.sent++;
      if (['unpaid', 'overdue', 'partial'].includes(inv.status)) entry.unpaid++;
      entry.due  += inv.amountDue;
      entry.paid += inv.amountPaid;
    }
    return [...map.values()];
  }, [invoices]);

  const breakdownItems = [
    { label: 'Fully Paid',     count: statusCounts.fully_paid, cls: 'text-green-400  border-green-500/30  bg-green-500/5'  },
    { label: 'Partial',        count: statusCounts.partial,    cls: 'text-blue-400   border-blue-500/30   bg-blue-500/5'   },
    { label: 'Unpaid/Overdue', count: statusCounts.unpaid,     cls: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5' },
    { label: 'Overpaid',       count: statusCounts.overpaid,   cls: 'text-purple-400 border-purple-500/30 bg-purple-500/5' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono mb-3">
          Annual Performance Overview · {year}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard icon={<FileText size={18} />}   label="Total Invoices" value={invoices.length.toString()} sub="Year to Date" />
          <KpiCard icon={<DollarSign size={18} />} label="Total Due"      value={`$${totalDue.toFixed(2)}`}  sub="Year to Date" />
          <KpiCard
            icon={<CheckCircle2 size={18} />}
            label="Total Paid"
            value={`$${totalPaid.toFixed(2)}`}
            sub="Year to Date"
            accent="text-green-400"
          />
          <KpiCard
            icon={<Clock size={18} />}
            label="Unpaid"
            value={unpaidCount.toString()}
            sub="Year to Date"
            accent="text-yellow-400"
          />
          <KpiCard
            icon={netBalance >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            label="Net Balance"
            value={`${netBalance >= 0 ? '' : '-'}$${Math.abs(netBalance).toFixed(2)}`}
            sub="Year to Date"
            accent={netBalance >= 0 ? 'text-green-400' : 'text-red-400'}
          />
        </div>
      </div>

      <div>
        <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono mb-3">Status Breakdown</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {breakdownItems.map(({ label, count, cls }) => (
            <div key={label} className={`border p-5 ${cls}`}>
              <p className="text-3xl font-mono font-bold">{count}</p>
              <p className="text-[10px] uppercase tracking-widest font-mono mt-2 opacity-70">{label}</p>
              <p className="text-[10px] font-mono opacity-40 mt-0.5">invoices</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono mb-3">
          Monthly Summary · Last 12 Months
        </p>
        <div className="bg-white/3 border border-white/10 p-5">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, fontFamily: 'monospace', fontSize: 11 }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                formatter={(v: number) => [`$${v.toFixed(2)}`]}
              />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }} />
              <Bar dataKey="due"  name="Amount Due"  fill="#b59a6a" radius={0} />
              <Bar dataKey="paid" name="Amount Paid" fill="#4ade80" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono mb-3">Monthly Breakdown</p>
        <div className="border border-white/10 overflow-x-auto">
          <table className="w-full text-xs font-mono min-w-[600px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/3">
                {['Month', 'Invoices', 'Sent', 'Unpaid', 'Amount Due', 'Amount Paid', 'Balance'].map((h, i) => (
                  <th key={h} className={`px-4 py-2 text-white/30 text-[9px] uppercase tracking-widest font-normal ${i === 0 ? 'text-left' : 'text-right'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((row, i) => {
                const bal = row.paid - row.due;
                return (
                  <tr key={i} className={`border-b border-white/5 ${row.invoices === 0 ? 'opacity-25' : 'hover:bg-white/3'}`}>
                    <td className="px-4 py-2.5 text-white/60">{row.month}</td>
                    <td className="px-4 py-2.5 text-right text-white">{row.invoices || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-white/50">{row.sent || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-yellow-400">{row.unpaid || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-gold">{row.due > 0 ? `$${row.due.toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-green-400">{row.paid > 0 ? `$${row.paid.toFixed(2)}` : '—'}</td>
                    <td className={`px-4 py-2.5 text-right ${bal < 0 ? 'text-red-400' : bal > 0 ? 'text-purple-400' : 'text-white/30'}`}>
                      {row.due > 0 ? `${bal >= 0 ? '' : '-'}$${Math.abs(bal).toFixed(2)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── File drop zone (reusable) ────────────────────────────────────────────────

function FileDropZone({
  file,
  onFile,
  compact = false,
}: {
  file: File | null;
  onFile: (f: File) => void;
  compact?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center text-center ${
        compact ? 'p-4 gap-2' : 'p-10 gap-3'
      } ${dragOver ? 'border-gold bg-gold/5' : 'border-white/20 hover:border-gold/50'}`}
    >
      {file ? (
        <>
          <FileText size={compact ? 18 : 28} className="text-gold" />
          <div>
            <p className="text-white text-sm font-mono leading-tight">{file.name}</p>
            <p className="text-white/30 text-xs font-mono mt-0.5">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <p className="text-white/20 text-[10px] font-mono">Click to replace</p>
        </>
      ) : (
        <>
          <Paperclip size={compact ? 18 : 28} className="text-white/20" />
          <div>
            <p className="text-white/30 text-sm font-mono">Drag & drop or click to attach</p>
            <p className="text-white/20 text-xs font-mono mt-0.5">PDF or image · optional</p>
          </div>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
    </div>
  );
}

// ─── Create Invoice Modal ─────────────────────────────────────────────────────

function CreateInvoiceModal({
  suppliers,
  onClose,
  onCreated,
}: {
  suppliers: Supplier[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();

  const [title,        setTitle]        = useState('');
  const [vendor,       setVendor]       = useState('');
  const [amountDue,    setAmountDue]    = useState('');
  const [amountPaid,   setAmountPaid]   = useState('');
  const [paidDate,     setPaidDate]     = useState('');
  const [sent,         setSent]         = useState(false);
  const [status,       setStatus]       = useState<Invoice['status']>('unpaid');
  const [dateReceived, setDateReceived] = useState(todayInput());
  const [dueDate,      setDueDate]      = useState('');
  const [notes,        setNotes]        = useState('');
  const [pendingFile,  setPendingFile]  = useState<File | null>(null);

  const [saving,   setSaving]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [error,    setError]    = useState('');

  const [supplierOpen, setSupplierOpen] = useState(false);
  const matchedSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(vendor.toLowerCase()));
  const isLinked = suppliers.some(s => s.name.toLowerCase() === vendor.toLowerCase());

  const parsedDue  = parseFloat(amountDue)  || 0;
  const parsedPaid = parseFloat(amountPaid) || 0;
  const balance    = parsedPaid - parsedDue;

  const autoStatus = computeAutoStatus(
    parsedDue,
    parsedPaid,
    dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
  );

  const inputCls  = "w-full bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors";
  const selectCls = "w-full bg-zinc-800 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors cursor-pointer [&>option]:bg-zinc-800 [&>option]:text-white";

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    setProgress(0);
    try {
      let fileURL  = '';
      let fileName = '';
      let fileType = '';

      if (pendingFile) {
        const storageRef = ref(storage, `invoices/${Date.now()}_${pendingFile.name}`);
        const task = uploadBytesResumable(storageRef, pendingFile);
        await new Promise<void>((resolve, reject) => {
          task.on('state_changed',
            s => setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
            reject,
            () => resolve(),
          );
        });
        fileURL  = await getDownloadURL(storageRef);
        fileName = pendingFile.name;
        fileType = pendingFile.type;
      }

      const invoiceNo = await nextInvoiceNumber();
      await addDoc(collection(db, 'invoices'), {
        invoiceNo,
        title:        title.trim() || (fileName ? stripExt(fileName) : 'Untitled Invoice'),
        vendor:       vendor.trim(),
        amountDue:    parsedDue,
        amountPaid:   parsedPaid,
        paidDate:     paidDate ? Timestamp.fromDate(new Date(paidDate)) : null,
        sent,
        status,
        dateReceived: dateReceived ? Timestamp.fromDate(new Date(dateReceived)) : Timestamp.now(),
        dueDate:      dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
        notes:        notes.trim(),
        fileURL,
        fileName,
        fileType,
        uploadedBy:   user?.displayName ?? user?.email ?? 'Unknown',
        createdAt:    serverTimestamp(),
      });

      onCreated();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
      setProgress(0);
    }
  };

  // File preview on left side
  const previewEl = pendingFile ? (
    pendingFile.type.startsWith('image/') ? (
      <img
        src={URL.createObjectURL(pendingFile)}
        alt={pendingFile.name}
        className="max-w-full max-h-full object-contain"
      />
    ) : (
      <div className="flex flex-col items-center gap-3 text-white/20">
        <FileText size={48} />
        <p className="font-mono text-sm text-white/40">{pendingFile.name}</p>
        <p className="font-mono text-xs">{(pendingFile.size / 1024).toFixed(0)} KB</p>
      </div>
    )
  ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0e0e0e] border border-white/10 w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl z-10">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <Plus size={16} className="text-gold" />
            <h3 className="text-white font-serif text-lg">New Invoice</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/30 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body: file left, form right */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">

          {/* Left: file zone / preview */}
          <div className="lg:w-[55%] border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-black/20 min-h-0 h-[280px] lg:h-full">
            {pendingFile ? (
              <>
                <div className="flex-1 overflow-auto flex items-center justify-center p-6 min-h-0">
                  {previewEl}
                </div>
                <div className="px-4 py-2 border-t border-white/10 shrink-0 flex items-center justify-between bg-[#0a0a0a]">
                  <p className="text-white/20 font-mono text-[10px] truncate">{pendingFile.name}</p>
                  <button
                    onClick={() => setPendingFile(null)}
                    className="text-white/20 hover:text-red-400 text-[10px] font-mono uppercase tracking-widest transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <FileDropZone file={null} onFile={setPendingFile} />
              </div>
            )}

            {/* Replace file button when file is selected */}
            {pendingFile && (
              <div className="px-4 pb-3 bg-[#0a0a0a]">
                <FileDropZone file={null} onFile={setPendingFile} compact />
              </div>
            )}
          </div>

          {/* Right: form */}
          <div className="lg:w-[45%] flex flex-col overflow-y-auto">
            <div className="p-5 space-y-4 flex-1">
              <p className="text-gold text-[10px] uppercase tracking-widest font-mono border-b border-white/10 pb-2">
                Invoice Details
              </p>

              <Field label="Title / Description">
                <input
                  className={inputCls}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={pendingFile ? stripExt(pendingFile.name) : 'e.g. Water Heater Installation'}
                  autoFocus
                />
              </Field>

              <Field label="Customer / Supplier">
                <div className="relative">
                  <input
                    className={inputCls}
                    value={vendor}
                    onChange={e => { setVendor(e.target.value); setSupplierOpen(true); }}
                    onFocus={() => setSupplierOpen(true)}
                    onBlur={() => setTimeout(() => setSupplierOpen(false), 150)}
                    placeholder="Select from suppliers or type name"
                  />
                  {isLinked && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-widest font-mono text-green-400 border border-green-500/30 bg-green-500/10 px-1.5 py-0.5">
                      Linked
                    </span>
                  )}
                  {supplierOpen && matchedSuppliers.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 bg-zinc-900 border border-white/10 border-t-0 max-h-40 overflow-y-auto shadow-xl">
                      {matchedSuppliers.map(s => (
                        <button key={s.id} type="button"
                          onMouseDown={() => { setVendor(s.name); setSupplierOpen(false); }}
                          className="w-full text-left px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors font-mono">
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount Due ($)">
                  <input type="number" min="0" step="0.01" className={inputCls}
                    value={amountDue} onChange={e => setAmountDue(e.target.value)} placeholder="0.00" />
                </Field>
                <Field label="Amount Paid ($)">
                  <input type="number" min="0" step="0.01" className={inputCls}
                    value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder="0.00" />
                </Field>
              </div>

              {/* Live balance */}
              {(parsedDue > 0 || parsedPaid > 0) && (
                <div className={`flex items-center justify-between px-3 py-2 border text-xs font-mono ${
                  balance < 0 ? 'border-red-500/20 bg-red-500/5 text-red-400'
                  : balance > 0 ? 'border-purple-500/20 bg-purple-500/5 text-purple-400'
                  : 'border-green-500/20 bg-green-500/5 text-green-400'
                }`}>
                  <span className="opacity-60">Balance</span>
                  <span className="font-bold">{balance >= 0 ? '' : '-'}${Math.abs(balance).toFixed(2)}</span>
                </div>
              )}

              {/* Status + auto */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Field label="Status">
                    <select className={selectCls} value={status} onChange={e => setStatus(e.target.value as Invoice['status'])}>
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partial</option>
                      <option value="fully_paid">Fully Paid</option>
                      <option value="overpaid">Overpaid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </Field>
                </div>
                {autoStatus !== status && (
                  <button
                    type="button"
                    onClick={() => setStatus(autoStatus)}
                    className="mb-0.5 text-[9px] uppercase tracking-widest font-mono px-2 py-2 border border-gold/30 text-gold hover:bg-gold/10 transition-colors whitespace-nowrap"
                  >
                    Auto: {STATUS_CFG[autoStatus].label}
                  </button>
                )}
              </div>

              {/* Sent toggle */}
              <Field label="Invoice Sent">
                <button
                  type="button"
                  onClick={() => setSent(!sent)}
                  className={`flex items-center gap-2 px-3 py-2 border text-sm font-mono transition-all w-full ${
                    sent
                      ? 'border-green-500/30 bg-green-500/10 text-green-400'
                      : 'border-white/10 bg-white/5 text-white/30 hover:border-white/20'
                  }`}
                >
                  {sent ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  {sent ? 'Sent to customer' : 'Not sent yet'}
                </button>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date Received">
                  <input type="date" className={inputCls + " [color-scheme:dark]"}
                    value={dateReceived} onChange={e => setDateReceived(e.target.value)} />
                </Field>
                <Field label="Due Date">
                  <input type="date" className={inputCls + " [color-scheme:dark]"}
                    value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </Field>
              </div>

              <Field label="Paid Date">
                <input type="date" className={inputCls + " [color-scheme:dark]"}
                  value={paidDate} onChange={e => setPaidDate(e.target.value)} />
              </Field>

              <Field label="Notes">
                <textarea className={inputCls + " resize-none"} rows={3}
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Payment method, PO number, any remarks…" />
              </Field>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/10 bg-[#0a0a0a] flex items-center justify-between gap-3 shrink-0">
              <div className="flex-1">
                {saving && pendingFile && (
                  <div className="space-y-1">
                    <div className="h-1 bg-white/10 overflow-hidden">
                      <div className="h-full bg-gold transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-white/30 text-[10px] font-mono">Uploading… {progress}%</p>
                  </div>
                )}
                {error && <p className="text-red-400 text-[10px] font-mono">{error}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={onClose}
                  className="border border-white/10 text-white/40 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex items-center gap-2 bg-gold hover:bg-gold/80 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  <Save size={13} />
                  {saving ? (pendingFile ? 'Uploading…' : 'Saving…') : 'Create Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function InvoiceTab() {
  const { toast } = useToast();

  const [invoices,  setInvoices]  = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [innerTab,    setInnerTab]    = useState<InnerTab>('dashboard');
  const [showCreate,  setShowCreate]  = useState(false);

  const [dateFilter,   setDateFilter]   = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [minAmount,    setMinAmount]    = useState('');
  const [maxAmount,    setMaxAmount]    = useState('');

  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());

  // ─── Live data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, async snap => {
      const docs = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          amountDue:  data.amountDue  ?? data.amount ?? 0,
          amountPaid: data.amountPaid ?? 0,
          sent:       data.sent       ?? false,
          paidDate:   data.paidDate   ?? null,
        } as Invoice;
      });
      setInvoices(docs);

      const now = new Date();
      const toOverdue = docs.filter(inv =>
        (inv.status === 'unpaid' || inv.status === 'partial') &&
        inv.dueDate !== null &&
        inv.dueDate.toDate() < now
      );
      if (toOverdue.length > 0) {
        const batch = writeBatch(db);
        toOverdue.forEach(inv => batch.update(doc(db, 'invoices', inv.id), { status: 'overdue' }));
        await batch.commit();
      }
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'suppliers'), snap => {
      setSuppliers(
        snap.docs
          .map(d => ({ id: d.id, name: d.data().name as string }))
          .filter(s => s.name)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    });
  }, []);

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (inv: Invoice) => {
    if (!confirm(`Delete "${inv.title}"?`)) return;
    try {
      if (inv.fileURL) await deleteObject(ref(storage, inv.fileURL)).catch(() => {});
      await deleteDoc(doc(db, 'invoices', inv.id));
      if (editInvoice?.id === inv.id) setEditInvoice(null);
      setSelected(prev => { const n = new Set(prev); n.delete(inv.id); return n; });
    } catch {
      toast('Failed to delete invoice. Please try again.');
    }
  };

  const handleBulkMarkPaid = async () => {
    if (selected.size === 0) return;
    try {
      const batch = writeBatch(db);
      [...selected].forEach(id => {
        const inv = invoices.find(i => i.id === id);
        batch.update(doc(db, 'invoices', id), { status: 'fully_paid', amountPaid: inv?.amountDue ?? 0 });
      });
      await batch.commit();
      setSelected(new Set());
      toast(`${selected.size} invoice${selected.size > 1 ? 's' : ''} marked as paid.`, 'success');
    } catch {
      toast('Failed to update invoices. Please try again.');
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const count = selected.size;
    if (!confirm(`Delete ${count} invoice${count > 1 ? 's' : ''}? This cannot be undone.`)) return;
    const toDelete = invoices.filter(i => selected.has(i.id));
    try {
      await Promise.all(toDelete.map(inv => inv.fileURL ? deleteObject(ref(storage, inv.fileURL)).catch(() => {}) : Promise.resolve()));
      const batch = writeBatch(db);
      toDelete.forEach(inv => batch.delete(doc(db, 'invoices', inv.id)));
      await batch.commit();
      setSelected(new Set());
      if (editInvoice && selected.has(editInvoice.id)) setEditInvoice(null);
      toast(`${count} invoice${count > 1 ? 's' : ''} deleted.`, 'success');
    } catch {
      toast('Failed to delete invoices. Please try again.');
    }
  };

  // ─── Filtered list ──────────────────────────────────────────────────────────

  const filtered = invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    const rangeStart = startOfRange(dateFilter);
    if (rangeStart && inv.dateReceived && inv.dateReceived.toDate() < rangeStart) return false;
    const min = parseFloat(minAmount);
    const max = parseFloat(maxAmount);
    if (!isNaN(min) && inv.amountDue < min) return false;
    if (!isNaN(max) && inv.amountDue > max) return false;
    return true;
  });

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = filtered.length > 0 && filtered.every(i => selected.has(i.id));
  const toggleAll   = () =>
    setSelected(allSelected ? new Set() : new Set(filtered.map(i => i.id)));

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-serif text-2xl">Invoices</h2>
        <button
          onClick={() => { setShowCreate(true); setInnerTab('tracker'); }}
          className="flex items-center gap-2 bg-gold hover:bg-gold/80 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <Plus size={14} /> New Invoice
        </button>
      </div>

      {/* Inner tab switcher */}
      <div className="flex border-b border-white/10 mb-6">
        {([
          { key: 'dashboard' as const, label: 'Dashboard',       icon: <LayoutDashboard size={13} /> },
          { key: 'tracker'   as const, label: 'Invoice Tracker', icon: <List size={13} /> },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setInnerTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 text-[10px] uppercase tracking-widest font-mono border-b-2 transition-all -mb-px ${
              innerTab === t.key
                ? 'border-gold text-gold'
                : 'border-transparent text-white/30 hover:text-white/60'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard tab */}
      {innerTab === 'dashboard' && <DashboardView invoices={invoices} />}

      {/* Tracker tab */}
      {innerTab === 'tracker' && (
        <>
          {/* Filters */}
          <div className="bg-white/3 border border-white/10 p-4 mb-4 flex flex-wrap gap-4 items-end">
            <div>
              <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono mb-2">Date Received</p>
              <div className="flex gap-1 flex-wrap">
                {(['all', 'today', 'week', 'month'] as DateFilter[]).map(f => (
                  <button key={f} onClick={() => setDateFilter(f)}
                    className={`text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border transition-all ${
                      dateFilter === f ? 'bg-gold border-gold text-white' : 'border-white/10 text-white/40 hover:border-white/30'
                    }`}
                  >
                    {f === 'all' ? 'All Time' : f === 'today' ? 'Today' : f === 'week' ? '7 Days' : '30 Days'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono mb-2">Status</p>
              <div className="flex gap-1 flex-wrap">
                {(['all', 'unpaid', 'partial', 'fully_paid', 'overpaid', 'overdue'] as StatusFilter[]).map(f => (
                  <button key={f} onClick={() => setStatusFilter(f)}
                    className={`text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border transition-all ${
                      statusFilter === f ? 'bg-gold border-gold text-white' : 'border-white/10 text-white/40 hover:border-white/30'
                    }`}
                  >
                    {f === 'all' ? 'All' : STATUS_CFG[f].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono mb-2">Min ($)</p>
                <input type="number" min="0"
                  className="w-24 bg-white/5 border border-white/10 px-3 py-1.5 text-white text-xs focus:outline-none focus:border-gold/50"
                  value={minAmount} onChange={e => setMinAmount(e.target.value)} placeholder="0"
                />
              </div>
              <div>
                <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono mb-2">Max ($)</p>
                <input type="number" min="0"
                  className="w-24 bg-white/5 border border-white/10 px-3 py-1.5 text-white text-xs focus:outline-none focus:border-gold/50"
                  value={maxAmount} onChange={e => setMaxAmount(e.target.value)} placeholder="∞"
                />
              </div>
              {(minAmount || maxAmount) && (
                <button onClick={() => { setMinAmount(''); setMaxAmount(''); }}
                  className="text-white/30 hover:text-white text-[10px] font-mono uppercase tracking-widest border border-white/10 px-2 py-1.5"
                >Clear</button>
              )}
            </div>
          </div>

          {/* Bulk toolbar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-gold/10 border border-gold/30 flex-wrap">
              <span className="text-gold text-xs font-mono font-bold">{selected.size} selected</span>
              <div className="flex-1" />
              <button onClick={handleBulkMarkPaid}
                className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-1.5 text-xs font-bold uppercase tracking-widest hover:bg-green-500/20 transition-all">
                <FileCheck size={13} /> Mark Paid
              </button>
              <button onClick={handleBulkDelete}
                className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-1.5 text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all">
                <Trash2 size={13} /> Delete
              </button>
              <button onClick={() => setSelected(new Set())}
                className="text-white/30 hover:text-white text-[10px] uppercase tracking-widest font-mono transition-colors">
                Clear
              </button>
            </div>
          )}

          {/* List */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-white/20 font-mono text-sm">
              <FileText size={32} className="mx-auto mb-3 opacity-30" />
              {invoices.length === 0 ? (
                <div className="space-y-3">
                  <p>No invoices yet.</p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-2 border border-white/10 text-white/30 hover:text-white hover:border-white/30 px-4 py-2 text-xs font-mono uppercase tracking-widest transition-all"
                  >
                    <Plus size={12} /> Create your first invoice
                  </button>
                </div>
              ) : 'No invoices match the current filters.'}
            </div>
          ) : (
            <div className="border border-white/10 overflow-x-auto">
              <div className="hidden xl:grid grid-cols-[20px_1fr_auto_auto_auto_auto_auto_auto_auto] gap-3 px-4 py-2 border-b border-white/10 bg-white/3 items-center min-w-[920px]">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5 accent-gold cursor-pointer" />
                {['Title / Customer', 'Date', 'Due Date', 'Sent', 'Amt Due', 'Amt Paid', 'Balance', ''].map((h, i) => (
                  <span key={i} className="text-white/30 text-[9px] uppercase tracking-widest font-mono">{h}</span>
                ))}
              </div>

              {filtered.map((inv, idx) => {
                const balance = inv.amountPaid - inv.amountDue;
                return (
                  <div
                    key={inv.id}
                    className={`grid grid-cols-1 xl:grid-cols-[20px_1fr_auto_auto_auto_auto_auto_auto_auto] gap-2 xl:gap-3 items-center px-4 py-4 min-w-[920px] ${
                      idx < filtered.length - 1 ? 'border-b border-white/5' : ''
                    } transition-colors ${selected.has(inv.id) ? 'bg-gold/5' : 'hover:bg-white/3'}`}
                  >
                    <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggleSelect(inv.id)}
                      className="w-3.5 h-3.5 accent-gold cursor-pointer hidden xl:block" />

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-sm font-medium leading-tight">{inv.title || inv.fileName || 'Untitled'}</p>
                        {inv.invoiceNo && (
                          <span className="text-[9px] uppercase tracking-widest font-mono px-1.5 py-0.5 border border-white/10 text-white/30">
                            {inv.invoiceNo}
                          </span>
                        )}
                        {!inv.fileURL && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 border border-white/10 text-white/20 flex items-center gap-1">
                            <Paperclip size={9} /> No file
                          </span>
                        )}
                      </div>
                      {inv.vendor
                        ? <p className="text-white/30 text-xs font-mono mt-0.5">{inv.vendor}</p>
                        : <p className="text-white/20 text-xs font-mono italic mt-0.5">No customer</p>
                      }
                    </div>

                    <p className="text-white/50 text-xs font-mono">{fmtDate(inv.dateReceived)}</p>
                    <p className={`text-xs font-mono ${inv.status === 'overdue' ? 'text-red-400' : 'text-white/30'}`}>
                      {inv.dueDate ? fmtDate(inv.dueDate) : '—'}
                    </p>
                    <span className={`text-[11px] font-mono ${inv.sent ? 'text-green-400' : 'text-white/20'}`}>
                      {inv.sent ? '✓ Sent' : '✗ Unsent'}
                    </span>
                    <p className={`font-mono font-bold text-sm ${inv.amountDue > 0 ? 'text-gold' : 'text-white/20'}`}>
                      {inv.amountDue > 0 ? `$${inv.amountDue.toFixed(2)}` : '—'}
                    </p>
                    <p className={`font-mono text-sm ${inv.amountPaid > 0 ? 'text-green-400' : 'text-white/20'}`}>
                      {inv.amountPaid > 0 ? `$${inv.amountPaid.toFixed(2)}` : '—'}
                    </p>
                    <p className={`font-mono text-sm ${balance < 0 ? 'text-red-400' : balance > 0 ? 'text-purple-400' : 'text-white/30'}`}>
                      {inv.amountDue > 0 ? `${balance >= 0 ? '' : '-'}$${Math.abs(balance).toFixed(2)}` : '—'}
                    </p>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase tracking-widest font-mono px-2 py-1 border ${STATUS_CFG[inv.status].cls}`}>
                        {STATUS_CFG[inv.status].label}
                      </span>
                      <button onClick={() => setEditInvoice(inv)}
                        className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border border-white/10 text-white/40 hover:border-gold/50 hover:text-gold transition-all">
                        <Eye size={11} /> Open
                      </button>
                      <button onClick={() => handleDelete(inv)} className="p-1.5 text-white/20 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateInvoiceModal
          suppliers={suppliers}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); setInnerTab('tracker'); }}
        />
      )}

      {/* Edit modal */}
      {editInvoice && (
        <InvoiceModal
          invoice={editInvoice}
          suppliers={suppliers}
          onClose={() => setEditInvoice(null)}
          onSaved={updated => setEditInvoice(updated)}
          onDelete={inv => handleDelete(inv)}
        />
      )}
    </div>
  );
}

// ─── Edit Invoice Modal ───────────────────────────────────────────────────────

function InvoiceModal({
  invoice, suppliers, onClose, onSaved, onDelete,
}: {
  invoice: Invoice;
  suppliers: Supplier[];
  onClose: () => void;
  onSaved: (updated: Invoice) => void;
  onDelete: (inv: Invoice) => void;
}) {
  const isImage   = invoice.fileType?.startsWith('image/');
  const hasFile   = Boolean(invoice.fileURL);

  // File attachment state (for invoices without a file)
  const [attachFile,    setAttachFile]    = useState<File | null>(null);
  const [attaching,     setAttaching]     = useState(false);
  const [attachProgress, setAttachProgress] = useState(0);
  const [attachError,   setAttachError]   = useState('');

  const [title,        setTitle]        = useState(invoice.title);
  const [vendor,       setVendor]       = useState(invoice.vendor);
  const [amountDue,    setAmountDue]    = useState(invoice.amountDue  > 0 ? String(invoice.amountDue)  : '');
  const [amountPaid,   setAmountPaid]   = useState(invoice.amountPaid > 0 ? String(invoice.amountPaid) : '');
  const [paidDate,     setPaidDate]     = useState(tsToInput(invoice.paidDate));
  const [sent,         setSent]         = useState(invoice.sent);
  const [status,       setStatus]       = useState<Invoice['status']>(invoice.status);
  const [dateReceived, setDateReceived] = useState(tsToInput(invoice.dateReceived));
  const [dueDate,      setDueDate]      = useState(tsToInput(invoice.dueDate));
  const [notes,        setNotes]        = useState(invoice.notes);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [saveError,    setSaveError]    = useState('');

  const [supplierOpen, setSupplierOpen] = useState(false);
  const matchedSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(vendor.toLowerCase()));
  const isLinked = suppliers.some(s => s.name.toLowerCase() === vendor.toLowerCase());

  const parsedDue  = parseFloat(amountDue)  || 0;
  const parsedPaid = parseFloat(amountPaid) || 0;
  const balance    = parsedPaid - parsedDue;

  const autoStatus = computeAutoStatus(
    parsedDue,
    parsedPaid,
    dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
  );

  const inputCls  = "w-full bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors";
  const selectCls = "w-full bg-zinc-800 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors cursor-pointer [&>option]:bg-zinc-800 [&>option]:text-white";

  const handleAttachFile = async (file: File) => {
    setAttachError('');
    setAttaching(true);
    setAttachProgress(0);
    try {
      const storageRef = ref(storage, `invoices/${Date.now()}_${file.name}`);
      const task = uploadBytesResumable(storageRef, file);
      await new Promise<void>((resolve, reject) => {
        task.on('state_changed',
          s => setAttachProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
          reject,
          () => resolve(),
        );
      });
      const fileURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'invoices', invoice.id), {
        fileURL,
        fileName: file.name,
        fileType: file.type,
      });
      onSaved({ ...invoice, fileURL, fileName: file.name, fileType: file.type });
    } catch {
      setAttachError('Upload failed. Please try again.');
    } finally {
      setAttaching(false);
      setAttachProgress(0);
    }
  };

  const handleSave = async () => {
    setSaveError('');
    setSaving(true);
    try {
      const updates = {
        title:        title.trim() || invoice.fileName || 'Untitled Invoice',
        vendor:       vendor.trim(),
        amountDue:    parsedDue,
        amountPaid:   parsedPaid,
        paidDate:     paidDate ? Timestamp.fromDate(new Date(paidDate)) : null,
        sent,
        status,
        dateReceived: dateReceived ? Timestamp.fromDate(new Date(dateReceived)) : invoice.dateReceived,
        dueDate:      dueDate      ? Timestamp.fromDate(new Date(dueDate))      : null,
        notes:        notes.trim(),
      };
      await updateDoc(doc(db, 'invoices', invoice.id), updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved({ ...invoice, ...updates });
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0e0e0e] border border-white/10 w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl z-10">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText size={16} className="text-gold shrink-0" />
            <h3 className="text-white font-serif text-lg leading-tight truncate">{title || invoice.fileName || 'Untitled'}</h3>
            {invoice.invoiceNo && (
              <span className="shrink-0 text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 border border-white/10 text-white/40">
                {invoice.invoiceNo}
              </span>
            )}
            <span className={`shrink-0 text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 border ${STATUS_CFG[status].cls}`}>
              {STATUS_CFG[status].label}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasFile && (
              <a href={invoice.fileURL} target="_blank" rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border border-white/10 text-white/30 hover:border-white/30 hover:text-white transition-all">
                <ExternalLink size={11} /> New Tab
              </a>
            )}
            <button onClick={onClose} className="p-1.5 text-white/30 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">

          {/* Left: file viewer or attach zone */}
          <div className="lg:w-[55%] border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-black/20 min-h-0 h-[280px] lg:h-full">
            {hasFile ? (
              <>
                {isImage ? (
                  <div className="flex-1 overflow-auto flex items-start justify-center p-4">
                    <img src={invoice.fileURL} alt={invoice.fileName} className="max-w-full object-contain" />
                  </div>
                ) : (
                  <iframe src={invoice.fileURL} title={invoice.fileName} className="flex-1 w-full border-0 min-h-0" />
                )}
                <div className="px-4 py-2 border-t border-white/10 shrink-0 flex items-center justify-between bg-[#0a0a0a]">
                  <p className="text-white/20 font-mono text-[10px] truncate">{invoice.fileName}</p>
                  <a href={invoice.fileURL} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-mono text-white/20 hover:text-gold transition-colors">
                    <FileCheck size={11} /> Full view
                  </a>
                </div>
              </>
            ) : (
              // No file — show attach zone
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
                <p className="text-white/20 text-[10px] uppercase tracking-widest font-mono">No file attached</p>
                {attaching ? (
                  <div className="w-full max-w-xs space-y-2">
                    <div className="h-1 bg-white/10 overflow-hidden">
                      <div className="h-full bg-gold transition-all duration-300" style={{ width: `${attachProgress}%` }} />
                    </div>
                    <p className="text-white/30 text-[10px] font-mono text-center">Uploading… {attachProgress}%</p>
                  </div>
                ) : (
                  <FileDropZone file={attachFile} onFile={f => { setAttachFile(f); handleAttachFile(f); }} />
                )}
                {attachError && <p className="text-red-400 text-xs font-mono">{attachError}</p>}
              </div>
            )}
          </div>

          {/* Right: edit form */}
          <div className="lg:w-[45%] flex flex-col overflow-y-auto">
            <div className="p-5 space-y-4 flex-1">
              <p className="text-gold text-[10px] uppercase tracking-widest font-mono border-b border-white/10 pb-2">
                Invoice Details
              </p>

              <Field label="Title / Description">
                <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)}
                  placeholder={invoice.fileName || 'Untitled Invoice'} />
              </Field>

              <Field label="Customer / Supplier">
                <div className="relative">
                  <input
                    className={inputCls}
                    value={vendor}
                    onChange={e => { setVendor(e.target.value); setSupplierOpen(true); }}
                    onFocus={() => setSupplierOpen(true)}
                    onBlur={() => setTimeout(() => setSupplierOpen(false), 150)}
                    placeholder="Select from suppliers or type name"
                  />
                  {isLinked && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-widest font-mono text-green-400 border border-green-500/30 bg-green-500/10 px-1.5 py-0.5">
                      Linked
                    </span>
                  )}
                  {supplierOpen && matchedSuppliers.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 bg-zinc-900 border border-white/10 border-t-0 max-h-40 overflow-y-auto shadow-xl">
                      {matchedSuppliers.map(s => (
                        <button key={s.id} type="button"
                          onMouseDown={() => { setVendor(s.name); setSupplierOpen(false); }}
                          className="w-full text-left px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors font-mono">
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount Due ($)">
                  <input type="number" min="0" step="0.01" className={inputCls}
                    value={amountDue} onChange={e => setAmountDue(e.target.value)} placeholder="0.00" />
                </Field>
                <Field label="Amount Paid ($)">
                  <input type="number" min="0" step="0.01" className={inputCls}
                    value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder="0.00" />
                </Field>
              </div>

              {(parsedDue > 0 || parsedPaid > 0) && (
                <div className={`flex items-center justify-between px-3 py-2 border text-xs font-mono ${
                  balance < 0 ? 'border-red-500/20 bg-red-500/5 text-red-400'
                  : balance > 0 ? 'border-purple-500/20 bg-purple-500/5 text-purple-400'
                  : 'border-green-500/20 bg-green-500/5 text-green-400'
                }`}>
                  <span className="opacity-60">Balance</span>
                  <span className="font-bold">{balance >= 0 ? '' : '-'}${Math.abs(balance).toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Field label="Status">
                    <select className={selectCls} value={status} onChange={e => setStatus(e.target.value as Invoice['status'])}>
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partial</option>
                      <option value="fully_paid">Fully Paid</option>
                      <option value="overpaid">Overpaid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </Field>
                </div>
                {autoStatus !== status && (
                  <button type="button" onClick={() => setStatus(autoStatus)}
                    className="mb-0.5 text-[9px] uppercase tracking-widest font-mono px-2 py-2 border border-gold/30 text-gold hover:bg-gold/10 transition-colors whitespace-nowrap">
                    Auto: {STATUS_CFG[autoStatus].label}
                  </button>
                )}
              </div>

              <Field label="Invoice Sent">
                <button type="button" onClick={() => setSent(!sent)}
                  className={`flex items-center gap-2 px-3 py-2 border text-sm font-mono transition-all w-full ${
                    sent
                      ? 'border-green-500/30 bg-green-500/10 text-green-400'
                      : 'border-white/10 bg-white/5 text-white/30 hover:border-white/20'
                  }`}>
                  {sent ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  {sent ? 'Sent to customer' : 'Not sent yet'}
                </button>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date Received">
                  <input type="date" className={inputCls + " [color-scheme:dark]"}
                    value={dateReceived} onChange={e => setDateReceived(e.target.value)} />
                </Field>
                <Field label="Due Date">
                  <input type="date" className={inputCls + " [color-scheme:dark]"}
                    value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </Field>
              </div>

              <Field label="Paid Date">
                <input type="date" className={inputCls + " [color-scheme:dark]"}
                  value={paidDate} onChange={e => setPaidDate(e.target.value)} />
              </Field>

              <Field label="Notes">
                <textarea className={inputCls + " resize-none"} rows={3}
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Payment method, PO number, any remarks…" />
              </Field>

              <div className="text-white/20 text-[10px] font-mono border-t border-white/10 pt-3">
                Uploaded by {invoice.uploadedBy}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/10 bg-[#0a0a0a] flex items-center justify-between gap-3 shrink-0">
              <button onClick={() => onDelete(invoice)}
                className="text-[10px] uppercase tracking-widest font-mono text-white/20 hover:text-red-400 transition-colors flex items-center gap-1.5">
                <Trash2 size={12} /> Delete
              </button>
              <div className="flex items-center gap-2">
                {saveError && <p className="text-red-400 text-[10px] font-mono">{saveError}</p>}
                {saved && <p className="text-green-400 text-[10px] font-mono">Saved</p>}
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 bg-gold hover:bg-gold/80 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50">
                  <Save size={13} />
                  {saving ? 'Saving…' : 'Save Details'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
