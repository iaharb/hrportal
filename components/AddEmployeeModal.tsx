
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService.ts';
import { Employee } from '../types.ts';
import { translations } from '../translations.ts';
import { useNotifications } from './NotificationSystem.tsx';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'ar';
  onSuccess: () => void;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ isOpen, onClose, language, onSuccess }) => {
  const { notify } = useNotifications();
  const [loading, setLoading] = useState(false);
  const t = translations[language];

  const [departments, setDepartments] = useState<string[]>([]);
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>({
    name: '',
    nameArabic: '',
    nationality: 'Kuwaiti',
    civilId: '',
    department: 'IT',
    position: '',
    positionArabic: '',
    joinDate: new Date().toISOString().split('T')[0],
    salary: 1500,
    status: 'Active',
    trainingHours: 0,
    workDaysPerWeek: 6,
    civilIdExpiry: '',
    passportNumber: '',
    passportExpiry: '',
    iznAmalExpiry: '',
    leaveBalances: { annual: 30, sick: 15, emergency: 6, annualUsed: 0, sickUsed: 0, emergencyUsed: 0 },
    iban: '',
    bankCode: 'NBK'
  });

  useEffect(() => {
    const loadDepts = async () => {
      const d = await dbService.getDepartments();
      setDepartments(d);
    };
    if (isOpen) loadDepts();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.civilId) {
      notify("Missing Data", "Name and Civil ID are mandatory for registry entry.", "warning");
      return;
    }

    setLoading(true);
    try {
      await dbService.addEmployee(formData);
      notify("Registry Updated", `${formData.name} has been enrolled successfully.`, "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("[ADD_EMPLOYEE_MODAL] Error:", err);
      notify("Sync Failure", err.message || "Failed to commit record to database.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="bg-white rounded-[48px] w-full max-w-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Modal Header */}
        <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t.addMember}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Official Workforce Enrollment</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors text-slate-400 font-bold text-xl"
          >
            ×
          </button>
        </div>
        
        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-12">
          
          {/* Section 1: Personal Identity */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="text-xl">👤</span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Personal Identity</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t.nameEn}</label>
                <input 
                  required 
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t.nameAr}</label>
                <input 
                  required 
                  dir="rtl" 
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 text-right focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all" 
                  value={formData.nameArabic} 
                  onChange={e => setFormData({...formData, nameArabic: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Civil ID Number</label>
                <input 
                  required 
                  maxLength={12}
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all" 
                  value={formData.civilId} 
                  onChange={e => setFormData({...formData, civilId: e.target.value.replace(/\D/g, '')})} 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t.nationality}</label>
                <select 
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none" 
                  value={formData.nationality} 
                  onChange={e => setFormData({...formData, nationality: e.target.value as any})}
                >
                  <option value="Kuwaiti">{t.kuwaiti}</option>
                  <option value="Expat">{t.expat}</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 2: Career Placement */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="text-xl">💼</span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Career & Placement</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t.dept}</label>
                <select 
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none"
                  value={formData.department}
                  onChange={e => setFormData({...formData, department: e.target.value})}
                >
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t.roleEn}</label>
                <input 
                  required 
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 focus:ring-4 focus:ring-emerald-500/5 outline-none" 
                  value={formData.position} 
                  onChange={e => setFormData({...formData, position: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Join Date</label>
                <input 
                  type="date"
                  required 
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none" 
                  value={formData.joinDate} 
                  onChange={e => setFormData({...formData, joinDate: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Working Days / Week</label>
                <select 
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none"
                  value={formData.workDaysPerWeek}
                  onChange={e => setFormData({...formData, workDaysPerWeek: parseInt(e.target.value)})}
                >
                  <option value={5}>5 Days (Fri/Sat Weekend)</option>
                  <option value={6}>6 Days (Friday Weekend Only)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 3: Financial Config */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="text-xl">💰</span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Financial Config</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t.salary} (KWD)</label>
                <input 
                  type="number" 
                  required
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none" 
                  value={formData.salary} 
                  onChange={e => setFormData({...formData, salary: parseInt(e.target.value) || 0})} 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">IBAN Number</label>
                <input 
                  placeholder="KW..."
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none" 
                  value={formData.iban} 
                  onChange={e => setFormData({...formData, iban: e.target.value.toUpperCase()})} 
                />
              </div>
            </div>
          </section>

          {/* Form Footer / Submit */}
          <div className="flex gap-4 pt-10 border-t border-slate-50 sticky bottom-0 bg-white pb-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-8 py-5 rounded-[24px] border border-slate-200 font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
            >
              {t.discard}
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-[2] px-8 py-5 rounded-[24px] font-black text-[11px] uppercase tracking-widest text-white bg-slate-900 shadow-2xl shadow-slate-900/20 hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Commit to Registry <span className="text-lg">→</span></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
