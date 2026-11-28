import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, ShieldAlert, X, UserPlus } from 'lucide-react';
import type { AppNotification } from '../types/index.ts';

export type ToastVariant = 'success' | 'error' | 'info' | 'admin';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  statusLabel?: string;
  variant: ToastVariant;
  dedupeKey?: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  showSuccess: () => {},
  showError: () => {},
  showInfo: () => {},
  dismissToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => {
      if (toast.dedupeKey && prev.some((t) => t.dedupeKey === toast.dedupeKey)) {
        return prev;
      }
      return [{ ...toast, id }, ...prev].slice(0, 4);
    });

    const duration = toast.variant === 'admin' ? 8000 : toast.variant === 'error' ? 5500 : 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    showToast({ title, message, variant: 'success' });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string) => {
    showToast({ title, message, variant: 'error' });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    showToast({ title, message, variant: 'info' });
  }, [showToast]);

  // Listen to dedicated Admin Dashboard real-time notifications (dispatched ONLY when logged in user is Admin)
  useEffect(() => {
    const onAdminNotif = (e: Event) => {
      const notif = (e as CustomEvent<AppNotification>).detail;
      if (!notif) return;
      showToast({
        title: notif.title || 'AKUN BARU DITAMBAHKAN',
        message: notif.message || 'Admin lain telah menambahkan akun baru ke sistem TAMVESTA.',
        statusLabel: notif.statusLabel || 'Status: Berhasil ditambahkan.',
        variant: 'admin',
        dedupeKey: notif.dedupeKey || notif.id,
      });
    };

    window.addEventListener('tamvesta_admin_notification', onAdminNotif);
    return () => window.removeEventListener('tamvesta_admin_notification', onAdminNotif);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, dismissToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-4 left-3 right-3 sm:left-auto sm:right-5 sm:w-full sm:max-w-md z-[120] flex flex-col gap-2.5 pointer-events-none">
          {toasts.map((t) => {
            const isAdmin = t.variant === 'admin';
            const isSuccess = t.variant === 'success';
            const isError = t.variant === 'error';

            return (
              <div
                key={t.id}
                className={`pointer-events-auto rounded-2xl p-3.5 sm:p-4 shadow-2xl border flex items-start gap-3 transition-all animate-in slide-in-from-top-3 fade-in duration-200 ${
                  isAdmin
                    ? 'bg-slate-900 text-white border-emerald-500/60 ring-2 ring-emerald-400/25'
                    : isSuccess
                    ? 'bg-emerald-950/95 text-white border-emerald-500/40'
                    : isError
                    ? 'bg-rose-950/95 text-white border-rose-500/50'
                    : 'bg-slate-900/95 text-white border-slate-700'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isAdmin
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : isSuccess
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : isError
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}
                >
                  {isAdmin ? (
                    <UserPlus className="w-5 h-5" />
                  ) : isSuccess ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isError ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <Info className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {isAdmin && (
                    <span className="inline-block text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-1">
                      Notifikasi Admin Dashboard
                    </span>
                  )}
                  <h4 className="text-xs sm:text-sm font-black leading-snug break-words">{t.title}</h4>
                  {t.message && (
                    <p className="text-[11px] sm:text-xs text-slate-200/90 mt-0.5 leading-relaxed break-words">
                      {t.message}
                    </p>
                  )}
                  {t.statusLabel && (
                    <p className="text-[11px] font-bold text-emerald-300 mt-1">{t.statusLabel}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => dismissToast(t.id)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition shrink-0"
                  aria-label="Tutup notifikasi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
};
