import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, ArrowRight } from 'lucide-react';
import GeneratedImage from './GeneratedImage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const cartItems = [
  { id: 1, name: 'Grilled Steaks', price: 45, quantity: 1, prompt: 'Gourmet grilled steak with vegetables' },
  { id: 2, name: 'Crispy Lobster & Shrimp Bites', price: 22, quantity: 2, prompt: 'Crispy fried lobster and shrimp appetizers' },
  { id: 3, name: 'Chicken tortilla soup', price: 37, quantity: 1, prompt: 'Hot chicken tortilla soup in a bowl' },
];

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-darker/50 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-dark text-white">
              <h2 className="text-xl font-serif">Your Cart <span className="text-gold text-sm ml-2">{cartItems.length} items</span></h2>
              <button onClick={onClose} className="p-2 hover:text-gold transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-4 group">
                  <div className="w-20 h-20 flex-shrink-0 overflow-hidden">
                    <GeneratedImage 
                      prompt={item.prompt}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-serif text-lg leading-tight mb-1 hover:text-gold cursor-pointer transition-colors">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{item.quantity}</span>
                      <span>x</span>
                      <span className="text-gold font-bold">${item.price}</span>
                    </div>
                  </div>
                  <button className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <span className="text-gray-500 uppercase tracking-widest text-xs font-bold">Subtotal :</span>
                <span className="text-2xl font-serif text-dark">${subtotal}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <a 
                  href="#cart" 
                  className="flex items-center justify-center py-4 border border-dark text-dark text-xs font-bold uppercase tracking-widest hover:bg-dark hover:text-white transition-all"
                >
                  View Cart
                </a>
                <a 
                  href="#checkout" 
                  className="flex items-center justify-center gap-2 py-4 bg-gold text-white text-xs font-bold uppercase tracking-widest hover:bg-dark transition-all group"
                >
                  Checkout
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
