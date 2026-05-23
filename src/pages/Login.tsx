import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { School, User, Lock, AlertCircle, Loader2, LogIn, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';

export default function Login({ role: initialRole }: { role?: 'admin' | 'guru' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { settings, user, profile, loading: appLoading, loginWithCredentials } = useAppContext();

  // If no role provided via props, default to guru (or we could show a selector)
  const role = initialRole || 'guru';
  const isAdminPage = role === 'admin';

  // Reactive Navigation: Redirect when auth and profile are ready
  useEffect(() => {
    if (user && profile && !appLoading) {
      if (profile.role === 'admin' && isAdminPage) {
        navigate('/admin');
      } else if (profile.role === 'guru' && !isAdminPage) {
        navigate('/guru');
      }
    }
  }, [user, profile, appLoading, isAdminPage, navigate]);
  
  const theme = isAdminPage ? {
    primary: 'blue',
    gradient: 'from-blue-600 to-indigo-600',
    shadow: 'shadow-blue-200',
    ring: 'focus:ring-blue-500',
    label: 'Login Admin',
    icon: <Lock className="w-8 h-8 text-white" />,
    bg: 'bg-slate-50'
  } : {
    primary: 'purple',
    gradient: 'from-blue-600 to-purple-600',
    shadow: 'shadow-purple-200',
    ring: 'focus:ring-purple-500',
    label: 'Login Guru',
    icon: <User className="w-8 h-8 text-white" />,
    bg: 'bg-slate-50'
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setLoading(true);
    setError('');

    try {
      const inputVal = username.trim();
      const cleanPassword = password.trim();

      await loginWithCredentials(inputVal, cleanPassword, role);
    } catch (err: any) {
      setError(err.message || 'Kredensial tidak valid. Periksa kembali Username/NIP dan Password.');
    } finally {
      setLoading(false);
    }
  };

  const isProcessing = loading || (user && !profile && appLoading);

  return (
    <div className={`min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden`}>
      {/* Background decoration */}
      <div className={`absolute -top-24 -left-24 w-[600px] h-[600px] bg-linear-to-br ${theme.gradient} opacity-5 rounded-full blur-[120px]`} />
      <div className={`absolute -bottom-24 -right-24 w-[600px] h-[600px] bg-linear-to-tr ${theme.gradient} opacity-5 rounded-full blur-[120px]`} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full relative z-10"
      >
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-8 group">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Beranda</span>
          </Link>

          <div className={`inline-flex p-4 bg-linear-to-br ${theme.gradient} rounded-2xl shadow-2xl ${theme.shadow} mb-6`}>
            {theme.icon}
          </div>
          <h1 className="text-2xl font-display font-black text-white tracking-tight mb-2">
            {theme.label}
          </h1>
          <p className="text-slate-400 text-sm font-medium px-4">
            {settings?.schoolName || 'SIMAR Portal'}
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-2xl shadow-black/20">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Username / NIP</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isAdminPage ? "admin" : "NIP"}
                  className={`w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 ${theme.ring} focus:bg-slate-950 transition-all outline-none text-white placeholder:text-slate-700 text-sm font-medium`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 ${theme.ring} focus:bg-slate-950 transition-all outline-none text-white placeholder:text-slate-700 text-sm font-medium`}
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3 text-xs text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className={`w-full bg-linear-to-r ${theme.gradient} text-white text-sm font-black uppercase tracking-widest py-4 rounded-xl hover:shadow-xl ${theme.shadow} active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50 disabled:active:scale-100 mt-4`}
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Masuk Portal
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
            {isAdminPage ? (
              <Link 
                to="/login/guru" 
                className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 hover:text-white transition-colors bg-purple-400/10 px-6 py-2 rounded-full border border-purple-400/20"
              >
                Login sebagai Guru
              </Link>
            ) : (
              <Link 
                to="/login/admin" 
                className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 hover:text-white transition-colors bg-blue-400/10 px-6 py-2 rounded-full border border-blue-400/20"
              >
                Login sebagai Admin
              </Link>
            )}
          </div>
        </div>

        <div className="text-center mt-12 pb-8">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            &copy; 2026 IRFAN, S.Pd.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
