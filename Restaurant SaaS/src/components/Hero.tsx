import React from 'react';
import { motion } from 'motion/react';
import { Play, ArrowRight, ChevronDown } from 'lucide-react';
import GeneratedImage from './GeneratedImage';

export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 z-0 scale-110">
        <GeneratedImage 
          prompt="Luxury restaurant interior with elegant tables, warm lighting, high-end fine dining atmosphere, 8k resolution"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 z-10" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-20 text-center text-white">
        <motion.h4 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-gold uppercase tracking-[0.3em] font-mono text-sm mb-6"
        >
          Top Services and Premium Cuisine
        </motion.h4>
        
        <motion.h2 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-5xl md:text-7xl lg:text-8xl font-serif mb-12 leading-tight"
        >
          Welcome to <br /> Restabook Restaurant
        </motion.h2>

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
