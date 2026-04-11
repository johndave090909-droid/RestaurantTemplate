import React, { useEffect, useRef, useState } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import {
  Upload, FileText, Trash2, Eye, X, DollarSign, AlertCircle,
  Clock, Save, FileCheck, ExternalLink,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  title: string;
  vendor: string;
  amount: number;
  dateReceived: Timestamp | null;
  dueDate: Timestamp | null;
  status: 'unpaid' | 'paid' | 'overdue';
  fileURL: string;
  fileName: string;
  fileType: string;
  notes: string;
  uploadedBy: string;
  createdAt: Timestamp;
}

type DateFilter   = 'all' | 'today' | 'week' | 'month';
type StatusFilter = 'all' | 'unpaid' | 'paid' | 'overdue';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  unpaid:  { label: 'Unpaid',  cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  paid:    { label: 'Paid',    cls: 'bg-green-500/10  text-green-400  border-green-500/20'  },
  overdue: { label: 'Overdue', cls: 'bg-red-500/10    text-red-400    border-red-500/20'    },
};

function fmtDate(ts: Timestamp | null): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function tsToInput(ts: Timestamp | null): string {
  if (!ts) return '';
  const d = ts.toDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfRange(range: DateFilter): Date | null {
  if (range === 'all') return null;
  const d = new Date();
  if (range === 'today') { d.setHours(0, 0, 0, 0); return d; }
  if (range === 'week')  { d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; }
  d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0); return d;
}

function isIncomplete(inv: Invoice): boolean {
  return !inv.vendor || inv.amount === 0;
}

