import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, updateProfile } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import { useAppContext } from '../../context/AppContext';
import { User, Camera, Lock, Save, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function GuruProfile() {
  const { profile } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    photoURL: '',
    newPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        photoURL: profile.photoURL || '',
        newPassword: ''
      });
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const user = auth.currentUser;
      const targetUid = profile?.uid || user?.uid;

      if (!targetUid) {
        throw new Error('Identitas pengguna tidak ditemukan.');
      }

      // Update Firestore User
      await updateDoc(doc(db, 'users', targetUid), {
        name: formData.name,
        photoURL: formData.photoURL
      });

      // Update Auth Profile if Firebase Auth user is active
      if (user) {
        try {
          await updateProfile(user, {
            displayName: formData.name,
            photoURL: formData.photoURL
          });
        } catch (authErr) {
          console.warn('Identity provider sync skipped:', authErr);
        }
      }

      // Update Password if provided
      if (formData.newPassword) {
        // Update in Local/Firestore Database
        await updateDoc(doc(db, 'users', targetUid), {
          password: formData.newPassword
        });

        // Update Firebase Auth password if active
        if (user) {
          try {
            await updatePassword(user, formData.newPassword);
          } catch (authErr) {
            console.warn('Auth provider password Sync skipped:', authErr);
          }
        }
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
        <h1 className="text-2xl font-display font-black text-white tracking-tight uppercase">Profil Guru</h1>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Personalisasi data pendidik dan pengaturan keamanan</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/40 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/5 shadow-2xl shadow-black/20"
      >
        <form onSubmit={handleSave} className="space-y-8">
          <div className="flex flex-col items-center gap-6 mb-10">
            <div className="relative group">
              <div className="w-36 h-36 rounded-[2rem] bg-slate-950/50 border-4 border-white/5 shadow-2xl overflow-hidden flex items-center justify-center ring-4 ring-purple-600/10 transition-all group-hover:ring-purple-600/20">
                {formData.photoURL ? (
                  <img src={formData.photoURL} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <User size={64} className="text-slate-700" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-purple-600 p-3 rounded-2xl text-white shadow-xl shadow-purple-900/40 group-hover:scale-110 transition-transform cursor-pointer">
                <Camera size={20} />
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Identitas Digital Pendidik</p>
          </div>

          <div className="grid grid-cols-1 gap-8">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Nama Lengkap & Gelar</label>
              <input 
                type="text" required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-white text-sm font-medium shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Prototipe URL Foto</label>
              <input 
                type="text"
                value={formData.photoURL}
                onChange={(e) => setFormData({...formData, photoURL: e.target.value})}
                className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-white text-sm font-medium shadow-inner"
              />
            </div>

            <div className="pt-8 border-t border-white/5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
                <Lock size={14} className="text-purple-500" /> Rotasi Kata Sandi (Opsional)
              </label>
              <input 
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-white text-sm font-medium shadow-inner"
              />
              <p className="text-[9px] font-bold text-slate-600 mt-3 uppercase tracking-widest leading-relaxed">Gunakan kombinasi alfanumerik untuk proteksi data yang optimal.</p>
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
            className="w-full bg-linear-to-r from-blue-600 to-purple-600 text-white text-[10px] font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-blue-500/20 active:scale-95 transition-all shadow-lg shadow-black/40 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
            Simpan Konfigurasi Profil
          </button>
        </form>
      </motion.div>
    </div>
  );
}
