import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { dbService } from '../services/dbService';
import { Employee, DepartmentMetric, User } from '../types';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deptMetrics, setDeptMetrics] = useState<DepartmentMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empData, metricData] = await Promise.all([
          dbService.getEmployees(),
          dbService.getDepartmentMetrics()
        ]);

        if (user.role === 'Manager' && user.department) {
          setEmployees(empData.filter(e => e.department === user.department));
          setDeptMetrics(metricData.filter(m => m.name === user.department));
        } else {
          setEmployees(empData);
          setDeptMetrics(metricData);
        }
      } catch (err) {
        console.error("Dashboard fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const totalEmployees = employees.length;
  const kuwaitiCount = employees.filter(e => e.nationality === 'Kuwaiti').length;
  const kuwaitizationRatio = totalEmployees > 0 ? (kuwaitiCount / totalEmployees) * 100 : 0;

  if (loading) return (
    <div className="space-y-8 animate-pulse">
      <div className="h-12 w-64 bg-slate-200 rounded-xl"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-3xl"></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-slate-200 rounded-3xl"></div>
        <div className="h-96 bg-slate-200 rounded-3xl"></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">
      <header>
        <nav className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-4">Workforce Intelligence</nav>
        <h2 className="text-5xl font-black text-slate-950 tracking-tighter">
          {user.role === 'Manager' ? user.department : 'Enterprise'} <span className="text-emerald-600">Overview</span>
        </h2>
      </header>

      {/* Bento Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bento-card bg-white flex flex-col justify-between">
           <span className="text-3xl mb-4">👥</span>
           <div>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Talent</p>
             <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{totalEmployees}</h3>
           </div>
        </div>
        <div className="bento-card bg-emerald-600 text-white shadow-xl shadow-emerald-600/30 flex flex-col justify-between">
           <span className="text-3xl mb-4 text-emerald-100/50">🇰🇼</span>
           <div>
             <p className="text-emerald-100/50 text-[10px] font-black uppercase tracking-widest mb-1">National Ratio</p>
             <h3 className="text-4xl font-black text-white tracking-tighter">{kuwaitizationRatio.toFixed(1)}%</h3>
           </div>
        </div>
        <div className="bento-card bg-white flex flex-col justify-between">
           <span className="text-3xl mb-4">📅</span>
           <div>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Active Leaves</p>
             <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
               {employees.filter(e => e.status === 'On Leave').length}
             </h3>
           </div>
        </div>
        <div className="bento-card bg-white flex flex-col justify-between">
           <span className="text-3xl mb-4">⚖️</span>
           <div>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Compliance Grade</p>
             <h3 className="text-4xl font-black text-emerald-600 tracking-tighter">A+</h3>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bento-card bg-white min-h-[400px]">
          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Workforce Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptMetrics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', padding: '16px' }}
                />
                <Bar dataKey="kuwaitiCount" name="Kuwaiti" fill="#059669" radius={[12, 12, 0, 0]} barSize={40} />
                <Bar dataKey="expatCount" name="Expat" fill="#f1f5f9" radius={[12, 12, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bento-card bg-white flex flex-col items-center justify-center text-center">
          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8 w-full text-left">Nationalization Goal</h3>
          <div className="relative w-full aspect-square max-w-[200px] mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Kuwaiti', value: kuwaitiCount },
                    { name: 'Expat', value: totalEmployees - kuwaitiCount }
                  ]}
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  <Cell fill="#059669" />
                  <Cell fill="#f1f5f9" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-slate-950">{kuwaitizationRatio.toFixed(0)}%</span>
            </div>
          </div>
          <div className="w-full space-y-3">
             <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Status</span>
               <span className="text-[10px] font-black text-emerald-600 uppercase">Verified</span>
             </div>
             <p className="text-[9px] text-slate-400 leading-relaxed italic">Last updated via PAM real-time sync</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;