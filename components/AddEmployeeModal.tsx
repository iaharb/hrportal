
import React, { useState } from 'react';
import { dbService } from '../services/dbService.ts';
import { isSupabaseConfigured } from '../services/supabaseClient.ts';
import { Employee } from '../types.ts';

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
    civilId: '',
    department: 'IT',
    position: '',
    joinDate: new Date().toISOString().split('T')[0],
    salary: 1500,
    status: 'Active',
    trainingHours: 0,
    workDaysPerWeek: 6,
    civilIdExpiry: '',
    passportNumber: '',
    passportExpiry: '',
    iznAmalExpiry: '',
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
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="bg-white rounded-[48px] w-full max-w-2xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 max-h-[95vh] flex flex-col">
        <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Hire National Talent</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Register a new member to the corporate registry.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto">
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Section 1: Legal Identity</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Full Name (As per Passport)</label>
                <input required type="text" className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-700" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Abdullah Al-Saleh" />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Nationality</label>
                <select className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-slate-700" value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value as 'Kuwaiti' | 'Expat'})}>
                  <option value="Kuwaiti">🇰🇼 Kuwaiti National</option>
                  <option value="Expat">🌍 Expat Workforce</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Civil ID Number</label>
                <input required type="text" className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-700" value={formData.civilId} onChange={e => setFormData({...formData, civilId: e.target.value})} placeholder="2XXXXXXXXXXX" />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Civil ID Expiry</label>
                <input required type="date" className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-700 text-xs" value={formData.civilIdExpiry} onChange={e => setFormData({...formData, civilIdExpiry: e.target.value})} />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Work Permit (Izn Amal) Expiry</label>
                <input type="date" className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-700 text-xs" value={formData.iznAmalExpiry} onChange={e => setFormData({...formData, iznAmalExpiry: e.target.value})} />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Section 2: Employment Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Department</label>
                <select className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                  <option value="IT">IT</option>
                  <option value="HR">HR</option>
                  <option value="Sales">Sales</option>
                  <option value="Operations">Operations</option>
                  <option value="Executive">Executive</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Role / Position</label>
                <input required type="text" className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} placeholder="e.g. Finance Head" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Basic Monthly Salary (KWD)</label>
                <input required type="number" className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-700" value={formData.salary} onChange={e => setFormData({...formData, salary: parseFloat(e.target.value)})} placeholder="1500" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Working Days Per Week</label>
                <select className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700" value={formData.workDaysPerWeek} onChange={e => setFormData({...formData, workDaysPerWeek: parseInt(e.target.value)})}>
                  <option value={5}>5 Days (Standard)</option>
                  <option value={6}>6 Days (Extended)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-8 bg-slate-900 rounded-[32px] text-white">
            <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-6">Initial Leave Quota</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Annual</label>
                <input type="number" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-bold text-white" value={formData.leaveBalances.annual} onChange={e => updateBalance('annual', e.target.value)} />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Sick</label>
                <input type="number" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm font-bold text-white" value={formData.leaveBalances.sick} onChange={e => updateBalance('sick', e.target.value)} />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Emergency</label>
                <input type="number" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm font-bold text-white" value={formData.leaveBalances.emergency} onChange={e => updateBalance('emergency', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-8 py-5 rounded-[24px] border border-slate-200 font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors">Discard</button>
            <button type="submit" disabled={loading} className={`flex-1 px-8 py-5 rounded-[24px] font-black text-[11px] uppercase tracking-widest text-white transition-all disabled:opacity-50 ${isSupabaseConfigured ? 'bg-slate-900 hover:bg-black shadow-2xl shadow-slate-900/20 active:scale-95' : 'bg-slate-300 cursor-not-allowed'}`}>
              {loading ? 'Registering...' : 'Commit to Registry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
