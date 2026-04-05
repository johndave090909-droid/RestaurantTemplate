import React, { useState, useEffect } from 'react';
import { Save, Loader2, Check } from 'lucide-react';
import { useSiteConfig, SiteConfig } from '../../../context/SiteConfigContext';

export default function SiteSettingsTab() {
  const { config, saveConfig, saving } = useSiteConfig();
  const [draft, setDraft] = useState<SiteConfig>(config);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setDraft(config); }, [config]);

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
      </div>
    </div>
  );
}
