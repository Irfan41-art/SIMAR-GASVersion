import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAppContext } from '../../context/AppContext';
import { School, Save, CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function SchoolData() {
  const { settings } = useAppContext();
  const [formData, setFormData] = useState({
    schoolName: '',
    principalName: '',
    logoURL: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        schoolName: settings.schoolName,
        principalName: settings.principalName,
        logoURL: settings.logoURL || ''
      });
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      await setDoc(doc(db, 'settings', 'school'), formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight uppercase">Data Sekolah</h1>
        <p className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mt-1">Konfigurasi identitas institusi pendidikan</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/40 backdrop-blur-xl p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] border border-white/5 shadow-2xl shadow-black/20"
      >
        <form onSubmit={handleSave} className="space-y-8">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-400/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <School size={32} />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Nama Sekolah</label>
              <input 
                type="text"
                required
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white text-sm font-medium"
                placeholder="e.g. SD Negeri 4 Pusungi"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Kepala Sekolah</label>
              <input 
                type="text"
                required
                value={formData.principalName}
                onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white text-sm font-medium"
                placeholder="Masukkan nama kepala sekolah"
              />
            </div>

            <div className="flex flex-col gap-4">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">URL Logo Sekolah (Opsional)</label>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-950/50 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                  {formData.logoURL ? (
                    <img src={formData.logoURL} alt="Logo Preview" className="w-full h-full object-cover" />
                  ) : (
                    <School size={24} className="text-slate-700" />
                  )}
                </div>
                <input 
                  type="text"
                  value={formData.logoURL}
                  onChange={(e) => setFormData({ ...formData, logoURL: e.target.value })}
                  className="flex-1 px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white text-sm font-medium"
                  placeholder="https://..."
                />
              </div>
              <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase tracking-widest italic ml-1">Gunakan URL foto dari Profil Admin untuk sinkronisasi logo.</p>
            </div>
          </div>

          {success && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-4 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest"
            >
              <CheckCircle size={18} />
              Konfigurasi berhasil disimpan!
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white text-sm font-black uppercase tracking-widest py-4 rounded-xl hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-500/20 active:scale-95 transition-all shadow-lg shadow-black/20 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
            Simpan Konfigurasi
          </button>
        </form>
      </motion.div>
    </div>
  );
}
