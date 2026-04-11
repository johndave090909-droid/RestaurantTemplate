import React, { useState } from 'react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Sparkles, Loader2 } from 'lucide-react';

const SEED_ITEMS = [
  { name: 'Salmon Fillet',      category: 'Seafood',         quantity: 12,  unit: 'kg',      costPerUnit: 18,   minThreshold: 3,  supplier: 'Ocean Fresh Co.',    notes: '' },
  { name: 'Lobster (live)',      category: 'Seafood',         quantity: 4,   unit: 'pcs',     costPerUnit: 45,   minThreshold: 2,  supplier: 'Ocean Fresh Co.',    notes: 'Keep in tank' },
  { name: 'Chicken Breast',     category: 'Meat & Poultry',  quantity: 20,  unit: 'kg',      costPerUnit: 8,    minThreshold: 5,  supplier: 'Prime Meats Ltd.',   notes: '' },
  { name: 'Beef Tenderloin',    category: 'Meat & Poultry',  quantity: 8,   unit: 'kg',      costPerUnit: 35,   minThreshold: 2,  supplier: 'Prime Meats Ltd.',   notes: 'Aged 28 days' },
  { name: 'Whole Milk',         category: 'Dairy',           quantity: 30,  unit: 'L',       costPerUnit: 1.20, minThreshold: 10, supplier: 'Green Valley Farm',  notes: '' },
  { name: 'Heavy Cream',        category: 'Dairy',           quantity: 10,  unit: 'L',       costPerUnit: 2.50, minThreshold: 3,  supplier: 'Green Valley Farm',  notes: '' },
  { name: 'Cheddar Cheese',     category: 'Dairy',           quantity: 5,   unit: 'kg',      costPerUnit: 12,   minThreshold: 2,  supplier: 'Green Valley Farm',  notes: '' },
  { name: 'Roma Tomatoes',      category: 'Produce',         quantity: 15,  unit: 'kg',      costPerUnit: 2,    minThreshold: 4,  supplier: 'Local Harvest',      notes: '' },
  { name: 'Garlic',             category: 'Produce',         quantity: 3,   unit: 'kg',      costPerUnit: 4,    minThreshold: 1,  supplier: 'Local Harvest',      notes: '' },
  { name: 'Mixed Lettuce',      category: 'Produce',         quantity: 6,   unit: 'kg',      costPerUnit: 3,    minThreshold: 2,  supplier: 'Local Harvest',      notes: 'Keep refrigerated' },
  { name: 'Olive Oil',          category: 'Pantry',          quantity: 8,   unit: 'L',       costPerUnit: 9,    minThreshold: 2,  supplier: 'Mediterranean Imports', notes: 'Extra virgin' },
  { name: 'Basmati Rice',       category: 'Dry Goods',       quantity: 25,  unit: 'kg',      costPerUnit: 2.50, minThreshold: 5,  supplier: 'Bulk Foods Direct',  notes: '' },
  { name: 'All Purpose Flour',  category: 'Dry Goods',       quantity: 20,  unit: 'kg',      costPerUnit: 1.50, minThreshold: 5,  supplier: 'Bulk Foods Direct',  notes: '' },
  { name: 'Red Wine',           category: 'Beverages',       quantity: 24,  unit: 'bottles', costPerUnit: 15,   minThreshold: 6,  supplier: 'Vineyard Select',    notes: 'Cabernet Sauvignon' },
  { name: 'Sparkling Water',    category: 'Beverages',       quantity: 48,  unit: 'bottles', costPerUnit: 1.50, minThreshold: 12, supplier: 'Aqua Premium',       notes: '' },
];

type Status = 'idle' | 'loading' | 'done' | 'exists' | 'error';

export default function SeedInventoryButton() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const seed = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const snap = await getDocs(collection(db, 'inventoryItems'));
      if (!snap.empty) { setStatus('exists'); setTimeout(() => setStatus('idle'), 4000); return; }

      const batch = writeBatch(db);
      SEED_ITEMS.forEach(item => {
        batch.set(doc(collection(db, 'inventoryItems')), item);
      });
      await batch.commit();
      setStatus('done');
      setTimeout(() => setStatus('idle'), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Seed failed.';
      setErrorMsg(msg);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  const label =
    status === 'loading' ? 'Seeding…' :
    status === 'done'    ? 'Seeded!' :
    status === 'exists'  ? 'Already seeded' :
    status === 'error'   ? errorMsg || 'Error' :
    'Seed Inventory';

  return (
    <button
      onClick={seed}
      disabled={status === 'loading'}
      className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all disabled:opacity-50 ${
        status === 'done'   ? 'border-green-500/40 text-green-400 bg-green-500/10' :
        status === 'exists' ? 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10' :
        status === 'error'  ? 'border-red-500/40 text-red-400 bg-red-500/10' :
        'border-white/10 text-white/40 hover:border-gold/50 hover:text-gold'
      }`}
    >
      {status === 'loading'
        ? <Loader2 size={13} className="animate-spin" />
        : <Sparkles size={13} />}
      {label}
    </button>
  );
}
