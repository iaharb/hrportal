
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService.ts';
import { Employee } from '../types.ts';
import { translations } from '../translations.ts';
import { useNotifications } from './NotificationSystem.tsx';
import { useTranslation } from 'react-i18next';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'ar';
  onSuccess: () => void;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ isOpen, onClose, language, onSuccess }) => {
  const { t } = useTranslation();
  const { notify } = useNotifications();
  const [loading, setLoading] = useState(false);
  const localeT = translations[language];

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
      notify(t('warning'), t('actionRequired'), "warning");
      return;
    }

    setLoading(true);
    try {
      await dbService.addEmployee(formData);
      notify(t('success'), t('officialRecord'), "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      notify(t('critical'), t('unknown'), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="bg-white rounded-[48px] w-full max-w-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
        
        <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('addMember')}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{t('officialRecord')}</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-xl font-bold">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-12">
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="text-xl">👤</span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{t('personalIdentity')}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t('nameEn')}</label>
                <input required className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t('nameAr')}</label>
                <input required dir="rtl" className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-right" value={formData.nameArabic} onChange={e => setFormData({...formData, nameArabic: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t('civilIdNumber')}</label>
                <input required maxLength={12} className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold" value={formData.civilId} onChange={e => setFormData({...formData, civilId: e.target.value.replace(/\D/g, '')})} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t('nationality')}</label>
                <select className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold" value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value as any})}>
                  <option value="Kuwaiti">{t('kuwaiti')}</option>
                  <option value="Expat">{t('expat')}</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="text-xl">💼</span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{t('careerPlacement')}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t('dept')}</label>
                <select className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t('roleEn')}</label>
                <input required className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t('joinDate')}</label>
                <input type="date" required className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold" value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t('workingDaysWeek')}</label>
                <select className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold" value={formData.workDaysPerWeek} onChange={e => setFormData({...formData, workDaysPerWeek: parseInt(e.target.value)})}>
                  <option value={5}>{language === 'ar' ? '٥ أيام (جمعة/سبت عطلة)' : '5 Days (Fri/Sat Weekend)'}</option>
                  <option value={6}>{language === 'ar' ? '٦ أيام (جمعة فقط عطلة)' : '6 Days (Friday Weekend Only)'}</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="text-xl">💰</span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{t('financialConfig')}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t('salary')} ({t('currency')})</label>
                <input type="number" required className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold" value={formData.salary} onChange={e => setFormData({...formData, salary: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t('ibanNumber')}</label>
                <input placeholder="KW..." className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold" value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value.toUpperCase()})} />
              </div>
            </div>
          </section>

          <div className="flex gap-4 pt-10 border-t border-slate-50 sticky bottom-0 bg-white pb-2">
            <button type="button" onClick={onClose} className="flex-1 px-8 py-5 rounded-[24px] border border-slate-200 font-black text-[11px] uppercase text-slate-400 transition-all">{t('discard')}</button>
            <button type="submit" disabled={loading} className="flex-[2] px-8 py-5 rounded-[24px] font-black text-[11px] uppercase text-white bg-slate-900 shadow-2xl active:scale-95 transition-all">
              {loading ? '...' : t('enroll')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
