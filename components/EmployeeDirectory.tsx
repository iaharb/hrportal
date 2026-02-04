import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Employee, User } from '../types';

interface EmployeeDirectoryProps {
  user: User;
  onAddClick?: () => void;
}

const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({ user, onAddClick }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        let data = await dbService.getEmployees();
        if (user.role === 'Manager' && user.department) {
          data = data.filter(e => e.department === user.department);
        }
        setEmployees(data);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user]);

  const filtered = employees.filter(e => 
    e.name.toLowerCase().includes(filter.toLowerCase()) ||
    e.position.toLowerCase().includes(filter.toLowerCase()) ||
    e.department.toLowerCase().includes(filter.toLowerCase())
  );

  const SkeletonCard = () => (
    <div className="bento-card min-h-[220px] flex flex-col justify-between">
      <div className="flex justify-between">
        <div className="w-16 h-16 skeleton rounded-2xl"></div>
        <div className="w-20 h-6 skeleton rounded-full"></div>
      </div>
      <div className="space-y-3">
        <div className="w-3/4 h-6 skeleton"></div>
        <div className="w-1/2 h-4 skeleton"></div>
      </div>
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100/50">
        <div className="w-24 h-4 skeleton"></div>
        <div className="w-16 h-4 skeleton"></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-3">Talent Management System</nav>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Directory</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500">🔍</span>
            <input 
              type="text" 
              placeholder="Search talent, roles, departments..."
              className="bg-white border-0 shadow-sm rounded-2xl pl-12 pr-6 py-4 w-full md:w-80 outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-medium"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          {onAddClick && (
            <button onClick={onAddClick} className="bg-emerald-600 text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95">
              Hire Talent
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((emp) => (
            <div key={emp.id} className="bento-card group flex flex-col h-full bg-white">
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-xl font-black text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 group-hover:rotate-6">
                   {emp.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                  emp.nationality === 'Kuwaiti' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'
                }`}>
                  {emp.nationality === 'Kuwaiti' ? '🇰🇼 Kuwaiti' : 'Expat'}
                </div>
              </div>
              
              <div className="flex-1">
                <h4 className="text-xl font-black text-slate-900 mb-0.5">{emp.name}</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">{emp.position}</p>
                
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black bg-slate-50 px-3 py-1.5 rounded-lg text-slate-500 uppercase tracking-widest">
                     {emp.department}
                   </span>
                   {emp.status === 'Active' ? (
                     <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                       Active
                     </span>
                   ) : (
                     <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase">
                       On Leave
                     </span>
                   )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                 <div className="text-[9px] text-slate-300 font-black uppercase tracking-[0.2em]">
                   Since {new Date(emp.joinDate).getFullYear()}
                 </div>
                 <button className="text-[10px] font-black text-emerald-600 group-hover:translate-x-1 transition-transform uppercase tracking-widest">
                   Profile →
                 </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-20 text-center glass rounded-3xl">
          <p className="text-4xl mb-4 opacity-20">📂</p>
          <p className="text-slate-400 font-black uppercase tracking-widest">No workforce records match your search</p>
        </div>
      )}
    </div>
  );
};

export default EmployeeDirectory;