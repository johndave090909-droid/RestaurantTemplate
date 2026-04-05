import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Users, ArrowRight } from 'lucide-react';
import GeneratedImage from './GeneratedImage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReservationModal({ isOpen, onClose }: ReservationModalProps) {
  const timeOptions = useMemo(() => ([
    '10:00 AM',
    '12:00 PM',
    '2:00 PM',
    '6:00 PM',
    '8:00 PM',
  ]), []);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    guests: '',
    date: '',
    time: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const dateRef = useRef<HTMLInputElement | null>(null);

  const onChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  };

  const resetForm = () => {
    setForm({
      name: '',
      email: '',
      phone: '',
      guests: '',
      date: '',
      time: '',
      notes: '',
    });
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!form.guests || !form.date || !form.time) {
      setError('Please select guests, date, and time.');
      return;
    }

    const guestsNum = Number(form.guests);
    if (!Number.isFinite(guestsNum) || guestsNum <= 0) {
      setError('Please choose a valid number of guests.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        date: form.date,
        time: form.time,
        guests: guestsNum,
        notes: form.notes.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      };
      const savePromise = addDoc(collection(db, 'reservations'), payload);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Save timed out. Check your Firestore rules or network.')), 8000);
      });
      await Promise.race([savePromise, timeoutPromise]);
      setSuccess(true);
      resetForm();
    } catch (err) {
      console.error('Reservation submit failed', err);
      const msg = err instanceof Error ? err.message : 'Unable to submit reservation. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const openDatePicker = () => {
    const el = dateRef.current;
    if (!el) return;
    // Some mobile browsers require calling showPicker() from a user gesture.
    try {
      if (typeof (el as HTMLInputElement).showPicker === 'function') {
        (el as HTMLInputElement).showPicker();
      } else {
        el.focus();
      }
    } catch {
      el.focus();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-darker/90 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full h-full sm:h-auto sm:max-w-4xl bg-white flex flex-col md:flex-row overflow-y-auto md:overflow-hidden overscroll-contain"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-50 p-2 text-dark hover:text-gold transition-colors"
            >
              <X size={24} />
            </button>

            {/* Left Side: Image/Info */}
            <div className="md:w-2/5 bg-dark text-white p-12 flex flex-col justify-center relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="text-gold uppercase tracking-[0.3em] font-mono text-xs mb-4">Don't forget to book a table</h4>
                <h2 className="text-4xl font-serif mb-6">Table Reservations</h2>
                <div className="w-12 h-[1px] bg-gold mb-8" />
                <p className="text-white/50 italic leading-relaxed">
                  "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam."
                </p>
              </div>
              
              {/* Decorative Background */}
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <GeneratedImage 
                  prompt="Luxury restaurant dining table setup, candle light, romantic atmosphere"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Right Side: Form */}
            <div className="md:w-3/5 p-12">
              <form className="space-y-6" onSubmit={onSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Your Name *" 
                      className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors"
                      required
                      value={form.name}
                      onChange={onChange('name')}
                    />
                  </div>
                  <div className="relative">
                    <input 
                      type="email" 
                      placeholder="Email Address" 
                      className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors"
                      value={form.email}
                      onChange={onChange('email')}
                    />
                  </div>
                  <div className="relative">
                    <input 
                      type="tel" 
                      placeholder="Phone *" 
                      className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors"
                      required
                      value={form.phone}
                      onChange={onChange('phone')}
                    />
                  </div>
                  <div className="relative flex items-center">
                    <Users size={16} className="absolute right-0 text-gray-400 pointer-events-none" />
                    <select
                      className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors bg-transparent appearance-none"
                      required
                      value={form.guests}
                      onChange={onChange('guests')}
                    >
                      <option value="" disabled>Persons</option>
                      <option value="1">1 Person</option>
                      <option value="2">2 People</option>
                      <option value="3">3 People</option>
                      <option value="4">4 People</option>
                      <option value="5">5 People</option>
                      <option value="10">Banquet</option>
                    </select>
                  </div>
                  <div className="relative flex items-center">
                    <Calendar size={16} className="absolute right-0 text-gray-400 pointer-events-none" />
                    <input 
                      type="date" 
                      placeholder="Date" 
                      className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors touch-manipulation"
                      required
                      ref={dateRef}
                      value={form.date}
                      onChange={onChange('date')}
                      onFocus={openDatePicker}
                      onClick={openDatePicker}
                    />
                  </div>
                  <div className="relative flex items-center">
                    <Clock size={16} className="absolute right-0 text-gray-400 pointer-events-none" />
                    <select
                      className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors bg-transparent appearance-none"
                      required
                      value={form.time}
                      onChange={onChange('time')}
                    >
                      <option value="" disabled>Time</option>
                      {timeOptions.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <textarea 
                  placeholder="Your Message:" 
                  rows={3}
                  className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors resize-none"
                  value={form.notes}
                  onChange={onChange('notes')}
                />

                {error && <div className="text-sm text-red-600">{error}</div>}
                {success && <div className="text-sm text-green-600">Reservation submitted! See you soon.</div>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gold text-white py-4 font-bold uppercase tracking-widest hover:bg-dark transition-all flex items-center justify-center gap-3 group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Reserve Table'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
