
import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/dbService.ts';
import { useNotifications } from './NotificationSystem.tsx';
import { useTranslation } from 'react-i18next';
import { supabase } from '../services/supabaseClient.ts';
import { HardwareConfig, AttendanceRecord, OfficeLocation, Announcement, PublicHoliday, DepartmentMetric } from '../types.ts';
import { GoogleGenAI } from "@google/genai";

type TableName = 'employees' | 'leave_requests' | 'payroll_runs' | 'public_holidays' | 'office_locations' | 'department_metrics';

const TABLE_TEMPLATES: Record<TableName, any> = {
  employees: { id: '', name: '', name_arabic: '', nationality: 'Kuwaiti', civil_id: '', department: 'IT', position: '', salary: 1500, status: 'Active', face_token: '', device_user_id: '' },
  office_locations: { id: '', name: '', name_arabic: '', lat: 29.3759, lng: 47.9774, radius: 250 },
  department_metrics: { name: '', name_arabic: '', kuwaiti_count: 0, expat_count: 0, target_ratio: 30 },
  public_holidays: { id: '', name: '', name_arabic: '', date: '', type: 'National', is_fixed: true },
  leave_requests: { id: '', employee_name: '', department: '', type: 'Annual', start_date: '', end_date: '', days: 0, duration_hours: 0, status: 'Pending' },
  payroll_runs: { period_key: '', cycle_type: 'Monthly', status: 'Draft', total_disbursement: 0 }
};

