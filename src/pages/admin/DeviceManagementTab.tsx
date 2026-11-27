import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  Tablet,
  Shield,
  ShieldCheck,
  Search,
  Power,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
} from 'lucide-react';
import type { DeviceSession } from '../../types/index.ts';

interface DeviceManagementTabProps {
  sessions: DeviceSession[];
  onTerminateSession: (sessionId: string) => Promise<void>;
  onRefresh: () => void;
}

export const DeviceManagementTab: React.FC<DeviceManagementTabProps> = ({
  sessions,
  onTerminateSession,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'mobile' | 'desktop'>('all');
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      (s.userName || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.username || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.deviceName || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.os || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.browser || '').toLowerCase().includes(search.toLowerCase());
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'mobile' && (s.deviceType === 'mobile' || s.deviceType === 'tablet')) ||
      (typeFilter === 'desktop' && s.deviceType === 'desktop');
    return matchesSearch && matchesType;
  });

  const handleTerminate = async (sessionId: string, deviceName: string, userName: string) => {
    if (!window.confirm(`Keluarkan sesi perangkat "${deviceName}" milik ${userName}? Pengguna akan diminta login ulang.`)) {
      return;
    }

    setTerminatingId(sessionId);
    try {
      await onTerminateSession(sessionId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Gagal mengakhiri sesi perangkat');
    } finally {
      setTerminatingId(null);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-blue-600" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-indigo-600" />;
      default:
        return <Laptop className="w-5 h-5 text-emerald-600" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-xs font-bold text-blue-700 border border-blue-200 mb-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>KEAMANAN AKSES & PERANGKAT LOGIN</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Manajemen Sesi Perangkat
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Pantau seluruh perangkat yang terhubung ke TAMVESTA. Administrator dapat memutus sesi perangkat yang mencurigakan secara terpusat untuk menjaga keamanan akun civitas sekolah.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Segarkan Sesi</span>
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sesi Login</span>
            <p className="text-3xl font-black text-slate-900 mt-1">{sessions.length}</p>
            <span className="text-[11px] font-bold text-emerald-600 mt-1 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Terdaftar Aktif
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">HP & Tablet</span>
            <p className="text-3xl font-black text-blue-700 mt-1">
              {sessions.filter((s) => s.deviceType === 'mobile' || s.deviceType === 'tablet').length}
            </p>
            <span className="text-[11px] font-bold text-blue-600 mt-1 block">Aplikasi & Browser Mobile</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Smartphone className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Laptop & Desktop</span>
            <p className="text-3xl font-black text-indigo-700 mt-1">
              {sessions.filter((s) => s.deviceType === 'desktop').length}
            </p>
            <span className="text-[11px] font-bold text-indigo-600 mt-1 block">Komputer Kantor / Lab</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Laptop className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              typeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({sessions.length})
          </button>
          <button
            onClick={() => setTypeFilter('mobile')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              typeFilter === 'mobile'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            Mobile (HP/Tablet)
          </button>
          <button
            onClick={() => setTypeFilter('desktop')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              typeFilter === 'desktop'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
            }`}
          >
            Desktop (Laptop/PC)
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pengguna, perangkat, OS..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
              <tr>
                <th className="p-3.5 text-center w-12">No</th>
                <th className="p-3.5">Nama Pengguna</th>
                <th className="p-3.5">Perangkat</th>
                <th className="p-3.5">Sistem Operasi</th>
                <th className="p-3.5">Browser</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Aktivitas Terakhir</th>
                <th className="p-3.5 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Tidak ada sesi perangkat yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session, idx) => (
                  <tr key={session.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{session.userName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] text-slate-500">@{session.username}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-700">
                          {session.userRole}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-100 rounded-lg">
                          {getDeviceIcon(session.deviceType)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block">{session.deviceName || 'Perangkat'}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">{session.deviceType}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">
                      {session.os || 'Tidak Diketahui'}
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">
                      {session.browser || 'Tidak Diketahui'}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Online
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                      {new Date(session.lastActive).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleTerminate(session.id, session.deviceName || 'Perangkat', session.userName)}
                        disabled={terminatingId === session.id}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-[11px] transition shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                        title="Akhiri sesi perangkat ini"
                      >
                        <Power className="w-3.5 h-3.5 text-rose-600" />
                        <span>{terminatingId === session.id ? 'Memutus...' : 'Keluarkan'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
