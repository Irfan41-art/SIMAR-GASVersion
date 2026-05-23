import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, BookOpen, ClipboardCheck, GraduationCap, UserCircle, 
  LogOut, Menu, X, ChevronRight, FileText, ExternalLink
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';

export default function GuruLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, settings, logout } = useAppContext();

  const menuItems = [
    { label: 'Dashboard', path: '/guru', icon: <LayoutDashboard size={20} /> },
    { label: 'Data Murid', path: '/guru/students', icon: <Users size={20} /> },
    { label: 'Absensi', path: '/guru/attendance', icon: <UserCircle size={20} /> },
    { label: 'Penilaian', path: '/guru/grades', icon: <ClipboardCheck size={20} /> },
    { label: 'Jurnal Guru', path: '/guru/journal', icon: <FileText size={20} /> },
    { label: 'Profil Saya', path: '/guru/profile', icon: <UserCircle size={20} /> },
  ];

  const externalLinks = [
    { label: 'Generator AI', url: 'https://generate-ai-v3.vercel.app/', icon: <ExternalLink size={18} /> },
    { label: 'Bank Modul', url: 'https://drive.google.com/drive/folders/1Mj8_k3hfzbC6qkD5imfr0-NEIlr4yIah', icon: <BookOpen size={18} /> },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#020617] flex relative overflow-hidden text-slate-300">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[140px] -z-0 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[140px] -z-0 pointer-events-none" />
      
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-slate-900/40 backdrop-blur-xl border-r border-white/5 z-50 transition-transform lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden bg-slate-800">
              {settings?.logoURL ? (
                <img src={settings.logoURL} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-black text-xs uppercase tracking-tighter">SM</span>
                </div>
              )}
            </div>
            <h1 className="text-lg font-display font-black text-white tracking-tight">SIMAR <span className="text-purple-400 text-xs ml-1 uppercase font-black">Guru</span></h1>
          </div>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-160px)]">
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-4 mb-3">Main Menu</div>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`
                flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all group
                ${location.pathname === item.path 
                  ? 'bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-xl shadow-blue-500/20' 
                  : 'text-slate-500 hover:bg-white/5 hover:text-white'}
              `}
            >
              <div className="flex items-center gap-3">
                <span className={location.pathname === item.path ? 'text-white' : 'text-slate-600 group-hover:text-purple-400'}>
                  {item.icon}
                </span>
                {item.label}
              </div>
              <ChevronRight className={`w-3 h-3 transition-transform ${location.pathname === item.path ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100 group-hover:translate-x-1'}`} />
            </Link>
          ))}

          <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-4 mt-8 mb-3">Modul Ajar</div>
          {externalLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-white/5 hover:text-blue-400 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-600 group-hover:text-blue-400">
                  {link.icon}
                </span>
                {link.label}
              </div>
              <ExternalLink size={12} className="opacity-40 group-hover:opacity-100" />
            </a>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-white/5 bg-slate-950/20">
          <div className="px-4 py-3 flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex-shrink-0 overflow-hidden ring-2 ring-white/5">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-full h-full text-slate-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate uppercase tracking-wider">{profile?.name || 'Guru'}</p>
              <p className="text-[10px] text-slate-500 truncate font-bold uppercase">{profile?.nip || 'User'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
          >
            <LogOut size={16} />
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen relative z-10">
        <header className="h-16 bg-slate-950/40 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-30 lg:hidden text-white">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400 hover:text-white transition-colors">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md overflow-hidden bg-slate-800">
              {settings?.logoURL ? (
                <img src={settings.logoURL} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <span className="text-[8px] font-black">SM</span>
                </div>
              )}
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest">SIMAR Guru</h2>
          </div>
          <div className="w-8"></div>
        </header>

        <main className="p-4 sm:p-6 lg:p-10 flex-grow">
          <div className="max-w-5xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
        
        <footer className="p-8 border-t border-white/5 text-center text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em]">
          &copy; 2026 Guru Portal - Developed by IRFAN, S.Pd.
        </footer>
      </div>
    </div>
  );
}
