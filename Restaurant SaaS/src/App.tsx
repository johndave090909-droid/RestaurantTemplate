import React, { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import OpeningHours from './components/OpeningHours';
import Services from './components/Services';
import SpecialMenu from './components/SpecialMenu';
import Team from './components/Team';
import Events from './components/Events';
import Reviews from './components/Reviews';
import Footer from './components/Footer';
import ReservationModal from './components/ReservationModal';
import CartDrawer from './components/CartDrawer';

export default function App() {
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <Header 
        onOpenReservation={() => setIsReservationOpen(true)} 
        onOpenCart={() => setIsCartOpen(true)} 
      />
      
      <main>
        <Hero />
        <About />
        <OpeningHours />
        <Services />
        <SpecialMenu />
        <Team />
        <Events onOpenReservation={() => setIsReservationOpen(true)} />
        <Reviews />
      </main>

      <Footer />

      {/* Modals & Drawers */}
      <ReservationModal 
        isOpen={isReservationOpen} 
        onClose={() => setIsReservationOpen(false)} 
      />
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />

      {/* Custom Cursor Element (Optional visual flair) */}
      <div className="fixed w-8 h-8 border border-gold rounded-full pointer-events-none z-[9999] mix-blend-difference hidden lg:block transition-transform duration-100 ease-out" 
           style={{ transform: 'translate(-50%, -50%)' }} />
    </div>
  );
}
