
import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/dbService.ts';
import { useNotifications } from './NotificationSystem.tsx';
import { useTranslation } from 'react-i18next';
import { supabase } from '../services/supabaseClient.ts';

type TableName = 'employees' | 'leave_requests' | 'payroll_runs' | 'public_holidays' | 'office_locations' | 'department_metrics';

const TABLE_TEMPLATES: Record<TableName, any> = {
  employees: { id: '', name: '', name_arabic: '', nationality: 'Kuwaiti', civil_id: '', department: 'IT', position: '', salary: 1500, status: 'Active', face_token: '' },
  office_locations: { id: '', name: '', lat: 29.3759, lng: 47.9774, radius: 250 },
  department_metrics: { name: '', kuwaiti_count: 0, expat_count: 0, target_ratio: 30 },
  public_holidays: { id: '', name: '', date: '', type: 'National', is_fixed: true },
  leave_requests: { id: '', employee_name: '', department: '', type: 'Annual', start_date: '', end_date: '', status: 'Pending' },
  payroll_runs: { period_key: '', cycle_type: 'Monthly', status: 'Draft', total_disbursement: 0 }
};

const AdminCenter: React.FC = () => {
  const { notify, confirm } = useNotifications();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'Integrity' | 'Registry' | 'Forge'>('Integrity');
  
  // Registry Explorer State
  const [selectedTable, setSelectedTable] = useState<TableName>('employees');
  const [tableData, setTableData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [connectionReport, setConnectionReport] = useState<any>(null);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

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
      notify("Fetch Failed", "Could not synchronize with registry.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Registry') {
      fetchTableData(selectedTable);
    }
  }, [activeTab, selectedTable]);

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
      title: "Run Biometric Migration?",
      message: "This will attempt to add the 'face_token' column to your live 'employees' table. Use this if you see registry errors during enrollment.",
      confirmText: "Migrate Now",
      onConfirm: async () => {
        setLoading(true);
        try {
          if (!supabase) throw new Error("Supabase not connected");
          const { error } = await supabase.rpc('run_sql', { 
            sql_query: "ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_token TEXT;" 
          });
          if (error) {
            // Most free Supabase projects don't expose 'run_sql' RPC by default for security.
            // Provide a clear fallback instruction.
            throw new Error("RPC 'run_sql' not found. Please run SQL manually in Supabase Dashboard.");
          }
          notify("Migration Success", "Registry schema updated with biometric support.", "success");
        } catch (err: any) {
          notify("Manual Step Required", "Automatic migration blocked. Run 'ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_token TEXT;' in Supabase SQL Editor.", "warning");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleSeedSystem = async () => {
    setLoading(true);
    try {
      const res = await dbService.seedDatabase();
      if (res.success) {
        notify("Registry Provisioned", "System defaults pushed to database.", "success");
        if (activeTab === 'Registry') fetchTableData(selectedTable);
      } else {
        notify("Seed Failed", res.error || "Could not write to Supabase.", "error");
      }
    } catch (err: any) {
      notify("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    confirm({
      title: "Confirm Deletion",
      message: `Are you sure you want to purge record ID: ${id}? This action is permanent in the registry audit trail.`,
      onConfirm: async () => {
        try {
          await dbService.deleteGenericRecord(selectedTable, id);
          setTableData(prev => prev.filter(row => (row.id || row.name || row.period_key) !== id));
          notify("Purged", "Record successfully removed from registry.", "success");
        } catch (err) {
          notify("Purge Failed", "Data integrity constraint violated.", "error");
        }
      }
    });
  };

  const handleOpenEdit = (row: any) => {
    setEditingRow(row);
    // Merge template with row to ensure all keys exist for the form
    setFormData({ ...TABLE_TEMPLATES[selectedTable], ...row });
    setIsCreating(false);
  };

  const handleOpenCreate = () => {
    setEditingRow(null);
    setIsCreating(true);
    // Use template instead of relying on existing rows
    setFormData({ ...TABLE_TEMPLATES[selectedTable] });
  };

  const handleSaveRow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isCreating) {
        await dbService.createGenericRecord(selectedTable, formData);
        notify("Created", "New entry forged in registry.", "success");
      } else {
        const id = formData.id || formData.name || formData.period_key;
        await dbService.updateGenericRecord(selectedTable, id, formData);
        notify("Committed", "Manual override successful.", "success");
      }
      setEditingRow(null);
      setIsCreating(false);
      fetchTableData(selectedTable);
    } catch (err: any) {
      console.error("Registry Sync Error:", err);
      notify("Commit Failed", err.message || "Audit trail rejected the modification.", "error");
    }
  };

  const filteredData = useMemo(() => {
    if (!searchQuery) return tableData;
    const q = searchQuery.toLowerCase();
    return tableData.filter(row => 
      Object.values(row).some(val => String(val).toLowerCase().includes(q))
    );
  }, [tableData, searchQuery]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const registryTabs: { id: TableName, label: string, category: 'workforce' | 'system' }[] = [
    { id: 'employees', label: 'Workforce', category: 'workforce' },
    { id: 'leave_requests', label: 'Leaves', category: 'workforce' },
    { id: 'payroll_runs', label: 'Payroll', category: 'workforce' },
    { id: 'office_locations', label: 'Office GPS', category: 'system' },
    { id: 'public_holidays', label: 'Holidays', category: 'system' },
    { id: 'department_metrics', label: 'Targets', category: 'system' }
  ];

  const activeFormKeys = useMemo(() => {
    // Always derive form fields from the template for consistency
    return Object.keys(TABLE_TEMPLATES[selectedTable]);
  }, [selectedTable]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24">
      {/* Header Panel */}
      <div className="bg-slate-900 rounded-[56px] p-12 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
           <span className="text-[200px]">🛡️</span>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black mb-4 tracking-tighter">Enterprise Registry Forge</h2>
          <p className="text-slate-400 max-w-xl font-medium leading-relaxed">
            Manage both user data and system definitions including geo-fencing perimeters and nationalization targets.
          </p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap gap-4 bg-white p-2 rounded-[32px] border border-slate-200 shadow-sm self-start inline-flex">
        {['Integrity', 'Registry', 'Forge'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-10 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab === 'Registry' ? 'Data Explorer' : tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {activeTab === 'Integrity' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4">
            <div className="lg:col-span-1 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Registry Link</h3>
                <p className="text-xs text-slate-500 font-medium mb-8">Real-time Supabase health check.</p>
                {connectionReport && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${connectionReport.success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {connectionReport.success ? '⚡' : '❌'}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-widest">
                          {connectionReport.success ? 'System Online' : 'System Degraded'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold">{connectionReport.message}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                 <button onClick={checkConnection} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black active:scale-95 transition-all">
                   Run Diagnostics
                 </button>
                 <button onClick={handleRunMigration} className="w-full py-4 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 active:scale-95 transition-all">
                   Fix Biometric Columns
                 </button>
                 <button onClick={handleSeedSystem} className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all">
                   Provision Defaults
                 </button>
              </div>
            </div>
            <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Latency Telemetry</h3>
                <div className="h-32 flex items-end gap-2 px-4">
                  {latencyHistory.map((ping, i) => (
                    <div 
                      key={i} 
                      className={`flex-1 rounded-t-lg transition-all duration-500 ${ping > 1000 ? 'bg-rose-500' : (ping > 500 ? 'bg-amber-400' : 'bg-emerald-500')}`}
                      style={{ height: `${Math.min(100, (ping / 3000) * 100)}%` }}
                    ></div>
                  ))}
                  {latencyHistory.length === 0 && <div className="w-full text-center text-slate-300 italic text-xs py-10">Waiting for ping...</div>}
                </div>
                <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Manual Migration Script</h4>
                  <code className="text-[10px] font-mono text-indigo-600 break-all bg-white p-2 block border border-slate-200 rounded-lg">
                    ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_token TEXT;
                  </code>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'Registry' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             {/* Sub Navigation for Tables */}
             <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex flex-col gap-4">
                   <div className="flex gap-4 items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[80px]">Workforce:</span>
                      <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                        {registryTabs.filter(t => t.category === 'workforce').map(tbl => (
                          <button 
                            key={tbl.id}
                            onClick={() => { setSelectedTable(tbl.id); setCurrentPage(1); }}
                            className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                              selectedTable === tbl.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            {tbl.label}
                          </button>
                        ))}
                      </div>
                   </div>
                   <div className="flex gap-4 items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[80px]">System:</span>
                      <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                        {registryTabs.filter(t => t.category === 'system').map(tbl => (
                          <button 
                            key={tbl.id}
                            onClick={() => { setSelectedTable(tbl.id); setCurrentPage(1); }}
                            className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                              selectedTable === tbl.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            {tbl.label}
                          </button>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="flex items-center gap-4">
                   <input 
                     type="text" 
                     placeholder="Filter registry..."
                     value={searchQuery}
                     onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                     className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none w-64 focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                   />
                   <button 
                     onClick={handleOpenCreate}
                     className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/10 active:scale-95 transition-all"
                   >
                     + New Entry
                   </button>
                </div>
             </div>

             {/* Data Grid with Pagination */}
             <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                           <th className="px-8 py-6">Actions</th>
                           {activeFormKeys.slice(0, 8).map(key => (
                             <th key={key} className="px-8 py-6">{key.replace('_', ' ')}</th>
                           ))}
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {loading ? (
                          <tr><td colSpan={9} className="p-24 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest">Scanning Registry...</td></tr>
                        ) : paginatedData.length > 0 ? (
                          paginatedData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                               <td className="px-8 py-6">
                                  <div className="flex gap-2">
                                     <button onClick={() => handleOpenEdit(row)} className="p-2 bg-white border border-slate-200 text-slate-400 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm">✏️</button>
                                     <button onClick={() => handleDelete(row.id || row.name || row.period_key)} className="p-2 bg-white border border-slate-200 text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all shadow-sm">🗑️</button>
                                  </div>
                               </td>
                               {activeFormKeys.slice(0, 8).map(key => (
                                 <td key={key} className="px-8 py-6">
                                    <p className="text-xs font-bold text-slate-700 max-w-[150px] truncate">
                                      {typeof row[key] === 'object' ? 'JSON' : (row[key] !== undefined ? String(row[key]) : '---')}
                                    </p>
                                 </td>
                               ))}
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={9} className="p-24 text-center text-slate-300 italic font-medium">No results found in {selectedTable}. Click "+ New Entry" to populate.</td></tr>
                        )}
                     </tbody>
                  </table>
                </div>

                {/* Pagination UI */}
                {filteredData.length > 0 && (
                  <div className="p-8 border-t border-slate-50 flex items-center justify-between bg-slate-50/20">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Showing {Math.min(filteredData.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredData.length, currentPage * itemsPerPage)} of {filteredData.length} entries
                    </div>
                    <div className="flex gap-2">
                      <button 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-30 shadow-sm"
                      >
                        Previous
                      </button>
                      <div className="flex items-center px-4 text-xs font-black text-slate-900">
                        {currentPage} / {totalPages || 1}
                      </div>
                      <button 
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-30 shadow-sm"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}

        {(activeTab === 'Forge') && (
           <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm animate-in fade-in duration-300 flex flex-col items-center justify-center h-96 text-center">
              <span className="text-5xl mb-6">🛠️</span>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Access Restricted</h3>
              <p className="text-sm text-slate-400 mt-2">Section currently undergoing security clearance audit.</p>
           </div>
        )}
      </div>

      {/* Registry Editor Modal */}
      {(editingRow || isCreating) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setEditingRow(null); setIsCreating(false); }}></div>
           <div className="relative bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
              <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{isCreating ? 'Forge New Entry' : 'Manual Override'}</h3>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Target Registry: {selectedTable}</p>
                 </div>
                 <button onClick={() => { setEditingRow(null); setIsCreating(false); }} className="text-slate-400 text-3xl font-light">×</button>
              </div>

              <form onSubmit={handleSaveRow} className="p-10 space-y-6 flex-1 overflow-y-auto max-h-[50vh]">
                 {activeFormKeys.map(key => {
                   if (key === 'created_at') return null;
                   return (
                     <div key={key} className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{key.replace('_', ' ')}</label>
                        <input 
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all"
                          value={typeof formData[key] === 'object' ? JSON.stringify(formData[key]) : (formData[key] !== undefined ? formData[key] : '')}
                          onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                          placeholder={`Enter ${key}...`}
                        />
                     </div>
                   );
                 })}
              </form>

              <div className="p-10 bg-slate-900 flex gap-4">
                 <button onClick={() => { setEditingRow(null); setIsCreating(false); }} type="button" className="flex-1 py-5 bg-white/10 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all">Discard</button>
                 <button type="submit" onClick={handleSaveRow} className="flex-[2] py-5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all hover:bg-emerald-700">Commit Changes</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminCenter;
