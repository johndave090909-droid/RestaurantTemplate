import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SiteConfigProvider } from './context/SiteConfigContext';

// Public site
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

// Admin
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminGuard from './pages/admin/AdminGuard';

function PublicSite() {
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
      <ReservationModal isOpen={isReservationOpen} onClose={() => setIsReservationOpen(false)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <div
        className="fixed w-8 h-8 border border-gold rounded-full pointer-events-none z-[9999] mix-blend-difference hidden lg:block transition-transform duration-100 ease-out"
        style={{ transform: 'translate(-50%, -50%)' }}
      />
    </div>
  );
}

function AdminRoute() {
  const { user, role } = useAuth();
  if (user && role) return <Navigate to="/admin/dashboard" replace />;
  return <AdminLoginPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SiteConfigProvider>
          <Routes>
            <Route path="/" element={<PublicSite />} />
            <Route path="/admin" element={<AdminRoute />} />
            <Route
              path="/admin/dashboard"
              element={
                <AdminGuard>
                  <AdminDashboard />
                </AdminGuard>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SiteConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
