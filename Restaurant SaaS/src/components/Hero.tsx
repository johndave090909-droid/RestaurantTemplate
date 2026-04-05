import React from 'react';
import { motion } from 'motion/react';
import { Play, ArrowRight, ChevronDown } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 z-0 scale-110">
        <img
          src="/hero-bg.png"
          alt="Hero background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 z-10" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-20 text-center text-white">
        {/* Ornament top */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <div className="h-[1px] w-20 bg-gradient-to-r from-transparent to-gold/70" />
          <div className="w-1.5 h-1.5 bg-gold rotate-45" />
          <div className="w-2 h-2 border border-gold rotate-45" />
          <div className="w-1.5 h-1.5 bg-gold rotate-45" />
          <div className="h-[1px] w-20 bg-gradient-to-l from-transparent to-gold/70" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-gold/80 uppercase tracking-[0.5em] font-mono text-xs mb-5"
        >
          Top Services and Premium Cuisine
        </motion.p>

        {/* Main title */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.35 }}
          className="relative mb-3"
        >
          {/* Ghost outline behind */}
          <h2
            aria-hidden="true"
            className="absolute inset-0 text-[6rem] md:text-[9rem] lg:text-[12rem] font-serif italic font-bold text-center leading-none select-none pointer-events-none"
            style={{
              WebkitTextStroke: '1px rgba(193,157,104,0.18)',
              color: 'transparent',
              transform: 'translate(4px, 6px)',
            }}
          >
            Unwind
          </h2>
          {/* Main text */}
          <h2
            className="text-[6rem] md:text-[9rem] lg:text-[12rem] font-serif italic font-bold text-center leading-none"
            style={{ textShadow: '0 4px 40px rgba(0,0,0,0.6)' }}
          >
            Unwind
          </h2>
        </motion.div>

        {/* Ornament bottom */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-gold/50" />
          <div className="w-1 h-1 bg-gold/60 rotate-45" />
          <span className="text-gold/60 font-mono text-[10px] tracking-[0.4em] uppercase">Est. 2020</span>
          <div className="w-1 h-1 bg-gold/60 rotate-45" />
          <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-gold/50" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <a 
            href="#menu" 
            className="inline-flex items-center gap-3 bg-gold hover:bg-white hover:text-dark text-white px-10 py-5 text-sm font-bold uppercase tracking-widest transition-all group"
          >
            Check out our Menu
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>
      </div>

      {/* Promo Video */}
      <div className="absolute bottom-12 left-12 z-20 hidden lg:flex items-center gap-6">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-gold hover:border-gold transition-all"
        >
          <Play size={24} fill="currentColor" />
        </motion.button>
        <div className="text-left">
          <h4 className="text-white text-sm font-bold uppercase tracking-widest">View Promo Video</h4>
        </div>
      </div>

      {/* Social Links */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 z-20 hidden lg:flex flex-col gap-8 text-white/50">
        {['Facebook', 'Instagram', 'Twitter', 'VK'].map((social) => (
          <a key={social} href="#" className="hover:text-gold transition-colors -rotate-90 origin-center whitespace-nowrap text-[10px] uppercase tracking-widest font-bold">
            {social}
          </a>
        ))}
      </div>

      {/* Scroll Down */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4">
        <div className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent" />
        <span className="text-white/50 text-[10px] uppercase tracking-[0.3em] font-bold">Scroll down to Discover</span>
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-gold"
        >
          <ChevronDown size={20} />
        </motion.div>
      </div>

      {/* Decorative Elements */}
      <div className="hero-dec_top" />
      <div className="hero-dec_bottom" />
      <div className="brush-dec" />
    </section>
  );
}
