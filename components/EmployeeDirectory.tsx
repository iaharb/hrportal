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
  
  const filtered = employees.filter(e => 
    e.name.toLowerCase().includes(filter.toLowerCase()) ||
    e.position.toLowerCase().includes(filter.toLowerCase())
  );

  const canManage = user.role === 'Admin' || user.role === 'Manager';

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {user.role === 'Manager' ? `${user.department} Team Directory` : 'Employee Directory'}
          </h2>
          <p className="text-slate-500">
            {user.role === 'Manager' ? `Viewing all employees reporting within your department.` : `Viewing all ${employees.length} company records.`}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search by name or role..."
              className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white w-full md:w-80 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          {canManage && onAddClick && (
            <button 
              onClick={onAddClick}
              className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all active:scale-95"
            >
              <span className="text-lg">+</span> Add Employee
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 flex justify-center items-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nationality</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Manager</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          {emp.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{emp.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">{emp.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                        emp.nationality === 'Kuwaiti' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {emp.nationality === 'Kuwaiti' && <span className="mr-1">🇰🇼</span>}
                        {emp.nationality}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{emp.position}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 italic">
                      {emp.managerName || 'None'}
                    </td>
                    <td className="px-6 py-4">
                      {updatingId === emp.id ? (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                          <div className="w-3 h-3 border border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                          Updating...
                        </div>
                      ) : canManage ? (
                        <select
                          value={emp.status}
                          onChange={(e) => handleStatusChange(emp.id, e.target.value as Employee['status'])}
                          className={`text-[10px] font-bold rounded-lg px-2.5 py-1.5 outline-none border transition-all cursor-pointer ${
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
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${emp.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                          {emp.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center text-slate-400">
            <p className="text-4xl mb-4">📂</p>
            <p>No records found in this department.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDirectory;