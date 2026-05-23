import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserPlus, Edit2, Trash2, Search, X, Loader2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function GuruManagement() {
  const [gurus, setGurus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentGuru, setCurrentGuru] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    nip: '',
    subject: '',
    classAssigned: '',
    username: '',
    password: ''
  });

  const fetchGurus = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'guru'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGurus(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGurus();
  }, []);

  const handleOpenModal = (guru: any = null) => {
    setCurrentGuru(guru);
    if (guru) {
      setFormData({
        name: guru.name,
        nip: guru.nip,
        subject: guru.subject || '',
        classAssigned: guru.classAssigned || '',
        username: guru.username,
        password: guru.password || ''
      });
    } else {
      setFormData({
        name: '',
        nip: '',
        subject: '',
        classAssigned: '',
        username: '',
        password: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password.length < 6) {
      alert('Password minimal harus 6 karakter (Ketentuan Keamanan Firebase).');
      return;
    }

    setLoading(true);
    try {
      const processedData = {
        ...formData,
        username: formData.username.trim().toLowerCase()
      };

      if (currentGuru) {
        await updateDoc(doc(db, 'users', currentGuru.id), processedData);
      } else {
        const newId = `guru_${Date.now()}`;
        await setDoc(doc(db, 'users', newId), {
          ...processedData,
          uid: newId,
          role: 'guru',
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      fetchGurus();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    console.log('Attempting to delete guru:', { id, name });
    
    if (window.confirm(`Yakin ingin menghapus guru "${name}"? Akun login guru tersebut juga tidak akan bisa digunakan lagi.`)) {
      setIsDeleting(id);
      try {
        const docRef = doc(db, 'users', id);
        console.log('Deleting document at path: users/', id);
        await deleteDoc(docRef);
        console.log('Deletion successful');
        alert(`Guru "${name}" berhasil dihapus.`);
        await fetchGurus();
      } catch (err: any) {
        console.error('DELETE ERROR DETECTED:', err);
        let errorMsg = 'Gagal menghapus data.';
        
        if (err.code === 'permission-denied') {
          errorMsg = 'Akses ditolak. Keamanan Firebase mendeteksi Anda bukan Admin atau data ini diproteksi. Coba Login ulang untuk memperbarui sesi Admin Anda.';
        } else {
          errorMsg = `Gagal menghapus guru: ${err.message || 'Error tidak diketahui'}`;
        }
        
        alert(errorMsg);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const filteredGurus = gurus.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.nip.includes(searchTerm)
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight uppercase">Manajemen Guru</h1>
          <p className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mt-1">Kelola akun dan kredensial tenaga pendidik</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-5 sm:px-6 py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-500/20 transition-all active:scale-95 shadow-lg shadow-black/20 w-full sm:w-auto"
        >
          <UserPlus size={18} />
          Tambah Tenaga Pendidik
        </button>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl sm:rounded-[2rem] border border-white/5 shadow-2xl shadow-black/20 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Cari nama atau NIP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-950/40 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white placeholder:text-slate-700 text-sm font-medium"
            />
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Nama Guru / NIP</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Mata Pelajaran</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Kelas Diampu</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Username</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    <Loader2 className="animate-spin inline mr-3 w-5 h-5" /> 
                    <span className="text-[10px] font-black uppercase tracking-widest">Memproses Basis Data...</span>
                  </td>
                </tr>
              ) : filteredGurus.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    <div className="text-[10px] font-black uppercase tracking-widest">Data guru tidak ditemukan</div>
                  </td>
                </tr>
              ) : filteredGurus.map((guru) => (
                <tr key={guru.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="font-bold text-slate-200 group-hover:text-white transition-colors">{guru.name}</div>
                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">{guru.nip}</div>
                  </td>
                  <td className="px-6 py-5 text-xs font-bold text-slate-400 capitalize">{guru.subject || '-'}</td>
                  <td className="px-6 py-5">
                    <span className="text-[9px] font-black text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full border border-purple-400/10 uppercase tracking-widest">
                      {guru.classAssigned || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[9px] font-black text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/10 uppercase tracking-widest">{guru.username}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(guru)}
                        className="p-2.5 text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"
                        title="Edit data"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(guru.id, guru.name)}
                        disabled={isDeleting === guru.id}
                        className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50"
                        title="Hapus data"
                      >
                        {isDeleting === guru.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden divide-y divide-white/5">
          {loading ? (
            <div className="px-6 py-16 text-center text-slate-500">
              <Loader2 className="animate-spin inline mr-3 w-5 h-5" /> 
              <span className="text-[10px] font-black uppercase tracking-widest">Memproses...</span>
            </div>
          ) : filteredGurus.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-500">
              <div className="text-[10px] font-black uppercase tracking-widest">Data guru tidak ditemukan</div>
            </div>
          ) : (
            filteredGurus.map((guru) => (
              <div key={guru.id} className="p-5 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-slate-200">{guru.name}</div>
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5">{guru.nip}</div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleOpenModal(guru)}
                      className="p-2 text-blue-400 bg-blue-400/5 rounded-lg"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(guru.id, guru.name)}
                      disabled={isDeleting === guru.id}
                      className="p-2 text-red-500 bg-red-500/5 rounded-lg disabled:opacity-50"
                    >
                      {isDeleting === guru.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Mata Pelajaran</p>
                    <p className="text-[10px] font-bold text-slate-300">{guru.subject || '-'}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Kelas Diampu</p>
                    <p className="text-[10px] font-bold text-purple-400 uppercase">{guru.classAssigned || '-'}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5 col-span-2">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Username Akses</p>
                    <p className="text-[10px] font-bold text-blue-400 lowercase">{guru.username}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto font-sans"
            >
              <div className="px-6 sm:px-8 py-5 sm:py-6 border-b border-white/5 flex justify-between items-center bg-linear-to-r from-blue-600 to-indigo-600 text-white">
                <div>
                  <h3 className="text-lg sm:text-xl font-display font-black tracking-tight uppercase">
                    {currentGuru ? 'Ubah Data' : 'Guru Baru'}
                  </h3>
                  <p className="text-blue-100/60 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Formulir Pendaftaran Tenaga Pendidik</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Nama Lengkap</label>
                    <input 
                      type="text" required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">NIP</label>
                    <input 
                      type="text" required
                      value={formData.nip}
                      onChange={(e) => setFormData({...formData, nip: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mata Pelajaran</label>
                    <input 
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm font-medium"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Kelas Diampu</label>
                    <input 
                      type="text"
                      value={formData.classAssigned}
                      onChange={(e) => setFormData({...formData, classAssigned: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm font-medium"
                    />
                  </div>
                  <div className="sm:col-span-2 border-t border-white/5 pt-6 mt-2">
                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 ml-1">Username Akses</label>
                    <input 
                      type="text" required
                      disabled={!!currentGuru}
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-30 text-white text-sm font-medium tracking-wide"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 ml-1">Password Keamanan</label>
                    <input 
                      type="text" required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-950/40 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="pt-4 sm:pt-6">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white text-sm font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-blue-500/20 active:scale-95 transition-all shadow-lg"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                    {currentGuru ? 'Perbarui Akun' : 'Aktifkan Akun Guru'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
