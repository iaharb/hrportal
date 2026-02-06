
import React, { useState, useEffect, useMemo } from 'react';
import { User, Employee, LeaveRequest, PayrollItem, PayrollRun } from '../types.ts';
import { dbService as hrmDb } from '../services/dbService.ts';
import { useTranslation } from 'react-i18next';

interface ProfileViewProps {
  user: User;
}

const SalaryCertificateModal: React.FC<{ 
  employee: Employee; 
  item?: PayrollItem; 
  onClose: () => void;
  bankName: string;
  language: string;
}> = ({ employee, item, onClose, bankName, language }) => {
  const { t } = useTranslation();
  const locale = language === 'ar' ? 'ar-KW' : 'en-KW';
  const today = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
  
  const basicSalary = item ? item.basic_salary : (employee.salary || 0);
  const allowances = item ? item.allowances : 0;
  const deductions = item ? (item.pifss_deduction + item.deductions) : (employee.nationality === 'Kuwaiti' ? basicSalary * 0.115 : 0);
  const netSalary = basicSalary + allowances - deductions;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh] flex flex-col">
        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('salaryCertPreview')}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">×</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-12 bg-white font-serif">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-12">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 font-sans tracking-tighter">QUBUS WORKFORCE</h2>
              <p className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest">Kuwait City, State of Kuwait</p>
            </div>
            <div className="text-right">
               <span className="text-4xl">🇰🇼</span>
            </div>
          </div>

          <div className="space-y-8 text-slate-800 leading-relaxed">
            <p className="text-right font-sans font-bold text-sm">Date: {today}</p>
            <div className="space-y-1">
              <p className="font-bold">To: {bankName || t('toWhom')}</p>
            </div>

            <h3 className="text-center text-xl font-bold underline underline-offset-8 uppercase font-sans py-4">
              {t('salaryCert')}
            </h3>

            <p className="text-sm">
              This is to certify that <strong>{language === 'ar' ? employee.nameArabic || employee.name : employee.name}</strong>, a <strong>{t(employee.nationality.toLowerCase())}</strong> national...
            </p>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-3 font-sans">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{t('salary')}</span>
                <span className="font-black text-slate-900">{basicSalary.toLocaleString(locale)} {t('currency')}</span>
              </div>
              <div className="flex justify-between text-lg pt-4 border-t-2 border-slate-900">
                <span className="text-slate-900 font-black uppercase tracking-widest text-[11px]">{t('netTransfer')}</span>
                <span className="font-black text-slate-900">{netSalary.toLocaleString(locale)} {t('currency')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-900 text-white flex gap-4">
           <button onClick={onClose} className="flex-1 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
             {t('discard')}
           </button>
           <button onClick={() => window.print()} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20">
             {t('downloadCert')}
           </button>
        </div>
      </div>
    </div>
  );
};

const ProfileView: React.FC<ProfileViewProps> = ({ user }) => {
  const { t, i18n } = useTranslation();
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [latestPayslip, setLatestPayslip] = useState<{item: PayrollItem, run: PayrollRun} | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState(t('toWhom'));

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const [emp, leaves, payslip] = await Promise.all([
        hrmDb.getEmployeeByName(user.name),
        hrmDb.getLeaveRequests({ employeeId: user.id }),
        hrmDb.getLatestFinalizedPayroll(user.id)
      ]);
      if (emp) setEmployeeData(emp);
      setLeaveHistory(leaves);
      setLatestPayslip(payslip);
    } catch (err) {
      console.error("Error fetching profile data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const locale = i18n.language === 'ar' ? 'ar-KW' : 'en-KW';

  if (loading) return <div className="p-10 animate-pulse bg-white rounded-[32px] h-96"></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row items-start md:items-end gap-6 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 end-0 p-10 opacity-5 pointer-events-none">
           <span className="text-[200px] leading-none select-none">🇰🇼</span>
        </div>
        
        <div className="w-28 h-28 rounded-[40px] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-5xl text-white shadow-2xl relative z-10">
          {user.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="mb-2 relative z-10 flex-1">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">{i18n.language === 'ar' ? (employeeData as any)?.nameArabic || user.name : user.name}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-lg tracking-widest border border-emerald-100">{user.role}</span>
          </div>
        </div>

        <div className="relative z-10 flex gap-4">
           <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-200">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">{t('joinedSince')}</p>
              <p className="text-lg font-black text-slate-900">{new Date(employeeData?.joinDate || '').getFullYear()}</p>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2">
            <div className="bg-slate-900 p-10 rounded-[40px] text-white flex flex-col justify-center items-center text-center">
               <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4">{t('latestSalarySlip')}</p>
               <h3 className="text-5xl font-black mb-2">{latestPayslip ? latestPayslip.item.net_salary.toLocaleString(locale) : '0'} <span className="text-xl">{t('currency')}</span></h3>
            </div>
         </div>
         
         <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 mb-4">{t('selfService')}</h3>
              <select 
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none mb-4"
              >
                <option>{t('toWhom')}</option>
                <option>NBK</option>
                <option>KFH</option>
              </select>
              <button 
                onClick={() => setShowCertModal(true)}
                className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em]"
              >
                {t('generateCert')}
              </button>
            </div>
         </div>
      </div>

      {showCertModal && employeeData && (
        <SalaryCertificateModal 
          employee={employeeData} 
          item={latestPayslip?.item} 
          bankName={selectedBank}
          language={i18n.language}
          onClose={() => setShowCertModal(false)}
        />
      )}
    </div>
  );
};

export default ProfileView;
