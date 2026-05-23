import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAppContext } from '../../context/AppContext';
import { 
  createDatabaseSpreadsheet, 
  syncDataToSheets, 
  importDataFromSheets,
  checkSpreadsheetStructure 
} from '../../lib/googleSheets';
import { 
  FileSpreadsheet, 
  Database, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Loader2, 
  Trash2, 
  School,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function SheetsIntegration() {
  const { 
    settings, 
    sheetsConfig, 
    sheetsAccessToken, 
    setSheetsAccessToken, 
    linkGoogleAccount, 
    saveSheetsConfig, 
    disconnectSheets 
  } = useAppContext();

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customSheetId, setCustomSheetId] = useState('');
  const [syncStats, setSyncStats] = useState({
    users: 0,
    students: 0,
    attendance: 0,
    grades: 0,
    journals: 0
  });

  // Fetch local dataset counts for the UI status overview
  const fetchLocalStats = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const studentsSnap = await getDocs(collection(db, 'students'));
      const attendanceSnap = await getDocs(collection(db, 'attendance'));
      const gradesSnap = await getDocs(collection(db, 'grades'));
      const journalsSnap = await getDocs(collection(db, 'journals'));

      setSyncStats({
        users: usersSnap.size,
        students: studentsSnap.size,
        attendance: attendanceSnap.size,
        grades: gradesSnap.size,
        journals: journalsSnap.size
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchLocalStats();
  }, []);

  const handleLinkAccount = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await linkGoogleAccount();
      if (res) {
        setSuccessMessage('Berhasil menghubungkan Akun Google!');
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err: any) {
      setErrorMessage(`Otorisasi gagal: ${err.message || 'Error tidak diketahui'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!sheetsAccessToken) {
      setErrorMessage('Token Google Sheets tidak tersedia. Silakan hubungkan kembali.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await createDatabaseSpreadsheet(sheetsAccessToken, settings?.schoolName || 'SD Negeri 4 Pusungi');
      if (result) {
        const newConfig = {
          spreadsheetId: result.spreadsheetId,
          spreadsheetUrl: result.spreadsheetUrl,
          lastSynced: 'Belum pernah disinkronisasi',
          connectedEmail: 'Akun Terhubung'
        };
        await saveSheetsConfig(newConfig);
        setSuccessMessage('Sukses membuat Google Spreadsheet baru!');
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setErrorMessage('Gagal membuat Spreadsheet. Pastikan izin akses Drive / Sheets telah diberikan.');
      }
    } catch (err: any) {
      setErrorMessage(`Error: ${err.message || 'Gagal memproses pembuatan file'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkExistingSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSheetId.trim()) return;
    if (!sheetsAccessToken) {
      setErrorMessage('Token Google Sheets tidak tersedia. Silakan hubungkan kembali.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const cleanId = customSheetId.trim();
      const isValid = await checkSpreadsheetStructure(sheetsAccessToken, cleanId);

      if (isValid) {
        const newConfig = {
          spreadsheetId: cleanId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
          lastSynced: 'Terhubung (Belum dinkronisasi)',
          connectedEmail: 'Akun Terhubung'
        };
        await saveSheetsConfig(newConfig);
        setSuccessMessage('Sukses menghubungkan Spreadsheet yang sudah ada!');
        setCustomSheetId('');
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setErrorMessage('Spreadsheet ID tidak valid atau sheet format (Settings, Users, dll) tidak lengkap.');
      }
    } catch (err: any) {
      setErrorMessage(`Format tidak cocok: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    if (!sheetsAccessToken || !sheetsConfig?.spreadsheetId) {
      setErrorMessage('Pastikan Akun dan Spreadsheet Drive sudah terhubung.');
      return;
    }

    const confirmExport = window.confirm(
      'Apakah Anda yakin ingin mengekspor seluruh data Firestore ke Google Sheets?\nData yang ada di Google Sheets saat ini akan ditimpa (overwrite) oleh versi database web.'
    );
    if (!confirmExport) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Fetch setting data
      const usersSnap = await getDocs(collection(db, 'users'));
      const studentsSnap = await getDocs(collection(db, 'students'));
      const attendanceSnap = await getDocs(collection(db, 'attendance'));
      const gradesSnap = await getDocs(collection(db, 'grades'));
      const journalsSnap = await getDocs(collection(db, 'journals'));

      const users = usersSnap.docs.map(doc => doc.data() as any);
      const students = studentsSnap.docs.map(doc => doc.data() as any);
      const attendance = attendanceSnap.docs.map(doc => doc.data() as any);
      const grades = gradesSnap.docs.map(doc => doc.data() as any);
      const journals = journalsSnap.docs.map(doc => doc.data() as any);

      const isOk = await syncDataToSheets(sheetsAccessToken, sheetsConfig.spreadsheetId, {
        settings: settings || { schoolName: 'SD Negeri 4 Pusungi', principalName: 'Kepala Sekolah' },
        users,
        students,
        attendance,
        grades,
        journals
      });

      if (isOk) {
        const nowStr = new Date().toLocaleString('id-ID', { hour12: false });
        await saveSheetsConfig({
          ...sheetsConfig,
          lastSynced: nowStr
        });
        setSuccessMessage('Sinkronisasi Ekspor data ke Google Sheets sukses!');
        fetchLocalStats();
      } else {
        setErrorMessage('Gagal mengunggah data. Silakan coba otorisasi ulang.');
      }
    } catch (err: any) {
      setErrorMessage(`Penulisan data gagal: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportAll = async () => {
    if (!sheetsAccessToken || !sheetsConfig?.spreadsheetId) {
      setErrorMessage('Hubungkan Akun Google dan Spreadsheet terlebih dahulu.');
      return;
    }

    const confirmImport = window.confirm(
      'Peringatan Kritis! Apakah Anda yakin ingin memulihkan (impor) seluruh data dari Google Sheets?\nSeluruh database sistem SIMAR saat ini akan ditimpa dengan versi data yang tersimpan di Google Sheets Anda.'
    );
    if (!confirmImport) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const data = await importDataFromSheets(sheetsAccessToken, sheetsConfig.spreadsheetId);

      if (!data) {
        setErrorMessage('Gagal membaca data Google Sheets. Format range baris mungkin berubah.');
        setLoading(false);
        return;
      }

      // Check integrity of imported records
      const usersLength = data.users?.length || 0;
      const studentsLength = data.students?.length || 0;

      if (usersLength === 0) {
        const isForce = window.confirm('Peringatan: Tidak mendeteksi baris Guru di Google Sheet. Impor ini akan mengosongkan Guru di sistem. Lanjutkan?');
        if (!isForce) {
          setLoading(false);
          return;
        }
      }

      // 1. Settings import
      if (data.settings) {
        await setDoc(doc(db, 'settings', 'school'), data.settings);
      }

      // 2. Users sync
      if (data.users) {
        // Clear non-referenced to avoid duplication
        for (const u of data.users) {
          await setDoc(doc(db, 'users', u.uid), u);
        }
      }

      // 3. Students sync
      if (data.students) {
        for (const s of data.students) {
          await setDoc(doc(db, 'students', s.id), s);
        }
      }

      // 4. Attendance sync
      if (data.attendance) {
        for (const a of data.attendance) {
          await setDoc(doc(db, 'attendance', a.id), a);
        }
      }

      // 5. Grades sync
      if (data.grades) {
        for (const g of data.grades) {
          await setDoc(doc(db, 'grades', g.id), g);
        }
      }

      // 6. Journals sync
      if (data.journals) {
        for (const j of data.journals) {
          await setDoc(doc(db, 'journals', j.id), j);
        }
      }

      const nowStr = new Date().toLocaleString('id-ID', { hour12: false });
      await saveSheetsConfig({
        ...sheetsConfig,
        lastSynced: `${nowStr} (Impor dari Sheet)`
      });

      setSuccessMessage('Seluruh basis data SIMAR berhasil diselaraskan dari Google Sheets!');
      fetchLocalStats();
    } catch (err: any) {
      setErrorMessage(`Import Error: ${err.message || 'Format parser baris bermasalah'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    const confirmDisconnect = window.confirm('Apakah Anda yakin ingin memutuskan integrasi Google Sheets? Konfigurasi Spreadsheet ID akan dibersihkan dari server.');
    if (!confirmDisconnect) return;

    setLoading(true);
    try {
      await disconnectSheets();
      setSuccessMessage('Integrasi Google Sheets berhasil diputuskan.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(`Gagal: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight uppercase">Integrasi Google Sheets</h1>
        <p className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mt-1">Gunakan Google Sheets di Google Drive sebagai basis data sekunder, pencadangan dan ekspor terpadu</p>
      </div>

      {/* Diagnostics Alerts */}
      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs font-bold uppercase tracking-wider"
        >
          <CheckCircle2 size={18} className="shrink-0" />
          {successMessage}
        </motion.div>
      )}

      {errorMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold uppercase tracking-wider"
        >
          <AlertTriangle size={18} className="shrink-0" />
          {errorMessage}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Step 1: Google Account connection */}
        <div className="lg:col-span-1 bg-slate-900/40 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/5 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-400/10">
              <Lock size={22} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Langkah 1: Akun Otorisasi</h3>
              <p className="text-xs text-slate-500 mt-1 uppercase font-bold leading-relaxed">SIMAR membutuhkan token akses Google Drive dan Sheets Anda untuk mengelola file spreadsheet.</p>
            </div>

            {sheetsAccessToken ? (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-wider">
                  <CheckCircle2 size={14} />
                  Kredensial Aktif
                </div>
                <p className="text-[10px] text-slate-400 truncate max-w-full italic font-medium">{sheetsAccessToken.slice(0, 15)}...{sheetsAccessToken.slice(-10)}</p>
                <button 
                  onClick={() => setSheetsAccessToken(null)}
                  className="text-[9px] text-red-400 hover:text-red-300 underline font-black uppercase tracking-wider"
                >
                  Segarkan Sesi
                </button>
              </div>
            ) : (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-wider">
                  <AlertTriangle size={14} />
                  Akun Belum Digabung
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed">Klik tombol di bawah untuk mengaktifkan izin Google Workspace.</p>
              </div>
            )}
          </div>

          <button
            onClick={handleLinkAccount}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Hubungkan Akun Google
          </button>
        </div>

        {/* Step 2: Spreadsheet Linking */}
        <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Langkah 2: Sambungkan Spreadsheet</h3>
              <p className="text-xs text-slate-500 uppercase font-bold">Buat file spreadsheet database baru atau hubungkan ID yang sudah ada</p>
            </div>
            <FileSpreadsheet className="text-blue-500 shrink-0" size={32} />
          </div>

          {sheetsConfig ? (
            <div className="p-4 sm:p-6 bg-slate-950/50 border border-white/5 rounded-2xl space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider truncate">SIMAR DB - {settings?.schoolName || 'SD Negeri 4 Pusungi'}</h4>
                  <p className="text-[10px] text-slate-500 font-bold tracking-wider mt-1 uppercase">Spreadsheet ID: <code className="text-slate-400 font-mono text-[9px] bg-slate-900 px-1 py-0.5 rounded">{sheetsConfig.spreadsheetId}</code></p>
                </div>
                <a 
                  href={sheetsConfig.spreadsheetUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-lg flex items-center justify-center transition-all shadow-lg shadow-emerald-600/10"
                  title="Buka Google Sheets"
                >
                  <ExternalLink size={16} />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-wider">
                <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                  <span className="text-slate-500 block mb-1">Status Sinkronisasi</span>
                  <span className="text-blue-400 font-bold">{sheetsConfig.lastSynced || 'Ada / Belum disinkronisasi'}</span>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                  <span className="text-slate-500 block mb-1">Total Tabel Terhubung</span>
                  <span className="text-emerald-400 font-bold">6 Sub-Sheets</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="text-xs font-black uppercase tracking-widest text-red-400 hover:bg-red-400/10 px-4 py-2.5 rounded-xl border border-red-500/10 flex items-center gap-2 transition-all"
                >
                  <Trash2 size={14} />
                  Putuskan Koneksi
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-950/20 p-6 rounded-2xl border border-white/5 space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider leading-relaxed">Metode A: Rekomendasi</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Membuat Spreadsheet di Google Drive Anda secara otomatis lengkap dengan headers</p>
                </div>
                <button
                  onClick={handleCreateNewSheet}
                  disabled={loading || !sheetsAccessToken}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/10"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                  Buat File Database Baru
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                <div className="h-px bg-white/5 flex-grow" />
                ATAU
                <div className="h-px bg-white/5 flex-grow" />
              </div>

              <form onSubmit={handleLinkExistingSheet} className="space-y-3">
                <div className="text-center mb-2">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider leading-relaxed">Metode B: Tempel Spreadsheet ID</p>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    required
                    value={customSheetId}
                    onChange={(e) => setCustomSheetId(e.target.value)}
                    placeholder="Contoh: 1v4S9X_0q7Y4-X6h..."
                    className="flex-grow px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white text-xs font-mono"
                  />
                  <button
                    type="submit"
                    disabled={loading || !sheetsAccessToken || !customSheetId.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Hubungkan
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Sync Operations Center */}
      <AnimatePresence>
        {sheetsConfig && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-slate-900/40 backdrop-blur-xl p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] border border-white/5 shadow-2x shadow-black/20 space-y-8"
          >
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">Pusat Kendali Sinkronisasi Database</h3>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mt-1">Status dan aksi pemulihan data antara SIMAR Web dan Google Sheets</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatItem label="GURU" value={syncStats.users} />
              <StatItem label="SISWA" value={syncStats.students} />
              <StatItem label="ABSENSI" value={syncStats.attendance} />
              <StatItem label="NILAI" value={syncStats.grades} />
              <StatItem label="JURNAL" value={syncStats.journals} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-4">
              
              {/* Push Action (Backup) */}
              <div className="p-6 bg-slate-950/50 border border-white/5 rounded-2xl flex flex-col justify-between gap-6 pointer-events-auto">
                <div className="space-y-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/10">
                    <ArrowUpRight size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Ekspor Data Ke Google Sheets</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 leading-relaxed">
                      Mengirim semua data local dari web ke Google Drive spreadsheet. Sangat direkomendasikan untuk pencadangan berkala.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleExportAll}
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={14} />}
                  Mulai Ekspor Sekarang
                </button>
              </div>

              {/* Pull Action (Restore) */}
              <div className="p-6 bg-slate-950/50 border border-white/5 rounded-2xl flex flex-col justify-between gap-6 pointer-events-auto">
                <div className="space-y-4">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/10">
                    <ArrowDownLeft size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Impor Data Dari Google Sheets</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 leading-relaxed">
                      Membaca baris Spreadsheet Drive dan menyelaraskannya ke internal Firestore. Berguna untuk memulihkan data jika terjadi kegagalan sistem.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleImportAll}
                  disabled={loading}
                  className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Database size={14} />}
                  Mulai Impor Sekarang
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5 text-center">
      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">{label}</span>
      <span className="text-lg font-display font-black text-white">{value}</span>
    </div>
  );
}
