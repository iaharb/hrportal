
import React from 'react';

const ComplianceView: React.FC = () => {
  const requirements = [
    { title: 'Social Security Registration', status: 'Complete', date: '2023-12-01', desc: 'All Kuwaiti nationals enrolled in PIFSS.' },
    { title: 'GOSI Contributions', status: 'Pending', date: '2024-03-31', desc: 'Monthly payment reconciliation for expats.' },
    { title: 'PAM Quota Fulfillment', status: 'In Progress', date: '2024-06-30', desc: 'Company is 85% towards 2024 hiring targets.' },
    { title: 'Training Declarations', status: 'Complete', date: '2024-01-15', desc: 'Quarterly training report submitted to PAM.' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">PAM Compliance & Government Portal</h2>
        <p className="text-slate-500">Manage required filings and quota status for the Public Authority for Manpower.</p>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-semibold text-slate-800">Mandatory Filings Status</h3>
          <button className="text-sm font-bold text-emerald-600 hover:text-emerald-700">Download All Certificates</button>
        </div>
        <div className="divide-y divide-slate-100">
          {requirements.map((req, i) => (
            <div key={i} className="p-6 flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className={`mt-1 p-2 rounded-lg ${
                  req.status === 'Complete' ? 'bg-emerald-50 text-emerald-600' :
                  req.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {req.status === 'Complete' ? '✓' : req.status === 'Pending' ? '⏱' : '○'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{req.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{req.desc}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-tighter">{req.status}</p>
                <p className="text-[10px] text-slate-400 mt-1">Due {req.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-indigo-900 shadow-sm">
          <h4 className="text-lg font-bold mb-4">MGRP Subsidy Tracking</h4>
          <p className="text-indigo-700 text-sm mb-6 leading-relaxed">
            Your firm is currently receiving 12,400 KWD monthly in government support for national hiring.
          </p>
          <div className="flex items-center justify-between p-4 bg-white border border-indigo-100 rounded-xl">
            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Eligible Employees</span>
            <span className="text-xl font-bold text-indigo-900">14 / 20</span>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 border-dashed flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-white rounded-full border border-slate-100 flex items-center justify-center text-3xl shadow-sm mb-4">📥</div>
          <h4 className="font-bold text-slate-800">Upload PAM Notice</h4>
          <p className="text-xs text-slate-500 mt-2 mb-6 max-w-xs">Received a physical letter from PAM? Scan and upload to let AI classify it.</p>
          <input type="file" id="pam-upload" className="hidden" />
          <label htmlFor="pam-upload" className="cursor-pointer bg-white border border-slate-200 px-6 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
            Select Document
          </label>
        </div>
      </div>
    </div>
  );
};

export default ComplianceView;
