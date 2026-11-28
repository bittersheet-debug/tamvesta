export type AppPermissionType = 'notifications' | 'camera' | 'media';

export type AppPermissionStatus = 'granted' | 'denied' | 'prompt' | 'limited' | 'unsupported';

export interface PermissionItemState {
  status: AppPermissionStatus;
  permanentlyDenied?: boolean;
}

export interface AllPermissionsState {
  platform: 'android' | 'web';
  sdkInt: number;
  canOpenSettings: boolean;
  notifications: PermissionItemState;
  camera: PermissionItemState;
  media: PermissionItemState;
}

export interface RolePermissionMeta {
  type: AppPermissionType;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  recommended: boolean;
}

interface TamvestaPermissionsNativePlugin {
  checkAllPermissions(): Promise<{
    platform?: string;
    sdkInt?: number;
    canOpenSettings?: boolean;
    notifications?: AppPermissionStatus;
    notificationsPermanentlyDenied?: boolean;
    camera?: AppPermissionStatus;
    cameraPermanentlyDenied?: boolean;
    media?: AppPermissionStatus;
    mediaPermanentlyDenied?: boolean;
  }>;
  requestPermission(options: { permission: AppPermissionType }): Promise<{
    status: AppPermissionStatus;
    permanentlyDenied?: boolean;
  }>;
  openAppSettings(): Promise<{ opened: boolean }>;
  showNativeNotification(options: {
    title: string;
    body?: string;
    tag?: string;
  }): Promise<{ shown: boolean }>;
}

const ONBOARDING_KEY = 'tamvesta_app_permissions_onboarded_v1';
const DENIED_HINT_KEY = 'tamvesta_permission_denied_flags_v1';

function getNativePlugin(): TamvestaPermissionsNativePlugin | null {
  if (typeof window === 'undefined') return null;
  const cap = (window as any).Capacitor;
  if (!cap) return null;
  const plugin = cap.Plugins?.TamvestaPermissions;
  if (plugin && typeof plugin.checkAllPermissions === 'function') {
    return plugin as TamvestaPermissionsNativePlugin;
  }
  return null;
}

export function isNativeAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
    return true;
  }
  return !!getNativePlugin();
}

function getDeniedFlags(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(DENIED_HINT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setDeniedFlag(type: AppPermissionType, denied: boolean): void {
  try {
    const flags = getDeniedFlags();
    flags[type] = denied;
    localStorage.setItem(DENIED_HINT_KEY, JSON.stringify(flags));
  } catch {
    // ignore storage errors
  }
}

export function hasCompletedPermissionOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markPermissionOnboardingCompleted(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // ignore
  }
}

export function resetPermissionOnboarding(): void {
  try {
    localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // ignore
  }
}

function normalizeStatus(val?: string | null): AppPermissionStatus {
  if (val === 'granted' || val === 'denied' || val === 'limited' || val === 'unsupported') {
    return val;
  }
  return 'prompt';
}

async function queryWebPermission(name: string): Promise<AppPermissionStatus> {
  try {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      const res = await navigator.permissions.query({ name: name as PermissionName });
      if (res.state === 'granted') return 'granted';
      if (res.state === 'denied') return 'denied';
      return 'prompt';
    }
  } catch {
    // Some browsers/WebViews do not support querying specific permission names
  }
  return 'prompt';
}

