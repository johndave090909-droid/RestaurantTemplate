import React, { useState } from 'react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Sparkles, Loader2, Check } from 'lucide-react';

const SEED_ITEMS = [
  // Mains
  { name: 'Soft Shell Crab', category: 'Mains', price: 29, description: 'Pan-seared soft shell crab with citrus butter sauce', available: true },
  { name: 'Miso Chicken', category: 'Mains', price: 19, description: 'Glazed chicken thigh with white miso and sesame', available: true },
  { name: 'Fish Pie', category: 'Mains', price: 12, description: 'Classic fish pie with creamy mash topping', available: true },
  { name: 'Salmon Riverland', category: 'Mains', price: 105, description: 'Premium riverland salmon with herbs and lemon butter', available: true },
  // Starters
  { name: 'Fried Potatoes', category: 'Starters', price: 29, description: 'Golden crispy fried potatoes with aioli dipping sauce', available: true },
  { name: 'Doner Burger', category: 'Starters', price: 19, description: 'Mini doner-style slider with pickled cabbage', available: true },
  { name: 'Steak Filet', category: 'Starters', price: 12, description: 'Bite-sized filet medallions with peppercorn sauce', available: true },
  { name: 'Cayenne Shrimp', category: 'Starters', price: 37, description: 'Spiced shrimp skewers with cooling yogurt dip', available: true },
  // Desserts
  { name: 'Tarte Tatin', category: 'Desserts', price: 25, description: 'Upside-down caramelised apple tart with crème fraîche', available: true },
  { name: 'Crème Brûlée', category: 'Desserts', price: 64, description: 'Classic vanilla custard with torched caramel crust', available: true },
  { name: 'Lemon Meringue', category: 'Desserts', price: 12, description: 'Zesty lemon curd tart with toasted Italian meringue', available: true },
  // Drinks
  { name: 'Kiwi Cocktail', category: 'Drinks', price: 12, description: 'Fresh kiwi, mint, lime and sparkling water', available: true },
  { name: 'Summer Beer', category: 'Drinks', price: 21, description: 'Light craft lager, brewed with citrus hops', available: true },
  { name: 'Red Mojito', category: 'Drinks', price: 17, description: 'Raspberry mojito with fresh mint and white rum', available: true },
  { name: 'Cabernet Sauvignon', category: 'Drinks', price: 40, description: 'Full-bodied red wine with dark fruit and oak notes', available: true },
  // Specials
  { name: 'Lobster with Melted Mozzarella', category: 'Specials', price: 156, description: 'Whole lobster grilled with melted buffalo mozzarella and garlic butter', available: true },
  { name: 'Butterfly Fried Shrimp Platter', category: 'Specials', price: 98, description: 'Jumbo butterfly shrimp, beer-battered and served with three dipping sauces', available: true },
];

export default function SeedMenuButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'exists' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSeed = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      // Check if items already exist
      const snap = await getDocs(collection(db, 'menuItems'));
      if (!snap.empty) {
        setStatus('exists');
        setTimeout(() => setStatus('idle'), 3000);
        return;
      }

      const batch = writeBatch(db);
      SEED_ITEMS.forEach(item => {
        batch.set(doc(collection(db, 'menuItems')), item);
      });
      await batch.commit();
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleSeed}
        disabled={status === 'loading'}
        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all disabled:opacity-50 ${
          status === 'done' ? 'border-green-500/40 text-green-400 bg-green-500/10' :
          status === 'exists' ? 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10' :
          status === 'error' ? 'border-red-500/40 text-red-400 bg-red-500/10' :
          'border-white/10 text-white/40 hover:border-gold/50 hover:text-gold'
        }`}
      >
        {status === 'loading' && <Loader2 size={13} className="animate-spin" />}
        {status === 'done' && <Check size={13} />}
        {(status === 'idle' || status === 'exists' || status === 'error') && <Sparkles size={13} />}
        {status === 'loading' ? 'Seeding...' :
         status === 'done' ? 'Seeded!' :
         status === 'exists' ? 'Already seeded' :
         status === 'error' ? 'Failed' :
         'Seed sample menu'}
      </button>
      {status === 'error' && errorMsg && (
        <p className="text-red-400 text-[10px] font-mono max-w-xs">{errorMsg}</p>
      )}
    </div>
  );
}
