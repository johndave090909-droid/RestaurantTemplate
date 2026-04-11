import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, ArrowRight, Plus, Minus, ShoppingBag, CheckCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useCart } from '@/src/context/CartContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'cart' | 'checkout' | 'success';

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, count, total, removeItem, updateQty, clearCart } = useCart();
  const [step, setStep] = useState<Step>('cart');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    onClose();
    // Reset to cart step after animation
    setTimeout(() => {
      if (step === 'success') {
        setStep('cart');
        setName('');
        setPhone('');
        setNotes('');
      }
    }, 400);
  };

  const handleCheckout = async () => {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'orders'), {
        items: items.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
        subtotal: total,
        total,
        notes: notes.trim(),
        customerName: name.trim(),
        customerPhone: phone.trim(),
        paymentMethod: 'online',
        status: 'pending',
        cashier: 'Online Order',
        source: 'online',
        createdAt: serverTimestamp(),
      });
      clearCart();
      setStep('success');
    } catch (e) {
      setError('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full border border-gray-200 px-3 py-2.5 text-sm text-dark focus:outline-none focus:border-gold/60 transition-colors bg-white";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
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
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-dark text-white shrink-0">
              <h2 className="text-xl font-serif">
                {step === 'success' ? 'Order Placed!' : 'Your Cart'}
                {step === 'cart' && count > 0 && (
                  <span className="text-gold text-sm ml-2">{count} {count === 1 ? 'item' : 'items'}</span>
                )}
              </h2>
              <button onClick={handleClose} className="p-2 hover:text-gold transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Success state */}
            {step === 'success' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
                <CheckCircle size={56} className="text-gold" />
                <div>
                  <h3 className="font-serif text-2xl text-dark mb-2">Thank you, {name}!</h3>
                  <p className="text-gray-500 text-sm">Your order has been received and is being prepared.</p>
                </div>
                <button
                  onClick={handleClose}
                  className="bg-gold text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-dark transition-all"
                >
                  Done
                </button>
              </div>
            )}

            {/* Cart step */}
            {step === 'cart' && (
              <>
                {items.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
                    <ShoppingBag size={48} className="opacity-30" />
                    <p className="text-sm uppercase tracking-widest font-mono">Your cart is empty</p>
                  </div>
                ) : (
                  <div className="flex-grow overflow-y-auto p-6 space-y-5">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-serif text-base text-dark leading-tight truncate">{item.name}</h3>
                          <p className="text-gold font-bold text-sm mt-0.5">${(item.price * item.qty).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => updateQty(item.id, item.qty - 1)}
                            className="w-7 h-7 flex items-center justify-center border border-gray-200 hover:border-gold hover:text-gold transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-dark">{item.qty}</span>
                          <button
                            onClick={() => updateQty(item.id, item.qty + 1)}
                            className="w-7 h-7 flex items-center justify-center border border-gray-200 hover:border-gold hover:text-gold transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {items.length > 0 && (
                  <div className="p-6 bg-gray-50 border-t border-gray-100 shrink-0">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-gray-500 uppercase tracking-widest text-xs font-bold">Subtotal</span>
                      <span className="text-2xl font-serif text-dark">${total.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => setStep('checkout')}
                      className="w-full flex items-center justify-center gap-2 py-4 bg-gold text-white text-xs font-bold uppercase tracking-widest hover:bg-dark transition-all group"
                    >
                      Proceed to Checkout
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Checkout step */}
            {step === 'checkout' && (
              <>
                <div className="flex-grow overflow-y-auto p-6 space-y-4">
                  {/* Order summary */}
                  <div className="bg-gray-50 p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-mono text-gray-400 mb-3">Order Summary</p>
                    {items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.qty}× {item.name}</span>
                        <span className="font-bold text-dark">${(item.price * item.qty).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                      <span className="text-dark">Total</span>
                      <span className="text-gold">${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Customer details */}
                  <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-widest font-mono text-gray-400">Your Details</p>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400 block mb-1">
                        Full Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        className={inputCls}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400 block mb-1">Phone (optional)</label>
                      <input
                        className={inputCls}
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+1 555 000 0000"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-mono text-gray-400 block mb-1">Special Requests (optional)</label>
                      <textarea
                        className={inputCls + " resize-none"}
                        rows={3}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Allergies, preferences..."
                      />
                    </div>
                  </div>

                  {error && <p className="text-red-500 text-xs font-mono">{error}</p>}
                </div>

                <div className="p-6 border-t border-gray-100 shrink-0 flex gap-3">
                  <button
                    onClick={() => setStep('cart')}
                    className="flex-1 py-4 border border-gray-200 text-dark text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleCheckout}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-gold text-white text-xs font-bold uppercase tracking-widest hover:bg-dark transition-all disabled:opacity-60"
                  >
                    {submitting ? 'Placing...' : 'Place Order'}
                    {!submitting && <ArrowRight size={14} />}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
