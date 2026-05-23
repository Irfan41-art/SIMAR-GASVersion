import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Users, UserPlus, ClipboardList, BookOpen, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    students: 0,
    gurus: 0,
    attendance: 0,
    journals: 0
  });

  useEffect(() => {
    async function fetchData() {
      const studentSnap = await getDocs(collection(db, 'students'));
      const guruSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'guru')));
      const attendanceSnap = await getDocs(collection(db, 'attendance'));
      const journalSnap = await getDocs(collection(db, 'journals'));

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
        gurus: guruSnap.size,
        attendance: totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0,
        journals: journalSnap.size
      });
    }
    fetchData();
  }, []);

  const data = [
    { name: 'Total Murid', value: stats.students, color: '#3b82f6' },
    { name: 'Total Guru', value: stats.gurus, color: '#10b981' },
    { name: 'Total Jurnal', value: stats.journals, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">Dashboard Admin</h1>
        <p className="text-slate-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-[0.2em]">Ringkasan seluruh data sistem SIMAR v2.0</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatItem icon={<Users size={20} className="sm:size-6"/>} label="Total Murid" value={stats.students} trend="+12% bulan ini" color="blue" />
        <StatItem icon={<UserPlus size={20} className="sm:size-6"/>} label="Total Guru" value={stats.gurus} trend="+2 bulan ini" color="emerald" />
        <StatItem icon={<TrendingUp size={20} className="sm:size-6"/>} label="Kehadiran" value={`${stats.attendance}%`} trend="Stabil" color="amber" />
        <StatItem icon={<ClipboardList size={20} className="sm:size-6"/>} label="Total Jurnal" value={stats.journals} trend="+15 minggu ini" color="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900/40 backdrop-blur-md p-5 sm:p-6 rounded-3xl sm:rounded-[2rem] border border-white/5 shadow-2xl shadow-black/10">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 sm:mb-8 px-2">Distribusi Data</h3>
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
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-md p-5 sm:p-6 rounded-3xl sm:rounded-[2rem] border border-white/5 shadow-2xl shadow-black/10">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 sm:mb-8 px-2">Status Sistem</h3>
          <div className="space-y-8 px-2">
            <SystemStatus label="Server Uptime" value="99.9%" progress={99.9} color="emerald" />
            <SystemStatus label="Database Usage" value="12%" progress={12} color="blue" />
            <SystemStatus label="File Storage" value="45%" progress={45} color="amber" />
            <div className="pt-6 border-t border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Aktivitas Terakhir</p>
              <div className="space-y-4">
                <ActivityItem user="Admin" action="Login sistem" time="10m" />
                <ActivityItem user="Irfan" action="Input data murid" time="1h" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ icon, label, value, trend, color }: any) {
  const colors: any = {
    blue: 'bg-blue-600 shadow-blue-500/20',
    emerald: 'bg-emerald-600 shadow-emerald-500/20',
    amber: 'bg-amber-600 shadow-amber-500/20',
    violet: 'bg-violet-600 shadow-violet-500/20',
  };
  return (
    <motion.div whileHover={{ y: -5 }} className="bg-slate-900/40 backdrop-blur-md p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border border-white/5 shadow-2xl shadow-black/10 transition-all">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg text-white ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <h4 className="text-2xl sm:text-3xl font-display font-black text-white">{value}</h4>
      <p className="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase mt-2 sm:mt-3 py-1 px-2 bg-white/5 rounded-full inline-block">{trend}</p>
    </motion.div>
  );
}

function SystemStatus({ label, value, progress, color }: any) {
  const barColors: any = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
  };
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-black text-white">{value}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${barColors[color]} rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.3)]`} style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
}

function ActivityItem({ user, action, time }: any) {
  return (
    <div className="flex items-center gap-3 text-[11px] font-medium">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
      <span className="font-black text-slate-200 uppercase tracking-wider">{user}</span>
      <span className="text-slate-500">{action}</span>
      <span className="ml-auto text-[9px] font-bold text-slate-600 bg-white/5 px-2 py-0.5 rounded-md">{time}</span>
    </div>
  );
}