export async function checkAllPermissions(): Promise<AllPermissionsState> {
  const nativePlugin = getNativePlugin();
  if (nativePlugin) {
    try {
      const res = await nativePlugin.checkAllPermissions();
      return {
        platform: 'android',
        sdkInt: typeof res.sdkInt === 'number' ? res.sdkInt : 33,
        canOpenSettings: res.canOpenSettings !== false,
        notifications: {
          status: normalizeStatus(res.notifications),
          permanentlyDenied: !!res.notificationsPermanentlyDenied,
        },
        camera: {
          status: normalizeStatus(res.camera),
          permanentlyDenied: !!res.cameraPermanentlyDenied,
        },
        media: {
          status: normalizeStatus(res.media),
          permanentlyDenied: !!res.mediaPermanentlyDenied,
        },
      };
    } catch (err) {
      console.warn('TamvestaPermissions.checkAllPermissions failed:', err);
    }
  }

  // Web / PWA fallback
  let notifStatus: AppPermissionStatus = 'prompt';
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') notifStatus = 'granted';
      else if (Notification.permission === 'denied') notifStatus = 'denied';
      else notifStatus = 'prompt';
    } else {
      const saved = localStorage.getItem('tamvesta_notif_permission');
      if (saved === 'granted') notifStatus = 'granted';
      else if (saved === 'denied') notifStatus = 'denied';
    }
  } catch {
    notifStatus = 'prompt';
  }

  const cameraStatus = await queryWebPermission('camera');
  // In standard web browsers, file input (<input type="file">) uses the OS picker on user gesture
  // without requiring a separate persistent storage permission.
  const mediaStatus: AppPermissionStatus =
    typeof document !== 'undefined' ? 'granted' : 'unsupported';

  const deniedFlags = getDeniedFlags();
  return {
    platform: 'web',
    sdkInt: 0,
    canOpenSettings: false,
    notifications: {
      status: notifStatus,
      permanentlyDenied: notifStatus === 'denied' && !!deniedFlags.notifications,
    },
    camera: {
      status: cameraStatus,
      permanentlyDenied: cameraStatus === 'denied',
    },
    media: {
      status: mediaStatus,
      permanentlyDenied: false,
    },
  };
}

export async function requestAppPermission(
  type: AppPermissionType
): Promise<PermissionItemState> {
  const nativePlugin = getNativePlugin();
  if (nativePlugin) {
    try {
      const res = await nativePlugin.requestPermission({ permission: type });
      const status = normalizeStatus(res.status);
      const permanentlyDenied = !!res.permanentlyDenied;
      setDeniedFlag(type, status === 'denied');

      if (type === 'notifications') {
        try {
          localStorage.setItem('tamvesta_notif_permission', status === 'granted' ? 'granted' : 'denied');
          localStorage.setItem('tamvesta_notif_enabled', status === 'granted' ? 'true' : 'false');
          window.dispatchEvent(
            new CustomEvent('tamvesta_notification_permission_changed', {
              detail: status === 'granted' ? 'granted' : 'denied',
            })
          );
        } catch {
          // ignore
        }
      }

      window.dispatchEvent(
        new CustomEvent('tamvesta_app_permissions_changed', {
          detail: { type, status, permanentlyDenied },
        })
      );

      return { status, permanentlyDenied };
    } catch (err) {
      console.warn(`TamvestaPermissions.requestPermission(${type}) failed:`, err);
    }
  }

  // Web / PWA fallback (only triggered by explicit user action)
  if (type === 'notifications') {
    let status: AppPermissionStatus = 'prompt';
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && typeof Notification.requestPermission === 'function') {
        const res = await Notification.requestPermission();
        status = res === 'granted' ? 'granted' : res === 'denied' ? 'denied' : 'prompt';
      } else {
        status = 'granted';
      }
      localStorage.setItem('tamvesta_notif_permission', status === 'granted' ? 'granted' : 'denied');
      localStorage.setItem('tamvesta_notif_enabled', status === 'granted' ? 'true' : 'false');
      window.dispatchEvent(
        new CustomEvent('tamvesta_notification_permission_changed', {
          detail: status === 'granted' ? 'granted' : 'denied',
        })
      );
    } catch {
      status = 'denied';
    }
    setDeniedFlag('notifications', status === 'denied');
    window.dispatchEvent(
      new CustomEvent('tamvesta_app_permissions_changed', {
        detail: { type, status, permanentlyDenied: status === 'denied' },
      })
    );
    return { status, permanentlyDenied: status === 'denied' };
  }

  if (type === 'camera') {
    // Only request camera stream on explicit user request, and immediately stop tracks
    // so the camera hardware is never left active without user action.
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
        setDeniedFlag('camera', false);
        window.dispatchEvent(
          new CustomEvent('tamvesta_app_permissions_changed', {
            detail: { type, status: 'granted', permanentlyDenied: false },
          })
        );
        return { status: 'granted', permanentlyDenied: false };
      }
    } catch {
      setDeniedFlag('camera', true);
      window.dispatchEvent(
        new CustomEvent('tamvesta_app_permissions_changed', {
          detail: { type, status: 'denied', permanentlyDenied: true },
        })
      );
      return { status: 'denied', permanentlyDenied: true };
    }
    return { status: 'unsupported', permanentlyDenied: false };
  }

  // Media on Web
  window.dispatchEvent(
    new CustomEvent('tamvesta_app_permissions_changed', {
      detail: { type, status: 'granted', permanentlyDenied: false },
    })
  );
  return { status: 'granted', permanentlyDenied: false };
}

