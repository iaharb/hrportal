
import React, { useState } from 'react';
import { User } from '../types.ts';
import { useLocationValidation } from '../hooks/useLocationValidation.ts';
import { dbService } from '../services/dbService.ts';
import { useNotifications } from '../components/NotificationSystem.tsx';
import { translations } from '../translations.ts';

const MobileAttendance: React.FC<{ user: User, language: 'en' | 'ar' }> = ({ user, language }) => {
  const { notify } = useNotifications();
  const { isValid, closestZone, distance, error, revalidate } = useLocationValidation();
  const [clocking, setClocking] = useState(false);
  const [activeShift, setActiveShift] = useState(!!localStorage.getItem('shift_start'));
  const t = translations[language];

  const handleClockAction = async () => {
    if (!isValid) {
      notify(t.unauthorizedZone, language === 'ar' ? "يجب أن تكون ضمن نطاق ٢٥٠ متر من المكتب." : "You must be within 250m of the office.", "error");
      return;
    }

    setClocking(true);
    await new Promise(r => setTimeout(r, 1500));

    if (!activeShift) {
      const now = new Date();
      localStorage.setItem('shift_start', Date.now().toString());
      await dbService.logAttendance({
        employeeId: user.id,
        employeeName: user.name,
        date: now.toISOString().split('T')[0],
        clockIn: now.toLocaleTimeString(),
        location: closestZone?.name || 'Mobile Site',
        status: 'On-Site',
        coordinates: { lat: 0, lng: 0 }
      });
      setActiveShift(true);
      notify(language === 'ar' ? 'تم تسجيل الدخول' : "Logged In", t.biometricHandshake, "success");
    } else {
      localStorage.removeItem('shift_start');
      await dbService.clockOutAttendance(user.id, new Date().toLocaleTimeString());
      setActiveShift(false);
      notify(language === 'ar' ? 'تم تسجيل الانصراف' : "Logged Out", t.finishSession, "info");
    }
    setClocking(false);
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] space-y-12">
      <div className="text-center">
        <div className={`w-64 h-64 rounded-full border-4 flex items-center justify-center transition-all ${
          activeShift ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white shadow-xl'
        }`}>
          <button 
            disabled={clocking}
            onClick={handleClockAction}
            className={`w-52 h-52 rounded-full flex flex-col items-center justify-center gap-4 transition-all active:scale-90 shadow-2xl ${
              activeShift ? 'bg-emerald-600 shadow-emerald-500/30' : 'bg-slate-900 shadow-slate-900/40'
            }`}
          >
            {clocking ? (
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span className="text-5xl">{activeShift ? '✋' : '👆'}</span>
                <span className="text-white font-black text-xs uppercase tracking-[0.3em]">
                  {activeShift ? t.stopShift : t.startShift}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="w-full space-y-6">
        <div className={`p-6 rounded-[32px] border ${isValid ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
           <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.siteValidation}</p>
              <button onClick={revalidate} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t.refreshGps}</button>
           </div>
           <div className="flex items-center gap-4">
              <span className="text-2xl">{isValid ? '📍' : '🚫'}</span>
              <div>
                 <p className="text-sm font-black text-slate-900">{closestZone?.name || t.outsidePerimeter}</p>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                   {distance ? `${Math.round(distance)}${language === 'ar' ? ' متر' : 'm'} ${language === 'ar' ? 'بعيداً' : 'away'}` : t.calculating}
                 </p>
              </div>
           </div>
        </div>
        
        <p className="text-center text-[9px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
          {t.biometricHandshake} <br/> {language === 'ar' ? 'مطلوب حسب لوائح هيئة القوى العاملة.' : 'By PAM labor regulations.'}
        </p>
      </div>
    </div>
  );
};

export default MobileAttendance;
