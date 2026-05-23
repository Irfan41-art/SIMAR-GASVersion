import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, updateProfile } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import { useAppContext } from '../../context/AppContext';
import { User, Camera, Lock, Save, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminProfile() {
  const { profile, settings } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    photoURL: '',
    newPassword: '',
    syncToLogo: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        photoURL: profile.photoURL || '',
        newPassword: '',
        syncToLogo: settings?.logoURL === profile.photoURL
      });
    }
  }, [profile, settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const user = auth.currentUser;
      if (!user) return;

      // Update Firestore User
      await updateDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        photoURL: formData.photoURL
      });

      // Update Auth Profile
      await updateProfile(user, {
        displayName: formData.name,
        photoURL: formData.photoURL
      });

      // Sinkronisasi ke Logo Sekolah jika diceklis
      if (formData.syncToLogo) {
        await updateDoc(doc(db, 'settings', 'school'), {
          logoURL: formData.photoURL
        });
      }

      // Update Password if provided
      if (formData.newPassword) {
        if (formData.newPassword.length < 6) {
          setMessage({ type: 'error', text: 'Kata sandi minimal harus 6 karakter.' });
          setLoading(false);
          return;
        }
        await updatePassword(user, formData.newPassword);
        // Also update stored password if we are using it for custom login logic
        await updateDoc(doc(db, 'users', user.uid), {
          password: formData.newPassword
        });
      }

      setMessage({ type: 'success', text: 'Profil berhasil diperbarui!' });
      setFormData(prev => ({ ...prev, newPassword: '' }));
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Gagal memperbarui profil.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
       <div>
        <h1 className="text-2xl font-display font-black text-white tracking-tight uppercase">Profil Admin</h1>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Konfigurasi otoritas dan kredensial akses</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/40 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/5 shadow-2xl shadow-black/20"
      >
        <form onSubmit={handleSave} className="space-y-8">
          <div className="flex flex-col items-center gap-6 mb-10">
            <div className="relative group">
              <div className="w-36 h-36 rounded-[2rem] bg-slate-950/50 border-4 border-white/5 shadow-2xl overflow-hidden flex items-center justify-center ring-4 ring-blue-600/10 transition-all group-hover:ring-blue-600/20">
                {formData.photoURL ? (
                  <img src={formData.photoURL} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <User size={64} className="text-slate-700" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-blue-600 p-3 rounded-2xl text-white shadow-xl shadow-blue-900/40 group-hover:scale-110 transition-transform cursor-pointer">
                <Camera size={20} />
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sinkronisasi Identitas Digital</p>
          </div>

          <div className="grid grid-cols-1 gap-8">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Nama Otoritas Lengkap</label>
              <input 
                type="text" required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm font-medium shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">URL Protokol Foto</label>
              <input 
                type="text"
                value={formData.photoURL}
                onChange={(e) => setFormData({...formData, photoURL: e.target.value})}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm font-medium shadow-inner"
              />
              <div className="mt-4 ml-1 flex items-center gap-3 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                <input 
                  type="checkbox" 
                  id="syncLogo"
                  checked={formData.syncToLogo}
                  onChange={(e) => setFormData({...formData, syncToLogo: e.target.checked})}
                  className="w-4 h-4 rounded border-white/10 bg-slate-900 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="syncLogo" className="text-[9px] font-black text-blue-400 uppercase tracking-widest cursor-pointer">Gunakan foto ini sebagai Logo Utama Aplikasi (Header & Landing Page)</label>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
                <Lock size={14} className="text-blue-500" /> Pembaruan Kunci Akses (Opsional)
              </label>
              <input 
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                placeholder="Enkripsi kata sandi baru..."
                className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm font-medium shadow-inner"
              />
              <p className="text-[9px] font-bold text-slate-600 mt-3 uppercase tracking-widest leading-relaxed">Kosongkan jika sistem deteksi tidak memerlukan rotasi kredensial.</p>
            </div>
          </div>

          {message.text && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex items-center gap-3 p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${
                message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}
            >
              {message.type === 'success' ? <CheckCircle size={18} /> : <User size={18} />}
              {message.text}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-blue-500/20 active:scale-95 transition-all shadow-lg shadow-black/40 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
            Otorisasi Pembaruan Profil
          </button>
        </form>
      </motion.div>
    </div>
  );
}
