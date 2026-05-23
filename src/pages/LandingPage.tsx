import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppContext } from '../context/AppContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Users, UserCheck, School, LogIn, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function LandingPage() {
  const { settings } = useAppContext();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalGurus: 0,
    attendanceRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const studentSnap = await getDocs(collection(db, 'students'));
        const guruSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'guru')));
        const attendanceSnap = await getDocs(collection(db, 'attendance'));

        const totalStudents = studentSnap.size;
        const totalGurus = guruSnap.size;

        let totalPresent = 0;
        let totalRecords = 0;

        attendanceSnap.forEach(doc => {
          const records = doc.data().records || {};
          Object.values(records).forEach(status => {
            totalRecords++;
            if (status === 'Hadir') totalPresent++;
          });
        });

        const attendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

        setStats({ totalStudents, totalGurus, attendanceRate });
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const chartData = [
    { name: 'Murid', value: stats.totalStudents, fill: '#3b82f6' },
    { name: 'Guru', value: stats.totalGurus, fill: '#10b981' },
    { name: 'Kehadiran (%)', value: stats.attendanceRate, fill: '#f59e0b' },
  ];

  const pieData = [
    { name: 'Hadir', value: stats.attendanceRate },
    { name: 'Tidak Hadir', value: 100 - stats.attendanceRate },
  ];
  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="min-h-screen bg-[#020617] font-sans text-slate-200 selection:bg-blue-500/30">
      {/* Header */}
      <header className="bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden bg-slate-800">
              {settings?.logoURL ? (
                <img src={settings.logoURL} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-600 flex items-center justify-center">
                  <School className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <h1 className="text-sm sm:text-xl font-display font-bold tracking-tight text-white flex flex-col sm:flex-row sm:items-center sm:gap-2 leading-tight">
              <span>SIMAR</span>
              <span className="hidden sm:inline text-slate-500 font-medium">|</span>
              <span className="text-[10px] sm:text-sm font-medium text-slate-400 truncate max-w-[150px] sm:max-w-none">
                SD NEGERI 4 PUSUNGI
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link 
              to="/login/admin" 
              className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-all"
            >
              Admin
            </Link>
            <Link 
              to="/login/guru" 
              className="px-3 sm:px-5 py-1.5 sm:py-2 bg-blue-600 text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-full hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/30 transition-all text-center"
            >
              Portal Guru
            </Link>
          </div>
        </div>
      </header>

      <main className="relative overflow-hidden">
        {/* Modern Background Decoration */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          {/* Hero Section */}
          <div className="text-center mb-20 max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-3 py-1 mb-6 text-[10px] font-black tracking-[0.2em] text-blue-400 uppercase bg-blue-400/10 border border-blue-400/20 rounded-full">
                SISTEM INFORMASI ADMINISTRASI GURU
              </span>
              <h2 className="text-4xl lg:text-5xl font-display font-black text-white mb-6 leading-tight tracking-tight">
                SELAMAT DATANG <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 via-indigo-400 to-purple-400">
                  {settings?.schoolName || 'Sekolah Masa Depan'}
                </span>
              </h2>
              <p className="text-base text-slate-400 leading-relaxed max-w-xl mx-auto mb-10">
                Sistem Informasi Manajemen Administrasi Guru (SIMAR). Membawa transparansi, akurasi, dan efisiensi ke dalam setiap aspek pengelolaan data pendidikan Anda.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link 
                  to="/login/guru"
                  className="px-8 py-3.5 bg-white text-[#020617] font-bold rounded-xl hover:bg-slate-100 transition-all flex items-center gap-2 group shadow-xl shadow-white/5"
                >
                  Mulai Sekarang
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <div className="px-8 py-3.5 bg-slate-900/50 backdrop-blur-md text-slate-300 font-bold rounded-xl border border-white/5 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-400" />
                  {stats.totalGurus}+ Guru Terdaftar
                </div>
              </div>
            </motion.div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            <StatCard 
              icon={<Users className="w-5 h-5" />}
              label="Murid"
              value={stats.totalStudents}
              color="blue"
            />
            <StatCard 
              icon={<UserCheck className="w-5 h-5" />}
              label="Guru"
              value={stats.totalGurus}
              color="purple"
            />
            <StatCard 
              icon={<School className="w-5 h-5" />}
              label="Presensi"
              value={`${stats.attendanceRate}%`}
              color="indigo"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-white/5"
            >
              <div className="mb-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Data Statistik</h3>
                <p className="text-xs text-slate-500">Perbandingan entitas pendidikan</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.02)'}}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }}
                    />
                    <Bar dataKey="value" fill="url(#barGradient)" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-white/5"
            >
              <div className="mb-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Distribusi Presensi</h3>
                <p className="text-xs text-slate-500">Persentase kehadiran mingguan</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={6}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#1e293b" />
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '12px', color: '#64748b'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-10">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md overflow-hidden bg-slate-800">
              {settings?.logoURL ? (
                <img src={settings.logoURL} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <School className="w-4 h-4 text-blue-500" />
              ) }
            </div>
            <span className="font-display font-bold text-white text-sm">SIMAR</span>
          </div>
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">
            &copy; 2026 Developed by IRFAN, S.Pd.
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string | number, color: string }) {
  const colorStyles: Record<string, { bg: string, text: string, icon: string, shadow: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: 'bg-blue-600', shadow: 'shadow-blue-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: 'bg-purple-600', shadow: 'shadow-purple-500/20' },
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', icon: 'bg-indigo-600', shadow: 'shadow-indigo-500/20' },
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 transition-all"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 shadow-lg ${colorStyles[color].icon} text-white`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className="text-2xl font-display font-black text-white">{value}</p>
      </div>
    </motion.div>
  );
}
