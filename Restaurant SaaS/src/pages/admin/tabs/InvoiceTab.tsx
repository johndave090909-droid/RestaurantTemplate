import React, { useEffect, useRef, useState } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import {
  Upload, FileText, Trash2, Eye, X, DollarSign, FileCheck, AlertCircle, Clock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  title: string;
  vendor: string;
  amount: number;
  dateReceived: Timestamp;
  dueDate: Timestamp | null;
  status: 'unpaid' | 'paid' | 'overdue';
  fileURL: string;
  fileName: string;
  fileType: string;
  notes: string;
  uploadedBy: string;
  createdAt: Timestamp;
}

type DateFilter = 'all' | 'today' | 'week' | 'month';
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

function startOfRange(range: DateFilter): Date | null {
  if (range === 'all') return null;
  const d = new Date();
  if (range === 'today') { d.setHours(0, 0, 0, 0); return d; }
  if (range === 'week')  { d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; }
  d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0); return d;
}

// ─── Shared field component ───────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-white/30 text-[9px] uppercase tracking-widest font-mono block mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
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

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [fTitle, setFTitle] = useState('');
  const [fVendor, setFVendor] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fDateReceived, setFDateReceived] = useState('');
  const [fDueDate, setFDueDate] = useState('');
  const [fStatus, setFStatus] = useState<Invoice['status']>('unpaid');
  const [fNotes, setFNotes] = useState('');
  const [fFile, setFFile] = useState<File | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Modal
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // ─── Live data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const q = query(collection(db, 'invoices'), orderBy('dateReceived', 'desc'));
    return onSnapshot(q, snap => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
    });
  }, []);

  // ─── Upload & save ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!fTitle.trim() || !fVendor.trim() || !fAmount || !fDateReceived) {
      setUploadError('Title, vendor, amount, and date received are required.');
      return;
    }
    if (!fFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    setUploadError('');
    setUploading(true);
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `invoices/${Date.now()}_${fFile.name}`);
      const task = uploadBytesResumable(storageRef, fFile);

      await new Promise<void>((resolve, reject) => {
        task.on(
          'state_changed',
          snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          () => resolve(),
        );
      });

      const fileURL = await getDownloadURL(storageRef);

      const dateReceived = fDateReceived ? Timestamp.fromDate(new Date(fDateReceived)) : Timestamp.now();
      const dueDate = fDueDate ? Timestamp.fromDate(new Date(fDueDate)) : null;

      await addDoc(collection(db, 'invoices'), {
        title: fTitle.trim(),
        vendor: fVendor.trim(),
        amount: parseFloat(fAmount),
        dateReceived,
        dueDate,
        status: fStatus,
        fileURL,
        fileName: fFile.name,
        fileType: fFile.type,
        notes: fNotes.trim(),
        uploadedBy: user?.displayName ?? user?.email ?? 'Unknown',
        createdAt: serverTimestamp(),
      });

      // Reset
      setFTitle(''); setFVendor(''); setFAmount('');
      setFDateReceived(''); setFDueDate(''); setFStatus('unpaid');
      setFNotes(''); setFFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowForm(false);
    } catch (e) {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (inv: Invoice) => {
    if (!confirm(`Delete invoice "${inv.title}"?`)) return;
    try {
      const storageRef = ref(storage, inv.fileURL);
      await deleteObject(storageRef).catch(() => {});
    } catch {}
    await deleteDoc(doc(db, 'invoices', inv.id));
  };

  // ─── Filtered list ──────────────────────────────────────────────────────────

  const filtered = invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    const rangeStart = startOfRange(dateFilter);
    if (rangeStart && inv.dateReceived) {
      if (inv.dateReceived.toDate() < rangeStart) return false;
    }
    const min = parseFloat(minAmount);
    const max = parseFloat(maxAmount);
    if (!isNaN(min) && inv.amount < min) return false;
    if (!isNaN(max) && inv.amount > max) return false;
    return true;
  });

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const totalAmount = invoices.reduce((s, i) => s + i.amount, 0);
  const unpaidCount = invoices.filter(i => i.status === 'unpaid').length;
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const unpaidTotal = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);

  const inputCls = "w-full bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors";
  const selectCls = "w-full bg-zinc-900 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors cursor-pointer [&>option]:bg-zinc-900 [&>option]:text-white";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-serif text-2xl">Invoices</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gold hover:bg-gold/80 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <Upload size={14} /> Upload Invoice
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="bg-white/3 border border-gold/30 p-5 mb-6 space-y-4">
          <p className="text-gold text-[10px] uppercase tracking-widest font-mono">New Invoice</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Invoice Title" required>
              <input className={inputCls} value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Sysco Foods – April 2025" />
            </Field>
            <Field label="Vendor / Supplier" required>
              <input className={inputCls} value={fVendor} onChange={e => setFVendor(e.target.value)} placeholder="Sysco Foods" />
            </Field>
            <Field label="Amount ($)" required>
              <input type="number" min="0" step="0.01" className={inputCls} value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Status">
              <select className={selectCls} value={fStatus} onChange={e => setFStatus(e.target.value as Invoice['status'])}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </Field>
            <Field label="Date Received" required>
              <input type="date" className={inputCls + " [color-scheme:dark]"} value={fDateReceived} onChange={e => setFDateReceived(e.target.value)} />
            </Field>
            <Field label="Due Date">
              <input type="date" className={inputCls + " [color-scheme:dark]"} value={fDueDate} onChange={e => setFDueDate(e.target.value)} />
            </Field>
          </div>

          <Field label="Notes">
            <textarea className={inputCls + " resize-none"} rows={2} value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Optional notes..." />
          </Field>

          {/* File picker */}
          <Field label="Invoice File (PDF or Image)" required>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-white/20 hover:border-gold/50 transition-colors p-6 text-center cursor-pointer"
            >
              {fFile ? (
                <p className="text-white text-sm font-mono">{fFile.name} <span className="text-white/30">({(fFile.size / 1024).toFixed(0)} KB)</span></p>
              ) : (
                <>
                  <Upload size={20} className="mx-auto text-white/20 mb-2" />
                  <p className="text-white/30 text-xs font-mono">Click to select PDF or image file</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={e => setFFile(e.target.files?.[0] ?? null)}
            />
          </Field>

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-1">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gold transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-white/30 text-[10px] font-mono">Uploading… {uploadProgress}%</p>
            </div>
          )}

          {uploadError && <p className="text-red-400 text-xs font-mono">{uploadError}</p>}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={uploading} className="bg-gold text-white px-4 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-50">
              {uploading ? 'Uploading…' : 'Save Invoice'}
            </button>
            <button onClick={() => { setShowForm(false); setUploadError(''); }} className="border border-white/10 text-white/40 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<FileText size={18} />} label="Total Invoices" value={invoices.length.toString()} />
        <StatCard icon={<DollarSign size={18} />} label="Total Value" value={`$${totalAmount.toFixed(2)}`} />
        <StatCard icon={<Clock size={18} />} label="Unpaid" value={unpaidCount.toString()} sub={`$${unpaidTotal.toFixed(2)} outstanding`} />
        <StatCard icon={<AlertCircle size={18} />} label="Overdue" value={overdueCount.toString()} sub={overdueCount > 0 ? 'Needs attention' : 'All clear'} />
      </div>

      {/* Filters */}
      <div className="bg-white/3 border border-white/10 p-4 mb-4 flex flex-wrap gap-4 items-end">
        {/* Date received */}
        <div>
          <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono mb-2">Date Received</p>
          <div className="flex gap-1 flex-wrap">
            {(['all', 'today', 'week', 'month'] as DateFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border transition-all ${
                  dateFilter === f ? 'bg-gold border-gold text-white' : 'border-white/10 text-white/40 hover:border-white/30'
                }`}
              >
                {f === 'all' ? 'All Time' : f === 'today' ? 'Today' : f === 'week' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono mb-2">Status</p>
          <div className="flex gap-1 flex-wrap">
            {(['all', 'unpaid', 'paid', 'overdue'] as StatusFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border transition-all ${
                  statusFilter === f ? 'bg-gold border-gold text-white' : 'border-white/10 text-white/40 hover:border-white/30'
                }`}
              >
                {f === 'all' ? 'All' : STATUS_CFG[f].label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount range */}
        <div className="flex items-end gap-2">
          <div>
            <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono mb-2">Min ($)</p>
            <input
              type="number" min="0" className="w-24 bg-white/5 border border-white/10 px-3 py-1.5 text-white text-xs focus:outline-none focus:border-gold/50"
              value={minAmount} onChange={e => setMinAmount(e.target.value)} placeholder="0"
            />
          </div>
          <div>
            <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono mb-2">Max ($)</p>
            <input
              type="number" min="0" className="w-24 bg-white/5 border border-white/10 px-3 py-1.5 text-white text-xs focus:outline-none focus:border-gold/50"
              value={maxAmount} onChange={e => setMaxAmount(e.target.value)} placeholder="∞"
            />
          </div>
          {(minAmount || maxAmount) && (
            <button onClick={() => { setMinAmount(''); setMaxAmount(''); }} className="text-white/30 hover:text-white text-[10px] font-mono uppercase tracking-widest border border-white/10 px-2 py-1.5">
              Clear
            </button>
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
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4 px-4 py-2 border-b border-white/10 bg-white/3">
            {['Title / Vendor', 'Date Received', 'Due Date', 'Amount', 'Status', ''].map((h, i) => (
              <span key={i} className="text-white/30 text-[9px] uppercase tracking-widest font-mono">{h}</span>
            ))}
          </div>

          {filtered.map((inv, idx) => (
            <div
              key={inv.id}
              className={`grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-3 sm:gap-4 items-center px-4 py-4 ${
                idx < filtered.length - 1 ? 'border-b border-white/5' : ''
              } hover:bg-white/3 transition-colors`}
            >
              {/* Title / vendor */}
              <div>
                <p className="text-white text-sm font-medium leading-tight">{inv.title}</p>
                <p className="text-white/30 text-xs font-mono mt-0.5">{inv.vendor}</p>
              </div>

              {/* Date received */}
              <p className="text-white/50 text-xs font-mono">{fmtDate(inv.dateReceived)}</p>

              {/* Due date */}
              <p className={`text-xs font-mono ${inv.status === 'overdue' ? 'text-red-400' : 'text-white/30'}`}>
                {inv.dueDate ? fmtDate(inv.dueDate) : '—'}
              </p>

              {/* Amount */}
              <p className="text-gold font-mono font-bold text-sm">${inv.amount.toFixed(2)}</p>

              {/* Status */}
              <span className={`text-[10px] uppercase tracking-widest font-mono px-2 py-1 border ${STATUS_CFG[inv.status].cls}`}>
                {STATUS_CFG[inv.status].label}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewInvoice(inv)}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border border-white/10 text-white/40 hover:border-gold/50 hover:text-gold transition-all"
                >
                  <Eye size={11} /> View
                </button>
                <button
                  onClick={() => handleDelete(inv)}
                  className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal viewer */}
      {viewInvoice && (
        <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}
    </div>
  );
}

// ─── Invoice Modal ────────────────────────────────────────────────────────────

function InvoiceModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const isImage = invoice.fileType.startsWith('image/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Container */}
      <div className="relative bg-[#0e0e0e] border border-white/10 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl z-10">

        {/* Modal header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-white font-serif text-xl leading-tight">{invoice.title}</h3>
            <p className="text-white/40 text-xs font-mono mt-0.5">{invoice.vendor}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`text-[10px] uppercase tracking-widest font-mono px-2 py-1 border ${STATUS_CFG[invoice.status].cls}`}>
              {STATUS_CFG[invoice.status].label}
            </span>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-6 px-6 py-3 border-b border-white/10 bg-white/3 shrink-0">
          <div>
            <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono">Amount</p>
            <p className="text-gold font-mono font-bold text-lg">${invoice.amount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono">Date Received</p>
            <p className="text-white text-sm font-mono">{fmtDate(invoice.dateReceived)}</p>
          </div>
          {invoice.dueDate && (
            <div>
              <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono">Due Date</p>
              <p className={`text-sm font-mono ${invoice.status === 'overdue' ? 'text-red-400' : 'text-white'}`}>
                {fmtDate(invoice.dueDate)}
              </p>
            </div>
          )}
          <div>
            <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono">Uploaded By</p>
            <p className="text-white/60 text-sm font-mono">{invoice.uploadedBy}</p>
          </div>
          {invoice.notes && (
            <div className="w-full">
              <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono">Notes</p>
              <p className="text-white/50 text-sm italic">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* File viewer */}
        <div className="flex-1 overflow-hidden min-h-0">
          {isImage ? (
            <div className="h-full overflow-auto flex items-start justify-center p-4 bg-black/30">
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
              className="w-full h-full min-h-[500px] border-0"
            />
          )}
        </div>

        {/* Modal footer */}
        <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between shrink-0">
          <p className="text-white/20 font-mono text-[10px]">{invoice.fileName}</p>
          <a
            href={invoice.fileURL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border border-white/10 text-white/40 hover:border-gold/50 hover:text-gold transition-all"
          >
            <FileCheck size={11} /> Open in new tab
          </a>
        </div>
      </div>
    </div>
  );
}
