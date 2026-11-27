import React from 'react';
import {
  Users,
  GraduationCap,
  ShieldCheck,
  Layers,
  Calendar,
  MessageCircle,
  Sparkles,
  Smartphone,
  History,
  Bell,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  BookOpen,
} from 'lucide-react';
import type {
  User,
  SchoolClass,
  ClassSchedule,
  Announcement,
  Quiz,
  SchoolActivityLog,
  DeviceSession,
} from '../../types/index.ts';

interface SchoolOverviewTabProps {
  students: User[];
  staffList: User[];
  schoolClasses: SchoolClass[];
  schedules: ClassSchedule[];
  announcements: Announcement[];
  quizzes: Quiz[];
  activityLogs: SchoolActivityLog[];
  deviceSessions: DeviceSession[];
  onNavigateTab: (tab: any) => void;
}

export const SchoolOverviewTab: React.FC<SchoolOverviewTabProps> = ({
  students,
  staffList,
  schoolClasses,
  schedules,
  announcements,
  quizzes,
  activityLogs,
  deviceSessions,
  onNavigateTab,
}) => {
  // Calculations
  const totalStudents = students.length;
  const grade7Count = students.filter((s) => s.kelas?.includes('7')).length;
  const grade8Count = students.filter((s) => s.kelas?.includes('8')).length;
  const grade9Count = students.filter((s) => s.kelas?.includes('9')).length;

  const teachers = staffList.filter((s) => s.role === 'guru');
  const adminStaff = staffList.filter(
    (s) => s.role === 'admin' || s.role === 'tata_usaha' || s.role === 'kepala_sekolah' || s.role === 'panitia'
  );

  const activeMobileSessions = deviceSessions.filter((d) => d.deviceType === 'mobile' || d.deviceType === 'tablet').length;
  const activeDesktopSessions = deviceSessions.filter((d) => d.deviceType === 'desktop').length;

  const publishedSchedulesCount = schedules.filter((s) => s.isPublished).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-bold text-emerald-200 border border-white/15">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>TAMVESTA • SISTEM MANAJEMEN SEKOLAH TERPADU</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Dashboard Sekolah
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 max-w-2xl leading-relaxed">
              Ringkasan data operasional sekolah Tamansiswa Batam secara terpusat dan real-time: akun siswa, guru terverifikasi, jadwal pelajaran, rombel kelas, dan keamanan sesi perangkat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigateTab('schedules')}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Jadwal Pelajaran</span>
            </button>
            <button
              onClick={() => onNavigateTab('dm')}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-300" />
              <span>Pesan Masuk (DM)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Siswa */}
        <div
          onClick={() => onNavigateTab('students')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Siswa</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{totalStudents}</p>
          <div className="flex items-center gap-2 mt-2 text-[11px] font-bold text-slate-500">
            <span className="text-blue-600">Kls 7: {grade7Count}</span>
            <span>•</span>
            <span className="text-indigo-600">Kls 8: {grade8Count}</span>
            <span>•</span>
            <span className="text-teal-600">Kls 9: {grade9Count}</span>
          </div>
        </div>

        {/* Total Guru */}
        <div
          onClick={() => onNavigateTab('staff')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Guru</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{teachers.length}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-emerald-600">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
            <span>100% Centang Hijau Resmi</span>
          </div>
        </div>

        {/* Total Administrasi */}
        <div
          onClick={() => onNavigateTab('staff')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Administrasi & TU</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{adminStaff.length}</p>
          <p className="text-[11px] font-bold text-amber-700 mt-2">Operator, TU, & Kepsek</p>
        </div>

        {/* Total Kelas */}
        <div
          onClick={() => onNavigateTab('classes')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Rombel Kelas</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{schoolClasses.length || 6}</p>
          <p className="text-[11px] font-bold text-purple-700 mt-2">Kelas 7, 8, dan 9</p>
        </div>
      </div>

      {/* Middle Grid: Breakdown Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistik & Distribusi Sekolah */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span>Statistik & Distribusi Sekolah</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Komposisi peserta didik dan konten akademik semester aktif</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200">
              Semester Genap 2026
            </span>
          </div>

          {/* Progress Bars for Grades */}
          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">Kelas 7 (Tingkat Pertama)</span>
                <span className="text-blue-700">{grade7Count} Siswa ({totalStudents ? Math.round((grade7Count / totalStudents) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${totalStudents ? (grade7Count / totalStudents) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">Kelas 8 (Tingkat Kedua)</span>
                <span className="text-indigo-700">{grade8Count} Siswa ({totalStudents ? Math.round((grade8Count / totalStudents) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${totalStudents ? (grade8Count / totalStudents) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">Kelas 9 (Tingkat Kelulusan)</span>
                <span className="text-teal-700">{grade9Count} Siswa ({totalStudents ? Math.round((grade9Count / totalStudents) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${totalStudents ? (grade9Count / totalStudents) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Academic Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jadwal Aktif</span>
              <span className="text-lg font-black text-slate-800 mt-0.5 block">{publishedSchedulesCount}</span>
              <span className="text-[10px] font-semibold text-emerald-600">Dipublikasi</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pengumuman</span>
              <span className="text-lg font-black text-slate-800 mt-0.5 block">{announcements.length}</span>
              <span className="text-[10px] font-semibold text-blue-600">Tersiar</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bank Quiz</span>
              <span className="text-lg font-black text-slate-800 mt-0.5 block">{quizzes.length}</span>
              <span className="text-[10px] font-semibold text-indigo-600">Materi Ujian</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sesi Login</span>
              <span className="text-lg font-black text-slate-800 mt-0.5 block">{deviceSessions.length || 1}</span>
              <span className="text-[10px] font-semibold text-purple-600">Perangkat Aktif</span>
            </div>
          </div>
        </div>

        {/* Sesi Perangkat & Keamanan */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Keamanan Sesi Perangkat</span>
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Sistem memantau sesi login aktif seluruh pengguna untuk mencegah akses tanpa izin.
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="font-bold text-slate-700">Smartphone & Tablet</span>
                <span className="font-mono font-bold text-slate-900">{activeMobileSessions} Perangkat</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="font-bold text-slate-700">Laptop & Komputer</span>
                <span className="font-mono font-bold text-slate-900">{activeDesktopSessions} Perangkat</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs">
                <span className="font-bold">Sinkronisasi Database</span>
                <span className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Real-Time
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('devices')}
            className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Kelola Sesi Perangkat</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Grid: Recent Activity & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aktivitas Terbaru Sekolah */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              <span>Aktivitas Terbaru Sistem</span>
            </h3>
            <button
              onClick={() => onNavigateTab('activity_log')}
              className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Belum ada riwayat aktivitas tercatat.</p>
            ) : (
              activityLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-200/70 flex items-start justify-between gap-3 transition text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{log.title}</span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-slate-600">
                        {log.type || 'sistem'}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{log.description}</p>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Oleh: {log.userName} ({log.userRole})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Menu Shortcuts */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
          <h3 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-3">
            Aksi Cepat Administrasi
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => onNavigateTab('classes')}
              className="w-full p-3 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 border border-slate-200 rounded-2xl text-left transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Manajemen Kelas</span>
                  <span className="text-[10px] text-slate-500">Atur rombel & wali kelas</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigateTab('schedules')}
              className="w-full p-3 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-2xl text-left transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Jadwal Mata Pelajaran</span>
                  <span className="text-[10px] text-slate-500">Unggah foto jadwal kelas 7, 8, 9</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigateTab('social_monitor')}
              className="w-full p-3 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 border border-slate-200 rounded-2xl text-left transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Pantau Feed & Story</span>
                  <span className="text-[10px] text-slate-500">Moderasi konten media sosial</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigateTab('notifications')}
              className="w-full p-3 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 rounded-2xl text-left transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Siaran Notifikasi</span>
                  <span className="text-[10px] text-slate-500">Kirim pemberitahuan ke portal</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