const AdminCenter: React.FC = () => {
  const { notify, confirm } = useNotifications();
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const isAr = language === 'ar';
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'Integrity' | 'Registry' | 'Configuration' | 'Worksheet' | 'Connectors' | 'Terminal' | 'Intelligence' | 'MasterData'>('Integrity');
  
  const [selectedTable, setSelectedTable] = useState<TableName>('employees');
  const [tableData, setTableData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [connectionReport, setConnectionReport] = useState<any>(null);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

  const [hwConfig, setHwConfig] = useState<HardwareConfig | null>(null);
  const [syncingHw, setSyncingHw] = useState(false);
  const [reconstructing, setReconstructing] = useState(false);

  const [terminalSql, setTerminalSql] = useState('-- Registry Terminal\n-- Enter SQL to execute via run_sql()\n\n');

  const [worksheetLogs, setWorksheetLogs] = useState<any[]>([]);
  const [wsFilter, setWsFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    query: ''
  });

  // Master Data Hub State
  const [officeNodes, setOfficeNodes] = useState<OfficeLocation[]>([]);
  const [editingNode, setEditingNode] = useState<Partial<OfficeLocation> | null>(null);
  const [allowanceRegistry, setAllowanceRegistry] = useState<{en: string, ar: string, isHousing: boolean}[]>([]);
  const [globalPolicies, setGlobalPolicies] = useState({ maxPermissionHours: 8, fractionalDayBasis: 8 });
  const [holidayRegistry, setHolidayRegistry] = useState<PublicHoliday[]>([]);
  const [deptMetrics, setDeptMetrics] = useState<DepartmentMetric[]>([]);

  const [editingHoliday, setEditingHoliday] = useState<Partial<PublicHoliday> | null>(null);
  const [editingDept, setEditingDept] = useState<Partial<DepartmentMetric> | null>(null);

  // Intelligence State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnn, setNewAnn] = useState({ title: '', titleArabic: '', content: '', contentArabic: '', priority: 'Normal' as 'Normal' | 'Urgent' });

  const months = isAr 
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const toCamel = (str: string) => str.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''));

  const fetchTableData = async (tableName: TableName) => {
    setLoading(true);
    setCurrentPage(1);
    try {
      let data: any[] = [];
      switch (tableName) {
        case 'employees': data = await dbService.getEmployees(); break;
        case 'leave_requests': data = await dbService.getLeaveRequests(); break;
        case 'payroll_runs': data = await dbService.getPayrollRuns(); break;
        case 'public_holidays': data = await dbService.getPublicHolidays(); break;
        case 'office_locations': data = await dbService.getOfficeLocations(); break;
        case 'department_metrics': data = await dbService.getDepartmentMetrics(); break;
      }
      setTableData(data);
    } catch (err) {
      notify(t('fetchFailed'), t('latencyMessage'), "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchHwConfig = async () => {
    const config = await dbService.getHardwareConfig();
    setHwConfig(config);
  };

  const fetchWorksheetData = async () => {
    setLoading(true);
    try {
      const logs = await dbService.getAttendanceWorksheet(wsFilter.year, wsFilter.month);
      setWorksheetLogs(logs);
    } catch (err) {
      notify("Sync Failed", "Could not synthesize worksheet data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterHub = async () => {
    setLoading(true);
    const [nodes, policies, allowances, holidays, metrics] = await Promise.all([
      dbService.getOfficeLocations(),
      dbService.getGlobalPolicies(),
      dbService.getMasterAllowances(),
      dbService.getPublicHolidays(),
      dbService.getDepartmentMetrics()
    ]);
    setOfficeNodes(nodes);
    setGlobalPolicies(policies);
    setAllowanceRegistry(allowances);
    setHolidayRegistry(holidays);
    setDeptMetrics(metrics);
    setLoading(false);
  };

  const fetchIntelligence = async () => {
    setLoading(true);
    try {
      const data = await dbService.getAnnouncements();
      setAnnouncements(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Registry') {
      fetchTableData(selectedTable);
    } else if (activeTab === 'Connectors') {
      fetchHwConfig();
    } else if (activeTab === 'Worksheet') {
      fetchWorksheetData();
    } else if (activeTab === 'Configuration' || activeTab === 'MasterData') {
      fetchMasterHub();
    } else if (activeTab === 'Intelligence') {
      fetchIntelligence();
    }
  }, [activeTab, selectedTable, wsFilter.month, wsFilter.year]);

  const checkConnection = async () => {
    setLoading(true);
    const report = await dbService.testConnection();
    setConnectionReport(report);
    if (report.latency !== undefined) {
      setLatencyHistory(prev => [...prev.slice(-9), report.latency!]);
    }
    setLoading(false);
  };

  const handleRunMigration = async () => {
    confirm({
      title: isAr ? "إصلاح مخطط السجل؟" : "Repair Registry Schema?",
      message: isAr 
        ? "سيقوم هذا بإضافة الأعمدة المفقودة (جدول الإعلانات، حقول اللغة العربية، إلخ) إلى سجلك المباشر."
        : "This will attempt to add missing columns (announcements table, arabic fields, etc) to your live registry.",
      confirmText: isAr ? "تنفيذ الإصلاح" : "Execute Migration",
      onConfirm: async () => {
        setLoading(true);
        try {
          if (!supabase) throw new Error("Supabase not connected");
          const sql = `
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_token TEXT;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS device_user_id TEXT;
            ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS duration_hours NUMERIC;
            ALTER TABLE attendance ADD COLUMN IF NOT EXISTS source TEXT;
            ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_id TEXT;
            CREATE TABLE IF NOT EXISTS office_locations (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name TEXT NOT NULL,
                name_arabic TEXT,
                lat NUMERIC NOT NULL,
                lng NUMERIC NOT NULL,
                radius INTEGER DEFAULT 250,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
            ALTER TABLE office_locations ADD COLUMN IF NOT EXISTS name_arabic TEXT;
            CREATE TABLE IF NOT EXISTS public_holidays (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name TEXT NOT NULL,
                name_arabic TEXT,
                date DATE NOT NULL,
                type TEXT,
                is_fixed BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
            ALTER TABLE public_holidays ADD COLUMN IF NOT EXISTS name_arabic TEXT;
            CREATE TABLE IF NOT EXISTS department_metrics (
                name TEXT PRIMARY KEY,
                name_arabic TEXT,
                kuwaiti_count INTEGER DEFAULT 0,
                expat_count INTEGER DEFAULT 0,
                target_ratio NUMERIC DEFAULT 30,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
            ALTER TABLE department_metrics ADD COLUMN IF NOT EXISTS name_arabic TEXT;
            CREATE TABLE IF NOT EXISTS announcements (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              title TEXT NOT NULL,
              title_arabic TEXT,
              content TEXT NOT NULL,
              content_arabic TEXT,
              priority TEXT DEFAULT 'Normal',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
            ALTER TABLE announcements ADD COLUMN IF NOT EXISTS title_arabic TEXT;
            ALTER TABLE announcements ADD COLUMN IF NOT EXISTS content_arabic TEXT;
          `;
          const { error } = await supabase.rpc('run_sql', { sql_query: sql });
          if (error) throw error;
          notify(t('success'), isAr ? "تم إصلاح مخطط السجل لجميع الميزات." : "Registry schema patched for all features.", "success");
        } catch (err: any) {
          notify(isAr ? "فشل الإصلاح" : "Migration Failed", err.message || "Unknown RPC error.", "error");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleExecuteTerminalSql = async () => {
    if (!terminalSql.trim()) return;
    setLoading(true);
    try {
      if (!supabase) throw new Error("Supabase not connected");
      const { error } = await supabase.rpc('run_sql', { sql_query: terminalSql });
      if (error) throw error;
      notify(isAr ? "نجاح الاستعلام" : "Query Success", isAr ? "تم تنفيذ أمر SQL على السجل المباشر." : "The SQL command was executed on the live registry.", "success");
    } catch (err: any) {
      notify(isAr ? "خطأ في تنفيذ SQL" : "SQL Execution Error", err.message || "Check your syntax or permissions.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoTranslate = async () => {
    if (!newAnn.title && !newAnn.content) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Translate the following HR announcement from English to professional Arabic:
      Title: ${newAnn.title}
      Content: ${newAnn.content}
      Return a JSON object with keys "titleArabic" and "contentArabic". Use corporate Kuwaiti terminology.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      const result = JSON.parse(response.text || '{}');
      setNewAnn(prev => ({
        ...prev,
        titleArabic: result.titleArabic || prev.titleArabic,
        contentArabic: result.contentArabic || prev.contentArabic
      }));
      notify(isAr ? "الترجمة جاهزة" : "Translation Ready", isAr ? "تم ملء الحقول العربية بواسطة الذكاء الاصطناعي." : "Arabic fields populated by AI.", "success");
    } catch (err) {
      notify(isAr ? "فشلت الترجمة" : "Translation Failed", isAr ? "تعذر على خدمة الذكاء الاصطناعي معالجة الطلب." : "AI service was unable to process the request.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnn.title || !newAnn.content) return;
    setLoading(true);
    try {
      await dbService.createAnnouncement(newAnn);
      setNewAnn({ title: '', titleArabic: '', content: '', contentArabic: '', priority: 'Normal' });
      await fetchIntelligence();
      notify(isAr ? "تم تحديث الشريط" : "Feed Updated", isAr ? "تمت إضافة إدخال جديد إلى شريط المعلومات." : "New entry added to the intelligence feed.", "success");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    confirm({
      title: isAr ? "إزالة الإدخال؟" : "Remove Feed Entry?",
      message: isAr ? "سيتم حذف هذا العنصر من جميع لوحات التحكم." : "This item will be removed from all dashboard tickers.",
      onConfirm: async () => {
        setLoading(true);
        try {
          await dbService.deleteAnnouncement(id);
          await fetchIntelligence();
          notify(isAr ? "تم الحذف" : "Deleted", isAr ? "تمت إزالة العنصر من السجل." : "Item removed from registry.", "info");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleSyncHardware = async () => {
    setSyncingHw(true);
    try {
      const result = await dbService.syncHardwareAttendance();
      notify(isAr ? "اكتملت مزامنة الأجهزة" : "Hardware Sync Complete", isAr ? `تم استيراد ${result.synced} سجلات بنجاح. الأخطاء: ${result.errors}` : `Successfully imported ${result.synced} logs. Errors: ${result.errors}`, result.errors > 0 ? "warning" : "success");
      fetchHwConfig();
      if (activeTab === 'Worksheet') fetchWorksheetData();
    } catch (err) {
      notify(isAr ? "فشلت المزامنة" : "Sync Failed", isAr ? "تعذر الوصول إلى نقطة نهاية الجهاز." : "Hardware endpoint unreachable.", "error");
    } finally {
      setSyncingHw(false);
    }
  };

  const handleReconstructHistory = async () => {
    setReconstructing(true);
    try {
      const result = await dbService.generateHistoricalAttendance();
      notify(isAr ? "اكتملت إعادة البناء" : "Reconstruction Complete", isAr ? `تم حقن ${result.generated} سجلات يومية من ١ يناير ٢٠٢٥ حتى تاريخه.` : `Injected ${result.generated} daily records from Jan 1st, 2025 to-date.`, result.generated === 0 ? "info" : "success");
      if (activeTab === 'Worksheet') fetchWorksheetData();
    } catch (err: any) {
      notify(isAr ? "فشل حقن البيانات" : "Historical Injection Failed", err.message || "Audit trail rejected simulated logs.", "error");
    } finally {
      setReconstructing(false);
    }
  };

  const handleSaveHwConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hwConfig) {
      await dbService.saveHardwareConfig(hwConfig);
      notify(isAr ? "تم حفظ الإعدادات" : "Config Saved", isAr ? "تم تحديث إعدادات الموصل." : "Connector settings updated.", "success");
    }
  };

  const handleSaveNode = async () => {
    if (!editingNode) return;
    try {
      if (editingNode.id) {
        await dbService.updateOfficeLocation(editingNode.id, editingNode);
      } else {
        await dbService.addOfficeLocation(editingNode as Omit<OfficeLocation, 'id'>);
      }
      notify(t('success'), isAr ? "تم حفظ الموقع." : "Location saved.", 'success');
      setEditingNode(null);
      fetchMasterHub();
    } catch (err) {
      notify(t('critical'), isAr ? "فشل حفظ الموقع." : "Failed to save node.", 'error');
    }
  };

  const handleSaveHoliday = async () => {
    if (!editingHoliday) return;
    try {
      await dbService.addPublicHoliday(editingHoliday as PublicHoliday);
      notify(t('success'), isAr ? "تم تسجيل العطلة." : "Holiday committed.", 'success');
      setEditingHoliday(null);
      fetchMasterHub();
    } catch (err) {
      notify(t('critical'), isAr ? "فشل حفظ العطلة." : "Failed to save holiday.", 'error');
    }
  };

  const handleSaveDept = async () => {
    if (!editingDept) return;
    try {
      await dbService.addDepartmentMetric(editingDept as DepartmentMetric);
      notify(t('success'), isAr ? "تم تحديث سجل الأقسام." : "Department registry updated.", 'success');
      setEditingDept(null);
      fetchMasterHub();
    } catch (err) {
      notify(t('critical'), isAr ? "فشل حفظ القسم." : "Failed to save department.", 'error');
    }
  };

  const handleDeleteNode = async (id: string) => {
    confirm({
      title: isAr ? "إزالة الموقع؟" : "Remove Node?",
      message: isAr ? "سيتم إيقاف التحقق الجغرافي لهذا الموقع فوراً." : "Geofencing for this location will be immediately disabled.",
      onConfirm: async () => {
        await dbService.deleteOfficeLocation(id);
        notify(t('success'), isAr ? "تمت إزالة الموقع." : "Node removed.", 'success');
        fetchMasterHub();
      }
    });
  };

  const handleDeleteHoliday = async (id: string) => {
    confirm({
      title: isAr ? "إزالة العطلة؟" : "Remove Holiday?",
      message: isAr ? "لن يتم استبعاد هذا التاريخ من حسابات الإجازات." : "This date will no longer be excluded from leave calculations.",
      onConfirm: async () => {
        await dbService.deletePublicHoliday(id);
        notify(t('success'), isAr ? "تمت إزالة العطلة." : "Holiday removed.", 'success');
        fetchMasterHub();
      }
    });
  };

  const handleDeleteDept = async (name: string) => {
    confirm({
      title: isAr ? "إزالة سجل القسم؟" : "Remove Department Registry?",
      message: isAr ? "سيتم حذف مستهدفات التوطين الخاصة بهذا القسم." : "This will remove the department's Kuwaitization tracking metrics.",
      onConfirm: async () => {
        await dbService.deleteDepartmentMetric(name);
        notify(t('success'), isAr ? "تم حذف القسم." : "Department removed.", 'success');
        fetchMasterHub();
      }
    });
  };

  const handleUpdatePolicy = async () => {
    await dbService.updateGlobalPolicies(globalPolicies);
    notify(t('success'), isAr ? "تم تحديث محرك السياسات." : "Global policies committed to registry engine.", "success");
  };

  const filteredData = useMemo(() => {
    if (!searchQuery) return tableData;
    const q = searchQuery.toLowerCase();
    return tableData.filter(row => 
      Object.values(row).some(val => String(val).toLowerCase().includes(q))
    );
  }, [tableData, searchQuery]);

  const filteredWsLogs = useMemo(() => {
    return worksheetLogs.filter(log => {
      return !wsFilter.query || 
        log.employeeName.toLowerCase().includes(wsFilter.query.toLowerCase()) || 
        log.status.toLowerCase().includes(wsFilter.query.toLowerCase());
    });
  }, [worksheetLogs, wsFilter.query]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeFormKeys = useMemo(() => {
    return Object.keys(TABLE_TEMPLATES[selectedTable]);
  }, [selectedTable]);

  const getStatusStyle = (status: string, sub?: string) => {
    if (sub === 'Resumption Pending') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    switch (status) {
      case 'On-Site': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'On Leave': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Rest Day': return 'bg-slate-100 text-slate-400 border-slate-200';
      case 'Weekend': return 'bg-slate-50 text-slate-300 border-slate-100';
      case 'Absent': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Holiday': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const SectionHeading = ({ icon, title, subtitle }: any) => (
    <div className="mb-8">
      <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
         <span className="p-2 bg-slate-100 rounded-xl text-slate-600 text-sm">{icon}</span>
         {title}
      </h3>
      <p className="text-xs text-slate-500 font-medium mt-1">{subtitle}</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header Panel */}
      <div className="bg-slate-900 rounded-[56px] p-12 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
           <span className="text-[200px]">🛡️</span>
        </div>
        <div className="relative z-10 text-start">
          <h2 className="text-4xl font-black mb-4 tracking-tighter">
            {isAr ? 'مركز تحكم سجلات المؤسسة' : 'Enterprise Registry Forge'}
          </h2>
          <p className="text-slate-400 max-w-xl font-medium leading-relaxed">
            {isAr 
              ? 'إدارة بيانات القوى العاملة، ثوابت النظام، موصلات الأجهزة، وذكاء لوحة التحكم.'
              : 'Manage workforce data, system constants, hardware connectors, and dashboard intelligence.'}
          </p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-[32px] border border-slate-200 shadow-sm self-start inline-flex">
        {[
          { id: 'Integrity', label: isAr ? 'صحة النظام' : 'System Health' },
          { id: 'Registry', label: isAr ? 'مستكشف البيانات' : 'Data Explorer' },
          { id: 'MasterData', label: isAr ? 'مركز البيانات الرئيسية' : 'Master Data Hub' },
          { id: 'Intelligence', label: isAr ? 'شريط المعلومات' : 'Intelligence Feed' },
          { id: 'Worksheet', label: isAr ? 'كشف الحضور' : 'Attendance Worksheet' },
          { id: 'Connectors', label: isAr ? 'مزامنة الأجهزة' : 'Hardware Sync' },
          { id: 'Terminal', label: isAr ? 'طرفية SQL' : 'SQL Terminal' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {activeTab === 'Integrity' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4">
            <div className="lg:col-span-1 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-between text-start">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">{isAr ? 'رابط السجل' : 'Registry Link'}</h3>
                <p className="text-xs text-slate-500 font-medium mb-8">{isAr ? 'فحص صحة اتصال Supabase المباشر.' : 'Real-time Supabase health check.'}</p>
                {connectionReport && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${connectionReport.success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {connectionReport.success ? '⚡' : '❌'}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-widest">
                          {connectionReport.success ? (isAr ? 'النظام متصل' : 'System Online') : (isAr ? 'تعطل النظام' : 'System Degraded')}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold">{connectionReport.message}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                 <button onClick={checkConnection} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black active:scale-95 transition-all">
                   {isAr ? 'تشغيل التشخيص' : 'Run Diagnostics'}
                 </button>
                 <button onClick={handleRunMigration} className="w-full py-4 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 active:scale-95 transition-all">
                   {isAr ? 'إصلاح المخطط' : 'Repair Schema'}
                 </button>
                 <button onClick={() => dbService.seedDatabase().then(() => fetchTableData(selectedTable))} className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all">
                   {isAr ? 'تهيئة الافتراضيات' : 'Provision Defaults'}
                 </button>
              </div>
            </div>
            
            <div className="lg:col-span-1 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm text-start">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">{isAr ? 'صحة الخدمات' : 'Service Health'}</h3>
               <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isAr ? 'نقطة نهاية ESS للهاتف' : 'Mobile ESS Endpoint'}</span>
                     <span className="text-[10px] font-black text-emerald-600 uppercase">{isAr ? 'يعمل' : 'Operational'}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isAr ? 'محرك تصدير WPS' : 'WPS Export Engine'}</span>
                     <span className="text-[10px] font-black text-emerald-600 uppercase">{isAr ? 'استعداد' : 'Standby'}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isAr ? 'ذكاء الذكاء الاصطناعي' : 'AI Intelligence'}</span>
                     <span className="text-[10px] font-black text-indigo-600 uppercase">{isAr ? 'نشط' : 'Active'}</span>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-1 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm text-start">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{isAr ? 'قياس التأخير' : 'Latency Telemetry'}</h3>
                <div className="h-32 flex items-end gap-2 px-4">
                  {latencyHistory.map((ping, i) => (
                    <div 
                      key={i} 
                      className={`flex-1 rounded-t-lg transition-all duration-500 ${ping > 1000 ? 'bg-rose-500' : (ping > 500 ? 'bg-amber-400' : 'bg-emerald-500')}`}
                      style={{ height: `${Math.min(100, (ping / 3000) * 100)}%` }}
                    ></div>
                  ))}
                  {latencyHistory.length === 0 && <div className="w-full text-center text-slate-300 italic text-xs py-10">{isAr ? 'في انتظار الاتصال...' : 'Waiting for ping...'}</div>}
                </div>
            </div>
          </div>
        )}

        {activeTab === 'Registry' && (
          <div className="space-y-8 animate-in fade-in duration-500 text-start">
             <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex flex-col gap-4">
                   <div className="flex gap-4 items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[80px]">{isAr ? 'القوى العاملة:' : 'Workforce:'}</span>
                      <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                        {['employees', 'leave_requests', 'payroll_runs'].map(tbl => (
                          <button 
                            key={tbl}
                            onClick={() => { setSelectedTable(tbl as TableName); setCurrentPage(1); }}
                            className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                              selectedTable === tbl ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            {tbl.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="flex items-center gap-4">
                   <input 
                     type="text" 
                     placeholder={isAr ? 'تصفية السجل...' : 'Filter registry...'}
                     value={searchQuery}
                     onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                     className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none w-64 focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                   />
                </div>
             </div>

             <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-start">
                     <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                           {activeFormKeys.slice(0, 8).map(key => (
                             <th key={key} className="px-8 py-6">{key.replace('_', ' ')}</th>
                           ))}
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {loading ? (
                          <tr><td colSpan={9} className="p-24 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest">{isAr ? 'جاري مسح السجل...' : 'Scanning Registry...'}</td></tr>
                        ) : paginatedData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30 transition-colors group">
                             {activeFormKeys.slice(0, 8).map(key => {
                               const camelKey = toCamel(key);
                               const val = row[key] !== undefined ? row[key] : row[camelKey];
                               return (
                                 <td key={key} className="px-8 py-6 text-xs font-bold text-slate-700">
                                   {val !== null && typeof val === 'object' ? '{...}' : (val !== undefined ? String(val) : '---')}
                                 </td>
                               );
                             })}
                          </tr>
                        ))}
                     </tbody>
                  </table>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'MasterData' && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 text-start">
              {/* Department Registry */}
              <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                 <div className="flex items-center justify-between">
                    <SectionHeading icon="🏢" title={isAr ? 'الأقسام والمستهدفات' : 'Departments & Targets'} subtitle={isAr ? 'إدارة الهيكل التنظيمي وحصص التوطين.' : 'Manage organizational hierarchy and Kuwaitization quotas.'} />
                    <button onClick={() => setEditingDept({ name: '', nameArabic: '', targetRatio: 30 })} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase">{isAr ? 'إضافة قسم' : 'Add Dept'}</button>
                 </div>

                 {editingDept && (
                   <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase">{isAr ? 'الاسم (EN)' : 'Name (EN)'}</label>
                            <input className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none" value={editingDept.name} onChange={e => setEditingDept({...editingDept, name: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase">{isAr ? 'الاسم (AR)' : 'Name (AR)'}</label>
                            <input className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none" dir="rtl" value={editingDept.nameArabic} onChange={e => setEditingDept({...editingDept, nameArabic: e.target.value})} />
                         </div>
                         <div className="col-span-2 space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase">{isAr ? 'نسبة التوطين المستهدفة %' : 'Target Kuwaitization %'}</label>
                            <input type="range" min="0" max="100" className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500" value={editingDept.targetRatio} onChange={e => setEditingDept({...editingDept, targetRatio: parseInt(e.target.value)})} />
                            <p className="text-end font-black text-xs text-indigo-400">{editingDept.targetRatio}%</p>
                         </div>
                      </div>
                      <button onClick={handleSaveDept} className="w-full py-3 bg-emerald-600 rounded-xl font-black text-[9px] uppercase tracking-widest">{isAr ? 'تأكيد القسم' : 'Commit Department'}</button>
                   </div>
                 )}

                 <div className="space-y-3">
                    {deptMetrics.map(dept => (
                       <div key={dept.name} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group">
                          <div>
                             <p className="text-sm font-black text-slate-900">{isAr ? dept.nameArabic || dept.name : dept.name}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{isAr ? dept.name : dept.nameArabic} • {dept.targetRatio}% {isAr ? 'مستهدف' : 'Target'}</p>
                          </div>
                          <button onClick={() => handleDeleteDept(dept.name)} className="opacity-0 group-hover:opacity-100 transition-all text-rose-500 text-xs font-black uppercase">{isAr ? 'إزالة' : 'Remove'}</button>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Public Holiday Registry */}
              <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                 <div className="flex items-center justify-between">
                    <SectionHeading icon="📅" title={isAr ? 'العطلات الرسمية' : 'Public Holidays'} subtitle={isAr ? 'منطق الاستبعاد الآلي لمحركات الرواتب والإجازات.' : 'Automatic exclusion logic for payroll and leave engines.'} />
                    <button onClick={() => setEditingHoliday({ name: '', nameArabic: '', date: new Date().toISOString().split('T')[0], type: 'National', isFixed: true })} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase">{isAr ? 'إضافة عطلة' : 'Add Holiday'}</button>
                 </div>

                 {editingHoliday && (
                   <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase">{isAr ? 'العنوان (EN)' : 'Title (EN)'}</label>
                            <input className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none" value={editingHoliday.name} onChange={e => setEditingHoliday({...editingHoliday, name: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase">{isAr ? 'العنوان (AR)' : 'Title (AR)'}</label>
                            <input className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none" dir="rtl" value={editingHoliday.nameArabic} onChange={e => setEditingHoliday({...editingHoliday, nameArabic: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase">{isAr ? 'تاريخ الفعالية' : 'Event Date'}</label>
                            <input type="date" className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none" value={editingHoliday.date} onChange={e => setEditingHoliday({...editingHoliday, date: e.target.value})} />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase">{isAr ? 'نوع المنطق' : 'Logic Type'}</label>
                            <select className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none" value={editingHoliday.type} onChange={e => setEditingHoliday({...editingHoliday, type: e.target.value as any})}>
                               <option value="National">{isAr ? 'وطنية' : 'National'}</option>
                               <option value="Religious">{isAr ? 'دينية' : 'Religious'}</option>
                            </select>
                         </div>
                      </div>
                      <button onClick={handleSaveHoliday} className="w-full py-3 bg-indigo-600 rounded-xl font-black text-[9px] uppercase tracking-widest">{isAr ? 'تأكيد العطلة' : 'Commit Holiday'}</button>
                   </div>
                 )}

                 <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {holidayRegistry.map(h => (
                       <div key={h.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group">
                          <div>
                             <p className="text-xs font-black text-slate-900">{isAr ? h.nameArabic || h.name : h.name}</p>
                             <p className="text-[10px] font-bold text-indigo-600 uppercase mt-0.5">{h.date} • {isAr ? h.name : h.nameArabic}</p>
                          </div>
                          <button onClick={() => handleDeleteHoliday(h.id)} className="opacity-0 group-hover:opacity-100 transition-all text-rose-500 text-xs font-black uppercase">{isAr ? 'حذف' : 'Delete'}</button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'Intelligence' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 text-start">
             <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{isAr ? 'تحديث شريط المعلومات' : 'Update Intelligence Feed'}</h3>
                  <button 
                    type="button"
                    disabled={loading || !newAnn.title || !newAnn.content}
                    onClick={handleAutoTranslate}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <span className="text-sm">✨</span> {isAr ? 'ترجمة آلية' : 'Auto-Translate'}
                  </button>
                </div>
                <form onSubmit={handleCreateAnnouncement} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{isAr ? 'العنوان (إنجليزي)' : 'Title (English)'}</label>
                         <input 
                           required
                           className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                           value={newAnn.title}
                           onChange={e => setNewAnn({...newAnn, title: e.target.value})}
                           placeholder="e.g. System Notice"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{isAr ? 'العنوان (عربي)' : 'Title (Arabic)'}</label>
                         <input 
                           dir="rtl"
                           className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-start"
                           value={newAnn.titleArabic}
                           onChange={e => setNewAnn({...newAnn, titleArabic: e.target.value})}
                           placeholder="مثال: تنبيه تقني"
                         />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{isAr ? 'المحتوى (إنجليزي)' : 'Content (English)'}</label>
                      <textarea 
                        required
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm outline-none h-24 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        value={newAnn.content}
                        onChange={e => setNewAnn({...newAnn, content: e.target.value})}
                        placeholder="Type the message in English..."
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">{isAr ? 'المحتوى (عربي)' : 'Content (Arabic)'}</label>
                      <textarea 
                        dir="rtl"
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm outline-none h-24 focus:ring-4 focus:ring-indigo-500/5 transition-all text-start"
                        value={newAnn.contentArabic}
                        onChange={e => setNewAnn({...newAnn, contentArabic: e.target.value})}
                        placeholder="اكتب الرسالة باللغة العربية..."
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{isAr ? 'مستوى الأولوية' : 'Priority Level'}</label>
                      <div className="flex gap-4">
                        <button type="button" onClick={() => setNewAnn({...newAnn, priority: 'Normal'})} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${newAnn.priority === 'Normal' ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>{isAr ? 'عادي' : 'Normal'}</button>
                        <button type="button" onClick={() => setNewAnn({...newAnn, priority: 'Urgent'})} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${newAnn.priority === 'Urgent' ? 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>{isAr ? 'عاجل' : 'Urgent'}</button>
                      </div>
                   </div>
                   <button type="submit" disabled={loading} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl shadow-indigo-600/20 hover:bg-indigo-700">
                     {isAr ? 'تأكيد الإدخال في الشريط' : 'Commit to Dashboard Feed'}
                   </button>
                </form>
             </div>

             <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm flex flex-col">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{isAr ? 'إدخالات الشريط النشطة' : 'Active Feed Items'}</h3>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                   {announcements.map(ann => (
                     <div key={ann.id} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 group transition-all hover:bg-white hover:shadow-xl relative overflow-hidden text-start">
                        {ann.priority === 'Urgent' && <div className="absolute top-0 end-0 w-1.5 h-full bg-rose-500"></div>}
                        <div className="flex justify-between items-start mb-2">
                           <div>
                              <h4 className="text-sm font-black text-slate-900">{isAr ? ann.titleArabic || ann.title : ann.title}</h4>
                              {!isAr && ann.titleArabic && <h4 className="text-sm font-black text-indigo-600" dir="rtl">{ann.titleArabic}</h4>}
                              {isAr && ann.title && <h4 className="text-sm font-black text-indigo-600 opacity-50" dir="ltr">{ann.title}</h4>}
                           </div>
                           <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${ann.priority === 'Urgent' ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'}`}>{ann.priority}</span>
                        </div>
                        <div className="space-y-2 mb-4">
                           <p className="text-xs text-slate-500 font-medium leading-relaxed">{isAr ? ann.contentArabic || ann.content : ann.content}</p>
                           {!isAr && ann.contentArabic && <p className="text-xs text-slate-600 font-bold leading-relaxed" dir="rtl">{ann.contentArabic}</p>}
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{new Date(ann.createdAt).toLocaleDateString(isAr ? 'ar-KW' : 'en-GB')}</span>
                           <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-[9px] font-black text-rose-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 px-3 py-1.5 rounded-lg">{isAr ? 'إزالة' : 'Remove'}</button>
                        </div>
                     </div>
                   ))}
                   {announcements.length === 0 && (
                     <div className="py-20 text-center text-slate-300 italic text-sm">{isAr ? 'لا توجد عناصر في شريط المعلومات.' : 'No items in the intelligence feed.'}</div>
                   )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'Configuration' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 text-start">
             {/* Office Locations / GPS Management */}
             <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-8">
                   <SectionHeading icon="📡" title={t('officeLocations')} subtitle={isAr ? 'إدارة النطاقات الجغرافية للتحقق من الموقع.' : 'Manage GPS perimeters for Site Validation.'} />
                   <button 
                    onClick={() => setEditingNode({ name: 'New Node', nameArabic: 'موقع جديد', lat: 29.37, lng: 47.97, radius: 250 })}
                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                   >
                      {t('addNode')}
                   </button>
                </div>

                <div className="space-y-4 flex-1">
                   {editingNode && (
                     <div className="p-8 bg-slate-900 rounded-[32px] text-white space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                           <p className="text-xs font-black uppercase tracking-widest text-emerald-400">{editingNode.id ? t('editLocation') : t('addNode')}</p>
                           <button onClick={() => setEditingNode(null)} className="text-slate-400">×</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-500 uppercase">{isAr ? 'الاسم (EN)' : 'Name (EN)'}</label>
                              <input className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none" value={editingNode.name} onChange={e => setEditingNode({...editingNode, name: e.target.value})} />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-500 uppercase">{isAr ? 'الاسم (AR)' : 'Name (AR)'}</label>
                              <input className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none" dir="rtl" value={editingNode.nameArabic} onChange={e => setEditingNode({...editingNode, nameArabic: e.target.value})} />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-500 uppercase">{t('latitude')}</label>
                              <input type="number" className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none" value={editingNode.lat} onChange={e => setEditingNode({...editingNode, lat: parseFloat(e.target.value)})} />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-500 uppercase">{t('longitude')}</label>
                              <input type="number" className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none" value={editingNode.lng} onChange={e => setEditingNode({...editingNode, lng: parseFloat(e.target.value)})} />
                           </div>
                           <div className="col-span-2 space-y-1">
                              <label className="text-[9px] font-black text-slate-500 uppercase">{t('radiusMeters')}</label>
                              <input type="number" className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none" value={editingNode.radius} onChange={e => setEditingNode({...editingNode, radius: parseInt(e.target.value)})} />
                           </div>
                        </div>
                        <button onClick={handleSaveNode} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                           {t('saveNode')}
                        </button>
                     </div>
                   )}

                   {officeNodes.map(node => (
                      <div key={node.id} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-emerald-500/5">
                         <div className="flex justify-between items-start">
                            <div>
                               <p className="text-sm font-black text-slate-900">{isAr ? node.nameArabic || node.name : node.name}</p>
                               <div className="flex gap-4 mt-2 font-mono text-[10px] text-slate-400 font-bold uppercase">
                                  <span>{t('latitude')}: {node.lat}</span>
                                  <span>{t('longitude')}: {node.lng}</span>
                               </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => setEditingNode(node)}
                                  className="px-4 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[8px] font-black uppercase tracking-widest hover:text-emerald-600 hover:border-emerald-100 transition-all"
                                >
                                  {t('editLocation')}
                                </button>
                                <button 
                                  onClick={() => handleDeleteNode(node.id)}
                                  className="px-4 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[8px] font-black uppercase tracking-widest hover:text-rose-600 hover:border-rose-100 transition-all"
                                >
                                  {isAr ? 'حذف' : 'Delete'}
                                </button>
                            </div>
                         </div>
                         <div className="mt-4 flex items-center gap-4">
                            <div className="flex-1 bg-slate-200 h-1 rounded-full overflow-hidden">
                               <div className="bg-emerald-500 h-full" style={{ width: '100%' }}></div>
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{node.radius}{isAr ? ' متر' : 'm'} Radius</span>
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             {/* Global Allowance Registry */}
             <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                <SectionHeading icon="💳" title={t('allowanceRegistry')} subtitle={isAr ? 'القائمة الرئيسية لهياكل التعويضات المالية للموظفين.' : 'Master list for employee financial structures.'} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {allowanceRegistry.map((allow, i) => (
                      <div key={i} className="p-5 bg-slate-50 rounded-[28px] border border-slate-100 flex items-center justify-between">
                         <div>
                            <p className="text-xs font-black text-slate-900">{isAr ? allow.ar : allow.en}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{allow.isHousing ? (isAr ? '🏠 سكن' : '🏠 Housing') : (isAr ? '💼 دعم' : '💼 Support')}</p>
                         </div>
                         <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs opacity-40">✓</div>
                      </div>
                   ))}
                </div>

                <div className="mt-12 p-8 bg-indigo-900 rounded-[40px] text-white flex flex-col justify-between h-[320px] relative overflow-hidden">
                   <div className="absolute top-0 end-0 p-8 opacity-10 rotate-12 text-6xl">⚙️</div>
                   <div>
                      <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-4">{t('policySettings')}</h4>
                      <p className="text-sm font-bold leading-relaxed opacity-80">
                         {isAr 
                           ? 'تعديل القيود التنظيمية مثل حصص الإذن الشهري أو منطق الأيام الجزئية.' 
                           : 'Modify regulatory constraints such as monthly permission quotas or fractional day logic.'}
                      </p>
                   </div>
                   <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[8px] font-black text-indigo-300 uppercase">{t('maxPermissionHours')}</label>
                           <input type="number" className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-sm font-black outline-none" value={globalPolicies.maxPermissionHours} onChange={e => setGlobalPolicies({...globalPolicies, maxPermissionHours: parseInt(e.target.value) || 0})} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[8px] font-black text-indigo-300 uppercase">{isAr ? 'أساس اليوم الجزئي (س)' : 'Fractional Day Basis (H)'}</label>
                           <input type="number" className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-sm font-black outline-none" value={globalPolicies.fractionalDayBasis} onChange={e => setGlobalPolicies({...globalPolicies, fractionalDayBasis: parseInt(e.target.value) || 0})} />
                        </div>
                      </div>
                      
                      <button onClick={handleUpdatePolicy} className="w-full py-4 bg-white text-indigo-900 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                         {isAr ? 'تحديث محرك السياسات' : 'Update Policy Engine'}
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'Worksheet' && (
          <div className="space-y-8 animate-in fade-in duration-500 text-start">
             <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                   <select 
                     className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black uppercase tracking-widest outline-none"
                     value={wsFilter.month}
                     onChange={e => setWsFilter({...wsFilter, month: parseInt(e.target.value)})}
                   >
                     {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                   </select>
                   <select 
                     className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black uppercase tracking-widest outline-none"
                     value={wsFilter.year}
                     onChange={e => setWsFilter({...wsFilter, year: parseInt(e.target.value)})}
                   >
                     <option value={2025}>2025</option>
                     <option value={2026}>2026</option>
                   </select>
                </div>
                <div className="flex items-center gap-4 flex-1 max-w-md">
                   <input 
                     type="text" 
                     placeholder={isAr ? 'بحث عن موظف أو حالة...' : 'Search employee or status...'}
                     value={wsFilter.query}
                     onChange={e => setWsFilter({...wsFilter, query: e.target.value})}
                     className="w-full px-6 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none shadow-sm focus:ring-2 focus:ring-emerald-500/20"
                   />
                   <button 
                     onClick={fetchWorksheetData}
                     className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-lg shadow-slate-900/10"
                   >
                     {isAr ? 'تحديث' : 'Refresh'}
                   </button>
                </div>
             </div>

             <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                   <table className="w-full text-start border-collapse">
                      <thead className="sticky top-0 bg-white z-10 shadow-sm">
                         <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <th className="px-10 py-6">{isAr ? 'الموظف' : 'Employee'}</th>
                            <th className="px-10 py-6">{isAr ? 'التاريخ' : 'Date'}</th>
                            <th className="px-10 py-6">{isAr ? 'تفاصيل الحالة' : 'Status Details'}</th>
                            <th className="px-10 py-6">{isAr ? 'تسجيل دخول/خروج' : 'Clock In/Out'}</th>
                            <th className="px-10 py-6">{isAr ? 'حالة السجل' : 'Registry Status'}</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {loading ? (
                           <tr><td colSpan={7} className="p-24 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest">{isAr ? 'جاري تجميع الكشف...' : 'Synthesizing Worksheet...'}</td></tr>
                         ) : filteredWsLogs.length > 0 ? (
                           filteredWsLogs.map((log) => (
                             <tr key={log.id} className="hover:bg-slate-50/30 transition-colors group">
                                <td className="px-10 py-6">
                                   <p className="text-sm font-black text-slate-900">{log.employeeName}</p>
                                   <p className="text-[8px] font-bold text-slate-400 uppercase">{log.workDaysPerWeek}-{isAr ? 'أيام عمل' : 'Day Schedule'}</p>
                                </td>
                                <td className="px-10 py-6 text-xs font-bold text-slate-500">{log.date}</td>
                                <td className="px-10 py-6">
                                   <div className="flex flex-col">
                                      <span className="text-xs font-bold text-slate-700">{log.location !== '--' ? log.location : '---'}</span>
                                      {log.subStatus && <span className="text-[8px] font-black text-indigo-500 uppercase">{log.subStatus}</span>}
                                   </div>
                                </td>
                                <td className="px-10 py-6 font-mono text-[11px] font-black text-slate-600">
                                   {log.clockIn} - {log.clockOut}
                                </td>
                                <td className="px-10 py-6">
                                   <div className={`inline-flex items-center px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${getStatusStyle(log.status, log.subStatus)}`}>
                                      {t(log.status.toLowerCase().replace(' ', '')) || log.status}
                                   </div>
                                   {log.subStatus === 'Resumption Pending' && (
                                      <span className="ms-2 text-[8px] text-amber-600 font-bold">⚠️ {isAr ? 'يتطلب تأكيد الموارد البشرية' : 'HR Confirmation Required'}</span>
                                   )}
                                </td>
                             </tr>
                           ))
                         ) : (
                           <tr><td colSpan={7} className="p-24 text-center text-slate-300 italic font-medium">{isAr ? 'لا توجد سجلات نشاط. استخدم "مزامنة الأجهزة" لتعبئة التاريخ.' : 'No activity records found. Use "Hardware Sync" to backfill history.'}</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'Connectors' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500 text-start">
             <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                   <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{isAr ? 'خادم الحضور' : 'Attendance Server'}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">{isAr ? 'تكوين الجسر لأجهزة التعرف على الوجه.' : 'Configure bridge to Facial Recognition hardware.'}</p>
                   </div>
                   <div className={`w-3 h-3 rounded-full ${hwConfig?.status === 'Connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                </div>

                <form onSubmit={handleSaveHwConfig} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{isAr ? 'نقطة نهاية الخادم (IP/FQDN)' : 'Server Endpoint (IP/FQDN)'}</label>
                      <input 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all"
                        value={hwConfig?.serverIp || ''}
                        onChange={e => setHwConfig(prev => prev ? {...prev, serverIp: e.target.value} : null)}
                        placeholder="192.168.1.1"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{isAr ? 'مفتاح API للجهاز' : 'Hardware API Key'}</label>
                      <input 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all"
                        value={hwConfig?.apiKey || ''}
                        onChange={e => setHwConfig(prev => prev ? {...prev, apiKey: e.target.value} : null)}
                        placeholder="FR-SECRET-KEY"
                      />
                   </div>
                   <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all">
                     {isAr ? 'تحديث سياسة الموصل' : 'Update Connector Policy'}
                   </button>
                </form>
             </div>

             <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm flex flex-col text-start">
                <div className="flex items-center justify-between mb-10">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isAr ? 'إعادة بناء السجل' : 'Registry Reconstruction'}</h3>
                   {hwConfig?.lastSync && <span className="text-[9px] font-bold text-slate-400 italic">{isAr ? 'الحالة المتصلة: مباشرة' : 'Connected Status: Live'}</span>}
                </div>

                <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8">
                   <div className={`w-32 h-32 rounded-[40px] flex items-center justify-center text-4xl shadow-inner ${reconstructing ? 'bg-indigo-50 animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
                      {reconstructing ? '🧵' : '⏳'}
                   </div>
                   <div className="max-w-xs">
                      <p className="text-xl font-black text-slate-800 tracking-tight">{isAr ? 'إعادة بناء تاريخ ٢٠٢٥' : 'Reconstruct 2025 History'}</p>
                      <p className="text-xs text-slate-400 font-medium mt-2">
                        {isAr 
                          ? 'ملء سجلات حضور القوى العاملة من ١ يناير ٢٠٢٥ لجميع الهويات المرتبطة.'
                          : 'Backfill workforce attendance logs from Jan 1st, 2025 to-date for all linked hardware identities.'}
                      </p>
                   </div>
                   <div className="w-full space-y-4">
                     <button 
                       onClick={handleSyncHardware}
                       disabled={syncingHw}
                       className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest shadow-xl shadow-slate-900/10 active:scale-95 transition-all disabled:opacity-50"
                     >
                       {syncingHw ? (isAr ? 'جاري سحب السجل...' : 'Pulling Daily Log...') : (isAr ? 'سحب سجلات يومية جديدة' : 'Pull New Daily Logs')}
                     </button>
                     <button 
                       onClick={handleReconstructHistory}
                       disabled={reconstructing}
                       className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-600/10 active:scale-95 transition-all disabled:opacity-50"
                     >
                       {reconstructing ? (isAr ? 'جاري إعادة بناء المخطط الزمني...' : 'Rebuilding 2025 Timeline...') : (isAr ? 'بدء تعبئة تاريخ ٢٠٢٥' : 'Run 2025 History Backfill')}
                     </button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'Terminal' && (
          <div className="bg-slate-950 p-10 rounded-[48px] shadow-2xl border border-white/5 animate-in zoom-in-95 text-start">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                      {isAr ? 'طرفية السجل' : 'Registry Terminal'}
                   </h3>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{isAr ? 'وصول المستخدم الخارق عبر run_sql() RPC' : 'Superuser Access via run_sql() RPC'}</p>
                </div>
                <div className="flex gap-4">
                   <button 
                     onClick={() => setTerminalSql('')}
                     className="px-6 py-2 bg-white/5 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
                   >
                     {isAr ? 'مسح' : 'Clear'}
                   </button>
                   <button 
                     onClick={handleExecuteTerminalSql}
                     disabled={loading || !terminalSql.trim()}
                     className="px-10 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                   >
                     {loading ? (isAr ? 'جاري التنفيذ...' : 'Executing...') : (isAr ? 'تأكيد الاستعلام' : 'Commit Query')}
                   </button>
                </div>
             </div>

             <div className="relative">
                <textarea 
                  className="w-full min-h-[400px] bg-slate-900 border border-white/10 rounded-[32px] p-10 font-mono text-sm text-indigo-300 outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner"
                  spellCheck={false}
                  value={terminalSql}
                  onChange={e => setTerminalSql(e.target.value)}
                />
                <div className="absolute bottom-6 right-10 text-[10px] font-black text-slate-600 uppercase tracking-widest pointer-events-none">
                   {isAr ? 'جسر PostgreSQL v16' : 'PostgreSQL v16 Bridge'}
                </div>
             </div>

             <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                   <h4 className="text-[9px] font-black text-slate-500 uppercase mb-4 tracking-widest">{isAr ? 'مكتبة الرقع' : 'Patch Library'}</h4>
                   <div className="flex flex-wrap gap-2">
                      <button onClick={() => setTerminalSql("ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone_number TEXT;")} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-slate-400">{isAr ? 'إضافة عمود الهاتف' : 'Add Phone Column'}</button>
                      <button onClick={() => setTerminalSql("UPDATE employees SET status = 'Active';")} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-slate-400">{isAr ? 'إعادة ضبط الحالة للكل' : 'Reset All Status'}</button>
                      <button onClick={() => setTerminalSql("DELETE FROM attendance WHERE date < '2024-01-01';")} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-slate-400">{isAr ? 'تطهير السجلات القديمة' : 'Purge Old Logs'}</button>
                   </div>
                </div>
                <div className="p-6 bg-rose-500/5 rounded-3xl border border-rose-500/10 flex items-center gap-6">
                   <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-xl">⚠️</div>
                   <p className="text-[11px] text-rose-300 font-medium leading-relaxed">
                      {isAr 
                        ? 'عمليات الطرفية ذرية ودائمة. تأكد من سلامة الاستعلامات قبل تأكيدها على سجل القوى العاملة المباشر.'
                        : 'Terminal operations are atomic and permanent. Ensure queries are sanitized before committing to the live workforce registry.'}
                   </p>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCenter;
