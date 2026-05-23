import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAppContext } from '../../context/AppContext';
import { ClipboardCheck, ChevronRight, FileDown, Loader2, Save, Printer, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const MAPEL_LIST = [
  "IPAS", "BAHASA INDONESIA", "MATEMATIKA", "PENDIDIKAN PANCASILA", 
  "SENI RUPA", "PENDIDIKAN AGAMA ISLAM", "PJOK"
];

const KELAS_LIST = ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"];

export default function Grades() {
  const { user, profile, settings } = useAppContext();
  const [activeTab, setActiveTab] = useState<'input' | 'report'>('input');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [inputConfig, setInputConfig] = useState({
    subject: '',
    class: '',
    title: ''
  });
  const [records, setRecords] = useState<Record<string, number>>({});
  const [showSheet, setShowSheet] = useState(false);

  const [reportConfig, setReportConfig] = useState({
    subject: '',
    class: ''
  });

  useEffect(() => {
    if (user && inputConfig.class) {
      const q = query(
        collection(db, 'students'), 
        where('teacherId', '==', user.uid),
        where('class', '==', inputConfig.class)
      );
      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStudents(data);
      });
      return () => unsub();
    }
  }, [user, inputConfig.class]);

  const handleShowSheet = () => {
    if (!inputConfig.subject || !inputConfig.class || !inputConfig.title) {
      alert('Lengkapi Mapel, Kelas, dan Judul Penilaian!');
      return;
    }
    const initialRecords: Record<string, number> = {};
    students.forEach(s => initialRecords[s.id] = 0);
    setRecords(initialRecords);
    setShowSheet(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'grades'), {
        ...inputConfig,
        records,
        teacherId: user.uid,
        createdAt: new Date().toISOString()
      });
      alert('Nilai berhasil disimpan!');
      setShowSheet(false);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan nilai.');
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = async () => {
    if (!user) return;
    const q = query(
      collection(db, 'grades'),
      where('teacherId', '==', user.uid),
      where('subject', '==', reportConfig.subject),
      where('class', '==', reportConfig.class)
    );
    const snap = await getDocs(q);
    const gradesData = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    if (gradesData.length === 0) {
      alert('Tidak ada data untuk periode ini.');
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    
    doc.setFontSize(14);
    doc.text(settings?.schoolName || 'SD Negeri 4 Pusungi', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`REKAP NILAI: ${reportConfig.subject} - ${reportConfig.class}`, 105, 23, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Guru: ${profile?.name}`, 105, 28, { align: 'center' });

    const tableHeaders = [['Nama Murid', 'Penilaian / Judul', 'Nilai']];
    const tableData: any[] = [];

    gradesData.forEach((g: any) => {
      students.forEach(s => {
        if (g.records[s.id] !== undefined) {
          tableData.push([s.name, g.title, g.records[s.id]]);
        }
      });
    });

    autoTable(doc, {
      startY: 35,
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.text('Mengetahui,', 30, finalY);
    doc.text('Kepala Sekolah', 30, finalY + 7);
    doc.text(settings?.principalName || '..........................', 30, finalY + 30);
    doc.text(profile?.name || '..........................', 150, finalY + 30);

    doc.save(`Nilai_${reportConfig.subject}_${reportConfig.class}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight uppercase">Penilaian Murid</h1>
        <p className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mt-1">Evaluasi akademik dan rekapitulasi performa belajar</p>
      </div>

      <div className="flex gap-2 p-1.5 bg-slate-900/40 backdrop-blur-md rounded-2xl w-full sm:w-fit border border-white/5 shadow-2xl overflow-x-auto">
        <button 
          onClick={() => setActiveTab('input')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-nowrap ${activeTab === 'input' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Input Nilai
        </button>
        <button 
          onClick={() => setActiveTab('report')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-nowrap ${activeTab === 'report' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Rekapitulasi Nilai
        </button>
      </div>

      {activeTab === 'input' ? (
        <div className="space-y-6">
          <div className="bg-slate-900/40 backdrop-blur-xl p-6 sm:p-8 rounded-3xl sm:rounded-[2rem] border border-white/5 border-l-4 border-l-blue-600 shadow-2xl shadow-black/20">
            <h3 className="text-sm font-black text-white mb-6 sm:mb-8 flex items-center gap-3 uppercase tracking-widest">
              <GraduationCap className="text-blue-500" size={20} />
              Konfigurasi Evaluasi
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mata Pelajaran</label>
                <select 
                  value={inputConfig.subject}
                  onChange={(e) => setInputConfig({...inputConfig, subject: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm font-medium appearance-none"
                >
                  <option value="">Pilih Mapel</option>
                  {MAPEL_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Kelas</label>
                <select 
                  value={inputConfig.class}
                  onChange={(e) => setInputConfig({...inputConfig, class: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm font-medium appearance-none"
                >
                  <option value="">Pilih Kelas</option>
                  {KELAS_LIST.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 md:col-span-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Judul Penilaian</label>
                <input 
                  type="text"
                  placeholder="e.g. UH 1 / Tugas Mandiri"
                  value={inputConfig.title}
                  onChange={(e) => setInputConfig({...inputConfig, title: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm font-medium"
                />
              </div>
            </div>
            <div className="mt-8">
              <button 
                onClick={handleShowSheet}
                className="w-full sm:w-auto bg-blue-600 text-white px-6 sm:px-8 py-4 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center sm:justify-start gap-2 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-500/20 transition-all active:scale-95 shadow-lg shadow-black/20"
              >
                Mulai Pemberian Nilai
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showSheet && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/40 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] border border-white/5 shadow-2xl shadow-black/40 overflow-hidden"
              >
                <div className="p-6 sm:p-8 bg-white/5 border-b border-white/5">
                  <h4 className="font-display font-black text-white uppercase tracking-tight">Kertas Kerja Penilaian</h4>
                  <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">Input skor mentah setiap siswa (Skala 0-100)</p>
                </div>
                <div className="p-4 sm:p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {students.map(s => (
                      <div key={s.id} className="p-4 sm:p-5 bg-slate-950/50 rounded-2xl flex items-center justify-between border border-white/5 group hover:border-blue-500/30 transition-all">
                        <span className="text-[10px] sm:text-[11px] font-black text-slate-400 group-hover:text-slate-200 truncate mr-3 uppercase tracking-wide">{s.name}</span>
                        <input 
                          type="number"
                          min="0" max="100"
                          value={records[s.id] || ''}
                          onChange={(e) => setRecords({...records, [s.id]: parseInt(e.target.value) || 0})}
                          className="w-16 sm:w-20 px-2 sm:px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-center font-black text-blue-400 focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-inner"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-6 sm:p-8 bg-white/5 border-t border-white/5 flex">
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full sm:w-auto sm:ml-auto bg-blue-600 text-white px-8 sm:px-12 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-500/20 active:scale-95 transition-all shadow-lg shadow-black/40 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                    Simpan Nilai
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-slate-900/40 backdrop-blur-xl p-6 sm:p-12 rounded-3xl sm:rounded-[3rem] border border-white/5 shadow-2xl shadow-black/40 max-w-lg mx-auto border-t-4 border-t-blue-600">
          <div className="text-center mb-6 sm:mb-10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-400 mx-auto mb-4 sm:mb-6 border border-blue-400/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <Printer size={28} className="sm:size-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-display font-black text-white uppercase tracking-tight">Dokumen Rekapitulasi</h3>
            <p className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mt-2">Dapatkan laporan nilai kolektif per kategori</p>
          </div>
          <div className="space-y-5 sm:space-y-6 mb-8 sm:mb-10">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mata Pelajaran</label>
              <select 
                value={reportConfig.subject}
                onChange={(e) => setReportConfig({...reportConfig, subject: e.target.value})}
                className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm font-medium appearance-none"
              >
                <option value="">Pilih Mapel</option>
                {MAPEL_LIST.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Kelas Target</label>
              <select 
                value={reportConfig.class}
                onChange={(e) => setReportConfig({...reportConfig, class: e.target.value})}
                className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm font-medium appearance-none"
              >
                <option value="">Pilih Kelas</option>
                {KELAS_LIST.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
          <button 
            onClick={generatePDF}
            className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-blue-500/20 active:scale-95 transition-all shadow-lg"
          >
            <FileDown size={18} />
            Unduh Dokumen PDF
          </button>
        </div>
      )}
    </div>
  );
}
