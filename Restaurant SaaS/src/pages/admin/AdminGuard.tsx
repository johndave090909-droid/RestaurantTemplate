import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="font-serif italic text-white text-4xl">Unwind</h1>
          <div className="w-5 h-5 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user || !role) return <Navigate to="/admin" replace />;

  return <>{children}</>;
}
