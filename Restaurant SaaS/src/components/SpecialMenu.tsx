import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Download, ShoppingBag, Check } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import GeneratedImage from './GeneratedImage';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useCart } from '@/src/context/CartContext';

const categories = [
  { id: 'tab-1', firebaseCategory: 'Mains', name: 'Main Dishes', num: '01.', prompt: 'Gourmet main course dish, steak or roasted meat, high-end plating' },
  { id: 'tab-2', firebaseCategory: 'Starters', name: 'Starter', num: '02.', prompt: 'Elegant appetizer, small bites, gourmet presentation' },
  { id: 'tab-3', firebaseCategory: 'Desserts', name: 'Desserts', num: '03.', prompt: 'Exquisite dessert, chocolate or fruit based, artistic plating' },
  { id: 'tab-4', firebaseCategory: 'Specials', name: 'Specials', num: '04.', prompt: 'Chef special dish, luxury plating, exclusive restaurant offering' },
  { id: 'tab-5', firebaseCategory: 'Drinks', name: 'Drinks', num: '05.', prompt: 'Sophisticated cocktails and wine bottles in a bar setting' },
];

interface FirebaseMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  available: boolean;
}

export default function SpecialMenu() {
  const [activeTab, setActiveTab] = useState('tab-1');
  const [allItems, setAllItems] = useState<FirebaseMenuItem[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const { addItem } = useCart();

  const handleAddToCart = (item: FirebaseMenuItem) => {
    addItem({ id: item.id, name: item.name, price: item.price });
    setAddedIds(prev => new Set(prev).add(item.id));
    setTimeout(() => setAddedIds(prev => { const s = new Set(prev); s.delete(item.id); return s; }), 1500);
  };

  useEffect(() => {
    return onSnapshot(collection(db, 'menuItems'), (snap) => {
      setAllItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as FirebaseMenuItem)));
    });
  }, []);

  const currentPrompt = categories.find(c => c.id === activeTab)?.prompt || '';

  const activeCategory = categories.find(c => c.id === activeTab)?.firebaseCategory || '';
  const currentItems = allItems
    .filter(item => item.category === activeCategory && item.available);

  return (
    <section id="menu" className="relative py-24 overflow-hidden min-h-[800px] flex items-center">
      {/* Background with transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 z-0"
        >
          <GeneratedImage 
            prompt={currentPrompt}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70 z-10" />
        </motion.div>
      </AnimatePresence>

      <div className="container mx-auto px-4 relative z-20">
        <div className="text-center mb-16">
          <h4 className="text-gold uppercase tracking-[0.3em] font-mono text-xs mb-4">Special menu offers.</h4>
          <h2 className="text-4xl md:text-5xl font-serif text-white mb-6">Enjoy Restaurants Specialties</h2>
          <div className="dots-separator">
            <span />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Tabs Menu */}
          <div className="lg:w-1/4">
            <div className="flex flex-col gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={cn(
                    "group flex items-center gap-4 py-4 px-6 text-left transition-all duration-300 border-l-2",
                    activeTab === cat.id 
                      ? "border-gold bg-white/10 text-white" 
                      : "border-transparent text-white/50 hover:text-white hover:bg-white/5"
                  )}
                >
                  <span className="font-mono text-xs text-gold">{cat.num}</span>
                  <span className="font-serif text-lg uppercase tracking-widest">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Menu Content */}
          <div className="lg:w-3/4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8"
              >
                {currentItems.length === 0 ? (
                  <p className="text-white/30 text-sm italic col-span-2">No items available in this category.</p>
                ) : (
                  currentItems.map((item, index) => (
                    <div key={item.id} className="group">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <h6 className="text-white font-serif text-lg flex items-center gap-2">
                          <span className="text-gold text-xs font-mono">{String(index + 1).padStart(2, '0')}.</span>
                          {item.name}
                        </h6>
                        <div className="flex-grow border-b border-white/10 border-dotted h-1" />
                        <span className="text-gold font-mono font-bold">${item.price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-white/50 text-sm italic leading-relaxed flex-1">
                          {item.description}
                        </p>
                        <button
                          onClick={() => handleAddToCart(item)}
                          className={cn(
                            "shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-all",
                            addedIds.has(item.id)
                              ? "border-green-400/50 text-green-400 bg-green-400/10"
                              : "border-gold/40 text-gold hover:bg-gold hover:text-white"
                          )}
                        >
                          {addedIds.has(item.id) ? <Check size={11} /> : <ShoppingBag size={11} />}
                          {addedIds.has(item.id) ? 'Added' : 'Add'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-16 flex flex-col sm:flex-row items-center gap-8">
              <a 
                href="#" 
                className="inline-flex items-center gap-3 bg-gold text-white px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-dark transition-all group"
              >
                View Full Menu
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <a 
                href="#" 
                className="flex items-center gap-2 text-white/70 hover:text-gold transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <Download size={16} />
                Download PDF
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Brushes */}
      <div className="brush-dec2" />
      <div className="brush-dec" />
    </section>
  );
}
