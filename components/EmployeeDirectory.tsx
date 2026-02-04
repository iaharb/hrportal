
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService.ts';
import { Employee, User } from '../types.ts';

interface EmployeeDirectoryProps {
  user: User;
  onAddClick?: () => void;
}

const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({ user, onAddClick }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let data = await dbService.getEmployees();
      
      // Filter by department if manager
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
  }, [user]);

  const handleStatusChange = async (employeeId: string, newStatus: Employee['status']) => {
    setUpdatingId(employeeId);
    try {
      await dbService.updateEmployeeStatus(employeeId, newStatus);
      // Update local state for immediate feedback
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId ? { ...emp, status: newStatus } : emp
      ));
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
      // Re-fetch to ensure sync if update failed
      await fetchEmployees();
    } finally {
      setUpdatingId(null);
    }
  };

  const calculateDaysRemaining = (expiryDate?: string) => {
    if (!expiryDate) return Infinity;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getComplianceStatus = (emp: Employee) => {
    const dates = [emp.civilIdExpiry, emp.passportExpiry, emp.iznAmalExpiry].filter(Boolean);
    if (dates.length === 0) return { label: 'Unknown', color: 'bg-slate-200', icon: '⚪' };
    
    const minDays = Math.min(...dates.map(d => calculateDaysRemaining(d)));
    
    if (minDays < 0) return { label: 'Expired', color: 'bg-rose-500', icon: '🔴' };
    if (minDays <= 30) return { label: 'Critical', color: 'bg-orange-500', icon: '🟠' };
    if (minDays <= 60) return { label: 'Warning', color: 'bg-amber-400', icon: '🟡' };
    return { label: 'Compliant', color: 'bg-emerald-500', icon: '🟢' };
  };
  
  const filtered = employees.filter(e => 
    e.name.toLowerCase().includes(filter.toLowerCase()) ||
    e.position.toLowerCase().includes(filter.toLowerCase())
  );

  const canManage = user.role === 'Admin' || user.role === 'Manager';

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {user.role === 'Manager' ? `${user.department} Workforce` : 'Global Employee Directory'}
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            {user.role === 'Manager' ? `Operational oversight for your departmental staff.` : `Managing company-wide records for ${employees.length} members.`}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors">🔍</span>
            <input 
              type="text" 
              placeholder="Search by name or role..."
              className="pl-12 pr-6 py-4 border border-slate-200 rounded-[20px] bg-white w-full md:w-80 focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 text-sm placeholder:text-slate-300 shadow-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          {canManage && onAddClick && (
            <button 
              onClick={onAddClick}
              className="bg-slate-900 text-white px-8 py-4 rounded-[20px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-900/10 group"
            >
              <span className="text-lg font-light group-hover:scale-125 transition-transform">+</span> 
              New Hire
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-32 flex flex-col justify-center items-center gap-4">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Registry...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Workforce Member</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Compliance Health</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Position & Level</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporting Manager</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">System Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((emp) => {
                  const health = getComplianceStatus(emp);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-black text-sm border border-slate-200">
                            {emp.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{emp.name}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter flex items-center gap-1.5">
                              {emp.nationality === 'Kuwaiti' ? '🇰🇼 Kuwaiti National' : '🌍 Expat Workforce'}
                              <span className="opacity-30">•</span>
                              {emp.department}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${health.color} shadow-sm shadow-${health.color.split('-')[1]}-500/20 animate-pulse`}></div>
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{health.label}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-slate-600">{emp.position}</td>
                      <td className="px-8 py-6 text-sm text-slate-400 font-medium italic">
                        {emp.managerName || 'Direct to CEO'}
                      </td>
                      <td className="px-8 py-6">
                        {updatingId === emp.id ? (
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                            Syncing...
                          </div>
                        ) : canManage ? (
                          <select
                            value={emp.status}
                            onChange={(e) => handleStatusChange(emp.id, e.target.value as Employee['status'])}
                            className={`text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2 outline-none border transition-all cursor-pointer shadow-sm ${
                              emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' :
                              emp.status === 'On Leave' ? 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100' :
                              'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                            }`}
                          >
                            <option value="Active">Active</option>
                            <option value="On Leave">On Leave</option>
                            <option value="Terminated">Terminated</option>
                          </select>
                        ) : (
                          <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${emp.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                            {emp.status}
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
          <div className="p-32 text-center">
            <span className="text-6xl mb-6 block grayscale opacity-20">🔎</span>
            <h4 className="text-lg font-black text-slate-300 uppercase tracking-widest">No matching records found</h4>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDirectory;
