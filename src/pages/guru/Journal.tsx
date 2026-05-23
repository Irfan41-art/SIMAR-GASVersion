import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAppContext } from '../../context/AppContext';
import { FileText, ChevronRight, FileDown, Loader2, Save, Printer, Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const MAPEL_LIST = [
  "IPAS", "BAHASA INDONESIA", "MATEMATIKA", "PENDIDIKAN PANCASILA", 
  "SENI RUPA", "PENDIDIKAN AGAMA ISLAM", "PJOK"
];

const KELAS_LIST = ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"];

export default function Journal() {
  const { user, profile, settings } = useAppContext();
  const [activeTab, setActiveTab] = useState<'input' | 'list'>('input');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [journals, setJournals] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    class: '',
    subject: '',
    session: '',
    presentCount: 0,
    absentCount: 0,
    status: 'terlaksana' as 'terlaksana' | 'tertunda',
    material: '',
    reflection: ''
  });

  useEffect(() => {
    if (user && activeTab === 'list') {
      const q = query(
        collection(db, 'journals'), 
        where('teacherId', '==', user.uid),
        orderBy('date', 'desc')
      );
      const unsub = onSnapshot(q, (snap) => {
        setJournals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [user, activeTab]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'journals'), {
        ...formData,
        teacherId: user.uid,
        createdAt: new Date().toISOString()
      });
      alert('Jurnal berhasil disimpan!');
      setActiveTab('list');
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        class: '',
        subject: '',
        session: '',
        presentCount: 0,
        absentCount: 0,
        status: 'terlaksana',
        material: '',
        reflection: ''
      });
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan jurnal.');
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = async (journal: any) => {
    const doc = new jsPDF();
    
    doc.setFontSize(14);
    doc.text(settings?.schoolName || 'SD Negeri 4 Pusungi', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('JURNAL HARIAN GURU', 105, 23, { align: 'center' });
    
    const tableData = [
      ['Tanggal', journal.date],
      ['Kelas', journal.class],
      ['Mata Pelajaran', journal.subject],
      ['Pertemuan ke-', journal.session],
      ['Hadir', journal.presentCount],
      ['Tidak Hadir', journal.absentCount],
      ['Status', journal.status.toUpperCase()],
      ['Materi Pembelajaran', journal.material],
      ['Refleksi', journal.reflection]
    ];

    autoTable(doc, {
      startY: 30,
      body: tableData,
      theme: 'grid',
      styles: { cellPadding: 5, fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.text('Guru Mata Pelajaran,', 140, finalY);
    doc.text(profile?.name || '..........................', 140, finalY + 30);

    doc.save(`Jurnal_${journal.date}_${journal.class}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight uppercase">Jurnal Guru</h1>
        <p className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mt-1">Dokumentasi operasional kegiatan pembelajaran harian</p>
      </div>

      <div className="flex gap-2 p-1.5 bg-slate-900/40 backdrop-blur-md rounded-2xl w-full sm:w-fit border border-white/5 shadow-2xl overflow-x-auto">
        <button 
          onClick={() => setActiveTab('input')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-nowrap ${activeTab === 'input' ? 'bg-violet-600 text-white shadow-xl shadow-violet-900/20' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Isi Jurnal
        </button>
        <button 
          onClick={() => setActiveTab('list')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-nowrap ${activeTab === 'list' ? 'bg-violet-600 text-white shadow-xl shadow-violet-900/20' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Daftar Jurnal
        </button>
      </div>

      {activeTab === 'input' ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/40 backdrop-blur-xl p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] border border-white/5 border-l-4 border-l-violet-600 shadow-2xl shadow-black/20"
        >
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="space-y-5 sm:space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Tanggal Sesi</label>
                <input 
                  type="date" required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-white text-sm font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Kelas</label>
                  <select 
                    required
                    value={formData.class}
                    onChange={(e) => setFormData({...formData, class: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-white text-sm font-medium appearance-none"
                  >
                    <option value="">Pilih</option>
                    {KELAS_LIST.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Pertemuan Ke-</label>
                  <input 
                    type="text" required
                    value={formData.session}
                    onChange={(e) => setFormData({...formData, session: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-white text-sm font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mata Pelajaran</label>
                <select 
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-white text-sm font-medium appearance-none"
                >
                  <option value="">Pilih Mapel</option>
                  {MAPEL_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Jumlah Hadir</label>
                  <input 
                    type="number" required
                    value={formData.presentCount}
                    onChange={(e) => setFormData({...formData, presentCount: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-white text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Tidak Hadir</label>
                  <input 
                    type="number" required
                    value={formData.absentCount}
                    onChange={(e) => setFormData({...formData, absentCount: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-white text-sm font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Status Keterlaksaan</label>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mt-1">
                  {['terlaksana', 'tertunda'].map(s => (
                    <label key={s} className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="radio" 
                          name="status"
                          checked={formData.status === s}
                          onChange={() => setFormData({...formData, status: s as any})}
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 border-2 border-white/10 rounded-full peer-checked:border-violet-500 peer-checked:bg-violet-500/20 transition-all"></div>
                        <div className="absolute w-2 h-2 bg-violet-400 rounded-full scale-0 peer-checked:scale-100 transition-transform"></div>
                      </div>
                      <span className="capitalize text-[11px] font-black text-slate-500 peer-checked:text-slate-200 uppercase tracking-widest transition-colors">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5 sm:space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Ringkasan Materi & Kegiatan</label>
                <textarea 
                  required rows={5}
                  value={formData.material}
                  onChange={(e) => setFormData({...formData, material: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 rounded-2xl sm:rounded-[1.5rem] focus:ring-2 focus:ring-violet-500 outline-none resize-none text-white text-sm font-medium"
                  placeholder="Tuliskan materi yang diajarkan..."
                ></textarea>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Refleksi Guru</label>
                <textarea 
                  required rows={4}
                  value={formData.reflection}
                  onChange={(e) => setFormData({...formData, reflection: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 rounded-2xl sm:rounded-[1.5rem] focus:ring-2 focus:ring-violet-500 outline-none resize-none text-white text-sm font-medium"
                  placeholder="Refleksi singkat kegiatan..."
                ></textarea>
              </div>
              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full bg-linear-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-violet-500/20 active:scale-95 transition-all shadow-lg shadow-black/40"
                >
                  {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                  Arsip Jurnal Harian
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {journals.length === 0 ? (
            <div className="bg-slate-900/40 backdrop-blur-md p-16 text-center text-slate-500 rounded-[3rem] border border-dashed border-white/10 uppercase text-[10px] font-black tracking-widest">
              Belum ada arsip jurnal yang ditemukan
            </div>
          ) : (
            journals.map(j => (
              <motion.div 
                key={j.id}
                whileHover={{ y: -2 }}
                className="bg-slate-900/40 backdrop-blur-xl p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 shadow-xl shadow-black/20"
              >
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center border shrink-0 ${j.status === 'terlaksana' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                    <FileText size={22} className="sm:size-6" />
                  </div>
                  <div>
                    <h4 className="font-display font-black text-slate-200 text-sm sm:text-base uppercase tracking-tight">{j.subject} - {j.class}</h4>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Pertemuan {j.session} • {format(new Date(j.date), 'dd MMM yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${j.status === 'terlaksana' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                    {j.status}
                  </span>
                  <button 
                    onClick={() => generatePDF(j)}
                    className="p-3 bg-white/5 text-slate-400 hover:bg-violet-600 hover:text-white rounded-xl transition-all shadow-sm border border-white/5"
                    title="Cetak Jurnal"
                  >
                    <Printer size={18} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
