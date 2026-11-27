import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  Laptop,
  X,
  Shield,
  Clock,
  CheckCircle2,
  Trash2,
  AlertCircle,
  RefreshCw,
  Globe,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import type { DeviceSession } from '../types/index.ts';

interface DeviceSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function detectCurrentDeviceInfo(): {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  deviceName: string;
} {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'desktop',
      os: 'Unknown',
      browser: 'Web Browser',
      deviceName: 'Komputer / Laptop',
    };
  }

  const ua = navigator.userAgent || '';
  let os = 'Unknown OS';
  let deviceName = 'Perangkat Tidak Dikenal';

  // Detect OS
  if (/Android/i.test(ua)) {
    os = 'Android';
    const match = ua.match(/Android\s([0-9\.]+)/i);
    const osVer = match ? ` ${match[1]}` : '';
    const modelMatch = ua.match(/;\s?([^;]+)\sBuild/i);
    deviceName = modelMatch ? modelMatch[1].trim() : `Smartphone Android${osVer}`;
  } else if (/iPhone/i.test(ua)) {
    os = 'iOS';
    deviceName = 'Apple iPhone';
  } else if (/iPad/i.test(ua)) {
    os = 'iPadOS';
    deviceName = 'Apple iPad';
  } else if (/Windows NT/i.test(ua)) {
    os = 'Windows';
    deviceName = 'Komputer / Laptop Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
    deviceName = 'Apple Mac / MacBook';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    deviceName = 'Perangkat Linux';
  }

  // Detect Browser
  let browser = 'Chrome';
  if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';
  else if (/Capacitor|Android WebView|wv/i.test(ua)) browser = 'Aplikasi TAMVESTA (APK)';

  // Detect Device Type
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  const width = window.innerWidth;
  if (/iPad|Tablet/i.test(ua) || (width >= 640 && width <= 1024 && /Mobile/i.test(ua))) {
    deviceType = 'tablet';
  } else if (/Mobi|Android|iPhone/i.test(ua) || width < 640) {
    deviceType = 'mobile';
  }

  return { deviceType, os, browser, deviceName };
}

export const DeviceSessionsModal: React.FC<DeviceSessionsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const currentInfo = detectCurrentDeviceInfo();

  const getSessionStorageId = () => {
    try {
      let sId = localStorage.getItem('tamvesta_device_session_id');
      if (!sId) {
        sId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        localStorage.setItem('tamvesta_device_session_id', sId);
      }
      return sId;
    } catch (_) {
      return 'sess_local_current';
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const currentSessionId = getSessionStorageId();

      // Record / update current session first
      if (user) {
        await api.recordDeviceSession({
          id: currentSessionId,
          deviceName: currentInfo.deviceName,
          deviceType: currentInfo.deviceType,
          os: currentInfo.os,
          browser: currentInfo.browser,
          isCurrent: true,
        }).catch(() => {});
      }

      const fetched = await api.getMyDeviceSessions();
      if (Array.isArray(fetched) && fetched.length > 0) {
        const enriched = fetched.map((s) => ({
          ...s,
          isCurrent: s.id === currentSessionId || (s.deviceName === currentInfo.deviceName && s.browser === currentInfo.browser),
        }));
        setSessions(enriched);
      } else {
        // Fallback session info
        setSessions([
          {
            id: currentSessionId,
            userId: user?.id || 'me',
            username: user?.username || 'user',
            userName: user?.name || 'Pengguna',
            userRole: user?.role || 'siswa',
            deviceName: currentInfo.deviceName,
            deviceType: currentInfo.deviceType,
            os: currentInfo.os,
            browser: currentInfo.browser,
            lastActive: new Date().toISOString(),
            isCurrent: true,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('Apakah Anda yakin ingin mengakhiri sesi login pada perangkat ini?')) return;
    setTerminatingId(sessionId);
    try {
      await api.terminateDeviceSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setNotice('Sesi perangkat berhasil dihentikan.');
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Gagal mengakhiri sesi perangkat.');
    } finally {
      setTerminatingId(null);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-emerald-600" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-indigo-600" />;
      case 'desktop':
      default:
        return <Laptop className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-2xl backdrop-blur-sm">
              <Shield className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">Informasi Perangkat</h3>
              <p className="text-[11px] text-emerald-200">Kelola riwayat & status login sesi akun Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        {notice && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notice}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Card Perangkat Saat Ini (Current Device) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border-2 border-emerald-300 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getDeviceIcon(currentInfo.deviceType)}
                <span className="text-xs font-black text-slate-800">{currentInfo.deviceName}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>Current Device (Aktif)</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
              <div>
                <span className="text-slate-400 block text-[10px]">Sistem Operasi:</span>
                <span className="font-bold text-slate-700">{currentInfo.os}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Browser / Aplikasi:</span>
                <span className="font-bold text-slate-700">{currentInfo.browser}</span>
              </div>
            </div>
          </div>

          {/* List Perangkat Lainnya */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Daftar Sesi Perangkat ({sessions.length})
              </h4>
              <button
                type="button"
                onClick={loadSessions}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Memeriksa perangkat yang aktif...</p>
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400">Tidak ada data sesi perangkat lain.</p>
            ) : (
              <div className="space-y-2.5">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                      sess.isCurrent
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-slate-100 rounded-xl shrink-0">
                        {getDeviceIcon(sess.deviceType)}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-slate-800 truncate">{sess.deviceName || 'Perangkat'}</p>
                          {sess.isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-600 text-white shrink-0">
                              Ini
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {sess.os} • {sess.browser}
                        </p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {sess.isCurrent
                              ? 'Aktif saat ini'
                              : `Terakhir aktif: ${new Date(sess.lastActive || sess.createdAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}`}
                          </span>
                        </p>
                      </div>
                    </div>

                    {!sess.isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleTerminateSession(sess.id)}
                        disabled={terminatingId === sess.id}
                        className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 rounded-xl font-bold transition flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                        title="Akhiri sesi login perangkat ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Keluarkan</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Keamanan */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Jika Anda mendapati perangkat mencurigakan yang tidak Anda kenali, segera tekan tombol <strong>Keluarkan</strong> dan ganti kata sandi akun Anda melalui menu Profil.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
