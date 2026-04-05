import React, { useState, useEffect } from 'react';
import { Phone, Mail, Globe, ShoppingBag, Bookmark, Share2, Menu as MenuIcon, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface HeaderProps {
  onOpenReservation: () => void;
  onOpenCart: () => void;
}

export default function Header({ onOpenReservation, onOpenCart }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#', active: true },
    { name: 'Menu', href: '#menu' },
    { name: 'About', href: '#about' },
    { name: 'Contact', href: '#contact' },
    { name: 'News', href: '#news' },
    { name: 'Pages', href: '#pages' },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 transition-all duration-300">
      {/* Top Bar */}
      <div className={cn(
        "bg-darker text-white py-2 transition-all duration-300",
        isScrolled ? "h-0 overflow-hidden py-0" : "h-auto"
      )}>
        <div className="container mx-auto px-4 flex justify-between items-center text-xs font-mono uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <a href="#" className="text-gold">EN</a>
              <span>/</span>
              <a href="#" className="hover:text-gold transition-colors">FR</a>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="tel:+489756412322" className="flex items-center gap-2 hover:text-gold transition-colors">
              <span className="text-gray-500">Call now:</span> +489756412322
            </a>
            <a href="mailto:yourmail@domain.com" className="flex items-center gap-2 hover:text-gold transition-colors">
              <span className="text-gray-500">Write:</span> yourmail@domain.com
            </a>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className={cn(
        "bg-white border-b border-gray-100 transition-all duration-300",
        isScrolled ? "py-2 shadow-md" : "py-4"
      )}>
        <div className="container mx-auto px-4 flex justify-between items-center">
          {/* Logo */}
          <a href="/" className="relative z-50">
            <img 
              src="https://restabook.kwst.net/images/logo.png" 
              alt="Restabook" 
              className={cn("transition-all duration-300", isScrolled ? "h-8" : "h-10")}
              referrerPolicy="no-referrer"
            />
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className={cn(
                  "text-sm font-medium uppercase tracking-widest transition-colors hover:text-gold flex items-center gap-1",
                  link.active ? "text-gold" : "text-gray-800"
                )}
              >
                {link.name}
                {link.name === 'Home' || link.name === 'Menu' || link.name === 'Pages' ? <ChevronDown size={14} /> : null}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button 
              onClick={onOpenReservation}
              className="hidden sm:flex items-center gap-2 bg-dark text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-gold transition-all group"
            >
              <span>Reservation</span>
              <Bookmark size={14} className="group-hover:scale-110 transition-transform" />
            </button>
            
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-600 hover:text-gold transition-colors relative group">
                <Share2 size={20} />
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-dark text-white text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Share</span>
              </button>
              
              <button 
                onClick={onOpenCart}
                className="p-2 text-gray-600 hover:text-gold transition-colors relative group"
              >
                <ShoppingBag size={20} />
                <span className="absolute -top-1 -right-1 bg-gold text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">3</span>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-dark text-white text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Your Cart</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden p-2 text-gray-800"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden absolute top-full left-0 w-full bg-white shadow-xl border-t border-gray-100"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className={cn(
                    "text-lg font-serif py-2 border-b border-gray-50 flex justify-between items-center",
                    link.active ? "text-gold" : "text-gray-800"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                  <ChevronDown size={18} className="-rotate-90" />
                </a>
              ))}
              <button 
                onClick={() => {
                  onOpenReservation();
                  setIsMobileMenuOpen(false);
                }}
                className="mt-4 bg-gold text-white py-4 font-bold uppercase tracking-widest"
              >
                Book a Table
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
