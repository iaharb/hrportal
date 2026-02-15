
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { dbService } from '../services/dbService.ts';
import { Employee, DepartmentMetric, User, View } from '../types.ts';
import { useTranslation } from 'react-i18next';

interface DashboardProps {
  user: User;
  onNavigate?: (view: View) => void;
  language?: 'en' | 'ar';
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deptMetrics, setDeptMetrics] = useState<DepartmentMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<{ type: string, latency?: number }>({ type: 'Testing' });
  const [showGuide, setShowGuide] = useState(!localStorage.getItem('guide_dashboard_seen'));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const test = await dbService.testConnection();
        setDbStatus({ 
          type: test.success ? (language === 'ar' ? 'مباشر' : 'Live') : (language === 'ar' ? 'تجريبي' : 'Mock'), 
          latency: test.latency 
        });

        const [empData, metricData] = await Promise.all([
          dbService.getEmployees(),
          dbService.getDepartmentMetrics()
        ]);

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
        console.error("Dashboard Fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, language]);

  const dismissGuide = () => {
    setShowGuide(false);
    localStorage.setItem('guide_dashboard_seen', 'true');
  };

  const calculateDaysRemaining = (expiryDate?: string) => {
    if (!expiryDate) return Infinity;
    const today = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const totalEmployees = employees.length;
  const kuwaitiCount = employees.filter(e => e.nationality === 'Kuwaiti').length;
  const kuwaitizationRatio = totalEmployees > 0 ? (kuwaitiCount / totalEmployees) * 100 : 0;
  const targetRatio = 30;

  const criticalExpiries = employees.filter(emp => {
    const cid = emp.civilIdExpiry ? calculateDaysRemaining(emp.civilIdExpiry) : Infinity;
    const pass = emp.passportExpiry ? calculateDaysRemaining(emp.passportExpiry) : Infinity;
    const izn = emp.iznAmalExpiry ? calculateDaysRemaining(emp.iznAmalExpiry) : Infinity;
    return cid <= 30 || pass <= 30 || izn <= 90;
  }).length;

  if (loading) {
    return (
      <div className="space-y-10 animate-pulse px-4">
        <div className="h-48 bg-white/50 rounded-3xl border border-slate-100"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white/50 rounded-3xl border border-slate-100"></div>)}
        </div>
      </div>
    );
  }

  const kpiItems = [
    { label: t('active'), val: employees.filter(e => e.status === 'Active').length, icon: '⚡', color: 'text-indigo-600', bg: 'bg-indigo-50', view: View.Directory },
    { label: t('onLeave'), val: employees.filter(e => e.status === 'On Leave').length, icon: '📅', color: 'text-amber-600', bg: 'bg-amber-50', view: View.Leaves },
    { label: t('nationalTalent'), val: kuwaitiCount, icon: '🇰🇼', color: 'text-emerald-600', bg: 'bg-emerald-50', view: View.Directory },
    { label: t('systemAlerts'), val: criticalExpiries, icon: '⚠️', color: criticalExpiries > 0 ? 'text-rose-600' : 'text-slate-400', bg: criticalExpiries > 0 ? 'bg-rose-50' : 'bg-slate-50', view: View.Compliance }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {showGuide && (
        <div className="bg-slate-900 rounded-[32px] p-10 text-white relative overflow-hidden group shadow-2xl shadow-slate-900/10">
           <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
              <span className="text-[180px]">👋</span>
           </div>
           <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center text-3xl shadow-xl">
                ✨
              </div>
              <div className="flex-1 space-y-1 text-center md:text-start">
                 <h3 className="text-xl font-extrabold tracking-tight">{t('guideDashboardTitle')}</h3>
                 <p className="text-slate-400 font-medium leading-relaxed max-w-xl">{t('guideDashboardDesc')}</p>
              </div>
              <button 
                onClick={dismissGuide}
                className="px-8 py-3 bg-white text-slate-900 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-indigo-50 transition-all active:scale-95 shadow-xl"
              >
                {t('gotIt')}
              </button>
           </div>
        </div>
      )}

      {/* Main KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiItems.map((kpi, i) => (
          <button 
            key={i} 
            onClick={() => onNavigate?.(kpi.view)}
            className="saas-card p-6 rounded-[28px] group text-start transition-all hover:scale-[1.02] active:scale-95"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 ${kpi.bg} rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform`}>
                {kpi.icon}
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <h4 className={`text-3xl font-black ${kpi.color}`}>{kpi.val.toLocaleString(language === 'ar' ? 'ar-KW' : 'en-KW')}</h4>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{t('members')}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Analytics Section */}
        <div className="lg:col-span-8 saas-card p-10 rounded-[40px] relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="relative w-56 h-56 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { value: kuwaitizationRatio },
                      { value: Math.max(0, 100 - kuwaitizationRatio) }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={0}
                    startAngle={90}
                    endAngle={450}
                    dataKey="value"
                    stroke="none"
                    animationDuration={1500}
                  >
                    <Cell fill="#4f46e5" />
                    <Cell fill="#f1f5f9" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center" dir="ltr">
                <span className="text-4xl font-black text-slate-900 leading-none">
                  {kuwaitizationRatio.toFixed(0)}%
                </span>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Kuwaitization</p>
              </div>
            </div>

            <div className="flex-1 space-y-8 text-start">
              <div className="space-y-3">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block border border-indigo-100">
                  {t('pamCertified')}
                </span>
                <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{t('workforceBalance')}</h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-md">
                  {kuwaitizationRatio >= targetRatio ? t('hiringSuccess') : t('hiringNeeded')}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                 <div className="space-y-1">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('nationalTalent')}</p>
                   <p className="text-2xl font-black text-slate-900">{kuwaitiCount.toLocaleString(language === 'ar' ? 'ar-KW' : 'en-KW')}</p>
                   <div className="h-1 bg-indigo-100 rounded-full w-24">
                      <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${(kuwaitiCount/totalEmployees)*100}%` }}></div>
                   </div>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('expat')}</p>
                   <p className="text-2xl font-black text-slate-900">{(totalEmployees - kuwaitiCount).toLocaleString(language === 'ar' ? 'ar-KW' : 'en-KW')}</p>
                   <div className="h-1 bg-slate-100 rounded-full w-24">
                      <div className="h-full bg-slate-400 rounded-full transition-all duration-1000" style={{ width: `${((totalEmployees - kuwaitiCount)/totalEmployees)*100}%` }}></div>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Quick Access */}
        <div className="lg:col-span-4 space-y-4">
           <div className="saas-card p-8 rounded-[40px] bg-slate-900 text-white h-full flex flex-col justify-between group overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <span className="text-6xl font-bold">🎯</span>
              </div>
              <div className="relative z-10 space-y-6 text-start">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{t('regulatoryHub')}</h4>
                <p className="text-slate-300 text-sm font-medium leading-relaxed">
                   Streamline government filings and ensure document integrity across your entire workforce.
                </p>
              </div>
              <div className="relative z-10 space-y-3 mt-12">
                 <button onClick={() => onNavigate?.(View.Compliance)} className="w-full py-4 bg-white/10 hover:bg-white text-slate-400 hover:text-slate-900 border border-white/5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">
                    {t('compliance')}
                 </button>
                 <button onClick={() => onNavigate?.(View.Payroll)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20">
                    {t('payroll')}
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Chart Section */}
      <section className="saas-card p-10 rounded-[40px]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4 text-start">
           <div className="space-y-1">
             <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('nationalizationTargets')}</h3>
             <p className="text-slate-500 text-sm font-medium">Departmental workforce comparative metrics.</p>
           </div>
           <div className="flex gap-6 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kuwaiti</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expat</span>
              </div>
           </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deptMetrics} barGap={8}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#f1f5f9" />
              <XAxis 
                dataKey={language === 'ar' ? 'nameArabic' : 'name'} 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                dy={12}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
              />
              <Tooltip 
                cursor={{fill: '#f8fafc', radius: 12}} 
              />
              <Bar 
                dataKey="kuwaitiCount" 
                fill="#4f46e5" 
                radius={[8, 8, 0, 0]} 
                barSize={32}
              />
              <Bar 
                dataKey="expatCount" 
                fill="#e2e8f0" 
                radius={[8, 8, 0, 0]} 
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
