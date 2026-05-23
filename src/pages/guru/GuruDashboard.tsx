import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAppContext } from '../../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Users, ClipboardList, BookOpen, TrendingUp, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';

export default function GuruDashboard() {
  const { user, profile } = useAppContext();
  const [stats, setStats] = useState({
    students: 0,
    attendance: 0,
    gradesTotal: 0,
    journals: 0
  });

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      const studentSnap = await getDocs(query(collection(db, 'students'), where('teacherId', '==', user.uid)));
      const attendanceSnap = await getDocs(query(collection(db, 'attendance'), where('teacherId', '==', user.uid)));
      const gradenSnap = await getDocs(query(collection(db, 'grades'), where('teacherId', '==', user.uid)));
      const journalSnap = await getDocs(query(collection(db, 'journals'), where('teacherId', '==', user.uid)));

      let totalPresent = 0;
      let totalRecords = 0;
      attendanceSnap.forEach(doc => {
        const records = doc.data().records || {};
        Object.values(records).forEach(status => {
          totalRecords++;
          if (status === 'Hadir') totalPresent++;
        });
      });

      setStats({
        students: studentSnap.size,
        attendance: totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0,
        gradesTotal: gradenSnap.size,
        journals: journalSnap.size
      });
    }
    fetchData();
  }, [user]);

  const data = [
    { name: 'Koleksi Nilai', value: stats.gradesTotal, color: '#3b82f6' },
    { name: 'Jurnal Harian', value: stats.journals, color: '#8b5cf6' },
    { name: 'Total Murid', value: stats.students, color: '#10b981' },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-500/20">
        <div className="relative z-10">
          <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-4 sm:mb-6">Portal Guru v2.0</span>
          <h1 className="text-2xl sm:text-4xl font-display font-black mb-3 sm:mb-4 tracking-tight leading-tight">Halo, Selamat Datang<br/>{profile?.name || 'Guru'}!</h1>
          <p className="text-blue-50/80 font-medium max-w-sm text-sm sm:text-lg leading-relaxed">Mari kelola administrasi mengajar hari ini dengan sistem yang lebih modern dan cerdas.</p>
        </div>
        <GraduationCap className="absolute -bottom-12 -right-12 w-48 h-48 sm:w-80 sm:h-80 opacity-10 rotate-12" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatItem icon={<Users size={20} className="sm:size-6"/>} label="Murid Diampu" value={stats.students} color="emerald" />
        <StatItem icon={<TrendingUp size={20} className="sm:size-6"/>} label="Rata Presensi" value={`${stats.attendance}%`} color="blue" />
        <StatItem icon={<GraduationCap size={20} className="sm:size-6"/>} label="Penilaian" value={stats.gradesTotal} color="amber" />
        <StatItem icon={<ClipboardList size={20} className="sm:size-6"/>} label="Jurnal" value={stats.journals} color="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900/40 backdrop-blur-md p-6 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border border-white/5 shadow-2xl shadow-black/10">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 sm:mb-10 text-center lg:text-left">Aktivitas Mengajar</h3>
          <div className="h-64 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.02)'}}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-md p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] border border-white/5 shadow-2xl shadow-black/10 flex flex-col justify-center text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-600/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <BookOpen size={28} className="sm:size-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white mb-2 sm:mb-3 uppercase tracking-tight">Status Sesi</h3>
          <p className="text-slate-500 mb-6 sm:mb-10 max-w-xs mx-auto text-xs sm:text-sm font-medium leading-relaxed">Sistem siap menerima input data absensi dan jurnal harian Anda.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
             <div className="p-4 sm:p-5 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 sm:mb-2">Mata Pelajaran</p>
                <p className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider">{profile?.subject || '-'}</p>
             </div>
             <div className="p-4 sm:p-5 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 sm:mb-2">Kelas Diampu</p>
                <p className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider">{profile?.classAssigned || '-'}</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ icon, label, value, color }: any) {
  const colors: any = {
    emerald: 'bg-emerald-600 shadow-emerald-500/20',
    blue: 'bg-blue-600 shadow-blue-500/20',
    amber: 'bg-amber-600 shadow-amber-500/20',
    violet: 'bg-violet-600 shadow-violet-500/20',
  };
  return (
    <motion.div whileHover={{ y: -8 }} className="bg-slate-900/40 backdrop-blur-md p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] border border-white/5 shadow-2xl shadow-black/10 transition-all flex flex-col items-center text-center">
      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-5 sm:mb-8 shadow-lg text-white ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 sm:mb-2">{label}</p>
        <h4 className="text-2xl sm:text-4xl font-display font-black text-white leading-tight tracking-tight">{value}</h4>
      </div>
    </motion.div>
  );
}
