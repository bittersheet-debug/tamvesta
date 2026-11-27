import React, { useState } from 'react';
import {
  History,
  Search,
  RotateCcw,
  UserPlus,
  Calendar,
  Layers,
  Bell,
  Activity,
  Shield,
  Clock,
  Filter,
} from 'lucide-react';
import type { SchoolActivityLog } from '../../types/index.ts';

interface ActivityLogTabProps {
  logs: SchoolActivityLog[];
  onRefresh: () => void;
}

export const ActivityLogTab: React.FC<ActivityLogTabProps> = ({ logs, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    const actionType = (log.type || '').toLowerCase();
    const matchesSearch =
      log.title.toLowerCase().includes(search.toLowerCase()) ||
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      actionType.includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' ||
      (categoryFilter === 'akun' && (actionType.includes('account') || actionType.includes('akun') || actionType.includes('siswa') || actionType.includes('guru') || actionType.includes('staff'))) ||
      (categoryFilter === 'jadwal' && (actionType.includes('schedule') || actionType.includes('jadwal'))) ||
      (categoryFilter === 'kelas' && (actionType.includes('class') || actionType.includes('kelas'))) ||
      (categoryFilter === 'pengumuman' && (actionType.includes('announcement') || actionType.includes('pengumuman')));

    return matchesSearch && matchesCategory;
  });

  const getActionBadgeStyle = (action: string) => {
    if (action.includes('akun') || action.includes('siswa') || action.includes('guru') || action.includes('staff')) {
      return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: <UserPlus className="w-3.5 h-3.5" /> };
    }
    if (action.includes('jadwal')) {
      return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <Calendar className="w-3.5 h-3.5" /> };
    }
    if (action.includes('kelas')) {
      return { bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Layers className="w-3.5 h-3.5" /> };
    }
    if (action.includes('pengumuman')) {
      return { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Bell className="w-3.5 h-3.5" /> };
    }
    return { bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: <Activity className="w-3.5 h-3.5" /> };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 mb-2">
            <History className="w-4 h-4 text-emerald-600" />
            <span>AUDIT TRAIL & LOG AKTIVITAS SEKOLAH</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Riwayat Aktivitas & Perubahan Data
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Catatan kronologis perubahan data sekolah: pembuatan akun baru, pembaruan jadwal pelajaran, mutasi kelas, publikasi pengumuman, dan aktivitas operasional lainnya secara transparan.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Segarkan Log</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Aktivitas ({logs.length})
          </button>
          <button
            onClick={() => setCategoryFilter('akun')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              categoryFilter === 'akun'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            Akun & Pengguna
          </button>
          <button
            onClick={() => setCategoryFilter('jadwal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              categoryFilter === 'jadwal'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Jadwal Pelajaran
          </button>
          <button
            onClick={() => setCategoryFilter('kelas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              categoryFilter === 'kelas'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            Manajemen Kelas
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari aktivitas, admin, aksi..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <History className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700">Belum ada riwayat aktivitas yang tercatat pada filter ini.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const badge = getActionBadgeStyle(log.type || 'admin_action');
            return (
              <div
                key={log.id}
                className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                    >
                      {badge.icon}
                      <span className="uppercase">{log.type || 'SISTEM'}</span>
                    </span>
                    <h4 className="font-black text-slate-900 text-xs sm:text-sm">{log.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{log.description}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium pt-0.5">
                    <span>
                      Oleh: <strong className="text-slate-700">{log.userName}</strong>
                    </span>
                    <span>•</span>
                    <span className="uppercase font-bold text-slate-500">{log.userRole}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono shrink-0 sm:self-center">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {new Date(log.timestamp).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
