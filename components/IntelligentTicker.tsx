
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService.ts';
import { Announcement } from '../types.ts';
import { useTranslation } from 'react-i18next';

const IntelligentTicker: React.FC = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const fetchAnnouncements = async () => {
    try {
      const data = await dbService.getAnnouncements();
      setAnnouncements(data);
    } catch (e) {
      console.error("Failed to fetch announcements", e);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    // Refresh feed every minute
    const interval = setInterval(fetchAnnouncements, 60000);
    return () => clearInterval(interval);
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div className="relative h-11 bg-indigo-600/5 rounded-2xl border border-indigo-600/10 overflow-hidden flex items-center mb-8 shrink-0 shadow-sm" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className={`absolute ${language === 'ar' ? 'right-0' : 'left-0'} top-0 bottom-0 px-4 bg-indigo-600 text-white flex items-center z-10 font-bold text-[10px] uppercase tracking-wider shadow-lg`}>
         {t('registryIntelligence')}
      </div>
      <div className="flex-1 overflow-hidden whitespace-nowrap">
        <div className={`inline-block animate-ticker-pro ${language === 'ar' ? 'pr-[100%]' : 'pl-[100%]'}`}>
           {announcements.map((ann) => {
             const title = language === 'ar' && ann.titleArabic ? ann.titleArabic : ann.title;
             const content = language === 'ar' && ann.contentArabic ? ann.contentArabic : ann.content;
             return (
               <span key={ann.id} className="inline-flex items-center gap-4 mx-16 text-xs font-semibold text-slate-600">
                 <span className={`w-1.5 h-1.5 rounded-full ${ann.priority === 'Urgent' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)] animate-pulse' : 'bg-indigo-400'}`}></span>
                 <span className="text-slate-900 font-bold">{title}</span>
                 <span className="opacity-40">|</span>
                 <span>{content}</span>
               </span>
             );
           })}
        </div>
      </div>
    </div>
  );
};

export default IntelligentTicker;