export async function openAppSettings(): Promise<boolean> {
  const nativePlugin = getNativePlugin();
  if (nativePlugin) {
    try {
      const res = await nativePlugin.openAppSettings();
      return !!res.opened;
    } catch (err) {
      console.warn('TamvestaPermissions.openAppSettings failed:', err);
    }
  }
  return false;
}

export async function showAndroidNativeNotification(
  title: string,
  body?: string,
  tag?: string
): Promise<boolean> {
  const nativePlugin = getNativePlugin();
  if (!nativePlugin) return false;
  try {
    const res = await nativePlugin.showNativeNotification({ title, body, tag });
    return !!res.shown;
  } catch {
    return false;
  }
}

/**
 * Memastikan izin tersedia tepat sebelum fitur digunakan (Just-in-Time).
 * Mengembalikan true jika izin diberikan (atau limited untuk media),
 * dan memicu dialog/panduan pengaturan jika ditolak tanpa memblokir fitur lain.
 */
export async function ensurePermissionForFeature(
  type: AppPermissionType,
  featureLabel?: string
): Promise<boolean> {
  const all = await checkAllPermissions();
  const current = all[type];

  if (current.status === 'granted' || current.status === 'limited') {
    return true;
  }

  if (current.status === 'unsupported') {
    return true;
  }

  // Jika belum pernah ditolak permanen, minta izin resmi Android/OS secara langsung
  if (!current.permanentlyDenied) {
    const req = await requestAppPermission(type);
    if (req.status === 'granted' || req.status === 'limited') {
      return true;
    }
  }

  // Jika ditolak, buka modal manajemen izin untuk panduan/buka pengaturan aplikasi
  window.dispatchEvent(
    new CustomEvent('tamvesta_open_permission_manager', {
      detail: { focusPermission: type, featureLabel },
    })
  );
  return false;
}

export function openPermissionManager(focusPermission?: AppPermissionType, featureLabel?: string): void {
  window.dispatchEvent(
    new CustomEvent('tamvesta_open_permission_manager', {
      detail: { focusPermission, featureLabel },
    })
  );
}

/**
 * Daftar izin & penjelasan yang disesuaikan dengan portal / peran pengguna TAMVESTA
 */
