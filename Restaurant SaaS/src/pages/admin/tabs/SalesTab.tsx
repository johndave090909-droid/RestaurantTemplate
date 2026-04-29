import React, { useEffect, useRef, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { TrendingUp, ShoppingBag, Receipt, DollarSign, X, Printer } from 'lucide-react';

interface Sale {
  id: string;
  orderId?: string;
  receiptNo?: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  itemCount: number;
  items: { name: string; qty: number; price: number }[];
  paymentMethod?: 'cash' | 'card';
  cashier: string;
  createdAt: Timestamp;
}

interface ReceiptData extends Sale {
  cashReceived?: number;
  changeDue?: number;
  notes?: string;
}

type Range = 'today' | 'week' | 'month';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOf(range: Range): Date {
  const d = new Date();
  if (range === 'today') {
    d.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(d.getDate() - 29);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white/3 border border-white/10 p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-white/20">{icon}</span>
        <span className="text-[9px] uppercase tracking-widest font-mono text-white/30">{label}</span>
      </div>
      <p className="text-white text-2xl font-mono font-bold">{value}</p>
      {sub && <p className="text-white/30 text-xs font-mono mt-1">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#1a1a1a] border border-white/10 px-3 py-2 text-xs font-mono">
        <p className="text-white/50 mb-1">{label}</p>
        <p className="text-gold font-bold">${payload[0].value.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

export default function SalesTab() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [range, setRange] = useState<Range>('today');
  const [receiptModal, setReceiptModal] = useState<ReceiptData | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const openReceipt = async (sale: Sale) => {
    setLoadingReceipt(true);
    let extra: { cashReceived?: number; changeDue?: number; notes?: string } = {};
    if (sale.orderId) {
      try {
        const snap = await getDoc(doc(db, 'orders', sale.orderId));
        if (snap.exists()) {
          const d = snap.data();
          extra = { cashReceived: d.cashReceived ?? undefined, changeDue: d.changeDue ?? undefined, notes: d.notes };
        }
      } catch {}
    }
    setReceiptModal({ ...sale, ...extra });
    setLoadingReceipt(false);
  };

  const printReceipt = () => {
    const content = receiptRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    win.document.write(`<html><body style="font-family:monospace;padding:20px">${content}</body></html>`);
    win.document.close();
    win.print();
    win.close();
  };

  useEffect(() => {
    const start = Timestamp.fromDate(startOf(range));
    const q = query(
      collection(db, 'sales'),
      where('createdAt', '>=', start),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snap => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    });
  }, [range]);

  // ─── Stats ────────────────────────────────────────────────────────────────

  const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
  const orderCount = sales.length;
  const avgOrder = orderCount ? totalRevenue / orderCount : 0;
  const totalItems = sales.reduce((s, sale) => s + (sale.itemCount ?? 0), 0);

  // ─── Bar chart data ───────────────────────────────────────────────────────

  const chartData = (() => {
    if (range === 'today') {
      // Hourly breakdown
      const hours: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hours[i] = 0;
      sales.forEach(sale => {
        if (sale.createdAt) {
          const h = sale.createdAt.toDate().getHours();
          hours[h] = (hours[h] || 0) + sale.total;
        }
      });
      return Object.entries(hours)
        .filter(([h]) => {
          const now = new Date().getHours();
          return parseInt(h) <= now;
        })
        .map(([h, total]) => ({
          label: `${parseInt(h) % 12 || 12}${parseInt(h) < 12 ? 'am' : 'pm'}`,
          total,
        }));
    } else {
      // Daily breakdown
      const days = range === 'week' ? 7 : 30;
      const buckets: Record<string, number> = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        buckets[key] = 0;
      }
      sales.forEach(sale => {
        if (sale.createdAt) {
          const d = sale.createdAt.toDate();
          const key = `${d.getMonth() + 1}/${d.getDate()}`;
          if (key in buckets) buckets[key] += sale.total;
        }
      });
      return Object.entries(buckets).map(([label, total]) => ({ label, total }));
    }
  })();

  // ─── Best sellers ─────────────────────────────────────────────────────────

  const itemTotals: Record<string, { qty: number; revenue: number }> = {};
  sales.forEach(sale => {
    sale.items?.forEach(item => {
      if (!itemTotals[item.name]) itemTotals[item.name] = { qty: 0, revenue: 0 };
      itemTotals[item.name].qty += item.qty;
      itemTotals[item.name].revenue += item.qty * item.price;
    });
  });
  const bestSellers = Object.entries(itemTotals)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 8);
  const maxQty = bestSellers[0]?.[1].qty ?? 1;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-white font-serif text-2xl">Sales Report</h2>
        <div className="flex gap-2">
          {(['today', 'week', 'month'] as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-[10px] uppercase tracking-widest font-mono px-3 py-1.5 border transition-all ${
                range === r ? 'bg-gold border-gold text-white' : 'border-white/10 text-white/40 hover:border-white/30'
              }`}
            >
              {r === 'today' ? 'Today' : r === 'week' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={<DollarSign size={18} />}
          label="Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          sub={range === 'today' ? 'Today' : range === 'week' ? 'Last 7 days' : 'Last 30 days'}
        />
        <StatCard
          icon={<Receipt size={18} />}
          label="Orders"
          value={orderCount.toString()}
          sub="Completed transactions"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Avg Order"
          value={`$${avgOrder.toFixed(2)}`}
          sub="Per transaction"
        />
        <StatCard
          icon={<ShoppingBag size={18} />}
          label="Items Sold"
          value={totalItems.toString()}
          sub="Total quantity"
        />
      </div>

      {/* Bar chart */}
      <div className="bg-white/3 border border-white/10 p-5 mb-6">
        <p className="text-gold text-[10px] uppercase tracking-widest font-mono mb-4">
          Revenue — {range === 'today' ? 'Hourly' : 'Daily'}
        </p>
        {chartData.every(d => d.total === 0) ? (
          <div className="h-40 flex items-center justify-center text-white/20 font-mono text-sm">
            No sales data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barCategoryGap="30%">
              <XAxis
                dataKey="label"
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${v}`}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="total" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.total > 0 ? '#c19d68' : 'rgba(255,255,255,0.06)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Best sellers */}
      <div className="bg-white/3 border border-white/10 p-5">
        <p className="text-gold text-[10px] uppercase tracking-widest font-mono mb-4">Best Sellers</p>
        {bestSellers.length === 0 ? (
          <div className="text-center py-8 text-white/20 font-mono text-sm">No sales data yet.</div>
        ) : (
          <div className="space-y-3">
            {bestSellers.map(([name, data], i) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-white/20 font-mono text-[10px] w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm truncate">{name}</span>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-white/40 text-xs font-mono">{data.qty} sold</span>
                      <span className="text-gold font-mono text-sm font-bold">${data.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold/60 rounded-full transition-all"
                      style={{ width: `${(data.qty / maxQty) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent transactions */}
      {sales.length > 0 && (
        <div className="bg-white/3 border border-white/10 p-5 mt-6">
          <p className="text-gold text-[10px] uppercase tracking-widest font-mono mb-4">Recent Transactions</p>
          <div className="space-y-2">
            {sales.slice(0, 10).map(sale => (
              <button
                key={sale.id}
                onClick={() => openReceipt(sale)}
                disabled={loadingReceipt}
                className="w-full flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 -mx-2 transition-colors text-left rounded"
              >
                <div>
                  <span className="text-white/50 font-mono text-xs">
                    {sale.createdAt ? sale.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                  {sale.receiptNo && (
                    <span className="text-white/30 font-mono text-xs ml-3">#{sale.receiptNo}</span>
                  )}
                  <span className="text-white/30 font-mono text-xs ml-3">{sale.cashier}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white/30 text-xs">{sale.itemCount} item{sale.itemCount !== 1 ? 's' : ''}</span>
                  <span className="text-gold font-mono font-bold">${sale.total.toFixed(2)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Receipt modal */}
      {receiptModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReceiptModal(null)}>
          <div className="bg-white w-full max-w-xs rounded-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div ref={receiptRef}>
                <h2 className="text-center font-bold text-lg">Unwind</h2>
                <p className="text-center text-xs text-gray-500 mb-1">Restaurant</p>
                <div className="border-t border-dashed border-gray-300 my-3" />
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Order #</span>
                  <span className="font-bold text-gray-800">{receiptModal.receiptNo ?? '—'}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mb-3">
                  <span>Date</span>
                  <span>{receiptModal.createdAt ? receiptModal.createdAt.toDate().toLocaleString() : '—'}</span>
                </div>
                <div className="border-t border-dashed border-gray-300 my-3" />
                {receiptModal.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm mb-1">
                    <span>{item.qty}× {item.name}</span>
                    <span>${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-dashed border-gray-300 my-3" />
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Subtotal</span><span>${receiptModal.subtotal.toFixed(2)}</span>
                </div>
                {receiptModal.discount > 0 && (
                  <div className="flex justify-between text-xs text-green-600 mb-1">
                    <span>Discount</span><span>-${receiptModal.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Tax</span><span>${receiptModal.tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-dashed border-gray-300 my-3" />
                <div className="flex justify-between font-bold text-base">
                  <span>TOTAL</span><span>${receiptModal.total.toFixed(2)}</span>
                </div>
                <div className="border-t border-dashed border-gray-300 my-3" />
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Payment</span>
                  <span className="font-bold text-gray-800 uppercase">{receiptModal.paymentMethod ?? '—'}</span>
                </div>
                {receiptModal.paymentMethod === 'cash' && receiptModal.cashReceived !== undefined && (
                  <>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Cash Received</span><span>${receiptModal.cashReceived.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-gray-800 mb-1">
                      <span>Change Due</span><span>${(receiptModal.changeDue ?? 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
                {receiptModal.notes && (
                  <p className="text-xs text-gray-400 mt-2 italic">Note: {receiptModal.notes}</p>
                )}
                <div className="border-t border-dashed border-gray-300 my-3" />
                <p className="text-center text-xs text-gray-400">Thank you for dining with us!</p>
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
                onClick={() => setReceiptModal(null)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-white bg-[#1a1a1a] hover:bg-[#111] transition-colors"
              >
                <X size={15} /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
