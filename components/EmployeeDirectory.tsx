
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService.ts';
import { Employee, User } from '../types.ts';
import { translations } from '../translations.ts';

interface EmployeeDirectoryProps {
  user: User;
  onAddClick?: () => void;
  language: 'en' | 'ar';
}

const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({ user, onAddClick, language }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const t = translations[language];

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let data = await dbService.getEmployees();
      if (user.role === 'Manager' && user.department) {
        data = data.filter(e => e.department === user.department);
      }
      setEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [user.id, user.department]); // Optimized dependency array

  const handleStatusChange = async (employeeId: string, newStatus: Employee['status']) => {
    setUpdatingId(employeeId);
    try {
      await dbService.updateEmployeeStatus(employeeId, newStatus);
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId ? { ...emp, status: newStatus } : emp
      ));
    } catch (err: any) {
      console.error("Status update failed", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getComplianceStatus = (emp: Employee) => {
    const dates = [emp.civilIdExpiry, emp.passportExpiry, emp.iznAmalExpiry]
      .filter(Boolean)
      .map(d => {
        const diff = new Date(d!).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
      });
      
    if (dates.length === 0) return { label: t.unknown, color: 'bg-slate-200', pulse: false };
    const minDays = Math.min(...dates);
    
    if (minDays < 0) return { label: t.expired, color: 'bg-rose-500', pulse: true };
    if (minDays <= 30) return { label: t.critical, color: 'bg-orange-500', pulse: true };
    if (minDays <= 90) return { label: t.warning, color: 'bg-amber-400', pulse: false };
    return { label: t.secure, color: 'bg-emerald-500', pulse: false };
  };
  
  const filtered = employees.filter(e => {
    const search = filter.toLowerCase();
    return e.name.toLowerCase().includes(search) ||
           (e.nameArabic && e.nameArabic.includes(search)) ||
           e.position.toLowerCase().includes(search) ||
           e.department.toLowerCase().includes(search);
  });

  const canManage = user.role === 'Admin' || user.role === 'HR';

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">{t.directory}</h2>
          <p className="text-slate-500 text-lg font-medium mt-1">Registry integrity for the 2025 cycle.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch gap-4">
          <input 
            type="text" 
            placeholder={t.searchPlaceholder}
            className="w-full min-w-[320px] px-8 py-5 border border-slate-200 rounded-[28px] bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none font-bold text-slate-700"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {canManage && (
            <button 
              onClick={onAddClick}
              className="bg-slate-900 text-white px-10 py-5 rounded-[28px] font-black text-[12px] uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-900/10"
            >
              + {t.enroll}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[56px] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-40 flex flex-col justify-center items-center gap-6">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">{t.syncing}</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="px-10 py-8 text-center" style={{ width: '100px' }}>#</th>
                  <th className="px-10 py-8">{t.nameEn} / {t.nameAr}</th>
                  <th className="px-10 py-8">{t.documentHealth}</th>
                  <th className="px-10 py-8">{t.roleEn}</th>
                  <th className="px-10 py-8">{t.registryStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((emp, idx) => {
                  const health = getComplianceStatus(emp);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-10 py-8 text-center text-xs font-black text-slate-300">{idx + 1}</td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-[24px] bg-slate-100 text-slate-600 flex items-center justify-center text-lg font-black border border-slate-200">
                            {emp.name[0]}
                          </div>
                          <div>
                            <p className="text-base font-black text-slate-900">{language === 'ar' && emp.nameArabic ? emp.nameArabic : emp.name}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {emp.nationality === 'Kuwaiti' ? '🇰🇼 Citizen' : '🌍 Expat'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                         <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className={`w-2.5 h-2.5 rounded-full ${health.color} ${health.pulse ? 'animate-pulse' : ''}`}></div>
                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{health.label}</span>
                         </div>
                      </td>
                      <td className="px-10 py-8">
                         <p className="text-sm font-bold text-slate-700">{language === 'ar' && emp.positionArabic ? emp.positionArabic : emp.position}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{emp.department}</p>
                      </td>
                      <td className="px-10 py-8">
                        {canManage ? (
                          <select
                            value={emp.status}
                            onChange={(e) => handleStatusChange(emp.id, e.target.value as Employee['status'])}
                            className="text-[10px] font-black uppercase tracking-widest rounded-xl px-5 py-2.5 bg-white border border-slate-200 shadow-sm"
                          >
                            <option value="Active">{t.active}</option>
                            <option value="On Leave">{t.onLeave}</option>
                            <option value="Terminated">{t.terminated}</option>
                          </select>
                        ) : (
                          <span className={`text-[10px] font-black uppercase tracking-widest ${emp.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {t[emp.status.toLowerCase().replace(' ', '') as keyof typeof t] || emp.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-40 text-center flex flex-col items-center">
            <h4 className="text-xl font-black text-slate-300 uppercase tracking-widest">{t.noRecords}</h4>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDirectory;
