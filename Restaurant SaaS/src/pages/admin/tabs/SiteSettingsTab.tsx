import React, { useState, useEffect, useRef } from 'react';
import { Save, Loader2, Check, Plus, Trash2, Upload, QrCode } from 'lucide-react';
import { useSiteConfig, SiteConfig } from '../../../context/SiteConfigContext';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../../lib/firebase';

interface DigitalPayment {
  id: string;
  name: string;
  qrUrl: string;
  storagePath?: string;
}

export default function SiteSettingsTab() {
  const { config, saveConfig, saving } = useSiteConfig();
  const [draft, setDraft] = useState<SiteConfig>(config);
  const [saved, setSaved] = useState(false);

  const [digitalPayments, setDigitalPayments] = useState<DigitalPayment[]>([]);
  const [newName, setNewName] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const [addingDigital, setAddingDigital] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(config); }, [config]);

  useEffect(() => {
    return onSnapshot(collection(db, 'digitalPayments'), snap => {
      setDigitalPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as DigitalPayment)));
    });
  }, []);

  const set = (key: keyof SiteConfig, value: string) =>
    setDraft(prev => ({ ...prev, [key]: value }));

  const setHour = (i: number, field: 'day' | 'hours', value: string) => {
    const updated = draft.openingHours.map((h, idx) => idx === i ? { ...h, [field]: value } : h);
    setDraft(prev => ({ ...prev, openingHours: updated }));
  };

  const handleSave = async () => {
    await saveConfig(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewFile(file);
    setNewPreview(URL.createObjectURL(file));
  };

  const handleAddDigital = async () => {
    if (!newName.trim() || !newFile) return;
    setAddingDigital(true);
    try {
      const path = `digitalPayments/${Date.now()}_${newFile.name}`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, newFile);
      const qrUrl = await getDownloadURL(sRef);
      await addDoc(collection(db, 'digitalPayments'), {
        name: newName.trim(),
        qrUrl,
        storagePath: path,
        createdAt: serverTimestamp(),
      });
      setNewName('');
      setNewFile(null);
      setNewPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setAddingDigital(false);
    }
  };

  const handleDeleteDigital = async (payment: DigitalPayment) => {
    setDeletingId(payment.id);
    try {
      await deleteDoc(doc(db, 'digitalPayments', payment.id));
      if (payment.storagePath) {
        try { await deleteObject(storageRef(storage, payment.storagePath)); } catch { /* already gone */ }
      }
    } finally {
      setDeletingId(null);
    }
  };

  const inputCls = "w-full bg-white/5 border border-white/10 px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors";
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="text-white/30 text-[9px] uppercase tracking-widest font-mono block mb-1.5">{label}</label>
      {children}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-serif text-2xl">Site Settings</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-gold hover:bg-gold/80 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Hero */}
        <section className="bg-white/3 border border-white/10 p-5">
          <h3 className="text-gold text-[10px] uppercase tracking-widest font-mono mb-4">Hero Section</h3>
          <div className="space-y-3">
            <Field label="Tagline"><input className={inputCls} value={draft.heroTagline} onChange={e => set('heroTagline', e.target.value)} /></Field>
            <Field label="Main Title"><input className={inputCls} value={draft.heroSubtitle} onChange={e => set('heroSubtitle', e.target.value)} /></Field>
            <Field label="Button Text"><input className={inputCls} value={draft.heroButtonText} onChange={e => set('heroButtonText', e.target.value)} /></Field>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white/3 border border-white/10 p-5">
          <h3 className="text-gold text-[10px] uppercase tracking-widest font-mono mb-4">Contact Info</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Phone 1"><input className={inputCls} value={draft.phone1} onChange={e => set('phone1', e.target.value)} /></Field>
            <Field label="Phone 2"><input className={inputCls} value={draft.phone2} onChange={e => set('phone2', e.target.value)} /></Field>
            <Field label="Email"><input className={inputCls} value={draft.email} onChange={e => set('email', e.target.value)} /></Field>
            <Field label="Address"><input className={inputCls} value={draft.address} onChange={e => set('address', e.target.value)} /></Field>
          </div>
        </section>

        {/* About */}
        <section className="bg-white/3 border border-white/10 p-5">
          <h3 className="text-gold text-[10px] uppercase tracking-widest font-mono mb-4">About Text</h3>
          <Field label="Description">
            <textarea rows={4} className={inputCls + " resize-none"} value={draft.aboutText} onChange={e => set('aboutText', e.target.value)} />
          </Field>
        </section>

        {/* Opening Hours */}
        <section className="bg-white/3 border border-white/10 p-5">
          <h3 className="text-gold text-[10px] uppercase tracking-widest font-mono mb-4">Opening Hours</h3>
          <div className="space-y-3">
            {draft.openingHours.map((h, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <Field label={`Day ${i + 1}`}><input className={inputCls} value={h.day} onChange={e => setHour(i, 'day', e.target.value)} /></Field>
                <Field label="Hours"><input className={inputCls} value={h.hours} onChange={e => setHour(i, 'hours', e.target.value)} /></Field>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <section className="bg-white/3 border border-white/10 p-5">
          <h3 className="text-gold text-[10px] uppercase tracking-widest font-mono mb-4">Footer</h3>
          <Field label="Copyright Year"><input className={inputCls} value={draft.copyrightYear} onChange={e => set('copyrightYear', e.target.value)} /></Field>
        </section>

        {/* Digital Payments */}
        <section className="bg-white/3 border border-white/10 p-5">
          <h3 className="text-gold text-[10px] uppercase tracking-widest font-mono mb-1">Digital Payment Methods</h3>
          <p className="text-white/20 text-[10px] font-mono mb-4">These appear as options in the POS Digital payment flow. Upload a QR code for each.</p>

          {/* Existing methods */}
          {digitalPayments.length > 0 && (
            <div className="space-y-2 mb-5">
              {digitalPayments.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-white/3 border border-white/10">
                  <div className="w-10 h-10 bg-white rounded flex items-center justify-center shrink-0">
                    <img src={p.qrUrl} alt={p.name} className="w-9 h-9 object-contain" />
                  </div>
                  <span className="text-white text-sm font-medium flex-1">{p.name}</span>
                  <button
                    onClick={() => handleDeleteDigital(p)}
                    disabled={deletingId === p.id}
                    className="text-white/20 hover:text-red-400 transition-colors disabled:opacity-40 p-1"
                  >
                    {deletingId === p.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {digitalPayments.length === 0 && (
            <div className="flex items-center gap-3 py-5 text-white/15 mb-4">
              <QrCode size={20} />
              <span className="font-mono text-xs">No digital payment methods yet</span>
            </div>
          )}

          {/* Add new */}
          <div className="border border-white/10 p-4 space-y-3">
            <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono">Add New Method</p>

            <Field label="Name (e.g. GCash, Maya, PayMaya)">
              <input
                className={inputCls}
                placeholder="GCash"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </Field>

            <Field label="QR Code Image">
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-white/20 hover:border-gold/40 text-white/30 hover:text-white py-3 text-xs font-mono uppercase tracking-widest transition-all"
                >
                  <Upload size={14} />
                  {newFile ? newFile.name : 'Upload QR Image'}
                </button>
                {newPreview && (
                  <div className="flex justify-center bg-white p-3 rounded">
                    <img src={newPreview} alt="QR Preview" className="w-28 h-28 object-contain" />
                  </div>
                )}
              </div>
            </Field>

            <button
              onClick={handleAddDigital}
              disabled={!newName.trim() || !newFile || addingDigital}
              className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold/80 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 text-xs font-bold uppercase tracking-widest transition-all"
            >
              {addingDigital ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {addingDigital ? 'Uploading...' : 'Add Payment Method'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
