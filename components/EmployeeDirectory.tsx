
import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/dbService.ts';
import { Employee, User } from '../types.ts';
import { useTranslation } from 'react-i18next';

interface EmployeeDirectoryProps {
  user: User;
  onAddClick?: () => void;
  onEditClick?: (emp: Employee) => void;
  language: 'en' | 'ar';
}

const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({ user, onAddClick, onEditClick }) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let data = await dbService.getEmployees();
      
      // Hierarchy Weights for Kuwaiti Corporate Structure
      const getWeight = (pos: string) => {
        const p = pos.toLowerCase();
        if (p.includes('ceo') || p.includes('general manager')) return 100;
        if (p.includes('director') || p.includes('head of')) return 80;
        if (p.includes('manager')) return 60;
        if (p.includes('lead')) return 40;
        return 10;
      };

      // Scope Filter: Managers and HR only see their own department + CEO for oversight
      if (user.role === 'Manager' || user.role === 'HR') {
        const targetDept = user.department;
        data = data.filter(e => {
          // Dr. Faisal (CEO) is always visible regardless of viewing scope
          const isCEO = /ceo/i.test(e.position);
          const isInDept = e.department === targetDept;
          return isCEO || isInDept;
        });
      }

      // Sort by weight (Highest at top) then name
      const sortedData = [...data].sort((a, b) => {
        const weightA = getWeight(a.position);
        const weightB = getWeight(b.position);

        if (weightA !== weightB) return weightB - weightA;
        return a.name.localeCompare(b.name);
      });

      setEmployees(sortedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [user.id, user.department, user.role]);

  const handleStatusChange = async (employeeId: string, newStatus: Employee['status']) => {
    setUpdatingId(employeeId);
    try {
      await dbService.updateEmployee(employeeId, { status: newStatus });
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
      
    if (dates.length === 0) return { label: t('unknown'), color: 'bg-slate-200', text: 'text-slate-500' };
    const minDays = Math.min(...dates);
    
    if (minDays < 0) return { label: t('expired'), color: 'bg-rose-100', text: 'text-rose-600' };
    if (minDays <= 30) return { label: `${minDays}d`, color: 'bg-orange-100', text: 'text-orange-600' };
    if (minDays <= 90) return { label: t('warning'), color: 'bg-amber-100', text: 'text-amber-600' };
    return { label: t('secure'), color: 'bg-emerald-100', text: 'text-emerald-600' };
  };
  
  const filtered = useMemo(() => {
    const search = filter.toLowerCase();
    return employees.filter(e => {
      return e.name.toLowerCase().includes(search) ||
             (e.nameArabic && e.nameArabic.includes(search)) ||
             e.position.toLowerCase().includes(search) ||
             e.department.toLowerCase().includes(search);
    });
  }, [employees, filter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const canManage = user.role === 'Admin' || user.role === 'HR';

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 text-start">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('directory')}</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Registry management for {user.role === 'Admin' ? 'Global Organization' : `${user.department} Scope`}.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="relative">
            <span className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center text-slate-400`}>🔍</span>
            <input 
              type="text" 
              placeholder={t('searchPlaceholder')}
              className={`w-full min-w-[320px] ${language === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-4 border border-slate-200 rounded-3xl bg-white text-sm font-bold outline-none transition-all shadow-sm focus:ring-4 focus:ring-indigo-500/5`}
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          {canManage && (
            <button 
              onClick={onAddClick}
              className="bg-indigo-600 text-white px-10 py-4 rounded-3xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
            >
              + {t('enroll')}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-32 flex flex-col justify-center items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('syncing')}</p>
          </div>
        ) : filtered.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                    <th className="px-10 py-6 text-start">Identifier</th>
                    <th className="px-10 py-6 text-start">{t('members')}</th>
                    <th className="px-10 py-6 text-start">{t('documentHealth')}</th>
                    <th className="px-10 py-6 text-start">{t('careerPlacement')}</th>
                    <th className="px-10 py-6 text-start">{t('registryStatus')}</th>
                    <th className="px-10 py-6 text-end"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedData.map((emp) => {
                    const health = getComplianceStatus(emp);
                    const isManager = /manager|head|director|ceo|lead/i.test(emp.position);
                    const isCEO = emp.position.toLowerCase().includes('ceo');

                    return (
                      <tr key={emp.id} className={`hover:bg-slate-50/50 transition-colors group ${isManager ? 'bg-indigo-50/20' : ''}`}>
                        <td className="px-10 py-8">
                           <div className="relative inline-block">
                              <div className={`w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center text-lg font-black border border-slate-200 overflow-hidden shadow-inner ring-4 ring-white group-hover:ring-indigo-100 transition-all ${isManager ? 'ring-indigo-100' : ''}`}>
                                 {emp.faceToken ? (
                                   <img src={emp.faceToken} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                 ) : (
                                   <span className="opacity-30">{emp.name[0]}</span>
                                 )}
                               </div>
                               {isManager && (
                                 <div className={`absolute -top-1 -right-1 w-5 h-5 ${isCEO ? 'bg-amber-500' : 'bg-indigo-600'} text-white rounded-full flex items-center justify-center text-[10px] shadow-lg border-2 border-white`}>
                                    {isCEO ? '👑' : '★'}
                                 </div>
                               )}
                           </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="text-start">
                            <p className="text-lg font-black text-slate-900 leading-tight">
                               {language === 'ar' && emp.nameArabic ? emp.nameArabic : emp.name}
                            </p>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                              {emp.nationality === 'Kuwaiti' ? '🇰🇼 Kuwaiti National' : `🌍 Expat • ${emp.nationality}`}
                            </p>
                          </div>
                        </td>
                        <td className="px-10 py-8 text-start">
                           <div className={`inline-flex items-center gap-2 px-4 py-1.5 ${health.color} rounded-xl border border-transparent shadow-sm`}>
                              <span className={`text-[10px] font-black uppercase tracking-wider ${health.text}`}>{health.label}</span>
                           </div>
                        </td>
                        <td className="px-10 py-8 text-start">
                           <p className="text-sm font-black text-slate-800 leading-tight">
                              {language === 'ar' && emp.positionArabic ? emp.positionArabic : emp.position}
                           </p>
                           <p className="text-[11px] text-indigo-600 font-extrabold uppercase mt-1 tracking-wider">
                              {language === 'ar' && emp.departmentArabic ? emp.departmentArabic : emp.department}
                           </p>
                        </td>
                        <td className="px-10 py-8 text-start">
                          {canManage ? (
                            <div className="relative inline-block w-full max-w-[140px]">
                              <select
                                disabled={updatingId === emp.id}
                                value={emp.status}
                                onChange={(e) => handleStatusChange(emp.id, e.target.value as Employee['status'])}
                                className="w-full appearance-none text-[11px] font-black uppercase tracking-widest rounded-xl px-4 py-2 bg-slate-50 border border-slate-200 outline-none hover:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all disabled:opacity-50"
                              >
                                <option value="Active">{t('active')}</option>
                                <option value="On Leave">{t('onleave')}</option>
                                <option value="Terminated">{t('terminated')}</option>
                              </select>
                              <div className={`pointer-events-none absolute inset-y-0 ${language === 'ar' ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center text-slate-400 text-[10px]`}>
                                ▼
                              </div>
                            </div>
                          ) : (
                            <span className={`text-[11px] font-black uppercase tracking-[0.1em] ${emp.status === 'Active' ? 'text-indigo-600' : 'text-slate-400'}`}>
                              {t(emp.status.toLowerCase().replace(' ', '')) || emp.status}
                            </span>
                          )}
                        </td>
                        <td className="px-10 py-8 text-end">
                           {canManage && (
                             <button 
                               onClick={() => onEditClick?.(emp)}
                               className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95"
                             >
                               <span className="text-xl">⚙️</span>
                             </button>
                           )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="p-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
              <div className="flex items-center gap-8">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {filtered.length.toLocaleString(language === 'ar' ? 'ar-KW' : 'en-KW')} {t('orgRegistry')}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">View:</span>
                  <select 
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-black outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  >
                    <option value={5}>05</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all disabled:opacity-30 active:scale-95 shadow-sm"
                >
                  Prev
                </button>
                <div className="flex items-center px-6 text-[11px] font-black text-slate-900 bg-white border border-slate-200 rounded-xl shadow-inner">
                  {currentPage.toLocaleString(language === 'ar' ? 'ar-KW' : 'en-KW')} <span className="mx-2 opacity-30">/</span> {totalPages.toLocaleString(language === 'ar' ? 'ar-KW' : 'en-KW')}
                </div>
                <button 
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all disabled:opacity-30 active:scale-95 shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-40 text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-4xl grayscale opacity-20">👥</div>
            <div>
              <h4 className="text-sm font-black text-slate-300 uppercase tracking-[0.3em]">{t('noRecords')}</h4>
              <p className="text-xs text-slate-400 font-medium mt-2">Adjust your filters or try a different search term.</p>
            </div>
            <button onClick={() => setFilter('')} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest underline underline-offset-4">Clear All Filters</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDirectory;
