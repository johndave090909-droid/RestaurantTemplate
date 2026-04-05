import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Download } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import GeneratedImage from './GeneratedImage';

const categories = [
  { id: 'tab-1', name: 'Main dishes', num: '01.', prompt: 'Gourmet main course dish, steak or roasted meat, high-end plating' },
  { id: 'tab-2', name: 'Starter', num: '02.', prompt: 'Elegant appetizer, small bites, gourmet presentation' },
  { id: 'tab-3', name: 'Desserts', num: '03.', prompt: 'Exquisite dessert, chocolate or fruit based, artistic plating' },
  { id: 'tab-4', name: 'Sea Food', num: '04.', prompt: 'Fresh seafood platter, lobster or oysters, luxury dining' },
  { id: 'tab-5', name: 'Drinks', num: '05.', prompt: 'Sophisticated cocktails and wine bottles in a bar setting' },
];

const menuItems: Record<string, any[]> = {
  'tab-1': [
    { id: '01.', name: 'Soft shell crab', price: '$29', details: 'Granny help you treat yourself with a different meal everyday' },
    { id: '02.', name: 'Miso chicken', price: '$19', details: 'Etiam tempus felis eros, id lobortis turpis' },
    { id: '03.', name: 'Fish pie', price: '$12', details: 'usce tempus tempus maximus volutpat' },
    { id: '04.', name: 'Salmon riverland', price: '$105', details: 'Fusce a tellus tellus. Praesent neque arcu, efficitur sit amet' },
  ],
  'tab-2': [
    { id: '01.', name: 'Fried Potatoes', price: '$29', details: 'Granny help you treat yourself with a different meal everyday' },
    { id: '02.', name: 'Doner Burger', price: '$19', details: 'Etiam tempus felis eros, id lobortis turpis' },
    { id: '03.', name: 'Steak Filet', price: '$12', details: 'usce tempus tempus maximus volutpat' },
    { id: '04.', name: 'Cayenne Shrimp', price: '$37', details: 'usce tempus tempus maximus volutpat' },
  ],
  'tab-3': [
    { id: '01.', name: 'Soft shell crab', price: '$29', details: 'Granny help you treat yourself with a different meal everyday' },
    { id: '02.', name: 'Tarte Tatin', price: '$25', details: 'Etiam tempus felis eros, id lobortis turpis' },
    { id: '03.', name: 'Creme Brulee', price: '$64', details: 'usce tempus tempus maximus volutpat' },
    { id: '04.', name: 'Lemon Meringue', price: '$12', details: 'usce tempus tempus maximus volutpat' },
  ],
  'tab-4': [
    { id: '01.', name: 'Lobster with melted mozarella', price: '$156', details: 'Granny help you treat yourself with a different meal everyday' },
    { id: '02.', name: 'Butterfly fried shrimps platter', price: '$98', details: 'Etiam tempus felis eros, id lobortis turpis' },
  ],
  'tab-5': [
    { id: '01.', name: 'Kiwi Coctail', price: '$12', details: 'Granny help you treat yourself with a different meal everyday' },
    { id: '02.', name: 'Summer Beer', price: '$21', details: 'Etiam tempus felis eros, id lobortis turpis' },
    { id: '03.', name: 'Red Mojitos', price: '$17', details: 'usce tempus tempus maximus volutpat' },
    { id: '04.', name: 'Cabernet Sauvignon', price: '$40', details: 'usce tempus tempus maximus volutpat' },
  ],
};

export default function SpecialMenu() {
  const [activeTab, setActiveTab] = useState('tab-1');

  const currentPrompt = categories.find(c => c.id === activeTab)?.prompt || '';

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
                {menuItems[activeTab].map((item) => (
                  <div key={item.id} className="group">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <h6 className="text-white font-serif text-lg flex items-center gap-2">
                        <span className="text-gold text-xs font-mono">{item.id}</span>
                        {item.name}
                      </h6>
                      <div className="flex-grow border-b border-white/10 border-dotted h-1" />
                      <span className="text-gold font-mono font-bold">{item.price}</span>
                    </div>
                    <p className="text-white/50 text-sm italic leading-relaxed">
                      {item.details}
                    </p>
                  </div>
                ))}
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
