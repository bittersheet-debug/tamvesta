import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types/index.ts';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../lib/api.ts';
import { realtimeSync } from '../lib/realtimeSync.ts';
import { setClientSessionId } from '../lib/deviceIdentity.ts';

function detectDeviceMetadata() {
  if (typeof navigator === 'undefined') {
    return { deviceType: 'desktop' as const, os: 'Unknown', browser: 'Browser', deviceName: 'Web Browser' };
  }
  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPod|Mobile/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  const deviceType: 'mobile' | 'tablet' | 'desktop' = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
  const os = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua)
    ? 'iOS'
    : /Windows/i.test(ua)
    ? 'Windows'
    : /Mac OS/i.test(ua)
    ? 'macOS'
    : 'Linux';
  const browser = /Edg/i.test(ua)
    ? 'Edge'
    : /Chrome/i.test(ua)
    ? 'Chrome'
    : /Safari/i.test(ua)
    ? 'Safari'
    : /Firefox/i.test(ua)
    ? 'Firefox'
    : 'TAMVESTA App';
  return { deviceType, os, browser, deviceName: `${os} (${browser})` };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  mustChangePassword: boolean;
  loginNotice: string | null;
  setLoginNotice: (val: string | null) => void;
  login: (username: string, password: string) => Promise<{ mustChangePassword: boolean }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setMustChangePassword: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      realtimeSync.stop();
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res?.user) {
        setUser(res.user);
        setMustChangePassword(!!res.mustChangePassword);
        realtimeSync.start(token, res.user);
      }
    } catch (err: any) {
      console.warn('Failed to restore session:', err);
      if (
        err?.status === 401 ||
        err?.status === 403 ||
        err?.code === 'SESSION_REVOKED' ||
        err?.code === 'ACCOUNT_DISABLED' ||
        err?.message?.includes('401') ||
        err?.message?.includes('kadaluarsa')
      ) {
        realtimeSync.stop();
        removeStoredToken();
        setUser(null);
        if (err?.message) {
          setLoginNotice(err.message);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Connect real-time multi-device stream & handle session revocation across devices
  useEffect(() => {
    const token = getStoredToken();
    if (user && token) {
      realtimeSync.start(token, user);
    } else {
      realtimeSync.stop();
    }

    const handleRevoked = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      realtimeSync.stop();
      removeStoredToken();
      setUser(null);
      setMustChangePassword(false);
      setLoginNotice(detail?.reason || 'Sesi akun Anda telah dicabut atau akun dinonaktifkan oleh Admin.');
    };

    const handleRealtimeUserSync = (e: Event) => {
      const ev = (e as CustomEvent)?.detail;
      if (ev?.entity === 'users' || ev?.entity === 'system' || ev?.entity === 'devices') {
        refreshUser();
      }
    };

    window.addEventListener('tamvesta_session_revoked', handleRevoked);
    window.addEventListener('tamvesta_realtime_sync', handleRealtimeUserSync);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('tamvesta_admin_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'REFRESH_ALL' || event.data?.userId === user?.id) {
          refreshUser();
        }
      };
    } catch (_) {}

    return () => {
      window.removeEventListener('tamvesta_session_revoked', handleRevoked);
      window.removeEventListener('tamvesta_realtime_sync', handleRealtimeUserSync);
      try {
        channel?.close();
      } catch (_) {}
    };
  }, [user?.id, refreshUser]);

  const login = async (username: string, password: string) => {
    const res = await api.login({ username, password });
    setStoredToken(res.token);
    setUser(res.user);
    setMustChangePassword(res.mustChangePassword);
    sessionStorage.removeItem('tamvesta_welcome_shown');
    realtimeSync.start(res.token, res.user);
    // Register device session for Admin multi-device session visibility & revocation
    try {
      const meta = detectDeviceMetadata();
      const sessRes = await api.recordDeviceSession(meta);
      if (sessRes?.session?.id) {
        setClientSessionId(sessRes.session.id);
      }
    } catch (_) {}
    return { mustChangePassword: res.mustChangePassword };
  };

  const logout = () => {
    realtimeSync.stop();
    removeStoredToken();
    setUser(null);
    setMustChangePassword(false);
    sessionStorage.removeItem('tamvesta_welcome_shown');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        mustChangePassword,
        loginNotice,
        setLoginNotice,
        login,
        logout,
        refreshUser,
        setMustChangePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