export function getPermissionsForRole(role?: string): {
  portalName: string;
  items: RolePermissionMeta[];
} {
  const r = (role || 'siswa').toLowerCase();

  if (r === 'admin') {
    return {
      portalName: 'Portal Dashboard Admin',
      items: [
        {
          type: 'notifications',
          title: 'Izin Notifikasi Sistem',
          subtitle: 'Keamanan, Aktivitas Akun & Pengumuman',
          description:
            'Terima notifikasi real-time untuk aktivitas akun, laporan masuk, pesan DM, dan status sistem sekolah.',
          features: ['Notifikasi keamanan & akun', 'Pesan DM & laporan', 'Pengumuman sekolah'],
          recommended: true,
        },
        {
          type: 'camera',
          title: 'Izin Kamera',
          subtitle: 'QR Scanner, Dokumentasi & Profil',
          description:
            'Digunakan saat memindai QR absensi, mengambil foto dokumentasi, atau memperbarui foto profil admin.',
          features: ['Scan QR absensi', 'Foto profil akun', 'Dokumentasi cepat'],
          recommended: true,
        },
        {
          type: 'media',
          title: 'Izin Foto & Media',
          subtitle: 'Unggah Jadwal, Dokumen & Foto',
          description:
            'Mengizinkan pemilihan gambar, file jadwal Excel, dan dokumen administrasi dari perangkat Anda.',
          features: ['Unggah jadwal & dokumen', 'Foto profil & monitor media', 'Lampiran DM'],
          recommended: true,
        },
      ],
    };
  }

  if (r === 'tata_usaha' || r === 'satpam') {
    return {
      portalName: r === 'satpam' ? 'Portal Keamanan & Administrasi' : 'Portal Administrasi (Tata Usaha)',
      items: [
        {
          type: 'notifications',
          title: 'Izin Notifikasi Administrasi',
          subtitle: 'Pembayaran, Surat & Pengumuman',
          description:
            'Dapatkan pemberitahuan instan untuk konfirmasi pembayaran SPP, pesan DM, dan pengumuman resmi sekolah.',
          features: ['Info administrasi & pembayaran', 'Pesan DM masuk', 'Pengumuman sekolah'],
          recommended: true,
        },
        {
          type: 'camera',
          title: 'Izin Kamera',
          subtitle: 'Dokumentasi & Foto Profil',
          description:
            'Ambil foto dokumentasi lapangan, barang temuan, atau perbarui foto profil akun secara langsung.',
          features: ['Foto dokumentasi & bukti', 'Foto profil akun', 'Scan QR sekolah'],
          recommended: true,
        },
        {
          type: 'media',
          title: 'Izin Foto & Media',
          subtitle: 'Unggah Berkas & Bukti Pembayaran',
          description:
            'Pilih foto, dokumen pembayaran, dan lampiran gambar dari galeri perangkat untuk arsip maupun DM.',
          features: ['Unggah dokumen & gambar', 'Lampiran foto DM', 'Foto profil'],
          recommended: true,
        },
      ],
    };
  }

  if (r === 'guru' || r === 'kepala_sekolah') {
    return {
      portalName: r === 'kepala_sekolah' ? 'Portal Kepala Sekolah' : 'Portal Guru',
      items: [
        {
          type: 'notifications',
          title: 'Izin Notifikasi Akademik',
          subtitle: 'Jadwal, Tugas, Pengumuman & DM',
          description:
            'Terima pengingat jadwal mengajar, pengumpulan tugas siswa, pesan DM, dan pengumuman sekolah.',
          features: ['Pengumuman sekolah', 'Jadwal & tugas siswa', 'Pesan DM masuk'],
          recommended: true,
        },
        {
          type: 'camera',
          title: 'Izin Kamera',
          subtitle: 'Scan QR Absensi & Dokumentasi',
          description:
            'Aktifkan kamera hanya saat memindai QR kehadiran siswa, mengambil dokumentasi kelas, atau foto profil.',
          features: ['Scan QR absensi', 'Dokumentasi kegiatan', 'Foto profil guru'],
          recommended: true,
        },
        {
          type: 'media',
          title: 'Izin Foto & Media',
          subtitle: 'Materi, Foto Profil & DM',
          description:
            'Unggah materi pembelajaran, foto kegiatan kelas, dan kirim gambar melalui DM dengan persetujuan Anda.',
          features: ['Unggah dokumen & gambar', 'Kirim foto melalui DM', 'Foto profil'],
          recommended: true,
        },
      ],
    };
  }

  // Default: Portal Siswa (siswa, support, panitia)
  return {
    portalName: 'Portal Siswa',
    items: [
      {
        type: 'notifications',
        title: 'Izin Notifikasi Sekolah',
        subtitle: 'Pengumuman, DM, Jadwal, Tugas & SPP',
        description:
          'Agar tidak ketinggalan pengumuman sekolah, pesan DM baru, jadwal pelajaran, tugas/kuis, dan info pembayaran.',
        features: [
          'Pengumuman resmi sekolah',
          'Pesan DM masuk',
          'Jadwal pelajaran & tugas',
          'Informasi administrasi & pembayaran',
        ],
        recommended: true,
      },
      {
        type: 'camera',
        title: 'Izin Kamera',
        subtitle: 'Foto Profil, Dokumentasi & Scan QR',
        description:
          'Kamera hanya aktif saat Anda memilih mengambil foto profil, memindai QR absensi, atau dokumentasi.',
        features: ['Ambil foto profil', 'Dokumentasi & story', 'Scan QR absensi'],
        recommended: true,
      },
      {
        type: 'media',
        title: 'Izin Foto & Media',
        subtitle: 'Galeri Foto Profil, DM & Unggahan',
        description:
          'Memilih dan mengunggah foto, gambar, atau dokumen dari galeri untuk foto profil, DM, dan laporan.',
        features: ['Foto profil & pengaturan akun', 'Kirim foto melalui DM', 'Unggah dokumen & gambar'],
        recommended: true,
      },
    ],
  };
}
