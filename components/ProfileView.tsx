
import React, { useState, useEffect, useRef } from 'react';
import { User, Employee, LeaveRequest, PayrollItem, PayrollRun } from '../types.ts';
import { dbService as hrmDb } from '../services/dbService.ts';
import { useTranslation } from 'react-i18next';
import { useNotifications } from './NotificationSystem.tsx';

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
              <h2 className="text-2xl font-black text-slate-900 font-sans tracking-tighter">ENTERPRISE HR WORKFORCE</h2>
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
  const { notify } = useNotifications();
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [latestPayslip, setLatestPayslip] = useState<{item: PayrollItem, run: PayrollRun} | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState(t('toWhom'));
  
  // Biometric Enrollment State
  const [enrolling, setEnrolling] = useState(false);
  const [enrollProgress, setEnrollProgress] = useState(0);
  const enrollVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const watchdogRef = useRef<number | null>(null);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const [emp, payslip] = await Promise.all([
        hrmDb.getEmployeeByName(user.name),
        hrmDb.getLatestFinalizedPayroll(user.id)
      ]);
      if (emp) setEmployeeData(emp);
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

  const handleEnrollFace = async () => {
    if (enrolling) return;
    
    setEnrolling(true);
    setEnrollProgress(0);
    
    let activeStream: MediaStream | null = null;
    
    watchdogRef.current = window.setTimeout(() => {
      if (enrolling) {
        setEnrolling(false);
        if (activeStream) activeStream.getTracks().forEach(t => t.stop());
        notify(t('critical'), t('latencyMessage'), "error");
      }
    }, 10000);
    
    try {
      activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (enrollVideoRef.current) {
        enrollVideoRef.current.srcObject = activeStream;
      }

      let progress = 0;
      const intervalId = window.setInterval(async () => {
        progress += 10;
        setEnrollProgress(progress);
        
        if (progress >= 100) {
          window.clearInterval(intervalId);
          if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
          await finalizeEnrollment(activeStream!);
        }
      }, 300);

    } catch (err) {
      if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
      notify(t('critical'), t('biometricHandshake'), "error");
      setEnrolling(false);
      if (activeStream) activeStream.getTracks().forEach(t => t.stop());
    }
  };

  const finalizeEnrollment = async (stream: MediaStream) => {
    try {
      if (enrollVideoRef.current && canvasRef.current && enrollVideoRef.current.readyState >= 2) {
        const ctx = canvasRef.current.getContext('2d');
        canvasRef.current.width = enrollVideoRef.current.videoWidth;
        canvasRef.current.height = enrollVideoRef.current.videoHeight;
        ctx?.drawImage(enrollVideoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
        
        if (employeeData) {
          await hrmDb.updateEmployee(employeeData.id, { faceToken: dataUrl });
          notify(t('verified'), t('officialRecord'), "success");
          await fetchProfileData();
        }
      } else {
        throw new Error("Video stream was not ready for snapshot.");
      }
    } catch (err: any) {
      notify(t('critical'), err.message || "Failed to commit biometric record.", "error");
    } finally {
      stream.getTracks().forEach(t => t.stop());
      setEnrolling(false);
    }
  };

  const locale = i18n.language === 'ar' ? 'ar-KW' : 'en-KW';

  if (loading) return <div className="p-10 animate-pulse bg-white rounded-[32px] h-96"></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <header className="flex flex-col md:flex-row items-start md:items-end gap-6 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 end-0 p-10 opacity-5 pointer-events-none">
           <span className="text-[200px] leading-none select-none">🇰🇼</span>
        </div>
        
        <div className="w-28 h-28 rounded-[40px] bg-slate-900 border-4 border-slate-800 flex items-center justify-center text-5xl text-white shadow-2xl relative z-10 overflow-hidden">
          {employeeData?.faceToken ? (
            <img src={employeeData.faceToken} className="w-full h-full object-cover grayscale brightness-110" />
          ) : (
            user.name.split(' ').map(n => n[0]).join('')
          )}
        </div>
        <div className="mb-2 relative z-10 flex-1">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">{i18n.language === 'ar' ? (employeeData as any)?.nameArabic || user.name : user.name}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-lg tracking-widest border border-emerald-100">{user.role}</span>
            <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg tracking-widest border ${employeeData?.faceToken ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
               {employeeData?.faceToken ? `🧬 ${t('biometricallyLinked')}` : `🚫 ${t('faceNotEnrolled')}`}
            </span>
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
         <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900 p-10 rounded-[40px] text-white flex flex-col justify-center items-center text-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 opacity-90"></div>
               <div className="relative z-10">
                 <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4">{t('latestSalarySlip')}</p>
                 <h3 className="text-5xl font-black mb-2">{latestPayslip ? latestPayslip.item.net_salary.toLocaleString(locale) : '0'} <span className="text-xl">{t('currency')}</span></h3>
               </div>
            </div>

            <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
               <div className="flex items-center justify-between mb-8 border-b pb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('identityEnrollment')}</h3>
                    <p className="text-xs text-slate-500 font-medium">{t('verifyFaceSignature')}</p>
                  </div>
                  {employeeData?.faceToken && (
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">✓</div>
                  )}
               </div>

               <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="relative">
                    <div className="w-48 h-48 rounded-[40px] bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center group relative shadow-inner">
                       {enrolling ? (
                         <video ref={enrollVideoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale" />
                       ) : employeeData?.faceToken ? (
                         <img src={employeeData.faceToken} className="w-full h-full object-cover grayscale" />
                       ) : (
                         <span className="text-4xl opacity-20">🤳</span>
                       )}
                       
                       {enrolling && (
                         <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center p-6">
                            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden border border-white/10">
                               <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${enrollProgress}%` }}></div>
                            </div>
                         </div>
                       )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-6">
                     <p className="text-sm text-slate-600 leading-relaxed font-medium">
                       {i18n.language === 'ar' 
                         ? 'لتمكين تسجيل الحضور من المواقع البعيدة، نحتاج لمسح صورة مرجعية بيومترية. يتم تشفير هذه البيانات واستخدامها فقط للتحقق من القرب المكاني المعتمد من القوى العاملة.'
                         : 'To authorize your attendance from remote sites, we require a master biometric image. This data is encrypted and used only for PAM-mandated proximity verification.'}
                     </p>
                     <button 
                       onClick={handleEnrollFace}
                       disabled={enrolling}
                       className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all hover:bg-black disabled:opacity-50"
                     >
                       {enrolling ? t('scanningGeometry') : (employeeData?.faceToken ? t('updateFaceRecord') : t('registerNewSignature'))}
                     </button>
                  </div>
               </div>
            </div>
         </div>
         
         <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-4 tracking-tight">{t('selfService')}</h3>
                <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
                  {i18n.language === 'ar' 
                    ? 'قم بإنشاء شهادات راتب مختومة فوراً لطلبات القروض البنكية (الوطني / بيتك).'
                    : 'Instantly generate stamped salary certificates for bank loan applications (NBK/KFH).'}
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                      {i18n.language === 'ar' ? 'جهة الإصدار' : 'Issuance Entity'}
                    </label>
                    <select 
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/10"
                    >
                      <option>{t('toWhom')}</option>
                      <option>National Bank of Kuwait (NBK)</option>
                      <option>Kuwait Finance House (KFH)</option>
                      <option>Boubyan Bank</option>
                      <option>Gulf Bank</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => setShowCertModal(true)}
                    className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/10 active:scale-95 transition-all hover:bg-emerald-700"
                  >
                    {t('generateCert')}
                  </button>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  {i18n.language === 'ar' ? 'إحصائيات الوثائق الرسمية' : 'Official Document Stats'}
                </h4>
                <div className="space-y-3">
                   <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500">{i18n.language === 'ar' ? 'حالة البطاقة المدنية' : 'Civil ID Status'}</span>
                      <span className="text-[10px] font-black text-emerald-600 uppercase">{t('secure')}</span>
                   </div>
                   <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500">{i18n.language === 'ar' ? 'ملف التأمينات (PIFSS)' : 'PIFSS Filing'}</span>
                      <span className="text-[10px] font-black text-emerald-600 uppercase">{t('verified')}</span>
                   </div>
                </div>
              </div>
            </div>
         </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

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
