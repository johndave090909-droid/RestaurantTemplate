import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function AdminLoginPage() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-serif italic text-white text-5xl mb-1">Unwind</h1>
          <div className="flex items-center gap-2 justify-center">
            <div className="h-[1px] w-12 bg-gold/40" />
            <span className="text-gold/60 font-mono text-[10px] uppercase tracking-widest">Admin Portal</span>
            <div className="h-[1px] w-12 bg-gold/40" />
          </div>
        </div>

        <div className="bg-[#161616] border border-white/10 p-8">
          <h2 className="text-white text-lg font-serif mb-1">Sign In</h2>
          <p className="text-white/30 text-xs font-mono uppercase tracking-widest mb-8">Authorized personnel only</p>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 py-3.5 px-4 text-sm font-medium transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin text-gray-500" /> : <GoogleIcon />}
            {loading ? 'Authenticating...' : 'Continue with Google'}
          </button>

          {error && (
            <p className="text-red-400 text-xs font-mono mt-4 p-3 bg-red-400/10 border border-red-400/20">{error}</p>
          )}
        </div>

        <p className="text-center text-white/20 text-[10px] font-mono uppercase tracking-widest mt-6">
          <a href="/" className="hover:text-white/40 transition-colors">← Back to site</a>
        </p>
      </div>
    </div>
  );
}
