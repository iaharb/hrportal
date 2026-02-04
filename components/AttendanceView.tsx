
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService.ts';
import { User, AttendanceRecord, OfficeLocation } from '../types.ts';
import { OFFICE_LOCATIONS } from '../constants.tsx';
import { useNotifications } from './NotificationSystem.tsx';

interface AttendanceViewProps {
  user: User;
}

const AttendanceView: React.FC<AttendanceViewProps> = ({ user }) => {
  const { notify } = useNotifications();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [currentLocation, setCurrentLocation] = useState<GeolocationCoordinates | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [activeRecord, setActiveRecord] = useState<AttendanceRecord | null>(null);
  const [activeZone, setActiveZone] = useState<OfficeLocation | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const data = await dbService.getAttendanceRecords({ employeeId: user.id });
    setHistory(data);
    const today = new Date().toISOString().split('T')[0];
    const todaysRecord = data.find(r => r.date === today);
    if (todaysRecord) setActiveRecord(todaysRecord);
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const checkZone = (coords: GeolocationCoordinates) => {
    const foundZone = OFFICE_LOCATIONS.find(loc => {
      const distance = getDistance(coords.latitude, coords.longitude, loc.lat, loc.lng);
      return distance <= loc.radius;
    });
    setActiveZone(foundZone || null);
    return foundZone;
  };

  const startDetection = () => {
    setDetecting(true);
    if (!navigator.geolocation) {
      notify("Error", "Geolocation is not supported by your browser.", "error");
      setDetecting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation(pos.coords);
        checkZone(pos.coords);
        setDetecting(false);
      },
      (err) => {
        notify("Access Denied", "Unable to retrieve location. Please check permissions.", "error");
        setDetecting(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleClockIn = async () => {
    if (!currentLocation || !activeZone) return;
    
    const now = new Date();
    const newRecord: Omit<AttendanceRecord, 'id'> = {
      employeeId: user.id,
      employeeName: user.name,
      date: now.toISOString().split('T')[0],
      clockIn: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      location: activeZone.name,
      status: 'On-Site',
      coordinates: { lat: currentLocation.latitude, lng: currentLocation.longitude }
    };

    try {
      const saved = await dbService.logAttendance(newRecord);
      setActiveRecord(saved);
      notify("Clock-In Successful", `Registered at ${activeZone.name}.`, "success");
      fetchData();
    } catch (err: any) {
      notify("Error", "Failed to save record.", "error");
    }
  };

  const handleClockOut = async () => {
    const now = new Date();
    const clockOutTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    try {
      await dbService.clockOutAttendance(user.id, clockOutTime);
      notify("Clock-Out Complete", "Work session finalized.", "info");
      fetchData();
    } catch (err) {
      notify("Error", "Failed to finalize session.", "error");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-10">
        <div className="lg:w-[450px] space-y-8">
          <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl shadow-slate-900/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <span className="text-[140px]">📍</span>
            </div>
            
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-10">Zone Validation</h3>

            <div className="space-y-8 relative z-10">
              <div className="flex items-center gap-6">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl shadow-inner ${activeZone ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300'}`}>
                  {detecting ? '⏳' : (activeZone ? '✅' : '🏢')}
                </div>
                <div className="flex-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Detected Site</p>
                   <p className={`text-xl font-black ${activeZone ? 'text-slate-900' : 'text-slate-300'}`}>
                     {detecting ? 'Scanning GPS...' : (activeZone ? activeZone.name : 'Unknown Territory')}
                   </p>
                </div>
              </div>

              <div className={`p-6 rounded-3xl border ${activeZone ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'} transition-all`}>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${activeZone ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {activeZone ? 'Perimeter Verified' : 'Unauthorized Zone'}
                  </span>
                  <div className={`w-3 h-3 rounded-full animate-pulse ${activeZone ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                </div>
                <p className={`text-xs font-medium leading-relaxed ${activeZone ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {activeZone 
                    ? `You are currently within the ${activeZone.radius}m secure radius for ${activeZone.name}. Access granted.`
                    : 'System requires active GPS signal within Shuwaikh, Sulaibiya or HQ to enable Attendance logging.'}
                </p>
              </div>

              {!activeRecord?.clockIn && (
                <button 
                  onClick={startDetection}
                  disabled={detecting}
                  className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 active:scale-95 transition-all hover:bg-black"
                >
                  {detecting ? 'Initializing Radar...' : 'Validate My Location'}
                </button>
              )}

              {activeZone && !activeRecord?.clockIn && (
                <button 
                  onClick={handleClockIn}
                  className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-emerald-600/30 active:scale-95 transition-all hover:bg-emerald-700 animate-in zoom-in-95"
                >
                  Clock In to Site
                </button>
              )}

              {activeRecord?.clockIn && !activeRecord.clockOut && (
                <div className="space-y-4">
                  <div className="bg-emerald-600 p-8 rounded-[40px] text-white shadow-xl shadow-emerald-600/20">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">Active Session</p>
                    <div className="flex items-end justify-between">
                      <h4 className="text-4xl font-black tracking-tight">{activeRecord.clockIn}</h4>
                      <p className="text-xs font-bold mb-1">Started at {activeRecord.location}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleClockOut}
                    className="w-full py-5 bg-white border-2 border-slate-200 text-slate-800 rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Finish Session (Clock Out)
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-indigo-600 p-10 rounded-[48px] text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
               <span className="text-[120px]">🛡️</span>
             </div>
             <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-6">Security Disclosure</h4>
             <p className="text-sm font-medium leading-relaxed opacity-90 relative z-10">
               Attendance is strictly geofenced per labor regulations. Attempting to clock in from unauthorized locations or using GPS spoofing will trigger an automated HR integrity audit.
             </p>
          </div>
        </div>

        <div className="flex-1 space-y-8">
           <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
              <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Activity Stream</h3>
                  <p className="text-xs text-slate-500 font-medium">Historical presence and zone validation logs.</p>
                </div>
                <div className="flex gap-2">
                   <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                     Month: {new Date().toLocaleString('default', { month: 'long' })}
                   </div>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 border-b border-slate-100">
                    <tr>
                      <th className="px-10 py-6">Date</th>
                      <th className="px-10 py-6">Validated Site</th>
                      <th className="px-10 py-6">Clock In</th>
                      <th className="px-10 py-6">Clock Out</th>
                      <th className="px-10 py-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-10 py-6">
                           <p className="text-sm font-black text-slate-900">{rec.date}</p>
                        </td>
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-3">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span className="text-sm font-bold text-slate-700">{rec.location}</span>
                           </div>
                        </td>
                        <td className="px-10 py-6 font-mono text-sm font-black text-slate-600">
                           {rec.clockIn}
                        </td>
                        <td className="px-10 py-6 font-mono text-sm font-black text-slate-400">
                           {rec.clockOut || '--:--'}
                        </td>
                        <td className="px-10 py-6">
                           <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg">
                              Verified
                           </span>
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-32 text-center">
                           <span className="text-6xl mb-6 block grayscale opacity-20">🗓️</span>
                           <h4 className="text-lg font-black text-slate-300">No session history detected</h4>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceView;
