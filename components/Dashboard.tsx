
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

        // Filter by department if manager
        if (user.role === 'Manager' && user.department) {
          const filteredEmps = empData.filter(e => e.department === user.department);
          const filteredMetrics = metricData.filter(m => m.name === user.department);
          setEmployees(filteredEmps);
          setDeptMetrics(filteredMetrics);
        } else {
          setEmployees(empData);
          setDeptMetrics(metricData);
        }
      } catch (err) {
        console.error("Fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const totalEmployees = employees.length;
  const kuwaitiCount = employees.filter(e => e.nationality === 'Kuwaiti').length;
  const expatCount = totalEmployees - kuwaitiCount;
  const kuwaitizationRatio = totalEmployees > 0 ? (kuwaitiCount / totalEmployees) * 100 : 0;

  const pieData = [
    { name: 'Kuwaiti', value: kuwaitiCount, color: '#059669' },
    { name: 'Expat', value: expatCount, color: '#94a3b8' },
  ];

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse-subtle">
        <div className="h-20 bg-white rounded-2xl border border-slate-100"></div>
        <div className="grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white rounded-2xl border border-slate-100"></div>)}
        </div>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 h-[400px] bg-white rounded-2xl border border-slate-100"></div>
          <div className="h-[400px] bg-white rounded-2xl border border-slate-100"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {user.role === 'Manager' ? `${user.department} Department Hub` : 'Executive Overview'}
          </h2>
          <p className="text-slate-500">
            {user.role === 'Manager' 
              ? `Management view for ${user.department} workforce activities.` 
              : 'Global database analytics for national workforce participation.'}
          </p>
        </div>
        {user.role === 'Manager' && (
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-bold uppercase tracking-wider">
            Scoped to your Team
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Headcount', value: totalEmployees, icon: '🏢' },
          { label: 'Kuwaiti Nationals', value: kuwaitiCount, icon: '🇰🇼', sub: `${kuwaitizationRatio.toFixed(1)}% Ratio` },
          { label: 'Expat Staff', value: expatCount, icon: '🌍' },
          { label: 'Compliance Grade', value: kuwaitizationRatio > 30 ? 'A' : 'B+', icon: '✅', sub: 'Based on active PAM data' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl">{stat.icon}</span>
              <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wider">Metric</span>
            </div>
            <p className="text-slate-500 text-sm">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
            {'sub' in stat && <p className="text-xs text-emerald-600 font-medium mt-1">{stat.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Department Distribution</h3>
          <div className="h-[300px]">
            {deptMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptMetrics}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="kuwaitiCount" name="Kuwaiti" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expatCount" name="Expat" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No department data found.</div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Staffing Balance</h3>
          <div className="h-[250px] relative">
            {totalEmployees > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">No records to display.</div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-slate-900">{kuwaitizationRatio.toFixed(0)}%</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kuwaiti</span>
            </div>
          </div>
          <div className="mt-6 space-y-3">
             {pieData.map((item, i) => (
               <div key={i} className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                   <span className="text-sm text-slate-600">{item.name}</span>
                 </div>
                 <span className="text-sm font-semibold text-slate-900">{item.value}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
