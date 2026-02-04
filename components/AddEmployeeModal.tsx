
import React, { useState } from 'react';
import { dbService } from '../services/dbService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { Employee } from '../types';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>({
    name: '',
    nationality: 'Kuwaiti',
    department: 'IT',
    position: '',
    joinDate: new Date().toISOString().split('T')[0],
    salary: 1500,
    status: 'Active',
    leaveBalances: { 
      annual: 30, 
      sick: 15, 
      emergency: 6,
      annualUsed: 0,
      sickUsed: 0,
      emergencyUsed: 0
    }
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      alert("Database not connected. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables to enable data persistence.");
      return;
    }
    setLoading(true);
    try {
      await dbService.addEmployee(formData);
      onSuccess();
      onClose();
    } catch (err) {
      alert("Error adding employee. Ensure your Supabase tables match the required schema.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateBalance = (type: 'annual' | 'sick' | 'emergency', value: string) => {
    setFormData({
      ...formData,
      leaveBalances: {
        ...formData.leaveBalances,
        [type]: parseInt(value) || 0
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-400/20 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl shadow-slate-900/10 relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 max-h-[90vh] flex flex-col">
        <div className="p-8 border-b border-slate-50 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">Add New Workforce Member</h2>
          <p className="text-sm text-slate-500">Register a national or expat employee with custom allocations.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
          {/* Primary Details Section */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4">Primary Details</h3>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
              <input 
                required
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Abdullah Al-Saleh"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nationality</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={formData.nationality}
                  onChange={e => setFormData({...formData, nationality: e.target.value as 'Kuwaiti' | 'Expat'})}
                >
                  <option value="Kuwaiti">🇰🇼 Kuwaiti</option>
                  <option value="Expat">🌍 Expat</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={formData.department}
                  onChange={e => setFormData({...formData, department: e.target.value})}
                >
                  <option value="IT">IT</option>
                  <option value="HR">HR</option>
                  <option value="Sales">Sales</option>
                  <option value="Operations">Operations</option>
                  <option value="Executive">Executive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Position</label>
                <input 
                  required
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={formData.position}
                  onChange={e => setFormData({...formData, position: e.target.value})}
                  placeholder="e.g. Senior Analyst"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Join Date</label>
                <input 
                  required
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={formData.joinDate}
                  onChange={e => setFormData({...formData, joinDate: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Monthly Salary (KWD)</label>
              <input 
                required
                type="number"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={formData.salary}
                onChange={e => setFormData({...formData, salary: parseFloat(e.target.value)})}
                placeholder="1500"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Leave Balances Section */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">Initial Leave Allocations</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Annual</label>
                <input 
                  type="number"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-bold"
                  value={formData.leaveBalances.annual}
                  onChange={e => updateBalance('annual', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Sick</label>
                <input 
                  type="number"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm font-bold"
                  value={formData.leaveBalances.sick}
                  onChange={e => updateBalance('sick', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Emergency</label>
                <input 
                  type="number"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm font-bold"
                  value={formData.leaveBalances.emergency}
                  onChange={e => updateBalance('emergency', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className={`flex-1 px-6 py-4 rounded-2xl font-bold text-white transition-all disabled:opacity-50 ${
                isSupabaseConfigured ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20' : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              {loading ? 'Processing...' : 'Complete Hire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