function stripExt(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
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

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
}) {
  return (
    <div className="bg-white/3 border border-white/10 p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-white/20">{icon}</span>
        <span className="text-[9px] uppercase tracking-widest font-mono text-white/30">{label}</span>
      </div>
      <p className="text-white text-2xl font-mono font-bold">{value}</p>
      {sub && <p className="text-white/30 text-xs font-mono mt-1">{sub}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function InvoiceTab() {
  const { user } = useAuth();
  const [invoices, setInvoices]         = useState<Invoice[]>([]);
  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setProgress]   = useState(0);
  const [uploadError, setUploadError]   = useState('');
  const [showUpload, setShowUpload]     = useState(false);
  const [dragOver, setDragOver]         = useState(false);
  const [pendingFile, setPendingFile]   = useState<File | null>(null);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  // Filters
  const [dateFilter,   setDateFilter]   = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [minAmount,    setMinAmount]    = useState('');
  const [maxAmount,    setMaxAmount]    = useState('');

  // Modal
  const [editInvoice, setEditInvoice]   = useState<Invoice | null>(null);

  // ─── Live data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
    });
  }, []);

  // ─── Upload (file only) ─────────────────────────────────────────────────────

  const doUpload = async (file: File) => {
    setUploadError('');
    setUploading(true);
    setProgress(0);
    try {
      const storageRef = ref(storage, `invoices/${Date.now()}_${file.name}`);
      const task = uploadBytesResumable(storageRef, file);
      await new Promise<void>((resolve, reject) => {
        task.on('state_changed',
          s => setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
          reject,
          () => resolve(),
        );
      });
      const fileURL = await getDownloadURL(storageRef);
      await addDoc(collection(db, 'invoices'), {
        title:       stripExt(file.name),
        vendor:      '',
        amount:      0,
        dateReceived: Timestamp.now(),
        dueDate:     null,
        status:      'unpaid',
        fileURL,
        fileName:    file.name,
        fileType:    file.type,
        notes:       '',
        uploadedBy:  user?.displayName ?? user?.email ?? 'Unknown',
        createdAt:   serverTimestamp(),
      });
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowUpload(false);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setPendingFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { setPendingFile(file); }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (inv: Invoice) => {
    if (!confirm(`Delete "${inv.title}"?`)) return;
    try { await deleteObject(ref(storage, inv.fileURL)).catch(() => {}); } catch {}
    await deleteDoc(doc(db, 'invoices', inv.id));
    if (editInvoice?.id === inv.id) setEditInvoice(null);
  };

  // ─── Filtered list ──────────────────────────────────────────────────────────

  const filtered = invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    const rangeStart = startOfRange(dateFilter);
    if (rangeStart && inv.dateReceived && inv.dateReceived.toDate() < rangeStart) return false;
    const min = parseFloat(minAmount);
    const max = parseFloat(maxAmount);
    if (!isNaN(min) && inv.amount < min) return false;
    if (!isNaN(max) && inv.amount > max) return false;
    return true;
  });

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const totalAmount  = invoices.reduce((s, i) => s + i.amount, 0);
  const unpaidCount  = invoices.filter(i => i.status === 'unpaid').length;
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const unpaidTotal  = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
  const incomplete   = invoices.filter(isIncomplete).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-serif text-2xl">Invoices</h2>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 bg-gold hover:bg-gold/80 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <Upload size={14} /> Upload Invoice
        </button>
      </div>

      {/* Upload zone */}
      {showUpload && (
        <div className="bg-white/3 border border-gold/30 p-5 mb-6 space-y-3">
          <p className="text-gold text-[10px] uppercase tracking-widest font-mono">Upload Invoice</p>
          <p className="text-white/30 text-xs font-mono">Just drop the file — you can fill in the details after.</p>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed p-10 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-gold bg-gold/5' : 'border-white/20 hover:border-gold/50'
            }`}
          >
            {pendingFile ? (
              <div>
                <FileText size={24} className="mx-auto text-gold mb-2" />
                <p className="text-white text-sm font-mono">{pendingFile.name}</p>
                <p className="text-white/30 text-xs font-mono mt-1">{(pendingFile.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div>
                <Upload size={24} className="mx-auto text-white/20 mb-2" />
                <p className="text-white/30 text-sm font-mono">Drag & drop or click to select</p>
                <p className="text-white/20 text-xs font-mono mt-1">PDF or image files</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
          />

          {uploading && (
            <div className="space-y-1">
              <div className="h-1 bg-white/10 overflow-hidden">
                <div className="h-full bg-gold transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-white/30 text-[10px] font-mono">Uploading… {uploadProgress}%</p>
            </div>
          )}
          {uploadError && <p className="text-red-400 text-xs font-mono">{uploadError}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => pendingFile && doUpload(pendingFile)}
              disabled={!pendingFile || uploading}
              className="bg-gold text-white px-4 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-40 transition-opacity"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <button
              onClick={() => { setShowUpload(false); setPendingFile(null); setUploadError(''); }}
              className="border border-white/10 text-white/40 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<FileText size={18} />}    label="Total Invoices" value={invoices.length.toString()} sub={incomplete > 0 ? `${incomplete} need details` : undefined} />
        <StatCard icon={<DollarSign size={18} />}  label="Total Value"    value={`$${totalAmount.toFixed(2)}`} />
        <StatCard icon={<Clock size={18} />}       label="Unpaid"         value={unpaidCount.toString()} sub={`$${unpaidTotal.toFixed(2)} outstanding`} />
        <StatCard icon={<AlertCircle size={18} />} label="Overdue"        value={overdueCount.toString()} sub={overdueCount > 0 ? 'Needs attention' : 'All clear'} />
      </div>

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
            {(['all', 'unpaid', 'paid', 'overdue'] as StatusFilter[]).map(f => (
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

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/20 font-mono text-sm">
          <FileText size={32} className="mx-auto mb-3 opacity-30" />
          {invoices.length === 0 ? 'No invoices yet. Upload one above.' : 'No invoices match the current filters.'}
        </div>
      ) : (
        <div className="border border-white/10">
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-2 border-b border-white/10 bg-white/3">
            {['Title / Vendor', 'Date Received', 'Due Date', 'Amount', 'Status', ''].map((h, i) => (
              <span key={i} className="text-white/30 text-[9px] uppercase tracking-widest font-mono">{h}</span>
            ))}
          </div>
          {filtered.map((inv, idx) => {
            const needsDetails = isIncomplete(inv);
            return (
              <div
                key={inv.id}
                className={`grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 sm:gap-4 items-center px-4 py-4 ${
                  idx < filtered.length - 1 ? 'border-b border-white/5' : ''
                } hover:bg-white/3 transition-colors`}
              >
                <div>
                  <p className="text-white text-sm font-medium leading-tight">{inv.title || inv.fileName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {inv.vendor
                      ? <p className="text-white/30 text-xs font-mono">{inv.vendor}</p>
                      : <p className="text-white/20 text-xs font-mono italic">No vendor</p>
                    }
                    {needsDetails && (
                      <span className="text-[9px] uppercase tracking-widest font-mono px-1.5 py-0.5 border border-orange-500/30 text-orange-400 bg-orange-500/10">
                        Needs details
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-white/50 text-xs font-mono">{fmtDate(inv.dateReceived)}</p>

                <p className={`text-xs font-mono ${inv.status === 'overdue' ? 'text-red-400' : 'text-white/30'}`}>
                  {inv.dueDate ? fmtDate(inv.dueDate) : '—'}
                </p>

                <p className={`font-mono font-bold text-sm ${inv.amount > 0 ? 'text-gold' : 'text-white/20'}`}>
                  {inv.amount > 0 ? `$${inv.amount.toFixed(2)}` : '—'}
                </p>

                <span className={`text-[10px] uppercase tracking-widest font-mono px-2 py-1 border ${STATUS_CFG[inv.status].cls}`}>
                  {STATUS_CFG[inv.status].label}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditInvoice(inv)}
                    className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border border-white/10 text-white/40 hover:border-gold/50 hover:text-gold transition-all"
                  >
                    <Eye size={11} /> Open
                  </button>
                  <button
                    onClick={() => handleDelete(inv)}
                    className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Side-by-side modal */}
      {editInvoice && (
        <InvoiceModal
          invoice={editInvoice}
          onClose={() => setEditInvoice(null)}
          onSaved={updated => setEditInvoice(updated)}
          onDelete={inv => handleDelete(inv)}
        />
      )}
    </div>
  );
}

// ─── Invoice Modal (side-by-side viewer + editor) ─────────────────────────────

function InvoiceModal({
  invoice,
  onClose,
  onSaved,
  onDelete,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSaved: (updated: Invoice) => void;
  onDelete: (inv: Invoice) => void;
}) {
  const isImage = invoice.fileType.startsWith('image/');

  // Editable fields
  const [title,        setTitle]        = useState(invoice.title);
  const [vendor,       setVendor]       = useState(invoice.vendor);
  const [amount,       setAmount]       = useState(invoice.amount > 0 ? String(invoice.amount) : '');
  const [status,       setStatus]       = useState<Invoice['status']>(invoice.status);
  const [dateReceived, setDateReceived] = useState(tsToInput(invoice.dateReceived));
  const [dueDate,      setDueDate]      = useState(tsToInput(invoice.dueDate));
  const [notes,        setNotes]        = useState(invoice.notes);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [saveError,    setSaveError]    = useState('');

  const inputCls  = "w-full bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors";
  const selectCls = "w-full bg-zinc-800 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors cursor-pointer [&>option]:bg-zinc-800 [&>option]:text-white";

  const handleSave = async () => {
    setSaveError('');
    setSaving(true);
    try {
      const updates = {
        title:        title.trim() || invoice.fileName,
        vendor:       vendor.trim(),
        amount:       parseFloat(amount) || 0,
        status,
        dateReceived: dateReceived ? Timestamp.fromDate(new Date(dateReceived)) : invoice.dateReceived,
        dueDate:      dueDate      ? Timestamp.fromDate(new Date(dueDate))      : null,
        notes:        notes.trim(),
      };
      await updateDoc(doc(db, 'invoices', invoice.id), updates);
      const updated: Invoice = { ...invoice, ...updates };
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved(updated);
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal container — full height, wide */}
      <div className="relative bg-[#0e0e0e] border border-white/10 w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl z-10">

        {/* Modal header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText size={16} className="text-gold shrink-0" />
            <h3 className="text-white font-serif text-lg leading-tight truncate">
              {title || invoice.fileName}
            </h3>
            <span className={`shrink-0 text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 border ${STATUS_CFG[status].cls}`}>
              {STATUS_CFG[status].label}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={invoice.fileURL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border border-white/10 text-white/30 hover:border-white/30 hover:text-white transition-all"
            >
              <ExternalLink size={11} /> New Tab
            </a>
            <button onClick={onClose} className="p-1.5 text-white/30 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body: two columns */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">

          {/* ── Left: file viewer ── */}
          <div className="lg:w-[55%] border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-black/20 min-h-0 h-1/2 lg:h-full">
            {isImage ? (
              <div className="flex-1 overflow-auto flex items-start justify-center p-4">
                <img
                  src={invoice.fileURL}
                  alt={invoice.fileName}
                  className="max-w-full object-contain"
                />
              </div>
            ) : (
              <iframe
                src={invoice.fileURL}
                title={invoice.fileName}
                className="flex-1 w-full border-0 min-h-0"
              />
            )}
            <div className="px-4 py-2 border-t border-white/10 shrink-0 flex items-center justify-between bg-[#0a0a0a]">
              <p className="text-white/20 font-mono text-[10px] truncate">{invoice.fileName}</p>
              <a
                href={invoice.fileURL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-mono text-white/20 hover:text-gold transition-colors"
              >
                <FileCheck size={11} /> Full view
              </a>
            </div>
          </div>

          {/* ── Right: edit form ── */}
          <div className="lg:w-[45%] flex flex-col overflow-y-auto">
            <div className="p-5 space-y-4 flex-1">
              <p className="text-gold text-[10px] uppercase tracking-widest font-mono border-b border-white/10 pb-2">
                Invoice Details
              </p>

              <Field label="Title">
                <input
                  className={inputCls}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={invoice.fileName}
                />
              </Field>

              <Field label="Vendor / Supplier">
                <input
                  className={inputCls}
                  value={vendor}
                  onChange={e => setVendor(e.target.value)}
                  placeholder="e.g. Sysco Foods"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount ($)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputCls}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Status">
                  <select
                    className={selectCls}
                    value={status}
                    onChange={e => setStatus(e.target.value as Invoice['status'])}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date Received">
                  <input
                    type="date"
                    className={inputCls + " [color-scheme:dark]"}
                    value={dateReceived}
                    onChange={e => setDateReceived(e.target.value)}
                  />
                </Field>
                <Field label="Due Date">
                  <input
                    type="date"
                    className={inputCls + " [color-scheme:dark]"}
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  className={inputCls + " resize-none"}
                  rows={4}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Payment method, PO number, any remarks…"
                />
              </Field>

              <div className="text-white/20 text-[10px] font-mono border-t border-white/10 pt-3">
                Uploaded by {invoice.uploadedBy}
              </div>
            </div>

            {/* Form footer */}
            <div className="px-5 py-4 border-t border-white/10 bg-[#0a0a0a] flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => onDelete(invoice)}
                className="text-[10px] uppercase tracking-widest font-mono text-white/20 hover:text-red-400 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={12} /> Delete
              </button>

              <div className="flex items-center gap-2">
                {saveError && <p className="text-red-400 text-[10px] font-mono">{saveError}</p>}
                {saved && <p className="text-green-400 text-[10px] font-mono">Saved</p>}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-gold hover:bg-gold/80 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                >
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
