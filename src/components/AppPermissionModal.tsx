import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Camera,
  Image as ImageIcon,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Settings,
  X,
  Lock,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  type AppPermissionType,
  type AllPermissionsState,
  checkAllPermissions,
  requestAppPermission,
  openAppSettings,
  hasCompletedPermissionOnboarding,
  markPermissionOnboardingCompleted,
  getPermissionsForRole,
} from '../lib/permissionService.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface AppPermissionModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const AppPermissionModal: React.FC<AppPermissionModalProps> = ({
  forceOpen = false,
  onClose,
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [permState, setPermState] = useState<AllPermissionsState | null>(null);
  const [loadingType, setLoadingType] = useState<AppPermissionType | 'all' | null>(null);
  const [focusPermission, setFocusPermission] = useState<AppPermissionType | null>(null);
  const [featureLabel, setFeatureLabel] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'info' | 'warning';
    text: string;
  } | null>(null);

  const refreshPermissions = useCallback(async () => {
    const state = await checkAllPermissions();
    setPermState(state);
    return state;
  }, []);

  // Refresh state when modal opens or app regains focus (e.g. returning from Android Settings)
  useEffect(() => {
    if (!isOpen) return;
    refreshPermissions();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        refreshPermissions();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [isOpen, refreshPermissions]);

  // Listen to global open events (from Navbar, Profile, or Just-in-Time feature checks)
  useEffect(() => {
    const handleOpenManager = (e: Event) => {
      const detail = (e as CustomEvent)?.detail || {};
      setFocusPermission(detail.focusPermission || null);
      setFeatureLabel(detail.featureLabel || null);
      setFeedback(null);
      setIsOpen(true);
    };

    const handleOpenNotif = () => {
      setFocusPermission('notifications');
      setFeatureLabel('Notifikasi Pengumuman, DM, Jadwal & Pembayaran');
      setFeedback(null);
      setIsOpen(true);
    };

    window.addEventListener('tamvesta_open_permission_manager', handleOpenManager);
    window.addEventListener('tamvesta_open_notification_prompt', handleOpenNotif);
    return () => {
      window.removeEventListener('tamvesta_open_permission_manager', handleOpenManager);
      window.removeEventListener('tamvesta_open_notification_prompt', handleOpenNotif);
    };
  }, []);

  // First-launch onboarding check
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    if (hasCompletedPermissionOnboarding()) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const state = await checkAllPermissions();
      if (cancelled) return;
      setPermState(state);

      const allGranted =
        state.notifications.status === 'granted' &&
        state.camera.status === 'granted' &&
        (state.media.status === 'granted' || state.media.status === 'limited');

      if (!allGranted) {
        setIsOpen(true);
      } else {
        markPermissionOnboardingCompleted();
      }
    }, 900);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [forceOpen]);

  if (!isOpen) return null;

  const { portalName, items } = getPermissionsForRole(user?.role);

  const handleClose = () => {
    markPermissionOnboardingCompleted();
    setIsOpen(false);
    setFocusPermission(null);
    setFeatureLabel(null);
    setFeedback(null);
    if (onClose) onClose();
  };

  const handleRequestSingle = async (type: AppPermissionType) => {
    setLoadingType(type);
    setFeedback(null);
    try {
      const result = await requestAppPermission(type);
      await refreshPermissions();
      if (result.status === 'granted' || result.status === 'limited') {
        setFeedback({
          type: 'success',
          text: `Izin ${
            type === 'notifications' ? 'Notifikasi' : type === 'camera' ? 'Kamera' : 'Foto & Media'
          } berhasil diaktifkan.`,
        });
      } else if (result.permanentlyDenied) {
        setFeedback({
          type: 'warning',
          text: 'Izin ditolak di sistem perangkat. Tekan "Buka Pengaturan Aplikasi" untuk mengaktifkannya kembali.',
        });
      } else {
        setFeedback({
          type: 'info',
          text: 'Izin belum diberikan. Fitur lain di TAMVESTA tetap dapat digunakan seperti biasa.',
        });
      }
    } finally {
      setLoadingType(null);
    }
  };

  const handleRequestAll = async () => {
    setLoadingType('all');
    setFeedback(null);
    try {
      const current = await refreshPermissions();
      const order: AppPermissionType[] = ['notifications', 'camera', 'media'];
      let grantedCount = 0;

      for (const type of order) {
        const item = current[type];
        if (item.status === 'granted' || item.status === 'limited') {
          grantedCount++;
          continue;
        }
        const res = await requestAppPermission(type);
        if (res.status === 'granted' || res.status === 'limited') {
          grantedCount++;
        }
      }

      const updated = await refreshPermissions();
      const allOk =
        updated.notifications.status === 'granted' &&
        updated.camera.status === 'granted' &&
        (updated.media.status === 'granted' || updated.media.status === 'limited');

      if (allOk) {
        markPermissionOnboardingCompleted();
        setFeedback({
          type: 'success',
          text: 'Semua izin perangkat aktif! TAMVESTA siap digunakan secara optimal.',
        });
        setTimeout(() => {
          handleClose();
        }, 1100);
      } else if (grantedCount > 0) {
        setFeedback({
          type: 'info',
          text: 'Sebagian izin sudah aktif. Anda tetap bisa menggunakan aplikasi atau membuka Pengaturan Aplikasi kapan saja.',
        });
      } else {
        setFeedback({
          type: 'warning',
          text: 'Izin belum diaktifkan. Anda dapat mengaktifkannya kapan saja melalui Pengaturan Aplikasi.',
        });
      }
    } finally {
      setLoadingType(null);
    }
  };

  const handleOpenSettings = async () => {
    const opened = await openAppSettings();
    if (!opened) {
      setFeedback({
        type: 'info',
        text: 'Pada browser web, silakan klik ikon gembok/pengaturan situs di bilah alamat browser untuk mengubah izin Notifikasi & Kamera.',
      });
    }
  };

  const getIcon = (type: AppPermissionType) => {
    if (type === 'notifications') return <Bell className="w-5 h-5" />;
    if (type === 'camera') return <Camera className="w-5 h-5" />;
    return <ImageIcon className="w-5 h-5" />;
  };

  const getStatusBadge = (type: AppPermissionType) => {
    const status = permState?.[type]?.status || 'prompt';
    if (status === 'granted') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" /> Diizinkan
        </span>
      );
    }
    if (status === 'limited') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
          <CheckCircle2 className="w-3 h-3" /> Foto Terpilih
        </span>
      );
    }
    if (status === 'denied') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
          <AlertTriangle className="w-3 h-3" /> Ditolak
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200">
        Belum Diatur
      </span>
    );
  };

  const anyPendingOrDenied =
    !permState ||
    permState.notifications.status !== 'granted' ||
    permState.camera.status !== 'granted' ||
    (permState.media.status !== 'granted' && permState.media.status !== 'limited');

  const anyDenied =
    permState?.notifications.status === 'denied' ||
    permState?.camera.status === 'denied' ||
    permState?.media.status === 'denied';

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Top Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-400 shrink-0" />

        {/* Header */}
        <div className="px-5 pt-5 pb-3 sm:px-6 flex items-start justify-between gap-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
              <ShieldCheck className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  <Sparkles className="w-2.5 h-2.5" /> {portalName}
                </span>
                {permState?.platform === 'android' && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                    Android API {permState.sdkInt}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1 leading-tight">
                Izin Akses Perangkat TAMVESTA
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition shrink-0"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {featureLabel && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Fitur <span className="font-black">{featureLabel}</span> memerlukan izin akses perangkat agar dapat berjalan dengan baik.
              </span>
            </div>
          )}

          {feedback && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold flex items-start gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : feedback.type === 'warning'
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : 'bg-sky-50 border border-sky-200 text-sky-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            TAMVESTA menggunakan sistem izin resmi Android agar Anda tetap aman dan memiliki kendali penuh atas akses perangkat:
          </p>

          {/* Permission Cards */}
          <div className="space-y-3">
            {items.map((item) => {
              const itemState = permState?.[item.type];
              const isGranted = itemState?.status === 'granted' || itemState?.status === 'limited';
              const isDenied = itemState?.status === 'denied';
              const isFocused = focusPermission === item.type;

              return (
                <div
                  key={item.type}
                  className={`p-4 rounded-2xl border transition ${
                    isFocused
                      ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                      : isGranted
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isGranted
                            ? 'bg-emerald-100 text-emerald-700'
                            : isDenied
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-teal-100 text-teal-700'
                        }`}
                      >
                        {getIcon(item.type)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900">
                            {item.title}
                          </h4>
                          {getStatusBadge(item.type)}
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    {!isGranted && (
                      <button
                        type="button"
                        onClick={() =>
                          isDenied && itemState?.permanentlyDenied && permState?.canOpenSettings
                            ? handleOpenSettings()
                            : handleRequestSingle(item.type)
                        }
                        disabled={loadingType !== null}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 transition active:scale-95 disabled:opacity-50 ${
                          isDenied
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        }`}
                      >
                        {loadingType === item.type
                          ? 'Meminta...'
                          : isDenied && itemState?.permanentlyDenied && permState?.canOpenSettings
                          ? 'Setelan'
                          : 'Izinkan'}
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 mt-2.5 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {item.features.map((feat) => (
                      <span
                        key={feat}
                        className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] font-semibold text-slate-600"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Privacy Assurance */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-[11px] text-slate-600">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-800">Privasi Terjaga:</strong> Kamera dan galeri tidak pernah aktif tanpa tindakan Anda. Jika sebagian izin ditolak, fitur TAMVESTA lainnya tetap dapat digunakan.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/70 space-y-2 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            {anyPendingOrDenied && (
              <button
                type="button"
                onClick={handleRequestAll}
                disabled={loadingType !== null}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {loadingType === 'all' ? 'Memproses Izin...' : 'Izinkan Semua Akses'}
                </span>
              </button>
            )}

            {(anyDenied || permState?.canOpenSettings) && (
              <button
                type="button"
                onClick={handleOpenSettings}
                className="py-3 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Pengaturan Aplikasi</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => refreshPermissions()}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-emerald-700 transition px-2 py-1"
            >
              <RefreshCw className="w-3 h-3" /> Segarkan Status
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition"
            >
              {anyPendingOrDenied ? 'Lanjutkan Nanti' : 'Selesai'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
