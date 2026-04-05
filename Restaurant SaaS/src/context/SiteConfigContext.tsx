import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SiteConfig {
  heroTagline: string;
  heroSubtitle: string;
  heroButtonText: string;
  restaurantName: string;
  phone1: string;
  phone2: string;
  email: string;
  address: string;
  aboutText: string;
  openingHours: { day: string; hours: string }[];
  copyrightYear: string;
}

const defaults: SiteConfig = {
  heroTagline: 'Top Services and Premium Cuisine',
  heroSubtitle: 'Unwind',
  heroButtonText: 'Check out our Menu',
  restaurantName: 'Unwind',
  phone1: '+489756412322',
  phone2: '+56897456123',
  email: 'yourmail@domain.com',
  address: 'USA 27TH Brooklyn NY',
  aboutText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  openingHours: [
    { day: 'Monday – Thursday', hours: '11:00am – 10:00pm' },
    { day: 'Friday – Saturday', hours: '11:00am – 11:00pm' },
    { day: 'Sunday', hours: '12:00pm – 9:00pm' },
  ],
  copyrightYear: '2020',
};

interface SiteConfigContextType {
  config: SiteConfig;
  saveConfig: (updates: Partial<SiteConfig>) => Promise<void>;
  saving: boolean;
}

const SiteConfigContext = createContext<SiteConfigContextType | null>(null);
const DOC_REF = () => doc(db, 'siteConfig', 'main');

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(defaults);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoc(DOC_REF()).then((snap) => {
      if (snap.exists()) {
        setConfig({ ...defaults, ...(snap.data() as Partial<SiteConfig>) });
      }
    });
  }, []);

  const saveConfig = async (updates: Partial<SiteConfig>) => {
    setSaving(true);
    const next = { ...config, ...updates };
    await setDoc(DOC_REF(), next);
    setConfig(next);
    setSaving(false);
  };

  return (
    <SiteConfigContext.Provider value={{ config, saveConfig, saving }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error('useSiteConfig must be used within SiteConfigProvider');
  return ctx;
}
