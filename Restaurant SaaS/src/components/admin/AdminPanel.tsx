import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, LogOut, Loader2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSiteConfig, SiteConfig } from '../../context/SiteConfigContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-white/70 text-[10px] uppercase tracking-widest font-mono">{title}</span>
        {open ? <ChevronUp size={14} className="text-gold" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, multiline = false }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const base = "w-full bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors placeholder:text-white/20 resize-none";
  return (
    <div>
      <label className="text-white/30 text-[9px] uppercase tracking-widest font-mono block mb-1">{label}</label>
      {multiline
        ? <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} className={base} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} className={base} />
      }
    </div>
  );
}

export default function AdminPanel({ isOpen, onClose }: Props) {
  const { user, role, logout } = useAuth();
  const { config, saveConfig, saving } = useSiteConfig();
  const [draft, setDraft] = useState<SiteConfig>(config);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setDraft(config); }, [config]);

  const set = (key: keyof SiteConfig, value: string) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const setHour = (index: number, field: 'day' | 'hours', value: string) => {
    const updated = draft.openingHours.map((h, i) => i === index ? { ...h, [field]: value } : h);
    setDraft(prev => ({ ...prev, openingHours: updated }));
  };

  const handleSave = async () => {
    await saveConfig(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  if (!user || !role) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[9990]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#0e0e0e] border-l border-white/10 z-[9991] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-white font-serif italic text-xl">Admin Panel</h2>
                <p className="text-white/30 text-[9px] uppercase tracking-widest font-mono">{user.email}</p>
              </div>
              <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto py-4 px-5 space-y-3">

              <Section title="Hero Section" defaultOpen>
                <Field label="Tagline" value={draft.heroTagline} onChange={v => set('heroTagline', v)} />
                <Field label="Main Title" value={draft.heroSubtitle} onChange={v => set('heroSubtitle', v)} />
                <Field label="Button Text" value={draft.heroButtonText} onChange={v => set('heroButtonText', v)} />
              </Section>

              <Section title="Contact Info">
                <Field label="Phone 1" value={draft.phone1} onChange={v => set('phone1', v)} />
                <Field label="Phone 2" value={draft.phone2} onChange={v => set('phone2', v)} />
                <Field label="Email" value={draft.email} onChange={v => set('email', v)} />
                <Field label="Address" value={draft.address} onChange={v => set('address', v)} />
              </Section>

              <Section title="About Text">
                <Field label="About Description" value={draft.aboutText} onChange={v => set('aboutText', v)} multiline />
              </Section>

              <Section title="Opening Hours">
                {draft.openingHours.map((h, i) => (
                  <div key={i} className="space-y-2 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                    <Field label={`Day ${i + 1}`} value={h.day} onChange={v => setHour(i, 'day', v)} />
                    <Field label="Hours" value={h.hours} onChange={v => setHour(i, 'hours', v)} />
                  </div>
                ))}
              </Section>

              <Section title="Footer">
                <Field label="Copyright Year" value={draft.copyrightYear} onChange={v => set('copyrightYear', v)} />
              </Section>

            </div>

            {/* Footer actions */}
            <div className="px-5 py-4 border-t border-white/10 shrink-0 space-y-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-gold hover:bg-gold/80 text-white py-3 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
              </button>
              <button
                onClick={handleLogout}
                className="w-full border border-white/10 hover:border-red-500/40 text-white/40 hover:text-red-400 py-2.5 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
