import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Users, ArrowRight } from 'lucide-react';
import GeneratedImage from './GeneratedImage';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReservationModal({ isOpen, onClose }: ReservationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
            className="relative w-full max-w-4xl bg-white overflow-hidden flex flex-col md:flex-row"
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
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Your Name *" 
                      className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors"
                      required
                    />
                  </div>
                  <div className="relative">
                    <input 
                      type="email" 
                      placeholder="Email Address *" 
                      className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors"
                      required
                    />
                  </div>
                  <div className="relative">
                    <input 
                      type="tel" 
                      placeholder="Phone *" 
                      className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors"
                      required
                    />
                  </div>
                  <div className="relative flex items-center">
                    <Users size={16} className="absolute right-0 text-gray-400" />
                    <select className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors bg-transparent appearance-none">
                      <option>Persons</option>
                      <option>1 Person</option>
                      <option>2 People</option>
                      <option>3 People</option>
                      <option>4 People</option>
                      <option>5 People</option>
                      <option>Banquet</option>
                    </select>
                  </div>
                  <div className="relative flex items-center">
                    <Calendar size={16} className="absolute right-0 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Date" 
                      className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors"
                    />
                  </div>
                  <div className="relative flex items-center">
                    <Clock size={16} className="absolute right-0 text-gray-400" />
                    <select className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors bg-transparent appearance-none">
                      <option>Time</option>
                      <option>10:00 am</option>
                      <option>12:00 pm</option>
                      <option>2:00 pm</option>
                      <option>6:00 pm</option>
                      <option>8:00 pm</option>
                    </select>
                  </div>
                </div>
                
                <textarea 
                  placeholder="Your Message:" 
                  rows={3}
                  className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gold transition-colors resize-none"
                />

                <button className="w-full bg-gold text-white py-4 font-bold uppercase tracking-widest hover:bg-dark transition-all flex items-center justify-center gap-3 group">
                  Reserve Table
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
