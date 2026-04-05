import React from 'react';
import { motion } from 'motion/react';
import { Facebook, Twitter, Instagram, ArrowRight } from 'lucide-react';
import GeneratedImage from './GeneratedImage';

const chefs = [
  {
    name: 'Kevin Gray',
    role: 'Master chef in New York',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    prompt: 'Portrait of a professional male chef in a white uniform, confident expression, kitchen background'
  },
  {
    name: 'Austin Evon',
    role: 'Master chef in Florida',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    prompt: 'Portrait of a professional female chef in a white uniform, smiling, modern kitchen background'
  },
  {
    name: 'Taylor Roberts',
    role: 'Master chef in Miami',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    prompt: 'Portrait of a young professional chef in a black uniform, artistic kitchen lighting'
  }
];

export default function Team() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h4 className="text-gold uppercase tracking-[0.3em] font-mono text-xs mb-4">Our awesome team</h4>
          <h2 className="text-4xl md:text-5xl font-serif mb-6">Meet Our Chefs</h2>
          <div className="dots-separator">
            <span />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {chefs.map((chef, index) => (
            <motion.div
              key={chef.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="group"
            >
              <div className="relative overflow-hidden mb-6">
                <GeneratedImage 
                  prompt={chef.prompt}
                  className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Social Links on Hover */}
                <div className="absolute bottom-6 left-6 flex flex-col gap-4 translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-white mb-2 -rotate-90 origin-left">Follow</span>
                  <div className="flex flex-col gap-3">
                    <a href="#" className="p-2 bg-white text-dark hover:bg-gold hover:text-white transition-colors"><Facebook size={14} /></a>
                    <a href="#" className="p-2 bg-white text-dark hover:bg-gold hover:text-white transition-colors"><Twitter size={14} /></a>
                    <a href="#" className="p-2 bg-white text-dark hover:bg-gold hover:text-white transition-colors"><Instagram size={14} /></a>
                  </div>
                </div>
              </div>

              <div className="text-center md:text-left">
                <h3 className="text-2xl font-serif mb-1">{chef.name}</h3>
                <h4 className="text-gold text-xs uppercase tracking-widest mb-4">{chef.role}</h4>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {chef.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 bg-gray-50 p-10 relative z-10">
          <h4 className="text-xl font-serif text-center md:text-left">Want to cook something tasty? Read our best recipes.</h4>
          <a 
            href="#recipes" 
            className="inline-flex items-center gap-3 bg-dark text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-gold transition-all group"
          >
            Recipes Book
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>

      {/* Decorative Wave */}
      <div className="absolute bottom-0 right-0 w-1/3 h-1/2 bg-[url('https://restabook.kwst.net/images/wave-bg.png')] bg-no-repeat bg-right-bottom opacity-10 pointer-events-none" />
    </section>
  );
}
