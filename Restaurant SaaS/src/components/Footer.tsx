import React from 'react';
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin, ChevronsUp, Send } from 'lucide-react';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-darker text-white pt-24 pb-12 relative overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Footer Top */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-16 border-b border-white/5 mb-16">
          <a href="/" className="relative z-10">
            <img 
              src="https://restabook.kwst.net/images/logo2.png" 
              alt="Restabook" 
              className="h-10"
              referrerPolicy="no-referrer"
            />
          </a>
          
          <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest">
            <a href="#" className="text-gold">EN</a>
            <span className="text-white/20">/</span>
            <a href="#" className="hover:text-gold transition-colors">FR</a>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-xs uppercase tracking-widest font-bold text-white/50">Follow us :</span>
            <div className="flex gap-4">
              <a href="#" className="text-white/50 hover:text-gold transition-colors"><Facebook size={18} /></a>
              <a href="#" className="text-white/50 hover:text-gold transition-colors"><Twitter size={18} /></a>
              <a href="#" className="text-white/50 hover:text-gold transition-colors"><Instagram size={18} /></a>
            </div>
          </div>
        </div>

        {/* Footer Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-24">
          {/* About Widget */}
          <div>
            <h4 className="text-xl font-serif mb-8 flex items-center gap-4">
              About us
              <span className="w-12 h-[1px] bg-gold/30" />
            </h4>
            <p className="text-white/50 leading-relaxed mb-6">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Eaque ipsa quae ab illo inventore veritatis et quasi architecto.
            </p>
            <a href="#about" className="text-gold text-xs uppercase tracking-widest font-bold hover:underline">Read more</a>
          </div>

          {/* Contact Widget */}
          <div>
            <h4 className="text-xl font-serif mb-8 flex items-center gap-4">
              Contact info
              <span className="w-12 h-[1px] bg-gold/30" />
            </h4>
            <div className="space-y-4 text-white/50">
              <div className="flex items-start gap-4">
                <Phone size={16} className="text-gold mt-1" />
                <div>
                  <a href="tel:+489756412322" className="block hover:text-white transition-colors">+489756412322</a>
                  <a href="tel:+56897456123" className="block hover:text-white transition-colors">+56897456123</a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Mail size={16} className="text-gold mt-1" />
                <a href="mailto:yourmail@domain.com" className="hover:text-white transition-colors">yourmail@domain.com</a>
              </div>
              <div className="flex items-start gap-4">
                <MapPin size={16} className="text-gold mt-1" />
                <span>USA 27TH Brooklyn NY</span>
              </div>
            </div>
            <a href="#contact" className="inline-block mt-6 text-gold text-xs uppercase tracking-widest font-bold hover:underline">Get in Touch</a>
          </div>

          {/* Subscribe Widget */}
          <div>
            <h4 className="text-xl font-serif mb-8 flex items-center gap-4">
              Subscribe
              <span className="w-12 h-[1px] bg-gold/30" />
            </h4>
            <p className="text-white/50 leading-relaxed mb-6">
              Want to be notified when we launch a new template or an update. Just sign up and we'll send you a notification by email.
            </p>
            <form className="relative">
              <input 
                type="email" 
                placeholder="Your Email" 
                className="w-full bg-white/5 border border-white/10 px-6 py-4 text-sm focus:outline-none focus:border-gold transition-colors"
              />
              <button 
                type="submit" 
                className="absolute right-0 top-0 h-full bg-gold px-6 hover:bg-white hover:text-dark transition-all"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-12 border-t border-white/5">
          <div className="text-white/30 text-xs uppercase tracking-widest">
            © Restabook 2020 . All rights reserved.
          </div>
          
          <button 
            onClick={scrollToTop}
            className="group flex items-center gap-4 text-xs uppercase tracking-widest font-bold hover:text-gold transition-colors"
          >
            <span>Back To Top</span>
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-gold group-hover:bg-gold group-hover:text-white transition-all">
              <ChevronsUp size={16} />
            </div>
          </button>
        </div>
      </div>
    </footer>
  );
}
