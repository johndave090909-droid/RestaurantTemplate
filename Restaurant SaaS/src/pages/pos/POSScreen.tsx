import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, addDoc, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  Plus, Minus, Trash2, LogOut, ShoppingBag,
  Printer, Check, X, LayoutGrid, Banknote, CreditCard, ArrowLeft, QrCode,
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  available: boolean;
}

interface CartItem extends MenuItem {
  qty: number;
}

interface DigitalMethod {
  id: string;
  name: string;
  qrUrl: string;
  storagePath?: string;
}

const CATEGORIES = ['All', 'Starters', 'Mains', 'Desserts', 'Drinks', 'Specials'];
const TAX_RATE = 0.1;

export default function POSScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [note, setNote] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'digital'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [digitalMethods, setDigitalMethods] = useState<DigitalMethod[]>([]);
  const [selectedDigital, setSelectedDigital] = useState<DigitalMethod | null>(null);
  const [qrModal, setQrModal] = useState(false);
  const [receipt, setReceipt] = useState<null | {
    items: CartItem[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    orderId: string;
    time: string;
    note: string;
    paymentMethod: 'cash' | 'card' | 'digital';
    digitalMethod?: string;
    cashReceived?: number;
    changeDue?: number;
  }>(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'menuItems'), snap => {
      setMenuItems(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() } as MenuItem))
          .filter(i => i.available)
      );
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'digitalPayments'), snap => {
      setDigitalMethods(snap.docs.map(d => ({ id: d.id, ...d.data() } as DigitalMethod)));
    });
  }, []);

  // ─── Cart helpers ───────────────────────────────────────────────────────────

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev =>
      prev
        .map(c => c.id === id ? { ...c, qty: c.qty + delta } : c)
        .filter(c => c.qty > 0)
    );
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));

  const clearCart = () => {
    setCart([]);
    setDiscountPct(0);
    setNote('');
    setCashReceived('');
    setPaymentMethod('cash');
    setSelectedDigital(null);
    setQrModal(false);
  };

  // ─── Totals ─────────────────────────────────────────────────────────────────

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discountAmt = subtotal * (discountPct / 100);
  const taxAmt = (subtotal - discountAmt) * TAX_RATE;
  const total = subtotal - discountAmt + taxAmt;

  // ─── Checkout ───────────────────────────────────────────────────────────────

  const openPayment = () => {
    if (!cart.length) return;
    setCashReceived('');
    setPaymentMethod('cash');
    setSelectedDigital(null);
    setQrModal(false);
    setPaymentModal(true);
  };

  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const changeDue = Math.max(0, cashReceivedNum - total);
  const cashValid =
    paymentMethod === 'card' ||
    (paymentMethod === 'digital' && !!selectedDigital) ||
    (paymentMethod === 'cash' && cashReceivedNum >= total);

  const nextReceiptNumber = async () => {
    try {
      const counterRef = doc(db, 'counters', 'receipts');
      const next = await runTransaction(db, async (tx) => {
        const snap = await tx.get(counterRef);
        const current = snap.exists() ? (snap.data().value as number) : 0;
        const value = current + 1;
        tx.set(counterRef, { value, updatedAt: serverTimestamp() }, { merge: true });
        return value;
      });
      return next.toString(36).toUpperCase().padStart(5, '0').slice(-5);
    } catch {
      return 'L-' + Date.now().toString(36).toUpperCase().slice(-5);
    }
  };

  const handleConfirmPayment = async () => {
    setCheckingOut(true);
    try {
      const receiptNo = await nextReceiptNumber();
      const ref = await addDoc(collection(db, 'orders'), {
        items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
        subtotal,
        discount: discountAmt,
        tax: taxAmt,
        total,
        discountPct,
        notes: note,
        paymentMethod,
        digitalMethod: paymentMethod === 'digital' ? (selectedDigital?.name ?? null) : null,
        cashReceived: paymentMethod === 'cash' ? cashReceivedNum : null,
        changeDue: paymentMethod === 'cash' ? changeDue : null,
        status: 'pending',
        cashier: user?.displayName ?? user?.email,
        receiptNo,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'sales'), {
        orderId: ref.id,
        receiptNo,
        total,
        subtotal,
        discount: discountAmt,
        tax: taxAmt,
        itemCount: cart.reduce((s, c) => s + c.qty, 0),
        items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.price })),
        paymentMethod,
        digitalMethod: paymentMethod === 'digital' ? (selectedDigital?.name ?? null) : null,
        cashier: user?.displayName ?? user?.email,
        createdAt: serverTimestamp(),
      });

      setPaymentModal(false);
      setQrModal(false);
      setReceipt({
        items: [...cart],
        subtotal,
        discount: discountAmt,
        tax: taxAmt,
        total,
        orderId: receiptNo,
        time: new Date().toLocaleString(),
        note,
        paymentMethod,
        digitalMethod: paymentMethod === 'digital' ? selectedDigital?.name : undefined,
        cashReceived: paymentMethod === 'cash' ? cashReceivedNum : undefined,
        changeDue: paymentMethod === 'cash' ? changeDue : undefined,
      });
      clearCart();
    } finally {
      setCheckingOut(false);
    }
  };

  // ─── Print receipt ──────────────────────────────────────────────────────────

  const printReceipt = () => {
    const content = receiptRef.current?.innerHTML;
    if (!content) return;
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    w.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body { font-family: monospace; font-size: 13px; padding: 20px; max-width: 320px; margin: 0 auto; }
        h2 { text-align: center; margin-bottom: 4px; }
        .center { text-align: center; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; }
        .line { border-top: 1px dashed #000; margin: 8px 0; }
        .bold { font-weight: bold; }
        .total { font-size: 15px; }
      </style></head>
      <body>${content}</body></html>
    `);
    w.document.close();
    w.print();
  };

  // ─── Filtered items ──────────────────────────────────────────────────────────

  const filtered = menuItems.filter(i => {
    const matchCat = category === 'All' || i.category === category;
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const grouped = CATEGORIES.slice(1).reduce((acc, cat) => {
    const items = filtered.filter(i => i.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {} as Record<string, MenuItem[]>);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex flex-col">

      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3 bg-[#0a0a0a] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-white/40 hover:text-white transition-colors"
            title="Back to Admin Panel"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-serif italic text-white text-xl">Unwind</h1>
          <div className="h-4 w-[1px] bg-white/10" />
          <span className="text-gold/70 font-mono text-[10px] uppercase tracking-widest">POS</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-white/30 hover:text-white text-xs font-mono uppercase tracking-widest flex items-center gap-2 transition-colors"
          >
            <LayoutGrid size={14} /> Dashboard
          </button>
          <button
            onClick={async () => { await logout(); navigate('/admin'); }}
            className="text-white/20 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Product grid ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-white/10">

          {/* Search + category filter */}
          <div className="px-4 pt-4 pb-3 space-y-3 border-b border-white/10 bg-[#0a0a0a]">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full bg-white/5 border border-white/10 px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors placeholder:text-white/20"
            />
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`shrink-0 text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border transition-all ${
                    category === cat
                      ? 'bg-gold border-gold text-white'
                      : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-gold text-[10px] uppercase tracking-widest font-mono mb-2 flex items-center gap-2">
                  {cat} <span className="h-[1px] flex-1 bg-gold/20" />
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {items.map(item => {
                    const inCart = cart.find(c => c.id === item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className={`relative text-left p-3 border transition-all group ${
                          inCart
                            ? 'bg-gold/10 border-gold/40'
                            : 'bg-white/3 border-white/10 hover:border-gold/30 hover:bg-white/5'
                        }`}
                      >
                        {inCart && (
                          <span className="absolute top-2 right-2 w-5 h-5 bg-gold rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                            {inCart.qty}
                          </span>
                        )}
                        <p className="text-white text-sm font-medium leading-tight pr-6">{item.name}</p>
                        {item.description && (
                          <p className="text-white/30 text-[10px] mt-0.5 truncate">{item.description}</p>
                        )}
                        <p className="text-gold font-mono font-bold mt-2">${item.price.toFixed(2)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-20 text-white/20 font-mono text-sm">
                {menuItems.length === 0 ? 'No menu items yet. Add them in the dashboard.' : 'No items match your search.'}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Cart ───────────────────────────────────────────────────── */}
        <div className="w-80 shrink-0 flex flex-col bg-[#0a0a0a]">

          {/* Cart header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ShoppingBag size={15} className="text-gold" />
              <span className="text-white text-sm font-medium">Order</span>
              {cart.length > 0 && (
                <span className="bg-gold text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cart.reduce((s, c) => s + c.qty, 0)}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-white/20 hover:text-red-400 transition-colors text-[10px] font-mono uppercase tracking-widest">
                Clear
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/15 gap-3">
                <ShoppingBag size={32} />
                <p className="font-mono text-xs uppercase tracking-widest">Cart is empty</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {cart.map(item => (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{item.name}</p>
                      <p className="text-white/30 text-xs font-mono">${item.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center border border-white/10 text-white/40 hover:border-gold/50 hover:text-gold transition-all"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="w-6 text-center text-white text-sm font-mono">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center border border-white/10 text-white/40 hover:border-gold/50 hover:text-gold transition-all"
                      >
                        <Plus size={10} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-red-400 transition-colors ml-1"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <span className="text-gold font-mono text-sm w-14 text-right shrink-0">
                      ${(item.price * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discount + note */}
          {cart.length > 0 && (
            <div className="px-4 py-3 space-y-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <label className="text-white/30 text-[10px] uppercase tracking-widest font-mono w-20 shrink-0">Discount</label>
                <div className="flex items-center gap-1 flex-1">
                  {[0, 5, 10, 15, 20].map(d => (
                    <button
                      key={d}
                      onClick={() => setDiscountPct(d)}
                      className={`flex-1 py-1 text-[10px] font-mono border transition-all ${
                        discountPct === d
                          ? 'bg-gold border-gold text-white'
                          : 'border-white/10 text-white/40 hover:border-white/30'
                      }`}
                    >
                      {d}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-white/30 text-[10px] uppercase tracking-widest font-mono w-20 shrink-0">Note</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Order note..."
                  className="flex-1 bg-white/5 border border-white/10 px-2 py-1.5 text-white text-xs focus:outline-none focus:border-gold/30 transition-colors placeholder:text-white/20"
                />
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="px-4 py-4 border-t border-white/10 space-y-1.5">
            <div className="flex justify-between text-xs text-white/40 font-mono">
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
            {discountPct > 0 && (
              <div className="flex justify-between text-xs text-green-400 font-mono">
                <span>Discount ({discountPct}%)</span><span>-${discountAmt.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-white/40 font-mono">
              <span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span><span>${taxAmt.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-white font-bold font-mono text-lg pt-1 border-t border-white/10">
              <span>Total</span><span className="text-gold">${total.toFixed(2)}</span>
            </div>

            <button
              onClick={openPayment}
              disabled={cart.length === 0}
              className="w-full mt-2 bg-gold hover:bg-gold/80 disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Charge ${total.toFixed(2)}
            </button>
          </div>
        </div>
      </div>

      {/* ── Payment modal ─────────────────────────────────────────────────────── */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-white/10 w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h3 className="text-white font-serif text-lg">Payment</h3>
              <button onClick={() => setPaymentModal(false)} className="text-white/30 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Amount due */}
              <div className="text-center py-4 bg-white/3 border border-white/10">
                <p className="text-white/30 text-[10px] uppercase tracking-widest font-mono mb-1">Amount Due</p>
                <p className="text-gold font-mono font-bold text-4xl">${total.toFixed(2)}</p>
              </div>

              {/* Method selector — 3 columns */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => { setPaymentMethod('cash'); setSelectedDigital(null); }}
                  className={`flex flex-col items-center gap-2 py-4 border transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-white/10 text-white/40 hover:border-white/30'
                  }`}
                >
                  <Banknote size={22} />
                  <span className="text-xs font-bold uppercase tracking-widest">Cash</span>
                </button>
                <button
                  onClick={() => { setPaymentMethod('card'); setSelectedDigital(null); }}
                  className={`flex flex-col items-center gap-2 py-4 border transition-all ${
                    paymentMethod === 'card'
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-white/10 text-white/40 hover:border-white/30'
                  }`}
                >
                  <CreditCard size={22} />
                  <span className="text-xs font-bold uppercase tracking-widest">Card</span>
                </button>
                <button
                  onClick={() => { setPaymentMethod('digital'); setSelectedDigital(null); }}
                  className={`flex flex-col items-center gap-2 py-4 border transition-all ${
                    paymentMethod === 'digital'
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-white/10 text-white/40 hover:border-white/30'
                  }`}
                >
                  <QrCode size={22} />
                  <span className="text-xs font-bold uppercase tracking-widest">Digital</span>
                </button>
              </div>

              {/* Cash */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-white/30 text-[10px] uppercase tracking-widest font-mono block mb-1.5">Cash Received</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      placeholder={`${total.toFixed(2)}`}
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-gold/50 transition-colors placeholder:text-white/20"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      Math.ceil(total),
                      Math.ceil(total / 5) * 5,
                      Math.ceil(total / 10) * 10,
                      Math.ceil(total / 20) * 20,
                    ].filter((v, i, a) => a.indexOf(v) === i).map(amt => (
                      <button
                        key={amt}
                        onClick={() => setCashReceived(amt.toString())}
                        className="py-2 border border-white/10 text-white/50 text-xs font-mono hover:border-gold/40 hover:text-gold transition-all"
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                  {cashReceivedNum >= total && (
                    <div className="flex justify-between items-center py-3 px-4 bg-green-500/10 border border-green-500/20">
                      <span className="text-green-400 text-sm font-mono uppercase tracking-widest">Change Due</span>
                      <span className="text-green-400 font-mono font-bold text-xl">${changeDue.toFixed(2)}</span>
                    </div>
                  )}
                  {cashReceived && cashReceivedNum < total && (
                    <div className="flex justify-between items-center py-3 px-4 bg-red-500/10 border border-red-500/20">
                      <span className="text-red-400 text-sm font-mono">Short by</span>
                      <span className="text-red-400 font-mono font-bold">${(total - cashReceivedNum).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Card */}
              {paymentMethod === 'card' && (
                <div className="py-4 px-4 bg-blue-500/10 border border-blue-500/20 text-center">
                  <CreditCard size={20} className="text-blue-400 mx-auto mb-2" />
                  <p className="text-blue-400 text-sm font-mono">Process payment on card terminal</p>
                  <p className="text-blue-400/50 text-xs mt-1">then confirm below</p>
                </div>
              )}

              {/* Digital */}
              {paymentMethod === 'digital' && (
                <div className="space-y-3">
                  {digitalMethods.length === 0 ? (
                    <div className="py-6 text-center text-white/20 font-mono text-xs border border-white/10">
                      No digital methods set up yet.<br />Go to Site Settings → Digital Payments.
                    </div>
                  ) : (
                    <>
                      <p className="text-white/30 text-[10px] uppercase tracking-widest font-mono">Select method — QR will appear</p>
                      <div className="grid grid-cols-2 gap-2">
                        {digitalMethods.map(m => (
                          <button
                            key={m.id}
                            onClick={() => { setSelectedDigital(m); setQrModal(true); }}
                            className={`flex flex-col items-center gap-2 py-3 px-2 border transition-all ${
                              selectedDigital?.id === m.id
                                ? 'border-gold bg-gold/10 text-gold'
                                : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'
                            }`}
                          >
                            <QrCode size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest text-center leading-tight">{m.name}</span>
                          </button>
                        ))}
                      </div>
                      {selectedDigital && (
                        <div className="flex items-center gap-2 py-2 px-3 bg-green-500/10 border border-green-500/20">
                          <Check size={13} className="text-green-400 shrink-0" />
                          <span className="text-green-400 text-xs font-mono flex-1">{selectedDigital.name} selected</span>
                          <button
                            onClick={() => setQrModal(true)}
                            className="text-green-400/60 hover:text-green-400 text-[10px] font-mono uppercase tracking-widest transition-colors"
                          >
                            Show QR
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Confirm */}
              <button
                onClick={handleConfirmPayment}
                disabled={!cashValid || checkingOut}
                className="w-full bg-gold hover:bg-gold/80 disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2"
              >
                {checkingOut
                  ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <Check size={16} />}
                {checkingOut
                  ? 'Processing...'
                  : paymentMethod === 'card'
                    ? 'Confirm Card Payment'
                    : paymentMethod === 'digital'
                      ? `Confirm ${selectedDigital?.name ?? 'Digital'} Payment`
                      : 'Confirm Cash Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Code popup ─────────────────────────────────────────────────────── */}
      {qrModal && selectedDigital && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-7 w-full max-w-xs flex flex-col items-center gap-5 shadow-2xl">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono mb-1">Scan to Pay via</p>
              <p className="text-2xl font-bold text-gray-900">{selectedDigital.name}</p>
            </div>
            <img
              src={selectedDigital.qrUrl}
              alt={`${selectedDigital.name} QR`}
              className="w-52 h-52 object-contain rounded-lg"
            />
            <p className="text-2xl font-bold font-mono text-gray-900">${total.toFixed(2)}</p>
            <p className="text-xs text-gray-400 text-center -mt-2">Show this screen to the customer</p>
            <button
              onClick={() => setQrModal(false)}
              className="w-full bg-gray-900 hover:bg-black text-white py-3.5 font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 rounded-xl"
            >
              <Check size={16} /> Done — Payment Received
            </button>
          </div>
        </div>
      )}

      {/* ── Receipt modal ─────────────────────────────────────────────────────── */}
      {receipt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-sm shadow-2xl">
            <div className="p-5">
              <div ref={receiptRef}>
                <h2 className="text-center font-bold text-lg">Unwind</h2>
                <p className="center text-center text-xs text-gray-500 mb-1">Restaurant</p>
                <div className="line border-t border-dashed border-gray-300 my-3" />
                <div className="row flex justify-between text-xs text-gray-500 mb-1">
                  <span>Order #</span><span className="font-bold text-gray-800">{receipt.orderId}</span>
                </div>
                <div className="row flex justify-between text-xs text-gray-500 mb-3">
                  <span>Date</span><span>{receipt.time}</span>
                </div>
                <div className="line border-t border-dashed border-gray-300 my-3" />

                {receipt.items.map((item, i) => (
                  <div key={i} className="row flex justify-between text-sm mb-1">
                    <span>{item.qty}× {item.name}</span>
                    <span>${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}

                <div className="line border-t border-dashed border-gray-300 my-3" />
                <div className="row flex justify-between text-xs text-gray-500 mb-1">
                  <span>Subtotal</span><span>${receipt.subtotal.toFixed(2)}</span>
                </div>
                {receipt.discount > 0 && (
                  <div className="row flex justify-between text-xs text-green-600 mb-1">
                    <span>Discount</span><span>-${receipt.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="row flex justify-between text-xs text-gray-500 mb-1">
                  <span>Tax</span><span>${receipt.tax.toFixed(2)}</span>
                </div>
                <div className="line border-t border-dashed border-gray-300 my-3" />
                <div className="row flex justify-between font-bold text-base total">
                  <span>TOTAL</span><span>${receipt.total.toFixed(2)}</span>
                </div>
                <div className="line border-t border-dashed border-gray-300 my-3" />
                <div className="row flex justify-between text-xs text-gray-500 mb-1">
                  <span>Payment</span>
                  <span className="font-bold text-gray-800 uppercase">
                    {receipt.paymentMethod === 'digital' && receipt.digitalMethod
                      ? receipt.digitalMethod
                      : receipt.paymentMethod}
                  </span>
                </div>
                {receipt.paymentMethod === 'cash' && receipt.cashReceived !== undefined && (
                  <>
                    <div className="row flex justify-between text-xs text-gray-500 mb-1">
                      <span>Cash Received</span><span>${receipt.cashReceived.toFixed(2)}</span>
                    </div>
                    <div className="row flex justify-between text-xs font-bold text-gray-800 mb-1">
                      <span>Change Due</span><span>${(receipt.changeDue ?? 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
                {receipt.note && (
                  <p className="text-xs text-gray-400 mt-2 italic">Note: {receipt.note}</p>
                )}
                <div className="line border-t border-dashed border-gray-300 my-3" />
                <p className="center text-center text-xs text-gray-400">Thank you for dining with us!</p>
              </div>
            </div>

            <div className="flex border-t border-gray-100">
              <button
                onClick={printReceipt}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100"
              >
                <Printer size={15} /> Print
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-white bg-[#1a1a1a] hover:bg-[#111] transition-colors"
              >
                <X size={15} /> New Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
