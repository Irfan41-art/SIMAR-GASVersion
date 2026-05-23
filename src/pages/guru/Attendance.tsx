import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAppContext } from '../../context/AppContext';
import { ClipboardCheck, CheckCircle2, ChevronRight, FileDown, Loader2, Save, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const MAPEL_LIST = [
  "IPAS", "BAHASA INDONESIA", "MATEMATIKA", "PENDIDIKAN PANCASILA", 
  "SENI RUPA", "PENDIDIKAN AGAMA ISLAM", "PJOK"
];

const KELAS_LIST = ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"];

export default function Attendance() {
  const { user, profile, settings } = useAppContext();
  const [activeTab, setActiveTab] = useState<'input' | 'report'>('input');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Input State
  const [inputConfig, setInputConfig] = useState({
    subject: '',
    class: '',
    meeting: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [records, setRecords] = useState<Record<string, string>>({});
  const [showSheet, setShowSheet] = useState(false);

  // Report State
  const [reportConfig, setReportConfig] = useState({
    month: format(new Date(), 'MM'),
    year: format(new Date(), 'yyyy')
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
    if (!inputConfig.subject || !inputConfig.class || !inputConfig.meeting) {
      alert('Lengkapi Mapel, Kelas, dan Pertemuan!');
      return;
    }
    const initialRecords: Record<string, string> = {};
    students.forEach(s => initialRecords[s.id] = '');
    setRecords(initialRecords);
    setShowSheet(true);
  };

  const handleHadirSemua = () => {
    const updated = { ...records };
    students.forEach(s => updated[s.id] = 'Hadir');
    setRecords(updated);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'attendance'), {
        ...inputConfig,
        records,
        teacherId: user.uid,
        createdAt: new Date().toISOString(),
        month: inputConfig.date.split('-')[1],
        year: inputConfig.date.split('-')[0]
      });
      alert('Absensi berhasil disimpan!');
      setShowSheet(false);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan absensi.');
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = async () => {
    if (!user) return;
    const q = query(
      collection(db, 'attendance'),
      where('teacherId', '==', user.uid),
      where('month', '==', reportConfig.month),
      where('year', '==', reportConfig.year)
    );
    const snap = await getDocs(q);
    const attendanceData = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    if (attendanceData.length === 0) {
      alert('Tidak ada data untuk periode ini.');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    const margins = 15;

    // Header
    doc.setFontSize(16);
    doc.text(settings?.schoolName || 'SD Negeri 4 Pusungi', 148.5, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text('LAPORAN ABSENSI MURID', 148.5, 28, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Periode: ${reportConfig.month}/${reportConfig.year} | Guru: ${profile?.name}`, 148.5, 34, { align: 'center' });

    const tableHeaders = [['Nama Murid', 'Kelas', 'Tgl/Mapel', 'Status']];
    const tableData: any[] = [];

    attendanceData.forEach((att: any) => {
      students.forEach(s => {
        if (att.records[s.id]) {
          tableData.push([
            s.name,
            att.class,
            `${format(new Date(att.date), 'dd/MM')} - ${att.subject}`,
            att.records[s.id]
          ]);
        }
      });
    });

    autoTable(doc, {
      startY: 40,
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    // Signature
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.text('Mengetahui,', 40, finalY);
    doc.text('Kepala Sekolah', 40, finalY + 7);
    doc.text(settings?.principalName || '..........................', 40, finalY + 30);

    doc.text('Dibuat Oleh,', 220, finalY);
    doc.text('Guru Mata Pelajaran', 220, finalY + 7);
    doc.text(profile?.name || '..........................', 220, finalY + 30);

    doc.save(`Absensi_${reportConfig.month}_${reportConfig.year}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight uppercase">Sistem Absensi</h1>
          <p className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mt-1">Pencatatan presensi digital dan pelaporan harian</p>
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-slate-900/40 backdrop-blur-md rounded-2xl w-full sm:w-fit border border-white/5 shadow-2xl overflow-x-auto">
        <button 
          onClick={() => setActiveTab('input')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-nowrap ${activeTab === 'input' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/20' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Input Presensi
        </button>
        <button 
          onClick={() => setActiveTab('report')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-nowrap ${activeTab === 'report' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/20' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Rekapitulasi PDF
        </button>
      </div>

      {activeTab === 'input' ? (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-slate-900/40 backdrop-blur-xl p-6 sm:p-8 rounded-3xl sm:rounded-[2rem] border border-white/5 border-l-4 border-l-emerald-600 shadow-2xl shadow-black/20">
            <h3 className="text-sm font-black text-white mb-6 sm:mb-8 flex items-center gap-3 uppercase tracking-widest">
              <ClipboardCheck className="text-emerald-500" size={20} />
              Konfigurasi Sesi Belajar
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mata Pelajaran</label>
                <select 
                  value={inputConfig.subject}
                  onChange={(e) => setInputConfig({...inputConfig, subject: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm font-medium appearance-none"
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
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm font-medium appearance-none"
                >
                  <option value="">Pilih Kelas</option>
                  {KELAS_LIST.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Pertemuan Ke-</label>
                <input 
                  type="text"
                  placeholder="e.g. 1"
                  value={inputConfig.meeting}
                  onChange={(e) => setInputConfig({...inputConfig, meeting: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Tanggal Sesi</label>
                <input 
                  type="date"
                  value={inputConfig.date}
                  onChange={(e) => setInputConfig({...inputConfig, date: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm font-medium"
                />
              </div>
            </div>
            <div className="mt-8">
              <button 
                onClick={handleShowSheet}
                className="bg-emerald-600 text-white px-6 sm:px-8 py-4 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center sm:justify-start gap-2 hover:bg-emerald-500 hover:shadow-xl hover:shadow-emerald-500/20 transition-all active:scale-95 shadow-lg shadow-black/20 w-full sm:w-auto"
              >
                Tampilkan Lembar Daftar Hadir
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
                <div className="p-5 sm:p-8 bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5">
                  <div className="text-center sm:text-left">
                    <h4 className="font-display font-black text-white uppercase tracking-tight">Presensi Murid</h4>
                    <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">Berikan status kehadiran pada setiap siswa</p>
                  </div>
                  <button 
                    onClick={handleHadirSemua}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                  >
                    Set Hadir Semua
                  </button>
                </div>

                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left bg-white/5">
                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Profil Siswa</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Status Kehadiran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {students.map(s => (
                        <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-8 py-5 font-bold text-slate-200 group-hover:text-white transition-colors">{s.name}</td>
                          <td className="px-8 py-5">
                            <div className="flex items-center justify-center gap-2 sm:gap-3">
                              {['Hadir', 'Izin', 'Sakit', 'Alpa'].map(status => (
                                <button
                                  key={status}
                                  onClick={() => setRecords({...records, [s.id]: status})}
                                  className={`px-3 sm:px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                    records[s.id] === status 
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-900/40' 
                                      : 'bg-slate-950/40 text-slate-500 border-white/5 hover:border-emerald-500/30'
                                  }`}
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden divide-y divide-white/5">
                  {students.map(s => (
                    <div key={s.id} className="p-5 space-y-4">
                      <div className="font-bold text-slate-200">{s.name}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {['Hadir', 'Izin', 'Sakit', 'Alpa'].map(status => (
                          <button
                            key={status}
                            onClick={() => setRecords({...records, [s.id]: status})}
                            className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                              records[s.id] === status 
                                ? 'bg-emerald-600 text-white border-emerald-600' 
                                : 'bg-slate-950/40 text-slate-500 border-white/5'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 sm:p-8 bg-white/5 border-t border-white/5">
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full sm:w-auto sm:ml-auto bg-emerald-600 text-white px-8 sm:px-12 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-500 hover:shadow-xl hover:shadow-emerald-500/20 active:scale-95 transition-all shadow-lg shadow-black/40 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                    Finalisasi & Simpan
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-slate-900/40 backdrop-blur-xl p-6 sm:p-12 rounded-3xl sm:rounded-[3rem] border border-white/5 shadow-2xl shadow-black/40 max-w-lg mx-auto border-t-4 border-t-emerald-600">
          <div className="text-center mb-6 sm:mb-10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-600/10 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto mb-4 sm:mb-6 border border-emerald-400/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <Printer size={28} className="sm:size-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-display font-black text-white uppercase tracking-tight">Eksport Laporan</h3>
            <p className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mt-2">Dapatkan dokumen legalitas kehadiran siswa</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-10">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Periode Bulan</label>
              <select 
                value={reportConfig.month}
                onChange={(e) => setReportConfig({...reportConfig, month: e.target.value})}
                className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm font-medium appearance-none"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={String(i + 1).padStart(2, '0')}>
                    {format(new Date(2023, i), 'MMMM')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Tahun Ajaran</label>
              <select 
                value={reportConfig.year}
                onChange={(e) => setReportConfig({...reportConfig, year: e.target.value})}
                className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm font-medium appearance-none"
              >
                {['2025', '2026', '2027', '2028'].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <button 
            onClick={generatePDF}
            className="w-full bg-linear-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-emerald-500/20 active:scale-95 transition-all shadow-lg"
          >
            <FileDown size={18} />
            Hasilkan Dokumen PDF
          </button>
        </div>
      )}
    </div>
  );
}
