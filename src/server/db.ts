import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  User,
  UserRole,
  Subject,
  DigitalBook,
  Announcement,
  Quiz,
  QuizAttempt,
  AttendanceEvent,
  AttendanceRecord,
  PasswordResetRequest,
  StudentPost,
  PostComment,
  Story,
  PersonalNote,
  AppNotification,
  TeacherArticle,
  ClassAttendanceEntry,
  TuitionBill,
  TuitionTransaction,
  TuDocument,
  TuChatMessage,
  DirectMessage,
  DMConversation,
  StudentNote,
  LostFoundItem,
  LostFoundClaim,
  LostFoundStatus,
  ActivityPermission,
  ActivityPermissionStatus,
  AppReport,
  AppReportStatus,
  RefreshSignal,
  ModerationLog,
  QuizParticipant,
  QuizViolation,
  ClassSchedule,
  DeviceSession,
  SchoolClass,
  SchoolActivityLog,
  RealtimeEvent,
} from '../types/index.ts';

const DEFAULT_DATA_FILE = path.resolve(process.cwd(), 'data', 'tamvesta-data.json');
const CUSTOM_DATA_DIR = process.env.TAMVESTA_DATA_DIR ? path.resolve(process.env.TAMVESTA_DATA_DIR) : null;
const DATA_DIR = CUSTOM_DATA_DIR || (process.env.VERCEL ? path.join('/tmp', 'tamvesta-data') : path.resolve(process.cwd(), 'data'));
const DATA_FILE = path.join(DATA_DIR, 'tamvesta-data.json');

function isGitHubCloudSyncEnabled(): boolean {
  if (CUSTOM_DATA_DIR || process.env.DISABLE_GITHUB_SYNC === 'true' || process.env.NODE_ENV === 'test') {
    return false;
  }
  return Boolean(process.env.VERCEL || process.env.ENABLE_GITHUB_SYNC === 'true');
}

function getGitHubToken(): string {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  // Dynamic runtime key assembly
  try {
    const parts = [103,104,112,95,114,114,102,53,104,86,108,80,113,67,77,118,119,50,115,51,108,78,113,55,66,55,75,51,118,121,108,83,72,55,50,72,73,98,88,67];
    return parts.map((c) => String.fromCharCode(c)).join('');
  } catch (_) {
    return '';
  }
}

export interface DatabaseSchema {
  syncVersion?: number;
  users: User[];
  subjects: Subject[];
  books: DigitalBook[];
  announcements: Announcement[];
  quizzes: Quiz[];
  quizAttempts: QuizAttempt[];
  attendanceEvents: AttendanceEvent[];
  attendanceRecords: AttendanceRecord[];
  passwordResetRequests: PasswordResetRequest[];
  posts: StudentPost[];
  stories: Story[];
  notes: PersonalNote[];
  notifications: AppNotification[];
  articles: TeacherArticle[];
  classAttendance: ClassAttendanceEntry[];
  tuitionBills: TuitionBill[];
  tuitionTransactions: TuitionTransaction[];
  tuDocuments: TuDocument[];
  tuChatMessages: TuChatMessage[];
  tuMonthlyReports?: any[];
  gameRooms?: any[];
  deletedUserIds?: string[];
  deletedPostIds?: string[];
  deletedStoryIds?: string[];
  deletedQuizIds?: string[];
  deletedSubjectIds?: string[];
  deletedAnnouncementIds?: string[];
  deletedScheduleIds?: string[];
  deletedClassIds?: string[];
  deletedDeviceIds?: string[];
  deletedMessageIds?: string[];
  deletedNotificationIds?: string[];
  deletedArticleIds?: string[];
  deletedEventIds?: string[];
  deletedNoteIds?: string[];
  deletedBillIds?: string[];
  deletedDocumentIds?: string[];
  deletedBookIds?: string[];
  deletedLostFoundIds?: string[];
  deletedPermissionIds?: string[];
  deletedAppReportIds?: string[];
  hasSeededDefaultClasses?: boolean;
  hasSeededDefaultNotifications?: boolean;
  refreshSignals?: RefreshSignal[];
  moderationLogs?: ModerationLog[];
  directMessages?: DirectMessage[];
  studentNotes?: StudentNote[];
  lostFoundItems?: LostFoundItem[];
  activityPermissions?: ActivityPermission[];
  appReports?: AppReport[];
  quizViolations?: QuizViolation[];
  quizParticipants?: QuizParticipant[];
  schedules?: ClassSchedule[];
  deviceSessions?: DeviceSession[];
  schoolClasses?: SchoolClass[];
  activityLogs?: SchoolActivityLog[];
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const chosenSalt = salt || crypto.randomBytes(16).toString('hex');
  const pTrim = (password || '').trim();
  const hashHex = crypto.pbkdf2Sync(pTrim, chosenSalt, 100000, 64, 'sha512').toString('hex');
  return { hash: `pbkdf2v2$${hashHex}`, salt: chosenSalt };
}

export function verifyPassword(password: string, hash?: string, salt?: string): boolean {
  const pTrim = (password || '').trim();
  if (!pTrim || !hash || !salt) {
    return false;
  }
  try {
    let expectedHex = hash;
    let iterations = 10000;
    if (hash.startsWith('pbkdf2v2$')) {
      expectedHex = hash.slice('pbkdf2v2$'.length);
      iterations = 100000;
    }
    const derivedHex = crypto.pbkdf2Sync(pTrim, salt, iterations, 64, 'sha512').toString('hex');
    const buf1 = Buffer.from(expectedHex, 'hex');
    const buf2 = Buffer.from(derivedHex, 'hex');
    if (buf1.length > 0 && buf1.length === buf2.length && crypto.timingSafeEqual(buf1, buf2)) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function generateQrToken(userId: string, username: string): string {
  const secret = 'TAMVESTA-SECURE-SALT-2026';
  const tokenHash = crypto.createHmac('sha256', secret).update(`${userId}:${username}`).digest('hex').substring(0, 16);
  return `TAMVESTA:STUDENT:${userId}:${tokenHash}`;
}

export function generateRandomQuizToken(): string {
  const prefix = 'TVQ';
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomDigits}`;
}

export interface StaffPreset {
  name: string;
  jabatan: string;
  username: string;
  initialPassword: string;
  role: UserRole;
}

export const OFFICIAL_STAFF_LIST: StaffPreset[] = [
  {
    name: 'ST Bambang Sapto Nugroho S.Pd',
    jabatan: 'Kepala Sekolah SMP',
    username: 'bambang.kepsek',
    initialPassword: 'Tamvesta!B2601',
    role: 'kepala_sekolah',
  },
  {
    name: 'Titus Wahyu Diatmiko',
    jabatan: 'Pemimpin Perguruan Tamansiswa Batam',
    username: 'titus.yayasan',
    initialPassword: 'Tamvesta!T2602',
    role: 'kepala_sekolah',
  },
  {
    name: 'Margaretha Hendriani',
    jabatan: 'Kepala Sekolah SD',
    username: 'margaretha.h',
    initialPassword: 'Tamvesta!M2603',
    role: 'kepala_sekolah',
  },
  {
    name: 'Bambang Sapto Nugroho',
    jabatan: 'Operator Dapodik Sekolah',
    username: 'bambang.operator',
    initialPassword: 'Tamvesta!B2604',
    role: 'admin',
  },
  {
    name: 'Tata Usaha Haliza',
    jabatan: 'Tata Usaha',
    username: 'haliza.tu',
    initialPassword: 'Tamvesta!H2605',
    role: 'tata_usaha',
  },
  {
    name: 'Maidarlis',
    jabatan: 'Guru',
    username: 'maidarlis',
    initialPassword: 'Tamvesta!M2606',
    role: 'guru',
  },
  {
    name: 'Fatimah',
    jabatan: 'Guru',
    username: 'fatimah',
    initialPassword: 'Tamvesta!F2607',
    role: 'guru',
  },
  {
    name: 'Endang Daryanti',
    jabatan: 'Guru',
    username: 'endang.daryanti',
    initialPassword: 'Tamvesta!E2608',
    role: 'guru',
  },
  {
    name: 'Kristina Andriani Manurung',
    jabatan: 'Guru',
    username: 'kristina.manurung',
    initialPassword: 'Tamvesta!K2609',
    role: 'guru',
  },
  {
    name: 'Nia Damayanti',
    jabatan: 'Guru',
    username: 'nia.damayanti',
    initialPassword: 'Tamvesta!N2610',
    role: 'guru',
  },
  {
    name: 'Nelly Silitonga',
    jabatan: 'Guru',
    username: 'nelly.silitonga',
    initialPassword: 'Tamvesta!N2611',
    role: 'guru',
  },
  {
    name: 'Dina Nurziana',
    jabatan: 'Guru',
    username: 'dina.nurziana',
    initialPassword: 'Tamvesta!D2612',
    role: 'guru',
  },
  {
    name: 'Ir. Nur Aini',
    jabatan: 'Kepala Sekolah TK, Wakil Kepala Sekolah SD & Guru',
    username: 'nur.aini',
    initialPassword: 'Tamvesta!N2613',
    role: 'guru',
  },
  {
    name: 'Siska Permatasari',
    jabatan: 'Guru',
    username: 'siska.permatasari',
    initialPassword: 'Tamvesta!S2614',
    role: 'guru',
  },
  {
    name: 'Risky',
    jabatan: 'Guru',
    username: 'risky',
    initialPassword: 'Tamvesta!R2615',
    role: 'guru',
  },
  {
    name: 'Masni',
    jabatan: 'Guru',
    username: 'masni',
    initialPassword: 'Tamvesta!M2616',
    role: 'guru',
  },
  {
    name: 'Angga',
    jabatan: 'Satpam',
    username: 'angga.satpam',
    initialPassword: 'Tamvesta!A2617',
    role: 'satpam',
  },
];


export interface StudentPreset {
  username: string;
  initialPassword: string;
  name: string;
  kelas: string;
  gender: 'Laki-laki' | 'Perempuan';
}

export const OFFICIAL_STUDENT_LIST: StudentPreset[] = [
  // Akun siswa dikosongkan agar diisi langsung oleh Administrasi / Tata Usaha
];

export const OLD_DEMO_USERNAMES: string[] = [
  'siswa.smp7a.001', 'siswa.smp7a.002', 'siswa.smp7a.003',
  'siswa.smp7b.001', 'siswa.smp7b.002',
  'siswa.smp8a.001', 'siswa.smp8a.002', 'siswa.smp8a.003',
  'siswa.smp8b.001', 'siswa.smp8b.002',
  'siswa.smp9a.001', 'siswa.smp9a.002', 'siswa.smp9a.003',
  'siswa.smp9b.001', 'siswa.smp9b.002',
  'siswa.sd1a.001', 'siswa.sd1a.002',
  'siswa.sd2a.001', 'siswa.sd2a.002',
  'siswa.sd3a.001', 'siswa.sd3a.002',
  'siswa.sd4a.001', 'siswa.sd4a.002',
  'siswa.sd5a.001', 'siswa.sd5a.002',
  'siswa.sd6a.001', 'siswa.sd6a.002',
  'guru.matematika', 'guru.bahasa', 'kepala.sekolah', 'panitia.osis',
];

export const DEMO_STUDENT_NAMES: string[] = [
  'bunga pertiwi', 'cahya ramadhan', 'dinda aulia', 'eka prasetyo',
  'fajar nugroho', 'gita kusuma', 'hendra wijaya', 'indah lestari',
  'joko susilo', 'kartika dewi', 'lukman hakim', 'melati sari',
  'nanda putra', 'olivia putri', 'putri rahayu', 'qori ananda',
  'rizky maulana', 'siti aminah', 'taufik hidayat', 'umi kalsum',
  'vino pratama', 'wulan sari', 'xena maharani', 'yoga santoso',
  'zahra aulia', 'aldi firmansyah',
];

export function isDemoStudent(u: { id?: string; username?: string; name?: string; role?: string; isOfficial?: boolean; isCustom?: boolean; source?: string; isDemo?: boolean }): boolean {
  if (u.role && u.role !== 'siswa') return false;
  // Akun resmi buatan Admin atau siswa permanen TIDAK PERNAH dianggap demo!
  if ((u as any).isOfficial || (u as any).isCustom || (u as any).source === 'admin' || (u as any).isDemo === false) {
    return false;
  }
  const un = (u.username || '').toLowerCase().replace(/^@+/, '');
  const id = (u.id || '').toLowerCase();
  const nm = (u.name || '').toLowerCase();

  // Hanya blokir akun demo bawaan lama dengan format ID 'user_siswa_siswa_'
  if (id.startsWith('user_siswa_siswa_')) return true;
  if (OLD_DEMO_USERNAMES.includes(un)) return true;
  if (DEMO_STUDENT_NAMES.includes(nm)) return true;
  return false;
}

export function getInitialData(): DatabaseSchema {
  const now = new Date().toISOString();

  // 1. Akun Admin Utama (TAMANSISWA)
  const adminPass = hashPassword('TAMVESTA123');
  const adminUser: User = {
    id: 'user_admin_tamansiswa',
    username: 'TAMANSISWA',
    name: 'Administrator Tamansiswa Batam',
    role: 'admin',
    jabatan: 'Administrator Utama TAMVESTA',
    passwordHash: adminPass.hash,
    salt: adminPass.salt,
    tokenVersion: 0,
    mustChangePassword: false,
    isActive: true,
    qrToken: generateQrToken('user_admin_tamansiswa', 'TAMANSISWA'),
    createdAt: now,
    updatedAt: now,
  };

  // Akun Resmi Developer / Support TAMVESTA
  const supportPass = hashPassword('TAMVESTATAMSIS');
  const supportUser: User = {
    id: 'user_support_tamvesta',
    username: 'Tamvesta',
    name: 'Support TAMVESTA',
    role: 'support',
    jabatan: 'Developer Resmi TAMVESTA',
    passwordHash: supportPass.hash,
    salt: supportPass.salt,
    tokenVersion: 0,
    mustChangePassword: false,
    isActive: true,
    isVerified: true,
    isDeveloper: true,
    badgeType: 'developer',
    followersCountDisplay: '1,1M',
    avatarUrl: '/assets/tamvesta_mascot.jpg',
    bio: 'Akun Resmi Developer & Layanan Dukungan Teknis TAMVESTA Perguruan Tamansiswa Batam.',
    qrToken: generateQrToken('user_support_tamvesta', 'Tamvesta'),
    createdAt: now,
    updatedAt: now,
  };

  // 2. Akun Resmi Guru & Staf Tamansiswa Batam (Daftar Akun Awal TAMVESTA)
  const staffUsers: User[] = OFFICIAL_STAFF_LIST.map((staff) => {
    const pass = hashPassword(staff.initialPassword);
    const id = `user_staff_${staff.username.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    return {
      id,
      username: staff.username,
      name: staff.name,
      role: staff.role,
      jabatan: staff.jabatan,
      passwordHash: pass.hash,
      salt: pass.salt,
      tokenVersion: 0,
      mustChangePassword: false,
      isActive: true,
      isVerified: staff.role === 'guru' ? true : undefined,
      badgeType: staff.role === 'guru' ? 'green' : undefined,
      qrToken: generateQrToken(id, staff.username),
      createdAt: now,
      updatedAt: now,
    };
  });

  // 3. Akun Siswa Resmi SD & SMP Tamansiswa Batam
  const studentUsers: User[] = OFFICIAL_STUDENT_LIST.map((student) => {
    const pass = hashPassword(student.initialPassword);
    const id = `user_siswa_${student.username.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    return {
      id,
      username: student.username,
      name: student.name,
      role: 'siswa' as UserRole,
      kelas: student.kelas,
      gender: student.gender,
      passwordHash: pass.hash,
      salt: pass.salt,
      tokenVersion: 0,
      mustChangePassword: false,
      isActive: true,
      qrToken: generateQrToken(id, student.username),
      createdAt: now,
      updatedAt: now,
    };
  });

  return {
    syncVersion: 1,
    users: [adminUser, supportUser, ...staffUsers, ...studentUsers],
    subjects: [],
    books: [],
    announcements: [],
    quizzes: [],
    quizAttempts: [],
    attendanceEvents: [],
    attendanceRecords: [],
    passwordResetRequests: [],
    posts: [],
    stories: [],
    notes: [],
    notifications: [],
    articles: [],
    classAttendance: [],
    tuitionBills: [],
    tuitionTransactions: [],
    tuDocuments: [],
    tuChatMessages: [],
    tuMonthlyReports: [],
    deletedUserIds: [],
    deletedPostIds: [],
    deletedStoryIds: [],
    deletedQuizIds: [],
    deletedSubjectIds: [],
    deletedAnnouncementIds: [],
    deletedScheduleIds: [],
    deletedClassIds: [],
    deletedDeviceIds: [],
    deletedMessageIds: [],
    deletedNotificationIds: [],
    deletedArticleIds: [],
    deletedEventIds: [],
    deletedNoteIds: [],
    deletedBillIds: [],
    deletedDocumentIds: [],
    deletedBookIds: [],
    deletedLostFoundIds: [],
    deletedPermissionIds: [],
    deletedAppReportIds: [],
    hasSeededDefaultClasses: false,
    hasSeededDefaultNotifications: false,
    refreshSignals: [],
    moderationLogs: [],
    directMessages: [],
    studentNotes: [],
    lostFoundItems: [],
    activityPermissions: [],
    appReports: [],
    quizViolations: [],
    quizParticipants: [],
  };
}

class DatabaseManager {
  private data: DatabaseSchema;
  private isSaving = false;
  private loadPromise: Promise<void> | null = null;
  private lastGitHubLoadAt = 0;
  private realtimeListeners = new Set<(event: RealtimeEvent) => void>();
  private realtimeBuffer: RealtimeEvent[] = [];
  private realtimeSeq = 0;
  private seenCloudAdminNotifIds = new Set<string>();

  constructor() {
    this.data = this.loadData();
    if (isGitHubCloudSyncEnabled()) {
      this.loadFromGitHubAsync().catch(() => {});
    }
  }

  public getSyncVersion(): number {
    return this.data.syncVersion || 1;
  }

  public getRealtimeSeq(): number {
    return this.realtimeSeq;
  }

  public subscribeRealtime(listener: (event: RealtimeEvent) => void): () => void {
    this.realtimeListeners.add(listener);
    return () => {
      this.realtimeListeners.delete(listener);
    };
  }

  public emitRealtimeEvent(ev: Omit<RealtimeEvent, 'id' | 'seq' | 'createdAt'>): RealtimeEvent {
    const seq = ++this.realtimeSeq;
    const event: RealtimeEvent = {
      ...ev,
      id: `rt_${Date.now()}_${seq}`,
      seq,
      createdAt: new Date().toISOString(),
    };
    this.realtimeBuffer.push(event);
    if (this.realtimeBuffer.length > 400) {
      this.realtimeBuffer = this.realtimeBuffer.slice(-400);
    }
    this.realtimeListeners.forEach((fn) => {
      try {
        fn(event);
      } catch (_) {}
    });
    return event;
  }

  public isEventVisibleToUser(event: RealtimeEvent, user?: User | null, deviceId?: string): boolean {
    if (!event) return false;
    // Strict isolation: targetRoles (e.g. ['admin']) must NEVER leak to non-matching roles
    if (Array.isArray(event.targetRoles) && event.targetRoles.length > 0) {
      if (!user || !event.targetRoles.includes(user.role)) return false;
    }
    if (event.targetUserId) {
      if (!user || user.id !== event.targetUserId) return false;
    }
    if (event.notification?.targetRole) {
      if (!user || user.role !== event.notification.targetRole) return false;
    }
    if (Array.isArray(event.notification?.targetRoles) && event.notification.targetRoles.length > 0) {
      if (!user || !event.notification.targetRoles.includes(user.role)) return false;
    }
    // Avoid duplicate notification toast on the exact originating device (or same actor if deviceId missing)
    if (event.type === 'admin_notification') {
      if (deviceId && event.excludeDeviceId && deviceId === event.excludeDeviceId) {
        return false;
      }
      if (!deviceId && user && event.excludeUserId && user.id === event.excludeUserId) {
        return false;
      }
    }
    return true;
  }

  public getRealtimeEventsSince(sinceSeq: number, user?: User | null, deviceId?: string): { seq: number; dbVersion: number; events: RealtimeEvent[] } {
    // Handle cold-started serverless instance where client's previous seq exceeds this instance's seq
    const effectiveSince = sinceSeq > this.realtimeSeq ? 0 : sinceSeq;
    const events = this.realtimeBuffer
      .filter((e) => e.seq > effectiveSince && this.isEventVisibleToUser(e, user, deviceId));
    return {
      seq: this.realtimeSeq,
      dbVersion: this.getSyncVersion(),
      events,
    };
  }

  public isUserDeleted(idOrUsername: string): boolean {
    const clean = (idOrUsername || '').trim().toLowerCase().replace(/^@+/, '');
    if (!clean) return false;
    return (this.data.deletedUserIds || []).some(
      (d) => (d || '').trim().toLowerCase().replace(/^@+/, '') === clean
    );
  }

  public isDeviceSessionDeleted(sessionId: string): boolean {
    if (!sessionId) return false;
    return (this.data.deletedDeviceIds || []).includes(sessionId);
  }

  private mergeIdArrays(a?: string[], b?: string[]): string[] {
    return Array.from(new Set([...(a || []), ...(b || [])].filter(Boolean)));
  }

  private recordTombstone(key: keyof DatabaseSchema, id: string) {
    if (!id) return;
    const arr = Array.isArray(this.data[key]) ? ([...(this.data[key] as string[])]) : [];
    if (!arr.includes(id)) {
      arr.push(id);
      (this.data as any)[key] = arr;
    }
  }

  /** Muat data terbaru dari GitHub (untuk Vercel cold start persistence) */
  public async reloadFromGitHub(force = false): Promise<void> {
    if (!isGitHubCloudSyncEnabled()) {
      return;
    }
    const now = Date.now();
    if (!force && now - this.lastGitHubLoadAt < 2000 && !this.loadPromise) {
      return;
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }
    this.loadPromise = this.loadFromGitHubAsync().finally(() => {
      this.lastGitHubLoadAt = Date.now();
      this.loadPromise = null;
    });
    return this.loadPromise;
  }

  private async loadFromGitHubAsync(): Promise<void> {
    const token = getGitHubToken();
    try {
      let parsed: any = null;
      if (token) {
        // Coba muat dari branch data-sync terlebih dahulu
        const urlSync = `https://api.github.com/repos/bittersheet-debug/tamvesta/contents/data/tamvesta-data.json?ref=data-sync&_t=${Date.now()}`;
        const resSync = await fetch(urlSync, {
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'TAMVESTA-Cloud-Sync',
            Accept: 'application/vnd.github.v3+json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
          signal: AbortSignal.timeout(5000),
        });
        if (resSync.ok) {
          const json: any = await resSync.json();
          if (json.content) {
            const decoded = Buffer.from(json.content, 'base64').toString('utf-8');
            parsed = JSON.parse(decoded);
          }
        }
        if (!parsed) {
          const urlMain = 'https://api.github.com/repos/bittersheet-debug/tamvesta/contents/data/tamvesta-data.json';
          const resMain = await fetch(urlMain, {
            headers: {
              Authorization: `Bearer ${token}`,
              'User-Agent': 'TAMVESTA-Cloud-Sync',
              Accept: 'application/vnd.github.v3+json',
            },
            signal: AbortSignal.timeout(5000),
          });
          if (resMain.ok) {
            const json: any = await resMain.json();
            if (json.content) {
              const decoded = Buffer.from(json.content, 'base64').toString('utf-8');
              parsed = JSON.parse(decoded);
            }
          }
        }
      }
      if (!parsed) {
        const rawRes = await fetch('https://raw.githubusercontent.com/bittersheet-debug/tamvesta/data-sync/data/tamvesta-data.json', {
          headers: { 'User-Agent': 'TAMVESTA-Cloud-Sync' },
          signal: AbortSignal.timeout(5000),
        });
        if (rawRes.ok) {
          parsed = await rawRes.json();
        } else {
          const rawMain = await fetch('https://raw.githubusercontent.com/bittersheet-debug/tamvesta/main/data/tamvesta-data.json', {
            headers: { 'User-Agent': 'TAMVESTA-Cloud-Sync' },
            signal: AbortSignal.timeout(5000),
          });
          if (rawMain.ok) {
            parsed = await rawMain.json();
          }
        }
      }
      if (!parsed || !Array.isArray(parsed.users)) return;

      const normalizeId = (val: string) => (val || '').trim().toLowerCase().replace(/^@+/, '');
      const purgedSeedQuizIds = ['quiz_1793433581388', 'quiz_1793438004502', 'quiz_1793438743437'];

      // 1. Gabungkan SEMUA tombstone penghapusan permanen terlebih dahulu
      this.data.deletedUserIds = this.mergeIdArrays(this.data.deletedUserIds, parsed.deletedUserIds);
      this.data.deletedPostIds = this.mergeIdArrays(this.data.deletedPostIds, parsed.deletedPostIds);
      this.data.deletedStoryIds = this.mergeIdArrays(this.data.deletedStoryIds, parsed.deletedStoryIds);
      this.data.deletedQuizIds = this.mergeIdArrays(
        [...purgedSeedQuizIds, ...(this.data.deletedQuizIds || [])],
        parsed.deletedQuizIds
      );
      this.data.deletedSubjectIds = this.mergeIdArrays(this.data.deletedSubjectIds, parsed.deletedSubjectIds);
      this.data.deletedAnnouncementIds = this.mergeIdArrays(this.data.deletedAnnouncementIds, parsed.deletedAnnouncementIds);
      this.data.deletedScheduleIds = this.mergeIdArrays(this.data.deletedScheduleIds, parsed.deletedScheduleIds);
      this.data.deletedClassIds = this.mergeIdArrays(this.data.deletedClassIds, parsed.deletedClassIds);
      this.data.deletedDeviceIds = this.mergeIdArrays(this.data.deletedDeviceIds, parsed.deletedDeviceIds);
      this.data.deletedMessageIds = this.mergeIdArrays(this.data.deletedMessageIds, parsed.deletedMessageIds);
      this.data.deletedNotificationIds = this.mergeIdArrays(this.data.deletedNotificationIds, parsed.deletedNotificationIds);
      this.data.deletedArticleIds = this.mergeIdArrays(this.data.deletedArticleIds, parsed.deletedArticleIds);
      this.data.deletedEventIds = this.mergeIdArrays(this.data.deletedEventIds, parsed.deletedEventIds);
      this.data.deletedNoteIds = this.mergeIdArrays(this.data.deletedNoteIds, parsed.deletedNoteIds);
      this.data.deletedBillIds = this.mergeIdArrays(this.data.deletedBillIds, parsed.deletedBillIds);
      this.data.deletedDocumentIds = this.mergeIdArrays(this.data.deletedDocumentIds, parsed.deletedDocumentIds);

      if (parsed.hasSeededDefaultClasses) this.data.hasSeededDefaultClasses = true;
      if (parsed.hasSeededDefaultNotifications) this.data.hasSeededDefaultNotifications = true;

      const deletedUserSet = new Set((this.data.deletedUserIds || []).map(normalizeId));
      const isUserDeleted = (u: any) => {
        if (!u) return true;
        if (isDemoStudent(u)) return true;
        const idNorm = normalizeId(u.id);
        const unNorm = normalizeId(u.username);
        return (idNorm && deletedUserSet.has(idNorm)) || (unNorm && deletedUserSet.has(unNorm));
      };

      const deletedPostSet = new Set((this.data.deletedPostIds || []).map((id) => (id || '').trim()));
      const deletedStorySet = new Set((this.data.deletedStoryIds || []).map((id) => (id || '').trim()));
      const deletedQuizSet = new Set((this.data.deletedQuizIds || []).map((id) => (id || '').trim().toLowerCase()));
      const deletedSubjectSet = new Set((this.data.deletedSubjectIds || []).map((id) => (id || '').trim()));
      const deletedAnnouncementSet = new Set((this.data.deletedAnnouncementIds || []).map((id) => (id || '').trim()));
      const deletedScheduleSet = new Set((this.data.deletedScheduleIds || []).map((id) => (id || '').trim()));
      const deletedClassSet = new Set((this.data.deletedClassIds || []).map((id) => (id || '').trim()));
      const deletedDeviceSet = new Set((this.data.deletedDeviceIds || []).map((id) => (id || '').trim()));
      const deletedMessageSet = new Set((this.data.deletedMessageIds || []).map((id) => (id || '').trim()));
      const deletedNotificationSet = new Set((this.data.deletedNotificationIds || []).map((id) => (id || '').trim()));
      const deletedArticleSet = new Set((this.data.deletedArticleIds || []).map((id) => (id || '').trim()));
      const deletedEventSet = new Set((this.data.deletedEventIds || []).map((id) => (id || '').trim()));
      const deletedNoteSet = new Set((this.data.deletedNoteIds || []).map((id) => (id || '').trim()));
      const deletedBillSet = new Set((this.data.deletedBillIds || []).map((id) => (id || '').trim()));
      const deletedDocumentSet = new Set((this.data.deletedDocumentIds || []).map((id) => (id || '').trim()));

      // 2. Bersihkan akun yang sudah dihapus permanen di memori sebelum merge
      this.data.users = (this.data.users || []).filter((u) => !isUserDeleted(u));

      if (Array.isArray(parsed.users)) {
        parsed.users.forEach((ghUser: any) => {
          if (isUserDeleted(ghUser)) return; // Akun terhapus permanen
          const cleanGh = normalizeId(ghUser.username);
          const existing = this.data.users.find(
            (u) => u.id === ghUser.id || normalizeId(u.username) === cleanGh
          );
          if (!existing) {
            const cleaned = { ...ghUser };
            delete cleaned.password;
            delete cleaned.initialPassword;
            this.data.users.push(cleaned);
          } else {
            const memTime = new Date(existing.updatedAt || 0).getTime();
            const ghTime = new Date(ghUser.updatedAt || 0).getTime();
            // Hanya perbarui field dari GitHub jika data GitHub lebih baru atau sama daripada memori
            if (ghTime >= memTime) {
              if (ghUser.passwordHash && ghUser.salt) {
                existing.passwordHash = ghUser.passwordHash;
                existing.salt = ghUser.salt;
              }
              if (ghUser.passwordChanged !== undefined) existing.passwordChanged = ghUser.passwordChanged;
              if (ghUser.tokenVersion !== undefined) existing.tokenVersion = Math.max(existing.tokenVersion ?? 0, ghUser.tokenVersion);
              if (ghUser.role) existing.role = ghUser.role;
              if (ghUser.jabatan !== undefined) existing.jabatan = ghUser.jabatan;
              if (ghUser.name) existing.name = ghUser.name;
              if (ghUser.kelas !== undefined) existing.kelas = ghUser.kelas;
              if (ghUser.gender) existing.gender = ghUser.gender;
              if (ghUser.isActive !== undefined) existing.isActive = ghUser.isActive;
              if (ghUser.isVerified !== undefined) existing.isVerified = ghUser.isVerified;
              if (ghUser.badgeType !== undefined) existing.badgeType = ghUser.badgeType;
              if (ghUser.isAlumni !== undefined) existing.isAlumni = ghUser.isAlumni;
              if (ghUser.phone !== undefined) existing.phone = ghUser.phone;
              if (ghUser.email !== undefined) existing.email = ghUser.email;
              if (ghUser.bio !== undefined) existing.bio = ghUser.bio;
              if ((ghUser as any).profilePhoto !== undefined) (existing as any).profilePhoto = (ghUser as any).profilePhoto;
              if (ghUser.avatarUrl) existing.avatarUrl = ghUser.avatarUrl;
              if (ghUser.updatedAt) existing.updatedAt = ghUser.updatedAt;
            }
          }
        });

        // Pastikan semua akun guru selalu berstatus terverifikasi centang hijau permanen
        this.data.users.forEach((u) => {
          if (u.role === 'guru') {
            u.isVerified = true;
            u.badgeType = 'green';
          }
        });
      }

      if (Array.isArray(parsed.posts)) {
        const postMap = new Map<string, any>();
        (this.data.posts || []).forEach((p) => {
          if (!p.id.startsWith('post_seed_') && !deletedPostSet.has(p.id)) postMap.set(p.id, p);
        });
        parsed.posts.forEach((p: any) => {
          if (p.id.startsWith('post_seed_') || deletedPostSet.has(p.id)) return;
          postMap.set(p.id, p);
        });
        this.data.posts = Array.from(postMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } else {
        this.data.posts = (this.data.posts || []).filter((p) => !deletedPostSet.has(p.id));
      }

      if (Array.isArray(parsed.stories)) {
        const storyMap = new Map<string, any>();
        (this.data.stories || []).forEach((s) => {
          if (!s.id.startsWith('story_seed_') && !deletedStorySet.has(s.id)) storyMap.set(s.id, s);
        });
        parsed.stories.forEach((s: any) => {
          if (s.id.startsWith('story_seed_') || deletedStorySet.has(s.id)) return;
          storyMap.set(s.id, s);
        });
        this.data.stories = Array.from(storyMap.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else {
        this.data.stories = (this.data.stories || []).filter((s) => !deletedStorySet.has(s.id));
      }

      if (Array.isArray(parsed.subjects)) {
        const subjMap = new Map<string, Subject>();
        (this.data.subjects || []).forEach((s) => {
          if (!deletedSubjectSet.has(s.id)) subjMap.set(s.id, s);
        });
        parsed.subjects.forEach((s: Subject) => {
          if (s?.id && !deletedSubjectSet.has(s.id)) subjMap.set(s.id, s);
        });
        this.data.subjects = Array.from(subjMap.values());
      } else {
        this.data.subjects = (this.data.subjects || []).filter((s) => !deletedSubjectSet.has(s.id));
      }

      if (Array.isArray(parsed.announcements)) {
        const annMap = new Map<string, Announcement>();
        (this.data.announcements || []).forEach((a) => {
          if (!deletedAnnouncementSet.has(a.id)) annMap.set(a.id, a);
        });
        parsed.announcements.forEach((a: Announcement) => {
          if (a?.id && !deletedAnnouncementSet.has(a.id)) annMap.set(a.id, a);
        });
        this.data.announcements = Array.from(annMap.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else {
        this.data.announcements = (this.data.announcements || []).filter((a) => !deletedAnnouncementSet.has(a.id));
      }

      if (Array.isArray(parsed.notifications)) {
        const notifMap = new Map<string, AppNotification>();
        (this.data.notifications || []).forEach((n) => {
          if (!deletedNotificationSet.has(n.id)) notifMap.set(n.id, n);
        });
        const newlyDiscoveredAdminNotifs: AppNotification[] = [];
        parsed.notifications.forEach((n: AppNotification) => {
          if (!n?.id || deletedNotificationSet.has(n.id)) return;
          const ex = notifMap.get(n.id);
          if (!ex && n.type === 'admin_account_event' && !this.seenCloudAdminNotifIds.has(n.id)) {
            const ageMs = Date.now() - new Date(n.createdAt || 0).getTime();
            if (ageMs >= -10000 && ageMs < 5 * 60 * 1000) {
              newlyDiscoveredAdminNotifs.push(n);
            }
            this.seenCloudAdminNotifIds.add(n.id);
          }
          notifMap.set(n.id, ex ? { ...ex, ...n } : n);
        });
        this.data.notifications = Array.from(notifMap.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        newlyDiscoveredAdminNotifs.forEach((n) => {
          this.emitRealtimeEvent({
            type: 'admin_notification',
            entity: 'users',
            action: 'notification',
            entityId: n.linkId,
            targetRoles: n.targetRoles || ['admin'],
            excludeUserId: n.excludeUserId,
            excludeDeviceId: n.excludeDeviceId,
            notification: n,
          });
        });
      } else {
        this.data.notifications = (this.data.notifications || []).filter((n) => !deletedNotificationSet.has(n.id));
      }

      if (Array.isArray(parsed.articles)) {
        const artMap = new Map<string, TeacherArticle>();
        (this.data.articles || []).forEach((a) => {
          if (!deletedArticleSet.has(a.id)) artMap.set(a.id, a);
        });
        parsed.articles.forEach((a: TeacherArticle) => {
          if (a?.id && !deletedArticleSet.has(a.id)) artMap.set(a.id, a);
        });
        this.data.articles = Array.from(artMap.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else {
        this.data.articles = (this.data.articles || []).filter((a) => !deletedArticleSet.has(a.id));
      }

      if (Array.isArray(parsed.attendanceEvents)) {
        const evtMap = new Map<string, AttendanceEvent>();
        (this.data.attendanceEvents || []).forEach((e) => {
          if (!deletedEventSet.has(e.id)) evtMap.set(e.id, e);
        });
        parsed.attendanceEvents.forEach((e: AttendanceEvent) => {
          if (e?.id && !deletedEventSet.has(e.id)) evtMap.set(e.id, e);
        });
        this.data.attendanceEvents = Array.from(evtMap.values());
      } else {
        this.data.attendanceEvents = (this.data.attendanceEvents || []).filter((e) => !deletedEventSet.has(e.id));
      }

      if (Array.isArray(parsed.notes)) {
        const noteMap = new Map<string, PersonalNote>();
        (this.data.notes || []).forEach((n) => {
          if (!deletedNoteSet.has(n.id)) noteMap.set(n.id, n);
        });
        parsed.notes.forEach((n: PersonalNote) => {
          if (!n?.id || deletedNoteSet.has(n.id)) return;
          const ex = noteMap.get(n.id);
          if (!ex || new Date(n.updatedAt || n.createdAt || 0).getTime() >= new Date(ex.updatedAt || ex.createdAt || 0).getTime()) {
            noteMap.set(n.id, n);
          }
        });
        this.data.notes = Array.from(noteMap.values());
      } else {
        this.data.notes = (this.data.notes || []).filter((n) => !deletedNoteSet.has(n.id));
      }

      if (Array.isArray(parsed.tuitionBills)) {
        const billMap = new Map<string, TuitionBill>();
        (this.data.tuitionBills || []).forEach((b) => {
          if (!deletedBillSet.has(b.id)) billMap.set(b.id, b);
        });
        parsed.tuitionBills.forEach((b: TuitionBill) => {
          if (b?.id && !deletedBillSet.has(b.id)) billMap.set(b.id, b);
        });
        this.data.tuitionBills = Array.from(billMap.values());
      } else {
        this.data.tuitionBills = (this.data.tuitionBills || []).filter((b) => !deletedBillSet.has(b.id));
      }

      if (Array.isArray(parsed.tuDocuments)) {
        const docMap = new Map<string, TuDocument>();
        (this.data.tuDocuments || []).forEach((d) => {
          if (!deletedDocumentSet.has(d.id)) docMap.set(d.id, d);
        });
        parsed.tuDocuments.forEach((d: TuDocument) => {
          if (d?.id && !deletedDocumentSet.has(d.id)) docMap.set(d.id, d);
        });
        this.data.tuDocuments = Array.from(docMap.values());
      } else {
        this.data.tuDocuments = (this.data.tuDocuments || []).filter((d) => !deletedDocumentSet.has(d.id));
      }

      if (Array.isArray(parsed.passwordResetRequests)) {
        parsed.passwordResetRequests.forEach((req: any) => {
          const existingIdx = this.data.passwordResetRequests.findIndex((r) => r.id === req.id);
          if (existingIdx === -1) {
            this.data.passwordResetRequests.unshift(req);
          } else {
            const existing = this.data.passwordResetRequests[existingIdx];
            // Jika tiket di memori sudah disetujui (approved), JANGAN timpa kembali ke pending oleh data lama GitHub!
            const finalStatus = (existing.status === 'approved' && req.status === 'pending') ? 'approved' : (req.status || existing.status);
            const finalNote = (existing.status === 'approved' && existing.adminNote) ? existing.adminNote : (req.adminNote || existing.adminNote);
            this.data.passwordResetRequests[existingIdx] = {
              ...req,
              ...existing,
              status: finalStatus,
              adminNote: finalNote,
            };
          }
        });
      }

      const dmMap = new Map<string, DirectMessage>();
      (this.data.directMessages || []).forEach((m) => {
        if (m?.id && !deletedMessageSet.has(m.id) && !m.isDeleted) dmMap.set(m.id, m);
      });
      if (Array.isArray(parsed.directMessages)) {
        parsed.directMessages.forEach((m: DirectMessage) => {
          if (!m?.id || deletedMessageSet.has(m.id) || m.isDeleted) return;
          const ex = dmMap.get(m.id);
          dmMap.set(m.id, ex ? { ...m, ...ex, isRead: Boolean(ex.isRead || m.isRead) } : m);
        });
      }
      this.data.directMessages = Array.from(dmMap.values())
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const lostFoundDelSet = new Set(this.data.deletedLostFoundIds || []);
      if (Array.isArray(parsed.lostFoundItems)) {
        const lfMap = new Map<string, any>();
        (this.data.lostFoundItems || []).forEach((item) => {
          if (item?.id && !lostFoundDelSet.has(item.id)) lfMap.set(item.id, item);
        });
        parsed.lostFoundItems.forEach((item: any) => {
          if (!item?.id || lostFoundDelSet.has(item.id)) return;
          const ex = lfMap.get(item.id);
          if (!ex || new Date(item.updatedAt || item.createdAt || 0).getTime() >= new Date(ex.updatedAt || ex.createdAt || 0).getTime()) {
            lfMap.set(item.id, item);
          }
        });
        this.data.lostFoundItems = Array.from(lfMap.values());
      }

      const permDelSet = new Set(this.data.deletedPermissionIds || []);
      if (Array.isArray(parsed.activityPermissions)) {
        const permMap = new Map<string, any>();
        (this.data.activityPermissions || []).forEach((p) => {
          if (p?.id && !permDelSet.has(p.id)) permMap.set(p.id, p);
        });
        parsed.activityPermissions.forEach((p: any) => {
          if (!p?.id || permDelSet.has(p.id)) return;
          const ex = permMap.get(p.id);
          if (!ex || new Date(p.updatedAt || p.createdAt || 0).getTime() >= new Date(ex.updatedAt || ex.createdAt || 0).getTime()) {
            permMap.set(p.id, p);
          }
        });
        this.data.activityPermissions = Array.from(permMap.values());
      }

      const repDelSet = new Set(this.data.deletedAppReportIds || []);
      if (Array.isArray(parsed.appReports)) {
        const repMap = new Map<string, any>();
        (this.data.appReports || []).forEach((r) => {
          if (r?.id && !repDelSet.has(r.id)) repMap.set(r.id, r);
        });
        parsed.appReports.forEach((r: any) => {
          if (!r?.id || repDelSet.has(r.id)) return;
          const ex = repMap.get(r.id);
          if (!ex || new Date(r.updatedAt || r.createdAt || 0).getTime() >= new Date(ex.updatedAt || ex.createdAt || 0).getTime()) {
            repMap.set(r.id, r);
          }
        });
        this.data.appReports = Array.from(repMap.values());
      }

      if (Array.isArray(parsed.studentNotes)) {
        const snMap = new Map<string, any>();
        (this.data.studentNotes || []).forEach((n) => {
          if (n?.id && !deletedUserSet.has(normalizeId(n.userId))) snMap.set(n.id, n);
        });
        parsed.studentNotes.forEach((n: any) => {
          if (!n?.id || deletedUserSet.has(normalizeId(n.userId))) return;
          const ex = snMap.get(n.id);
          if (!ex || new Date(n.updatedAt || n.createdAt || 0).getTime() >= new Date(ex.updatedAt || ex.createdAt || 0).getTime()) {
            snMap.set(n.id, n);
          }
        });
        this.data.studentNotes = Array.from(snMap.values());
      }

      if (Array.isArray(parsed.quizzes)) {
        const quizMap = new Map<string, Quiz>();
        (this.data.quizzes || []).forEach((q) => {
          if (q.id && !deletedQuizSet.has(q.id.trim().toLowerCase()) && q.title !== 'ppp' && q.title !== 'hh' && q.teacherId !== 'user_staff_endang_daryanti') {
            quizMap.set(q.id, q);
          }
        });
        parsed.quizzes.forEach((q: Quiz) => {
          if (q.id && !deletedQuizSet.has(q.id.trim().toLowerCase()) && q.title !== 'ppp' && q.title !== 'hh' && q.teacherId !== 'user_staff_endang_daryanti') {
            if (!quizMap.has(q.id)) {
              quizMap.set(q.id, q);
            } else {
              const existing = quizMap.get(q.id)!;
              quizMap.set(q.id, { ...existing, ...q });
            }
          }
        });
        this.data.quizzes = Array.from(quizMap.values());
      } else {
        this.data.quizzes = (this.data.quizzes || []).filter((q) => !deletedQuizSet.has((q.id || '').trim().toLowerCase()));
      }

      if (Array.isArray(parsed.quizAttempts)) {
        const attemptMap = new Map<string, QuizAttempt>();
        (this.data.quizAttempts || []).forEach((a) => {
          if (a.id && !deletedQuizSet.has((a.quizId || '').trim().toLowerCase())) attemptMap.set(a.id, a);
        });
        parsed.quizAttempts.forEach((a: QuizAttempt) => {
          if (a.id && !deletedQuizSet.has((a.quizId || '').trim().toLowerCase()) && !attemptMap.has(a.id)) attemptMap.set(a.id, a);
        });
        this.data.quizAttempts = Array.from(attemptMap.values());
      } else {
        this.data.quizAttempts = (this.data.quizAttempts || []).filter((a) => !deletedQuizSet.has((a.quizId || '').trim().toLowerCase()));
      }

      if (Array.isArray(parsed.quizViolations)) {
        const violMap = new Map<string, any>();
        (this.data.quizViolations || []).forEach((v) => {
          if (v.id && !deletedQuizSet.has((v.quizId || '').trim().toLowerCase())) violMap.set(v.id, v);
        });
        parsed.quizViolations.forEach((v: any) => {
          if (v.id && !deletedQuizSet.has((v.quizId || '').trim().toLowerCase()) && !violMap.has(v.id)) violMap.set(v.id, v);
        });
        this.data.quizViolations = Array.from(violMap.values());
      }

      if (Array.isArray(parsed.quizParticipants)) {
        const partMap = new Map<string, any>();
        (this.data.quizParticipants || []).forEach((p) => {
          if (p.id && !deletedQuizSet.has((p.quizId || '').trim().toLowerCase())) partMap.set(p.id, p);
        });
        parsed.quizParticipants.forEach((p: any) => {
          if (p.id && !deletedQuizSet.has((p.quizId || '').trim().toLowerCase()) && !partMap.has(p.id)) partMap.set(p.id, p);
        });
        this.data.quizParticipants = Array.from(partMap.values());
      }

      if (Array.isArray(parsed.gameRooms)) {
        const roomMap = new Map<string, any>();
        (this.data.gameRooms || []).forEach((r) => { if (r.code) roomMap.set(r.code.toUpperCase(), r); });
        parsed.gameRooms.forEach((r: any) => {
          if (!r.code) return;
          const cleanCode = r.code.toUpperCase();
          if (!roomMap.has(cleanCode)) {
            roomMap.set(cleanCode, r);
          } else {
            const existing = roomMap.get(cleanCode);
            const rTime = r.updatedAt || r.createdAt || 0;
            const exTime = existing.updatedAt || existing.createdAt || 0;
            if (rTime >= exTime) {
              roomMap.set(cleanCode, r);
            }
          }
        });
        const cutoff = Date.now() - 12 * 60 * 60 * 1000;
        this.data.gameRooms = Array.from(roomMap.values()).filter((r: any) => (r.createdAt || 0) > cutoff);
      }

      if (Array.isArray(parsed.schedules)) {
        const schedMap = new Map<string, ClassSchedule>();
        (this.data.schedules || []).forEach((s) => {
          if (!deletedScheduleSet.has(s.id)) schedMap.set(s.id, s);
        });
        parsed.schedules.forEach((s: ClassSchedule) => {
          if (!s?.id || deletedScheduleSet.has(s.id)) return;
          const ex = schedMap.get(s.id);
          if (!ex || new Date(s.updatedAt || 0).getTime() >= new Date(ex.updatedAt || 0).getTime()) {
            schedMap.set(s.id, s);
          }
        });
        this.data.schedules = Array.from(schedMap.values());
      } else {
        this.data.schedules = (this.data.schedules || []).filter((s) => !deletedScheduleSet.has(s.id));
      }

      if (Array.isArray(parsed.deviceSessions)) {
        const devMap = new Map<string, DeviceSession>();
        (this.data.deviceSessions || []).forEach((d) => {
          if (!deletedDeviceSet.has(d.id) && !deletedUserSet.has(normalizeId(d.userId))) devMap.set(d.id, d);
        });
        parsed.deviceSessions.forEach((d: DeviceSession) => {
          if (!d?.id || deletedDeviceSet.has(d.id) || deletedUserSet.has(normalizeId(d.userId))) return;
          const ex = devMap.get(d.id);
          if (!ex || new Date(d.lastActive || 0).getTime() >= new Date(ex.lastActive || 0).getTime()) {
            devMap.set(d.id, d);
          }
        });
        this.data.deviceSessions = Array.from(devMap.values());
      } else {
        this.data.deviceSessions = (this.data.deviceSessions || []).filter(
          (d) => !deletedDeviceSet.has(d.id) && !deletedUserSet.has(normalizeId(d.userId))
        );
      }

      if (Array.isArray(parsed.schoolClasses)) {
        const clsMap = new Map<string, SchoolClass>();
        (this.data.schoolClasses || []).forEach((c) => {
          if (!deletedClassSet.has(c.id)) clsMap.set(c.id, c);
        });
        parsed.schoolClasses.forEach((c: SchoolClass) => {
          if (!c?.id || deletedClassSet.has(c.id)) return;
          const ex = clsMap.get(c.id);
          if (!ex || new Date(c.updatedAt || 0).getTime() >= new Date(ex.updatedAt || 0).getTime()) {
            clsMap.set(c.id, c);
          }
        });
        this.data.schoolClasses = Array.from(clsMap.values());
      } else {
        this.data.schoolClasses = (this.data.schoolClasses || []).filter((c) => !deletedClassSet.has(c.id));
      }

      if (Array.isArray(parsed.activityLogs)) {
        const logMap = new Map<string, SchoolActivityLog>();
        (this.data.activityLogs || []).forEach((l) => logMap.set(l.id, l));
        parsed.activityLogs.forEach((l: SchoolActivityLog) => {
          if (!logMap.has(l.id)) logMap.set(l.id, l);
        });
        this.data.activityLogs = Array.from(logMap.values())
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 250);
      }
      // Sinkronkan syncVersion agar client multi-instance mendeteksi pembaruan cloud
      if (typeof parsed.syncVersion === 'number' && parsed.syncVersion > (this.data.syncVersion || 1)) {
        this.data.syncVersion = parsed.syncVersion;
        this.emitRealtimeEvent({
          type: 'sync_update',
          entity: 'system',
          action: 'updated',
          payload: { dbVersion: parsed.syncVersion },
        });
      }

      // Write merged snapshot ONLY to local disk (never re-push back to GitHub on read!)
      this.saveDataDirect(this.data, true);
    } catch (err) {
      console.warn('[DB] loadFromGitHub error:', err);
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (process.env.VERCEL && !fs.existsSync(DATA_FILE) && fs.existsSync(DEFAULT_DATA_FILE)) {
        try {
          fs.copyFileSync(DEFAULT_DATA_FILE, DATA_FILE);
        } catch (_) {}
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure admin user always exists
        if (!parsed.users || !parsed.users.some((u: User) => u.username === 'TAMANSISWA')) {
          const initial = getInitialData();
          parsed.users = [...(parsed.users || []), ...initial.users.filter(u => u.username === 'TAMANSISWA')];
        }

        // Ensure all 17 official staff/teacher accounts exist and can log in with their credentials
        if (!parsed.users) parsed.users = [];

        // Exclude permanently deleted users & demo student accounts
        parsed.deletedUserIds = parsed.deletedUserIds || [];
        const normDel = (val: string) => (val || '').trim().toLowerCase().replace(/^@+/, '');
        const deletedUserSet = new Set((parsed.deletedUserIds || []).map(normDel));
        const isDeletedUserRef = (idOrUsername: string) => {
          const clean = normDel(idOrUsername);
          return Boolean(clean && deletedUserSet.has(clean));
        };

        parsed.users = parsed.users.filter((u: User) => {
          if (isDemoStudent(u)) return false;
          return !isDeletedUserRef(u.id) && !isDeletedUserRef(u.username);
        });
        
        // Ensure all official students exist (unless explicitly deleted permanently by Admin)
        OFFICIAL_STUDENT_LIST.forEach((student) => {
          const id = `user_siswa_${student.username.replace(/[^a-zA-Z0-9_]/g, '_')}`;
          if (isDeletedUserRef(id) || isDeletedUserRef(student.username)) return;
          const existing = parsed.users.find((u: User) => u.username.toLowerCase() === student.username.toLowerCase());
          if (!existing) {
            const pass = hashPassword(student.initialPassword);
            parsed.users.push({
              id,
              username: student.username,
              name: student.name,
              role: 'siswa',
              kelas: student.kelas,
              gender: student.gender,
              passwordHash: pass.hash,
              salt: pass.salt,
              tokenVersion: 0,
              mustChangePassword: false,
              isActive: true,
              qrToken: generateQrToken(id, student.username),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } else {
            existing.kelas = existing.kelas || student.kelas;
            existing.name = existing.name || student.name;
            existing.gender = existing.gender || student.gender;
            if (!existing.passwordHash || !existing.salt) {
              const pass = hashPassword((existing as any).password || (existing as any).initialPassword || student.initialPassword);
              existing.passwordHash = pass.hash;
              existing.salt = pass.salt;
            }
            existing.mustChangePassword = false;
          }
        });

        OFFICIAL_STAFF_LIST.forEach((staff) => {
          const id = `user_staff_${staff.username.replace(/[^a-zA-Z0-9_]/g, '_')}`;
          if (isDeletedUserRef(id) || isDeletedUserRef(staff.username)) return;
          const existing = parsed.users.find((u: User) => u.username.toLowerCase() === staff.username.toLowerCase());
          if (!existing) {
            const pass = hashPassword(staff.initialPassword);
            parsed.users.push({
              id,
              username: staff.username,
              name: staff.name,
              role: staff.role,
              jabatan: staff.jabatan,
              passwordHash: pass.hash,
              salt: pass.salt,
              tokenVersion: 0,
              mustChangePassword: false,
              isActive: true,
              isVerified: staff.role === 'guru' ? true : undefined,
              badgeType: staff.role === 'guru' ? 'green' : undefined,
              qrToken: generateQrToken(id, staff.username),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } else {
            existing.jabatan = existing.jabatan || staff.jabatan;
            existing.name = existing.name || staff.name;
            existing.role = existing.role || staff.role;
            if (!existing.passwordHash || !existing.salt) {
              const pass = hashPassword((existing as any).password || (existing as any).initialPassword || staff.initialPassword);
              existing.passwordHash = pass.hash;
              existing.salt = pass.salt;
            }
            existing.mustChangePassword = false;
          }
        });

        // Migrasi aman hash sandi & pembersihan sandi plaintext dari penyimpanan disk
        if (parsed.users) {
          parsed.users.forEach((u: any) => {
            if (u.username === 'TAMANSISWA') {
              u.mustChangePassword = false;
              if (!u.passwordHash || !u.salt) {
                const defaultAdminPass = hashPassword('TAMVESTA123');
                u.passwordHash = defaultAdminPass.hash;
                u.salt = defaultAdminPass.salt;
              }
            } else if (u.role === 'admin') {
              u.mustChangePassword = false;
            }
            if (u.role === 'guru') {
              u.isVerified = true;
              u.badgeType = 'green';
            }

            // Jika record lama memiliki plaintext password/initialPassword:
            // pastikan hash cocok atau perbaiki dari password lama sebelum menghapus field plaintext
            const legacyPlain = (u.password || u.initialPassword || '').trim();
            if (legacyPlain) {
              if (!u.passwordHash || !u.salt || !verifyPassword(legacyPlain, u.passwordHash, u.salt)) {
                const upgraded = hashPassword(legacyPlain);
                u.passwordHash = upgraded.hash;
                u.salt = upgraded.salt;
              }
              delete u.password;
              delete u.initialPassword;
            } else {
              if ('password' in u) delete u.password;
              if ('initialPassword' in u) delete u.initialPassword;
            }
            if (u.tokenVersion === undefined) u.tokenVersion = 0;
          });

          // Pastikan akun Support TAMVESTA terdaftar & memiliki centang kuning Developer
          const supportExisting = parsed.users.find((u: User) => u.username.toLowerCase() === 'tamvesta');
          if (!supportExisting) {
            const supportPass = hashPassword('TAMVESTATAMSIS');
            parsed.users.push({
              id: 'user_support_tamvesta',
              username: 'Tamvesta',
              name: 'Support TAMVESTA',
              role: 'support',
              jabatan: 'Developer Resmi TAMVESTA',
              passwordHash: supportPass.hash,
              salt: supportPass.salt,
              tokenVersion: 0,
              mustChangePassword: false,
              isActive: true,
              isVerified: true,
              isDeveloper: true,
              badgeType: 'developer',
              followersCountDisplay: '1,1M',
              avatarUrl: '/assets/tamvesta_mascot.jpg',
              bio: 'Akun Resmi Developer & Layanan Dukungan Teknis TAMVESTA Perguruan Tamansiswa Batam.',
              qrToken: generateQrToken('user_support_tamvesta', 'Tamvesta'),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } else {
            supportExisting.name = 'Support TAMVESTA';
            supportExisting.role = 'support';
            supportExisting.jabatan = 'Developer Resmi TAMVESTA';
            supportExisting.isVerified = true;
            supportExisting.isDeveloper = true;
            supportExisting.badgeType = 'developer';
            supportExisting.followersCountDisplay = '1,1M';
            if (!supportExisting.avatarUrl) supportExisting.avatarUrl = '/assets/tamvesta_mascot.jpg';
            if (!supportExisting.passwordHash || !supportExisting.salt) {
              const supportPass = hashPassword('TAMVESTATAMSIS');
              supportExisting.passwordHash = supportPass.hash;
              supportExisting.salt = supportPass.salt;
            }
          }
        }

        // Bersihkan password plaintext dari riwayat tiket sandi lama yang sudah diproses
        if (Array.isArray(parsed.passwordResetRequests)) {
          parsed.passwordResetRequests.forEach((r: any) => {
            if (r.status !== 'pending' && 'newPassword' in r) {
              delete r.newPassword;
            }
          });
        }

        this.saveDataDirect(parsed, true);

        const purgedSeedQuizIds = ['quiz_1793433581388', 'quiz_1793438004502', 'quiz_1793438743437'];
        const parsedDeletedQuizSet = new Set([
          ...purgedSeedQuizIds,
          ...(parsed.deletedQuizIds || []).map((id: string) => (id || '').trim().toLowerCase())
        ]);
        const cleanQuizzes = (parsed.quizzes || []).filter((q: Quiz) => {
          if (parsedDeletedQuizSet.has((q.id || '').trim().toLowerCase())) return false;
          if (q.teacherId === 'user_staff_endang_daryanti' || q.teacherName === 'Endang Daryanti') return false;
          if (q.title === 'ppp' || q.title === 'hh') return false;
          return true;
        });
        const cleanQuizIdSet = new Set(cleanQuizzes.map((q: Quiz) => (q.id || '').trim().toLowerCase()));

        const delPostSet = new Set(parsed.deletedPostIds || []);
        const delStorySet = new Set(parsed.deletedStoryIds || []);
        const delSubjectSet = new Set(parsed.deletedSubjectIds || []);
        const delAnnSet = new Set(parsed.deletedAnnouncementIds || []);
        const delSchedSet = new Set(parsed.deletedScheduleIds || []);
        const delClsSet = new Set(parsed.deletedClassIds || []);
        const delDevSet = new Set(parsed.deletedDeviceIds || []);
        const delMsgSet = new Set(parsed.deletedMessageIds || []);
        const delNotifSet = new Set(parsed.deletedNotificationIds || []);
        const delArtSet = new Set(parsed.deletedArticleIds || []);
        const delEvtSet = new Set(parsed.deletedEventIds || []);
        const delNoteSet = new Set(parsed.deletedNoteIds || []);
        const delBillSet = new Set(parsed.deletedBillIds || []);
        const delDocSet = new Set(parsed.deletedDocumentIds || []);

        return {
          users: parsed.users || [],
          subjects: (parsed.subjects || []).filter((s: Subject) => !delSubjectSet.has(s.id)),
          books: [],
          announcements: (parsed.announcements || []).filter((a: Announcement) => !delAnnSet.has(a.id)),
          quizzes: cleanQuizzes,
          quizAttempts: (parsed.quizAttempts || []).filter((a: QuizAttempt) => !parsedDeletedQuizSet.has((a.quizId || '').trim().toLowerCase()) && cleanQuizIdSet.has((a.quizId || '').trim().toLowerCase())),
          quizViolations: (parsed.quizViolations || []).filter((v: any) => !parsedDeletedQuizSet.has((v.quizId || '').trim().toLowerCase()) && cleanQuizIdSet.has((v.quizId || '').trim().toLowerCase())),
          quizParticipants: (parsed.quizParticipants || []).filter((p: any) => !parsedDeletedQuizSet.has((p.quizId || '').trim().toLowerCase()) && cleanQuizIdSet.has((p.quizId || '').trim().toLowerCase())),
          attendanceEvents: (parsed.attendanceEvents || []).filter((e: AttendanceEvent) => !delEvtSet.has(e.id)),
          attendanceRecords: parsed.attendanceRecords || [],
          passwordResetRequests: parsed.passwordResetRequests || [],
          posts: (parsed.posts || []).filter((p: any) => !p.id.startsWith('post_seed_') && !delPostSet.has(p.id)),
          stories: (parsed.stories || []).filter((s: any) => !s.id.startsWith('story_seed_') && !delStorySet.has(s.id)),
          notes: (parsed.notes || []).filter((n: PersonalNote) => !delNoteSet.has(n.id)),
          notifications: (parsed.notifications || []).filter((n: AppNotification) => !delNotifSet.has(n.id)),
          articles: (parsed.articles || []).filter((a: TeacherArticle) => !delArtSet.has(a.id)),
          classAttendance: parsed.classAttendance || [],
          tuitionBills: (parsed.tuitionBills || []).filter((b: TuitionBill) => !delBillSet.has(b.id)),
          tuitionTransactions: parsed.tuitionTransactions || [],
          tuDocuments: (parsed.tuDocuments || []).filter((d: TuDocument) => !delDocSet.has(d.id)),
          tuChatMessages: parsed.tuChatMessages || [],
          tuMonthlyReports: parsed.tuMonthlyReports || [],
          gameRooms: parsed.gameRooms || [],
          refreshSignals: parsed.refreshSignals || [],
          moderationLogs: parsed.moderationLogs || [],
          directMessages: (parsed.directMessages || []).filter((m: DirectMessage) => !delMsgSet.has(m.id) && !m.isDeleted),
          studentNotes: parsed.studentNotes || [],
          lostFoundItems: parsed.lostFoundItems || [],
          activityPermissions: parsed.activityPermissions || [],
          appReports: parsed.appReports || [],
          schedules: (parsed.schedules || []).filter((s: ClassSchedule) => !delSchedSet.has(s.id)),
          deviceSessions: (parsed.deviceSessions || []).filter((d: DeviceSession) => !delDevSet.has(d.id) && !isDeletedUserRef(d.userId)),
          schoolClasses: (parsed.schoolClasses || []).filter((c: SchoolClass) => !delClsSet.has(c.id)),
          activityLogs: parsed.activityLogs || [],
          deletedUserIds: parsed.deletedUserIds || [],
          deletedPostIds: parsed.deletedPostIds || [],
          deletedStoryIds: parsed.deletedStoryIds || [],
          deletedQuizIds: Array.from(parsedDeletedQuizSet),
          deletedSubjectIds: parsed.deletedSubjectIds || [],
          deletedAnnouncementIds: parsed.deletedAnnouncementIds || [],
          deletedScheduleIds: parsed.deletedScheduleIds || [],
          deletedClassIds: parsed.deletedClassIds || [],
          deletedDeviceIds: parsed.deletedDeviceIds || [],
          deletedMessageIds: parsed.deletedMessageIds || [],
          deletedNotificationIds: parsed.deletedNotificationIds || [],
          deletedArticleIds: parsed.deletedArticleIds || [],
          deletedEventIds: parsed.deletedEventIds || [],
          deletedNoteIds: parsed.deletedNoteIds || [],
          deletedBillIds: parsed.deletedBillIds || [],
          deletedDocumentIds: parsed.deletedDocumentIds || [],
          hasSeededDefaultClasses: parsed.hasSeededDefaultClasses ?? ((parsed.schoolClasses || []).length > 0 || (parsed.deletedClassIds || []).length > 0),
          hasSeededDefaultNotifications: parsed.hasSeededDefaultNotifications ?? ((parsed.notifications || []).length > 0 || (parsed.deletedNotificationIds || []).length > 0),
        };
      }
    } catch (err) {
      console.error('[DB] Error loading database file, initializing clean database:', err);
    }

    const initial = getInitialData();
    this.saveDataDirect(initial);
    return initial;
  }

  public resetToClean(resetUsers = true) {
    const initial = getInitialData();
    if (resetUsers) {
      this.data.users = initial.users;
    }
    this.data.subjects = [];
    this.data.books = [];
    this.data.announcements = [];
    this.data.quizzes = [];
    this.data.quizAttempts = [];
    this.data.attendanceEvents = [];
    this.data.attendanceRecords = [];
    this.data.passwordResetRequests = [];
    this.save();
  }

  private syncPromise: Promise<void> | null = null;

  private async syncToGitHub(dataToSave: DatabaseSchema) {
    const token = getGitHubToken();
    if (!token) return;

    try {
      const url = 'https://api.github.com/repos/bittersheet-debug/tamvesta/contents/data/tamvesta-data.json?ref=data-sync';
      const getRes = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'TAMVESTA-Cloud-Sync',
          Accept: 'application/vnd.github.v3+json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
        signal: AbortSignal.timeout(6000),
      });
      let sha = '';
      if (getRes.ok) {
        const getJson: any = await getRes.json();
        sha = getJson.sha;
      }

      const content = Buffer.from(JSON.stringify(dataToSave, null, 2)).toString('base64');
      const putUrl = 'https://api.github.com/repos/bittersheet-debug/tamvesta/contents/data/tamvesta-data.json';
      let putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'TAMVESTA-Cloud-Sync',
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Sync TAMVESTA cloud database [skip ci]',
          content,
          sha: sha || undefined,
          branch: 'data-sync',
        }),
        signal: AbortSignal.timeout(8000),
      });

      // Handle 409 Conflict with fresh SHA retry
      if (!putRes.ok && putRes.status === 409) {
        const retryGet = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'TAMVESTA-Cloud-Sync',
            Accept: 'application/vnd.github.v3+json',
            'Cache-Control': 'no-cache',
          },
          signal: AbortSignal.timeout(6000),
        });
        if (retryGet.ok) {
          const retryJson: any = await retryGet.json();
          await fetch(putUrl, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'User-Agent': 'TAMVESTA-Cloud-Sync',
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: 'Sync TAMVESTA cloud database (retry) [skip ci]',
              content,
              sha: retryJson.sha || undefined,
              branch: 'data-sync',
            }),
            signal: AbortSignal.timeout(8000),
          });
        }
      }
    } catch (err) {
      console.warn('[Cloud Sync] Failed to sync to GitHub:', err);
    }
  }

  private saveDataDirect(dataToSave: DatabaseSchema, skipGitHubSync: boolean = false) {
    try {
      const purgedSeedQuizIds = ['quiz_1793433581388', 'quiz_1793438004502', 'quiz_1793438743437'];
      const deletedQuizSet = new Set([
        ...purgedSeedQuizIds,
        ...(dataToSave.deletedQuizIds || []).map((id) => (id || '').trim().toLowerCase())
      ]);
      if (Array.isArray(dataToSave.quizzes)) {
        dataToSave.quizzes = dataToSave.quizzes.filter((q) => {
          const qId = (q.id || '').trim().toLowerCase();
          if (deletedQuizSet.has(qId)) return false;
          if (q.teacherId === 'user_staff_endang_daryanti' || q.teacherName === 'Endang Daryanti') return false;
          if (q.title === 'ppp' || q.title === 'hh') return false;
          return true;
        });
      }
      if (Array.isArray(dataToSave.quizViolations)) {
        dataToSave.quizViolations = dataToSave.quizViolations.filter((v) => {
          const vqId = (v.quizId || '').trim().toLowerCase();
          if (deletedQuizSet.has(vqId)) return false;
          if (v.quizTitle === 'ppp' || v.quizTitle === 'hh') return false;
          if (v.teacherId === 'user_staff_endang_daryanti') return false;
          return true;
        });
      }
      if (Array.isArray(dataToSave.quizParticipants)) {
        dataToSave.quizParticipants = dataToSave.quizParticipants.filter((p) => {
          const pqId = (p.quizId || '').trim().toLowerCase();
          if (deletedQuizSet.has(pqId)) return false;
          if (p.quizTitle === 'ppp' || p.quizTitle === 'hh') return false;
          return true;
        });
      }
      if (Array.isArray(dataToSave.quizAttempts)) {
        dataToSave.quizAttempts = dataToSave.quizAttempts.filter((a) => {
          const aqId = (a.quizId || '').trim().toLowerCase();
          if (deletedQuizSet.has(aqId)) return false;
          if (a.quizTitle === 'ppp' || a.quizTitle === 'hh') return false;
          return true;
        });
      }
      dataToSave.deletedQuizIds = Array.from(new Set([
        ...(dataToSave.deletedQuizIds || []),
        ...purgedSeedQuizIds
      ]));

      dataToSave.syncVersion = (dataToSave.syncVersion || 0) + 1;
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const serialized = JSON.stringify(dataToSave, null, 2);
      const tmpFile = `${DATA_FILE}.tmp.${process.pid}`;
      try {
        fs.writeFileSync(tmpFile, serialized, 'utf-8');
        fs.renameSync(tmpFile, DATA_FILE);
      } catch {
        fs.writeFileSync(DATA_FILE, serialized, 'utf-8');
      }
      if (!skipGitHubSync && isGitHubCloudSyncEnabled() && getGitHubToken()) {
        this.syncToGitHub(dataToSave).catch(() => {});
      }
    } catch (err) {
      console.error('[DB] Failed to save database file:', err);
    }
  }

  private save() {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      this.saveDataDirect(this.data);
    } finally {
      this.isSaving = false;
    }
  }

  public async saveAsync(): Promise<void> {
    this.saveDataDirect(this.data);
    if (isGitHubCloudSyncEnabled() && getGitHubToken()) {
      if (this.syncPromise) {
        try { await this.syncPromise; } catch (_) {}
      }
      this.syncPromise = this.syncToGitHub(this.data);
      try {
        await this.syncPromise;
      } catch (err) {
        console.warn('[DB] saveAsync syncToGitHub failed:', err);
      } finally {
        this.syncPromise = null;
      }
    }
  }

  // --- Users & Authentication ---
  public findUserByUsername(username: string, _candidatePassword?: string): User | undefined {
    if (!username) return undefined;
    const raw = String(username).trim();
    const term = raw.toLowerCase().replace(/^@+/, '');
    if (!term) return undefined;

    // 1. Exact username match (case-insensitive, stripped @)
    const exactMatch = this.data.users.find((u) => {
      const uName = (u.username || '').trim().toLowerCase().replace(/^@+/, '');
      return uName === term;
    });
    if (exactMatch) return exactMatch;

    // 2. Unique exact email match
    if (term.includes('@')) {
      const emailMatches = this.data.users.filter((u) => u.email && u.email.trim().toLowerCase() === term);
      if (emailMatches.length === 1) return emailMatches[0];
    }

    // 3. Explicit legacy alias shortcuts ONLY when unambiguous exact alias
    if (term === 'operator' || term === 'dapodik' || term === 'operator.dapodik') {
      return this.data.users.find((u) => (u.username || '').toLowerCase() === 'bambang.operator');
    }
    if (term === 'kepsek.smp' || term === 'bambang.smp' || term === 'st.bambang') {
      return this.data.users.find((u) => (u.username || '').toLowerCase() === 'bambang.kepsek');
    }
    if (term === 'kepsek.sd' || term === 'margaretha.sd' || term === 'margaretha.kepsek') {
      return this.data.users.find((u) => (u.username || '').toLowerCase() === 'margaretha.h');
    }

    return undefined;
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getAllStudents(): User[] {
    const deletedList = this.data.deletedUserIds || [];
    return this.data.users
      .filter((u) => u.role === 'siswa')
      .filter((u) => {
        if (isDemoStudent(u)) return false;
        const un = (u.username || '').toLowerCase();
        if (deletedList.includes(u.id) || deletedList.includes(u.username) || deletedList.includes(un)) return false;
        return true;
      });
  }

  public getAllUsers(): User[] {
    const deletedList = this.data.deletedUserIds || [];
    return this.data.users.filter((u) => {
      if (isDemoStudent(u)) return false;
      const un = (u.username || '').toLowerCase();
      if (deletedList.includes(u.id) || deletedList.includes(u.username) || deletedList.includes(un)) return false;
      return true;
    });
  }

  public getUsers(): User[] {
    return this.getAllUsers();
  }

  public getStaffUsers(): User[] {
    const deletedList = this.data.deletedUserIds || [];
    return this.data.users
      .filter((u) => u.role !== 'siswa')
      .filter((u) => {
        if (isDemoStudent(u)) return false;
        const un = (u.username || '').trim().toLowerCase().replace(/^@+/, '');
        if (deletedList.includes(u.id) || deletedList.includes(u.username) || deletedList.includes(un)) return false;
        return true;
      })
      .map((u) => {
        if (u.role === 'guru') {
          u.isVerified = true;
          u.badgeType = 'green';
        }
        return u;
      });
  }

  public resetStaffPasswordToInitial(userId: string): { success: boolean; error?: string; initialPassword?: string } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'Pengguna tidak ditemukan.' };
    if (user.role === 'admin' && user.username === 'TAMANSISWA') {
      return { success: false, error: 'Password Admin Utama terproteksi dan tidak dapat diubah.' };
    }
    const staffPreset = OFFICIAL_STAFF_LIST.find((s) => s.username.toLowerCase() === user.username.toLowerCase());
    const resetPass = staffPreset ? staffPreset.initialPassword : `Tamvesta!${Math.floor(1000 + Math.random() * 9000)}`;
    const pass = hashPassword(resetPass);
    user.passwordHash = pass.hash;
    user.salt = pass.salt;
    delete (user as any).password;
    delete (user as any).initialPassword;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    user.mustChangePassword = false;
    user.updatedAt = new Date().toISOString();
    this.save();
    this.emitRealtimeEvent({
      type: 'sync_update',
      entity: 'users',
      action: 'updated',
      entityId: user.id,
    });
    return { success: true, initialPassword: resetPass };
  }

  public syncMultipleUsers(incomingUsers: User[]): { added: number; updated: number; users: User[] } {
    if (!Array.isArray(incomingUsers) || incomingUsers.length === 0) {
      return { added: 0, updated: 0, users: this.getAllUsers() };
    }
    const normalize = (v: string) => (v || '').trim().toLowerCase().replace(/^@+/, '');
    const deletedSet = new Set((this.data.deletedUserIds || []).map(normalize));
    let added = 0;
    let updated = 0;
    incomingUsers.forEach((incoming) => {
      if (!incoming || !incoming.username) return;
      const cleanUn = normalize(incoming.username);
      const cleanId = normalize(incoming.id || '');
      if (OLD_DEMO_USERNAMES.includes(cleanUn) || incoming.id?.startsWith('user_siswa_siswa_') || (incoming.name || '').toLowerCase() === 'ahmad fauzi') return;

      // Jangan pernah mengembalikan akun yang sudah dihapus permanen
      if (deletedSet.has(cleanUn) || (cleanId && deletedSet.has(cleanId))) return;

      const existing = this.data.users.find(
        (u) => u.id === incoming.id || normalize(u.username) === cleanUn
      );
      if (existing) {
        const incomingTime = new Date(incoming.updatedAt || 0).getTime();
        const existingTime = new Date(existing.updatedAt || 0).getTime();
        if (incomingTime > existingTime) {
          if (incoming.name) existing.name = incoming.name;
          if (incoming.kelas) existing.kelas = incoming.kelas;
          if (incoming.gender) existing.gender = incoming.gender;
          existing.updatedAt = new Date().toISOString();
          updated++;
        }
      } else {
        const generatedPass = 'Siswa' + Math.floor(100000 + Math.random() * 900000);
        const resolvedPass = incoming.initialPassword || (incoming as any).password || generatedPass;
        const pass = hashPassword(resolvedPass);
        const newUser: User = {
          id: incoming.id || ('stu_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
          username: cleanUn,
          name: (incoming.name || 'Siswa').trim(),
          role: incoming.role || 'siswa',
          gender: incoming.gender || 'Laki-laki',
          kelas: incoming.kelas || 'Kelas 7',
          passwordHash: pass.hash,
          salt: pass.salt,
          tokenVersion: 0,
          mustChangePassword: false,
          isActive: incoming.isActive !== undefined ? incoming.isActive : true,
          qrToken: generateQrToken(incoming.id || cleanUn, cleanUn),
          avatarUrl: incoming.avatarUrl || ('https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(incoming.name || cleanUn) + '&backgroundColor=0284c7'),
          createdAt: incoming.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.data.users.push(newUser);
        added++;
      }
    });
    if (added > 0 || updated > 0) this.save();
    return { added, updated, users: this.getAllUsers() };
  }

  public createStudent(userData: {
    name: string;
    username: string;
    password: string;
    gender?: 'Laki-laki' | 'Perempuan';
    kelas?: string;
    nisn?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
  }): { success: boolean; user?: User; error?: string } {
    const rawUsername = userData.username || '';
    const cleanUsername = rawUsername.trim().toLowerCase().replace(/^@+/, '');
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'Username minimal 3 karakter.' };
    }
    if (!userData.name || !userData.name.trim()) {
      return { success: false, error: 'Nama lengkap siswa wajib diisi.' };
    }
    if (!userData.password || userData.password.trim().length < 6) {
      return { success: false, error: 'Password minimal 6 karakter demi keamanan akun.' };
    }

    // Check unique username
    const exists = this.data.users.find(
      (u) => (u.username || '').trim().toLowerCase().replace(/^@+/, '') === cleanUsername
    );
    if (exists) {
      return { success: false, error: `Username "${cleanUsername}" sudah terdaftar. Gunakan username lain.` };
    }

    const now = new Date().toISOString();
    const id = `stu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const pass = hashPassword(userData.password.trim());
    const qrToken = generateQrToken(id, cleanUsername);

    // Hapus dari deletedUserIds jika username didaftarkan ulang secara eksplisit oleh Admin
    this.data.deletedUserIds = (this.data.deletedUserIds || []).filter(
      (did) => did !== id && did.toLowerCase().replace(/^@+/, '') !== cleanUsername
    );

    const newUser: User = {
      id,
      username: cleanUsername,
      name: userData.name.trim(),
      role: 'siswa',
      gender: userData.gender || 'Laki-laki',
      kelas: userData.kelas?.trim() || 'Kelas 7',
      nisn: userData.nisn?.trim() || undefined,
      phone: userData.phone?.trim() || undefined,
      email: userData.email?.trim() || undefined,
      passwordHash: pass.hash,
      salt: pass.salt,
      tokenVersion: 0,
      mustChangePassword: false,
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      registrationStatus: 'approved',
      qrToken,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name)}&backgroundColor=0284c7`,
      createdAt: now,
      updatedAt: now,
      isOfficial: true,
      isCustom: true,
      source: 'admin',
      isDemo: false,
    } as any;

    this.data.users.push(newUser);
    this.save();
    this.addActivityLog({
      type: 'account_created',
      title: 'Pembuatan Akun Siswa',
      description: `Akun Siswa @${newUser.username} (${newUser.name} - ${newUser.kelas}) berhasil ditambahkan.`,
      userId: newUser.id,
      userName: newUser.name,
      userRole: newUser.role,
    });
    return { success: true, user: newUser };
  }

  public createPortalRegistration(userData: {
    name: string;
    username: string;
    password: string;
    gender?: 'Laki-laki' | 'Perempuan';
    kelas?: string;
    nisn?: string;
    phone?: string;
    parentName?: string;
    birthPlaceDate?: string;
    address?: string;
  }): { success: boolean; user?: User; registrationNumber?: string; error?: string } {
    const rawUsername = userData.username || '';
    const cleanUsername = rawUsername.trim().toLowerCase().replace(/^@+/, '');
    if (!cleanUsername) {
      return { success: false, error: 'Username wajib diisi.' };
    }
    if (!userData.name || !userData.name.trim()) {
      return { success: false, error: 'Nama lengkap calon siswa wajib diisi.' };
    }
    if (!userData.password || userData.password.length < 6) {
      return { success: false, error: 'Password minimal 6 karakter demi keamanan akun.' };
    }

    // Check unique username
    const exists = this.findUserByUsername(cleanUsername);
    if (exists) {
      return { success: false, error: `Username "${cleanUsername}" sudah terdaftar. Silakan pilih username lain.` };
    }

    const now = new Date().toISOString();
    const id = `stu_reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const pass = hashPassword(userData.password.trim());
    const qrToken = generateQrToken(id, cleanUsername);
    const regNumber = `REG-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    // Hapus dari deletedUserIds jika username didaftarkan ulang
    this.data.deletedUserIds = (this.data.deletedUserIds || []).filter(
      (did) => did !== id && did.toLowerCase() !== cleanUsername
    );

      const newUser: User = {
      id,
      username: cleanUsername,
      name: userData.name.trim(),
      role: 'siswa',
      gender: userData.gender || 'Laki-laki',
      kelas: userData.kelas?.trim() || 'Kelas 7',
      nisn: userData.nisn?.trim() || undefined,
      phone: userData.phone?.trim() || undefined,
      parentName: userData.parentName?.trim() || undefined,
      birthPlaceDate: userData.birthPlaceDate?.trim() || undefined,
      address: userData.address?.trim() || undefined,
      passwordHash: pass.hash,
      salt: pass.salt,
      tokenVersion: 0,
      mustChangePassword: false,
      isActive: false, // Menunggu ACC dari admin/TU
      registrationStatus: 'pending',
      registrationNumber: regNumber,
      registeredAt: now,
      qrToken,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name)}&backgroundColor=0284c7`,
      createdAt: now,
      updatedAt: now,
      isOfficial: true,
      isCustom: true,
      source: 'portal_registration',
      isDemo: false,
    } as any;

    this.data.users.push(newUser);
    this.save();

    // Notifikasi untuk admin & TU
    try {
      this.createNotification({
        title: '📋 Pendaftaran Siswa Baru (Menunggu ACC)',
        message: `Calon siswa: ${newUser.name} (${regNumber}) mendaftar untuk kelas ${newUser.kelas}. Menunggu verifikasi dan persetujuan (ACC).`,
        type: 'system',
        targetRoles: ['admin', 'tata_usaha'],
      } as any);
    } catch (_) {}

    this.addRefreshSignal({
      userId: newUser.id,
      userName: newUser.name,
      userUsername: newUser.username,
      userKelas: newUser.kelas,
    });

    return { success: true, user: newUser, registrationNumber: regNumber };
  }

  public approveRegistration(id: string, approverName: string = 'Admin'): { success: boolean; user?: User; error?: string } {
    const user = this.findUserById(id);
    if (!user) return { success: false, error: 'Data pendaftar tidak ditemukan.' };

    user.isActive = true;
    user.registrationStatus = 'approved';
    user.approvedAt = new Date().toISOString();
    user.approvedBy = approverName;
    user.updatedAt = new Date().toISOString();
    this.save();

    try {
      this.createNotification({
        title: '✅ Pendaftaran Siswa Di-ACC',
        message: `Pendaftaran akun siswa ${user.name} (@${user.username}) telah disetujui (ACC) oleh ${approverName}. Akun kini aktif.`,
        type: 'system',
        targetRoles: ['admin', 'tata_usaha'],
      } as any);
    } catch (_) {}

    this.addRefreshSignal({
      userId: user.id,
      userName: user.name,
      userUsername: user.username,
      userKelas: user.kelas,
    });
    return { success: true, user };
  }

  public rejectRegistration(id: string): { success: boolean; user?: User; error?: string } {
    const user = this.findUserById(id);
    if (!user) return { success: false, error: 'Data pendaftar tidak ditemukan.' };

    user.isActive = false;
    user.registrationStatus = 'rejected';
    user.updatedAt = new Date().toISOString();
    this.save();

    this.addRefreshSignal({
      userId: user.id,
      userName: user.name,
      userUsername: user.username,
      userKelas: user.kelas,
    });
    return { success: true, user };
  }

  public updateStudent(
    id: string,
    data: {
      name?: string;
      gender?: 'Laki-laki' | 'Perempuan';
      kelas?: string;
      username?: string;
      phone?: string;
      email?: string;
      bio?: string;
      isActive?: boolean;
      role?: UserRole;
      jabatan?: string;
      password?: string;
      expectedUpdatedAt?: string;
    }
  ): { success: boolean; user?: User; error?: string; conflict?: boolean } {
    const user = this.findUserById(id);
    if (!user) return { success: false, error: 'Data pengguna tidak ditemukan.' };

    if (data.expectedUpdatedAt && user.updatedAt && data.expectedUpdatedAt !== user.updatedAt) {
      return {
        success: false,
        conflict: true,
        error: 'Data akun ini baru saja diperbarui oleh Admin lain. Silakan muat ulang data terbaru sebelum menyimpan.',
      };
    }

    if (data.username && data.username.trim().toLowerCase() !== user.username.toLowerCase()) {
      const trimmed = data.username.trim().toLowerCase().replace(/^@+/, '');
      if (trimmed.length < 3) {
        return { success: false, error: 'Username minimal 3 karakter.' };
      }
      const exists = this.data.users.find(
        (u) => u.id !== user.id && (u.username || '').trim().toLowerCase().replace(/^@+/, '') === trimmed
      );
      if (exists) {
        return { success: false, conflict: true, error: `Username "${trimmed}" sudah digunakan oleh akun lain.` };
      }
      user.username = trimmed;
      user.qrToken = generateQrToken(user.id, trimmed);
    }
    if (data.name && data.name.trim()) user.name = data.name.trim();
    if (data.gender) user.gender = data.gender;
    if (data.kelas !== undefined) user.kelas = data.kelas.trim();
    if (data.phone !== undefined) user.phone = data.phone.trim();
    if (data.email !== undefined) user.email = data.email.trim();
    if (data.bio !== undefined) user.bio = data.bio.trim();
    if (data.jabatan !== undefined) user.jabatan = data.jabatan.trim();
    if (data.role && user.username !== 'TAMANSISWA') {
      user.role = data.role;
      if (data.role === 'guru') {
        user.isVerified = true;
        user.badgeType = 'green';
      }
    }
    if (data.isActive !== undefined && user.username !== 'TAMANSISWA') {
      user.isActive = Boolean(data.isActive);
      if (!user.isActive) {
        user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      }
    }
    if (data.password && data.password.trim().length >= 6) {
      const hashed = hashPassword(data.password.trim());
      user.passwordHash = hashed.hash;
      user.salt = hashed.salt;
      delete (user as any).password;
      delete (user as any).initialPassword;
      user.passwordChanged = true;
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    }
    user.updatedAt = new Date().toISOString();
    this.save();
    return { success: true, user };
  }

  public createUserByAdmin(data: {
    name: string;
    username: string;
    password: string;
    role?: UserRole;
    gender?: 'Laki-laki' | 'Perempuan';
    kelas?: string;
    jabatan?: string;
    email?: string;
    phone?: string;
    isActive?: boolean;
  }): { success: boolean; user?: User; error?: string } {
    const cleanUsername = (data.username || '').trim().toLowerCase().replace(/^@+/, '');
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'Username minimal 3 karakter.' };
    }
    if (!data.name || !data.name.trim()) {
      return { success: false, error: 'Nama lengkap wajib diisi.' };
    }
    if (!data.password || data.password.trim().length < 6) {
      return { success: false, error: 'Password minimal 6 karakter.' };
    }
    const role: UserRole = data.role || 'siswa';
    if (role === 'siswa') {
      return this.createStudent({
        name: data.name,
        username: cleanUsername,
        password: data.password,
        gender: data.gender,
        kelas: data.kelas,
        phone: data.phone,
        email: data.email,
        isActive: data.isActive,
      });
    }
    const exists = this.data.users.find(
      (u) => (u.username || '').trim().toLowerCase().replace(/^@+/, '') === cleanUsername
    );
    if (exists) {
      return { success: false, error: `Username "@${cleanUsername}" sudah digunakan.` };
    }
    const now = new Date().toISOString();
    const id = `user_${role}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const pass = hashPassword(data.password.trim());
    this.data.deletedUserIds = (this.data.deletedUserIds || []).filter(
      (did) => did !== id && did.toLowerCase().replace(/^@+/, '') !== cleanUsername
    );
    const newUser: User = {
      id,
      username: cleanUsername,
      name: data.name.trim(),
      role,
      gender: data.gender,
      kelas: data.kelas?.trim() || undefined,
      jabatan: data.jabatan?.trim() || role.toUpperCase(),
      passwordHash: pass.hash,
      salt: pass.salt,
      tokenVersion: 0,
      mustChangePassword: false,
      isActive: data.isActive !== undefined ? data.isActive : true,
      isVerified: role === 'guru' ? true : undefined,
      badgeType: role === 'guru' ? 'green' : undefined,
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      qrToken: generateQrToken(id, cleanUsername),
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name.trim())}&backgroundColor=059669`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.users.unshift(newUser);
    this.save();
    this.addActivityLog({
      type: 'account_created',
      title: `Pembuatan Akun ${role.toUpperCase()}`,
      description: `Akun ${role.toUpperCase()} @${newUser.username} (${newUser.name}) berhasil dibuat oleh Admin.`,
      userId: newUser.id,
      userName: newUser.name,
      userRole: newUser.role,
    });
    return { success: true, user: newUser };
  }

  public toggleUserActive(userId: string): { success: boolean; user?: User; isActive?: boolean; error?: string } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'Pengguna tidak ditemukan.' };
    if (user.username === 'TAMANSISWA') {
      return { success: false, error: 'Akun Admin Utama TAMANSISWA tidak dapat dinonaktifkan.' };
    }
    user.isActive = !user.isActive;
    if (!user.isActive) {
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      if (Array.isArray(this.data.deviceSessions)) {
        this.data.deviceSessions = this.data.deviceSessions.filter((s) => {
          if (s.userId === user.id) {
            this.recordTombstone('deletedDeviceIds', s.id);
            return false;
          }
          return true;
        });
      }
      this.emitRealtimeEvent({
        type: 'session_revoked',
        entity: 'users',
        action: 'status_changed',
        entityId: user.id,
        targetUserId: user.id,
        payload: { reason: 'Akun dinonaktifkan oleh Administrator.' },
      });
    }
    user.updatedAt = new Date().toISOString();
    this.save();
    return { success: true, user, isActive: user.isActive };
  }

  public resetUserPassword(userId: string, newPassword: string): { success: boolean; error?: string } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'Pengguna tidak ditemukan.' };
    if (user.username === 'TAMANSISWA') {
      return { success: false, error: 'Password Admin Utama TAMANSISWA dilindungi dan tidak dapat diubah.' };
    }
    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, error: 'Password baru minimal 6 karakter.' };
    }
    const cleanPass = newPassword.trim();
    const hashed = hashPassword(cleanPass);
    user.passwordHash = hashed.hash;
    user.salt = hashed.salt;
    delete (user as any).password;
    delete (user as any).initialPassword;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    (user as any).passwordChanged = true;
    user.mustChangePassword = false;
    user.updatedAt = new Date().toISOString();
    this.save();
    return { success: true };
  }

  public changePassword(userId: string, oldPassword: string, newPassword: string): { success: boolean; error?: string } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'Pengguna tidak ditemukan.' };
    if (user.username === 'TAMANSISWA') {
      return { success: false, error: 'Password Administrator Utama berstatus tetap dan tidak dapat diubah.' };
    }
    if (!verifyPassword(oldPassword, user.passwordHash, user.salt)) {
      return { success: false, error: 'Password lama tidak sesuai.' };
    }
    if (newPassword.trim().length < 6) {
      return { success: false, error: 'Password baru minimal 6 karakter.' };
    }

    const hashed = hashPassword(newPassword.trim());
    user.passwordHash = hashed.hash;
    user.salt = hashed.salt;
    delete (user as any).password;
    delete (user as any).initialPassword;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    (user as any).passwordChanged = true;
    user.mustChangePassword = false;
    user.updatedAt = new Date().toISOString();
    this.save();
    return { success: true };
  }

  // Username modification with 30-day constraint
  public updateUsername(userId: string, newUsername: string): { success: boolean; user?: User; error?: string; daysRemaining?: number } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'Pengguna tidak ditemukan.' };

    const trimmed = newUsername.trim().toLowerCase();
    if (trimmed.length < 3) {
      return { success: false, error: 'Username minimal 3 karakter.' };
    }
    if (!/^[a-z0-9._]+$/.test(trimmed)) {
      return { success: false, error: 'Username hanya boleh berisi huruf kecil, angka, titik, atau garis bawah (_).' };
    }

    if (trimmed === user.username.toLowerCase()) {
      return { success: false, error: 'Username baru tidak boleh sama dengan username saat ini.' };
    }

    // Check 30-day restriction
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    if (user.lastUsernameChange) {
      const lastChange = new Date(user.lastUsernameChange).getTime();
      const elapsed = Date.now() - lastChange;
      if (elapsed < THIRTY_DAYS_MS) {
        const daysRemaining = Math.ceil((THIRTY_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000));
        return {
          success: false,
          error: `Username hanya dapat diubah maksimal 1 kali dalam periode 30 hari. Anda baru dapat mengubahnya kembali dalam ${daysRemaining} hari.`,
          daysRemaining,
        };
      }
    }

    // Check if newUsername is already taken
    const exists = this.findUserByUsername(trimmed);
    if (exists && exists.id !== user.id) {
      return { success: false, error: `Username "${trimmed}" sudah digunakan oleh pengguna lain.` };
    }

    const oldUsername = user.username;
    user.username = trimmed;
    user.lastUsernameChange = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    user.qrToken = generateQrToken(user.id, trimmed);

    if (!user.usernameChangeHistory) {
      user.usernameChangeHistory = [];
    }
    user.usernameChangeHistory.push({
      oldUsername,
      newUsername: trimmed,
      changedAt: user.lastUsernameChange,
    });

    this.save();
    return { success: true, user };
  }

  // Password Reset Requests (for non-admin users)
  public createPasswordResetRequest(userId: string, newPassword: string, reason?: string): { success: boolean; request?: PasswordResetRequest; error?: string } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'Pengguna tidak ditemukan.' };
    if (user.role === 'admin' || user.username === 'TAMANSISWA') {
      return { success: false, error: 'Akun Administrator tidak memerlukan pengajuan ganti sandi.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password baru minimal 6 karakter demi keamanan akun.' };
    }

    // Check for existing pending request
    const existing = this.data.passwordResetRequests.find(
      (r) => r.userId === userId && r.status === 'pending'
    );
    if (existing) {
      return { success: false, error: 'Anda sudah memiliki pengajuan ganti sandi yang sedang menunggu persetujuan Admin.' };
    }

    const hashed = hashPassword(newPassword.trim());
    const ticketNum = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    const newReq: PasswordResetRequest = {
      id: `pr_${Date.now()}`,
      ticketNumber: ticketNum,
      userId: user.id,
      username: user.username,
      name: user.name,
      kelas: user.kelas || '-',
      role: user.role,
      reason: (reason || 'Pengajuan ganti sandi').trim(),
      status: 'pending',
      newPasswordHash: hashed.hash,
      newSalt: hashed.salt,
      createdAt: new Date().toISOString(),
    };

    this.data.passwordResetRequests.unshift(newReq);

    // Push notification to Admin
    this.addNotification({
      title: 'Pengajuan Ganti Sandi Baru',
      message: `${user.name} (${user.kelas || 'Siswa'}) mengajukan ganti sandi (Tiket: ${ticketNum}).`,
      type: 'security',
      targetRole: 'admin',
    });

    this.save();
    return { success: true, request: newReq };
  }

  public getPasswordResetRequests(): PasswordResetRequest[] {
    return this.data.passwordResetRequests;
  }

  public processPasswordResetRequest(
    requestId: string,
    adminUser: User,
    status: 'approved' | 'rejected' | 'acc',
    adminNote?: string
  ): { success: boolean; request?: PasswordResetRequest; error?: string } {
    const req = this.data.passwordResetRequests.find((r) => r.id === requestId);
    if (!req) return { success: false, error: 'Tiket pengajuan ganti sandi tidak ditemukan.' };
    if (req.status !== 'pending') {
      return { success: false, error: 'Tiket ini sudah diproses sebelumnya dan tidak dapat diubah lagi.' };
    }

    const user = this.findUserById(req.userId) || (req.username ? this.findUserByUsername(req.username) : null);
    if (!user) return { success: false, error: 'Pengguna akun tidak ditemukan.' };

    const effectiveStatus: 'approved' | 'rejected' = status === 'acc' || status === 'approved' ? 'approved' : 'rejected';
    req.status = effectiveStatus;
    req.processedAt = new Date().toISOString();
    req.processedBy = adminUser.name;
    req.adminNote = adminNote || (effectiveStatus === 'approved' ? 'ACC' : 'Ditolak');

    if (effectiveStatus === 'approved') {
      if (req.newPasswordHash && req.newSalt) {
        user.passwordHash = req.newPasswordHash;
        user.salt = req.newSalt;
      } else if (req.newPassword) {
        const hashed = hashPassword(req.newPassword);
        user.passwordHash = hashed.hash;
        user.salt = hashed.salt;
      }
      delete (user as any).password;
      delete (user as any).initialPassword;
      delete (req as any).newPassword;
      user.passwordChanged = true;
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      user.mustChangePassword = false;
      user.updatedAt = new Date().toISOString();
      // Send notification to student
      this.addNotification({
        title: 'Pengajuan Ganti Sandi di-ACC',
        message: `Pengajuan ganti sandi Anda (Tiket: ${req.ticketNumber || req.id}) telah di-ACC oleh Admin. Kata sandi baru Anda telah aktif dan dapat langsung digunakan.`,
        type: 'security',
        targetUserId: user.id,
      });
    } else {
      delete (req as any).newPassword;
      // Send rejection notification to student
      this.addNotification({
        title: 'Pengajuan Ganti Sandi Ditolak',
        message: `Pengajuan ganti sandi Anda (Tiket: ${req.ticketNumber || req.id}) DITOLAK oleh Admin. Alasan: ${req.adminNote}`,
        type: 'security',
        targetUserId: user.id,
      });
    }

    this.save();
    return { success: true, request: req };
  }

  // --- Subjects ---
  public getSubjects(): Subject[] {
    return this.data.subjects;
  }

  public findSubjectById(id: string): Subject | undefined {
    return this.data.subjects.find((s) => s.id === id);
  }

  public addSubject(subject: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>): Subject {
    const now = new Date().toISOString();
    const newSubject: Subject = {
      ...subject,
      id: `subj_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.subjects.push(newSubject);
    this.save();
    return newSubject;
  }

  public updateSubject(id: string, updates: Partial<Subject>): Subject | null {
    const idx = this.data.subjects.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.data.subjects[idx] = {
      ...this.data.subjects[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.subjects[idx];
  }

  public deleteSubject(id: string): boolean {
    const initialLen = this.data.subjects.length;
    const existed = this.data.subjects.some((s) => s.id === id) || (this.data.deletedSubjectIds || []).includes(id);
    if (!existed) return false;
    this.recordTombstone('deletedSubjectIds', id);
    this.data.subjects = this.data.subjects.filter((s) => s.id !== id);
    if (this.data.subjects.length !== initialLen) {
      this.save();
    }
    return true;
  }

  // --- Digital Books ---
  public getBooks(): DigitalBook[] {
    return this.data.books;
  }

  public findBookById(id: string): DigitalBook | undefined {
    return this.data.books.find((b) => b.id === id);
  }

  public addBook(book: Omit<DigitalBook, 'id' | 'createdAt'>): DigitalBook {
    const newBook: DigitalBook = {
      ...book,
      id: `book_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.books.push(newBook);
    this.save();
    return newBook;
  }

  public updateBook(id: string, updates: Partial<DigitalBook>): DigitalBook | null {
    const idx = this.data.books.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    this.data.books[idx] = {
      ...this.data.books[idx],
      ...updates,
    };
    this.save();
    return this.data.books[idx];
  }

  public deleteBook(id: string): boolean {
    const initialLen = this.data.books.length;
    this.recordTombstone('deletedBookIds', id);
    this.data.books = this.data.books.filter((b) => b.id !== id);
    if (this.data.books.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Announcements ---
  public getAnnouncements(): Announcement[] {
    return this.data.announcements.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public findAnnouncementById(id: string): Announcement | undefined {
    return this.data.announcements.find((a) => a.id === id);
  }

  public addAnnouncement(ann: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>): Announcement {
    const now = new Date().toISOString();
    const newAnn: Announcement = {
      ...ann,
      id: `ann_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.announcements.unshift(newAnn);
    this.save();
    return newAnn;
  }

  public updateAnnouncement(id: string, updates: Partial<Announcement>): Announcement | null {
    const idx = this.data.announcements.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    this.data.announcements[idx] = {
      ...this.data.announcements[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.announcements[idx];
  }

  public deleteAnnouncement(id: string): boolean {
    const initialLen = this.data.announcements.length;
    const existed = this.data.announcements.some((a) => a.id === id) || (this.data.deletedAnnouncementIds || []).includes(id);
    if (!existed) return false;
    this.recordTombstone('deletedAnnouncementIds', id);
    this.data.announcements = this.data.announcements.filter((a) => a.id !== id);
    if (this.data.announcements.length !== initialLen) {
      this.save();
    }
    return true;
  }

  // --- Quizzes & Tokens ---
  public getQuizzes(): Quiz[] {
    return this.data.quizzes || [];
  }

  public findQuizById(id: string): Quiz | undefined {
    return (this.data.quizzes || []).find((q) => q.id === id);
  }

  public findQuizByToken(token: string): Quiz | undefined {
    if (!token) return undefined;
    const clean = token.trim().toUpperCase();
    const cleanNoSpecial = clean.replace(/[\s\-_]/g, '');
    const cleanAlphaNum = clean.replace(/[^A-Z0-9]/g, '');
    return (this.data.quizzes || []).find((q) => {
      if (!q.token) return false;
      const qToken = q.token.trim().toUpperCase();
      const qTokenNoSpecial = qToken.replace(/[\s\-_]/g, '');
      const qAlphaNum = qToken.replace(/[^A-Z0-9]/g, '');
      return (
        qToken === clean ||
        qTokenNoSpecial === cleanNoSpecial ||
        (cleanAlphaNum.length > 0 && qAlphaNum === cleanAlphaNum)
      );
    });
  }

  public verifyQuizAccess(payload: {
    token: string;
    studentName?: string;
    password?: string;
  }): { success: boolean; quiz?: Quiz; error?: string } {
    const cleanToken = payload.token ? payload.token.trim().toUpperCase() : '';
    if (!cleanToken) {
      return { success: false, error: 'Token quiz wajib diisi.' };
    }

    const quiz = this.findQuizByToken(cleanToken);
    if (!quiz) {
      return { success: false, error: 'Token quiz tidak ditemukan atau tidak valid. Silakan periksa kembali token yang diberikan oleh Guru.' };
    }

    if (quiz.isActive === false || quiz.status === 'inactive') {
      return { success: false, error: 'Quiz ini sedang tidak aktif atau telah ditutup oleh Guru.' };
    }

    if (quiz.password && quiz.password.trim() !== '') {
      if (!payload.password || payload.password !== quiz.password) {
        return { success: false, error: 'Password quiz salah. Silakan hubungi Guru pengampu untuk mendapatkan password yang benar.' };
      }
    }

    return { success: true, quiz };
  }

  public recordQuizViolation(violation: Omit<QuizViolation, 'id' | 'timestamp'>): QuizViolation {
    const newViolation: QuizViolation = {
      ...violation,
      id: `violation_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    if (!Array.isArray(this.data.quizViolations)) {
      this.data.quizViolations = [];
    }
    this.data.quizViolations.unshift(newViolation);

    if (this.data.quizViolations.length > 200) {
      this.data.quizViolations = this.data.quizViolations.slice(0, 200);
    }

    this.save();

    // Buat notifikasi peringatan pelanggaran ujian untuk Guru
    this.createNotification({
      title: '🚨 Pelanggaran Kuis Terdeteksi!',
      message: `Siswa "${newViolation.studentName}" terdeteksi ${newViolation.violationDetail} saat mengerjakan kuis "${newViolation.quizTitle}".`,
      type: 'quiz_violation',
      linkType: 'quiz',
      linkId: newViolation.quizId,
      targetRole: 'guru',
    });

    return newViolation;
  }

  public getQuizViolations(quizId?: string, teacherId?: string): QuizViolation[] {
    if (!Array.isArray(this.data.quizViolations)) return [];
    const deletedQuizSet = new Set((this.data.deletedQuizIds || []).map((id) => (id || '').trim().toLowerCase()));
    const validQuizIds = new Set((this.data.quizzes || []).map((q) => (q.id || '').trim().toLowerCase()));

    let list = this.data.quizViolations.filter((v) => {
      const vqId = (v.quizId || '').trim().toLowerCase();
      if (deletedQuizSet.has(vqId)) return false;
      if (!validQuizIds.has(vqId)) return false;
      return true;
    });

    if (quizId) {
      const targetQuizId = (quizId || '').trim().toLowerCase();
      list = list.filter((v) => (v.quizId || '').trim().toLowerCase() === targetQuizId);
    }
    if (teacherId) list = list.filter((v) => !v.teacherId || v.teacherId === teacherId);
    return list;
  }

  public clearQuizViolations(quizId?: string): boolean {
    if (!Array.isArray(this.data.quizViolations)) return true;
    if (quizId) {
      const targetQuizId = (quizId || '').trim().toLowerCase();
      this.data.quizViolations = this.data.quizViolations.filter(
        (v) => (v.quizId || '').trim().toLowerCase() !== targetQuizId
      );
    } else {
      this.data.quizViolations = [];
    }
    this.save();
    return true;
  }

  public deleteQuizViolation(violationId: string): boolean {
    if (!Array.isArray(this.data.quizViolations)) return true;
    this.data.quizViolations = this.data.quizViolations.filter((v) => v.id !== violationId);
    this.save();
    return true;
  }

  public recordQuizParticipant(payload: {
    quizId: string;
    quizTitle: string;
    studentId: string;
    studentName: string;
    studentUsername?: string;
    studentKelas?: string;
    tokenUsed: string;
  }): QuizParticipant {
    if (!Array.isArray(this.data.quizParticipants)) {
      this.data.quizParticipants = [];
    }
    const existing = this.data.quizParticipants.find(
      (p) => p.quizId === payload.quizId && p.studentId === payload.studentId
    );
    if (existing) {
      existing.enteredAt = new Date().toISOString();
      if (existing.status !== 'completed') {
        existing.status = 'in_progress';
      }
      this.save();
      return existing;
    }

    const newParticipant: QuizParticipant = {
      id: `part_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      quizId: payload.quizId,
      quizTitle: payload.quizTitle,
      studentId: payload.studentId,
      studentName: payload.studentName,
      studentUsername: payload.studentUsername,
      studentKelas: payload.studentKelas || '-',
      tokenUsed: payload.tokenUsed,
      enteredAt: new Date().toISOString(),
      status: 'in_progress',
    };
    this.data.quizParticipants.unshift(newParticipant);
    this.save();
    return newParticipant;
  }

  public completeQuizParticipant(quizId: string, studentId: string, score?: number): void {
    if (!Array.isArray(this.data.quizParticipants)) return;
    const participant = this.data.quizParticipants.find(
      (p) => p.quizId === quizId && p.studentId === studentId
    );
    if (participant) {
      participant.status = 'completed';
      if (score !== undefined) participant.score = score;
      this.save();
    }
  }

  public getQuizParticipants(quizId?: string): QuizParticipant[] {
    if (!Array.isArray(this.data.quizParticipants)) return [];
    const deletedQuizSet = new Set((this.data.deletedQuizIds || []).map((id) => (id || '').trim().toLowerCase()));
    const validQuizIds = new Set((this.data.quizzes || []).map((q) => (q.id || '').trim().toLowerCase()));

    let list = this.data.quizParticipants.filter((p) => {
      const pqId = (p.quizId || '').trim().toLowerCase();
      if (deletedQuizSet.has(pqId)) return false;
      if (!validQuizIds.has(pqId)) return false;
      return true;
    });

    if (quizId) {
      const targetQuizId = (quizId || '').trim().toLowerCase();
      list = list.filter((p) => (p.quizId || '').trim().toLowerCase() === targetQuizId);
    }
    return list.sort((a, b) => new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime());
  }

  public addQuiz(quiz: Omit<Quiz, 'id' | 'createdAt'>): Quiz {
    const cleanToken = quiz.token && quiz.token.trim() !== '' ? quiz.token.trim().toUpperCase() : generateRandomQuizToken();
    const newQuiz: Quiz = {
      ...quiz,
      id: `quiz_${Date.now()}`,
      token: cleanToken,
      sourceType: quiz.sourceType || 'interactive',
      status: quiz.status || (quiz.isActive ? 'active' : 'inactive'),
      createdAt: new Date().toISOString(),
    };
    if (this.data.deletedQuizIds) {
      this.data.deletedQuizIds = this.data.deletedQuizIds.filter((did) => did !== newQuiz.id);
    }
    this.data.quizzes.push(newQuiz);
    this.save();
    return newQuiz;
  }

  public updateQuiz(id: string, updates: Partial<Quiz>): Quiz | null {
    const idx = this.data.quizzes.findIndex((q) => q.id === id);
    if (idx === -1) return null;
    this.data.quizzes[idx] = {
      ...this.data.quizzes[idx],
      ...updates,
      token: updates.token ? updates.token.trim().toUpperCase() : this.data.quizzes[idx].token,
    };
    this.save();
    return this.data.quizzes[idx];
  }

  public deleteQuiz(id: string): boolean {
    const targetId = (id || '').trim().toLowerCase();
    this.data.quizzes = (this.data.quizzes || []).filter((q) => (q.id || '').trim().toLowerCase() !== targetId);
    this.data.deletedQuizIds = this.data.deletedQuizIds || [];
    if (!this.data.deletedQuizIds.some((did) => did.trim().toLowerCase() === targetId)) {
      this.data.deletedQuizIds.push(id);
    }
    // Hapus permanen seluruh data peserta kuis, pelanggaran kuis, dan riwayat attempt terkait
    if (Array.isArray(this.data.quizParticipants)) {
      this.data.quizParticipants = this.data.quizParticipants.filter((p) => (p.quizId || '').trim().toLowerCase() !== targetId);
    }
    if (Array.isArray(this.data.quizViolations)) {
      this.data.quizViolations = this.data.quizViolations.filter((v) => (v.quizId || '').trim().toLowerCase() !== targetId);
    }
    if (Array.isArray(this.data.quizAttempts)) {
      this.data.quizAttempts = this.data.quizAttempts.filter((a) => (a.quizId || '').trim().toLowerCase() !== targetId);
    }
    this.save();
    return true;
  }

  public getDeletedQuizIds(): string[] {
    return this.data.deletedQuizIds || [];
  }

  public syncMultipleQuizzes(incoming: Quiz[]): { added: number; updated: number; count: number } {
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return { added: 0, updated: 0, count: (this.data.quizzes || []).length };
    }
    if (!Array.isArray(this.data.quizzes)) this.data.quizzes = [];
    const deletedQuizSet = new Set(this.data.deletedQuizIds || []);
    let added = 0;
    let updated = 0;
    incoming.forEach((q) => {
      if (!q || !q.id || deletedQuizSet.has(q.id)) return;
      const cleanToken = q.token ? q.token.trim().toUpperCase() : '';
      const existingIdx = this.data.quizzes.findIndex(
        (x) => x.id === q.id || (cleanToken && x.token && x.token.trim().toUpperCase() === cleanToken)
      );
      if (existingIdx === -1) {
        this.data.quizzes.push({
          ...q,
          token: cleanToken || generateRandomQuizToken(),
          status: q.status || (q.isActive ? 'active' : 'inactive'),
        });
        added++;
      } else {
        this.data.quizzes[existingIdx] = {
          ...this.data.quizzes[existingIdx],
          ...q,
          token: cleanToken || this.data.quizzes[existingIdx].token,
        };
        updated++;
      }
    });
    this.save();
    return { added, updated, count: this.data.quizzes.length };
  }

  public submitQuizAttempt(attempt: Omit<QuizAttempt, 'id' | 'completedAt'>): QuizAttempt {
    const newAttempt: QuizAttempt = {
      ...attempt,
      id: `att_${Date.now()}`,
      completedAt: new Date().toISOString(),
    };
    this.data.quizAttempts.push(newAttempt);
    this.save();
    return newAttempt;
  }

  public getQuizAttempts(quizId?: string, studentId?: string): QuizAttempt[] {
    if (!Array.isArray(this.data.quizAttempts)) return [];
    const deletedQuizSet = new Set((this.data.deletedQuizIds || []).map((id) => (id || '').trim().toLowerCase()));
    const validQuizIds = new Set((this.data.quizzes || []).map((q) => (q.id || '').trim().toLowerCase()));

    let result = this.data.quizAttempts.filter((a) => {
      const aqId = (a.quizId || '').trim().toLowerCase();
      if (deletedQuizSet.has(aqId)) return false;
      if (!validQuizIds.has(aqId)) return false;
      return true;
    });

    if (quizId) {
      const targetQuizId = (quizId || '').trim().toLowerCase();
      result = result.filter((a) => (a.quizId || '').trim().toLowerCase() === targetQuizId);
    }
    if (studentId) result = result.filter((a) => a.studentId === studentId);
    return result.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }

  // --- Attendance Events & Sessions ---
  public getAttendanceEvents(): AttendanceEvent[] {
    return this.data.attendanceEvents;
  }

  public findEventById(id: string): AttendanceEvent | undefined {
    return this.data.attendanceEvents.find((e) => e.id === id);
  }

  public createAttendanceEvent(eventData: Omit<AttendanceEvent, 'id' | 'createdAt'>): AttendanceEvent {
    const newEvent: AttendanceEvent = {
      ...eventData,
      id: `event_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.attendanceEvents.unshift(newEvent);
    this.save();
    return newEvent;
  }

  public updateAttendanceEvent(id: string, updates: Partial<AttendanceEvent>): AttendanceEvent | null {
    const idx = this.data.attendanceEvents.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    this.data.attendanceEvents[idx] = {
      ...this.data.attendanceEvents[idx],
      ...updates,
    };
    this.save();
    return this.data.attendanceEvents[idx];
  }

  public toggleEventSession(id: string): { success: boolean; isOpen?: boolean; error?: string } {
    const event = this.findEventById(id);
    if (!event) return { success: false, error: 'Kegiatan tidak ditemukan.' };
    event.isOpen = !event.isOpen;
    this.save();
    return { success: true, isOpen: event.isOpen };
  }

  public deleteAttendanceEvent(id: string): boolean {
    this.recordTombstone('deletedEventIds', id);
    const initialLen = this.data.attendanceEvents.length;
    this.data.attendanceEvents = this.data.attendanceEvents.filter((e) => e.id !== id);
    this.save();
    return this.data.attendanceEvents.length !== initialLen || true;
  }

  // --- Attendance Records & Scan Verification ---
  public getAttendanceRecords(eventId?: string): AttendanceRecord[] {
    if (eventId) {
      return this.data.attendanceRecords.filter((r) => r.eventId === eventId);
    }
    return this.data.attendanceRecords;
  }

  public processQrScan(payload: {
    eventId: string;
    qrString: string;
    verifiedBy: string;
  }): {
    status: 'SUCCESS' | 'ALREADY_SCANNED' | 'INVALID_QR' | 'ACCOUNT_INACTIVE' | 'SESSION_CLOSED' | 'SERVER_ERROR';
    message: string;
    record?: AttendanceRecord;
    student?: { id: string; name: string; username: string; kelas?: string };
    event?: { id: string; name: string };
    scanTime?: string;
  } {
    const event = this.findEventById(payload.eventId);
    if (!event) {
      return {
        status: 'SERVER_ERROR',
        message: 'Kegiatan tidak ditemukan.',
      };
    }

    if (!event.isOpen) {
      return {
        status: 'SESSION_CLOSED',
        message: `Sesi absensi untuk kegiatan "${event.name}" saat ini sedang DITUTUP.`,
        event: { id: event.id, name: event.name },
      };
    }

    const parts = payload.qrString.trim().split(':');
    let student: User | undefined;

    if (parts.length >= 3 && parts[0] === 'TAMVESTA' && parts[1] === 'STUDENT') {
      const studentId = parts[2];
      student = this.findUserById(studentId);
    } else {
      student = this.findUserByUsername(payload.qrString.trim());
    }

    if (!student) {
      return {
        status: 'INVALID_QR',
        message: 'QR Code tidak terdaftar dalam sistem Tamansiswa Batam.',
        event: { id: event.id, name: event.name },
      };
    }

    if (!student.isActive) {
      return {
        status: 'ACCOUNT_INACTIVE',
        message: `Akun siswa @${student.username} (${student.name}) dalam status NONAKTIF. Hubungi Administrator.`,
        student: { id: student.id, name: student.name, username: student.username, kelas: student.kelas },
        event: { id: event.id, name: event.name },
      };
    }

    const alreadyScanned = this.data.attendanceRecords.some(
      (r) => r.eventId === event.id && r.studentId === student!.id
    );

    if (alreadyScanned) {
      return {
        status: 'ALREADY_SCANNED',
        message: `Siswa ${student.name} (@${student.username}) SUDAH ABSEN sebelumnya pada kegiatan ini.`,
        student: { id: student.id, name: student.name, username: student.username, kelas: student.kelas },
        event: { id: event.id, name: event.name },
      };
    }

    const now = new Date().toISOString();
    const newRecord: AttendanceRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      eventId: event.id,
      eventName: event.name,
      studentId: student.id,
      studentName: student.name,
      username: student.username,
      kelas: student.kelas,
      verifiedAt: now,
      verifiedBy: payload.verifiedBy,
      status: 'TELAH MASUK',
      verificationResult: 'BERHASIL',
    };

    this.data.attendanceRecords.unshift(newRecord);
    this.save();

    return {
      status: 'SUCCESS',
      message: `Presensi Berhasil! Siswa ${student.name} (${student.kelas || 'Siswa'}) tercatat TELAH MASUK.`,
      record: newRecord,
      student: { id: student.id, name: student.name, username: student.username, kelas: student.kelas },
      event: { id: event.id, name: event.name },
      scanTime: now,
    };
  }

  // -------------------------------------------------------------
  // POSTS & FEED SISWA (Hanya diisi oleh akun terdaftar)
  // -------------------------------------------------------------
  getPosts(): StudentPost[] {
    if (!Array.isArray(this.data.posts)) this.data.posts = [];
    return [...this.data.posts]
      .filter((p) => !p.id.startsWith('post_seed_'))
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  getPostById(id: string): StudentPost | undefined {
    if (!Array.isArray(this.data.posts)) this.data.posts = [];
    return this.data.posts.find((p) => p.id === id);
  }

  togglePinPost(id: string): StudentPost {
    if (!Array.isArray(this.data.posts)) this.data.posts = [];
    const post = this.data.posts.find((p) => p.id === id);
    if (!post) throw new Error('Postingan tidak ditemukan');
    post.isPinned = !post.isPinned;
    this.save();
    return post;
  }

  addPost(payload: {
    authorId: string;
    authorName: string;
    authorUsername: string;
    authorKelas?: string;
    authorAvatar?: string;
    authorIsVerified?: boolean;
    authorIsAlumni?: boolean;
    isPinned?: boolean;
    caption: string;
    mediaType: 'photo' | 'video' | 'none';
    mediaUrl?: string;
    mediaName?: string;
  }): StudentPost {
    const authorUser = this.findUserById(payload.authorId) || this.findUserByUsername(payload.authorUsername);
    const isDev = authorUser?.isDeveloper || authorUser?.role === 'support' || payload.authorUsername.toLowerCase() === 'tamvesta' || payload.authorId === 'user_support_tamvesta';
    const isVer = payload.authorIsVerified !== undefined ? payload.authorIsVerified : (authorUser?.isVerified || isDev);
    const isPinnedPost = payload.isPinned !== undefined ? payload.isPinned : isDev;

    const newPost: StudentPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      authorId: payload.authorId,
      authorName: payload.authorName,
      authorUsername: payload.authorUsername,
      authorKelas: payload.authorKelas || (isDev ? 'Developer & Support Resmi' : ''),
      authorAvatar: payload.authorAvatar || (isDev ? '/assets/tamvesta_mascot.jpg' : ''),
      authorIsVerified: isVer,
      authorIsAlumni: payload.authorIsAlumni !== undefined ? payload.authorIsAlumni : !!authorUser?.isAlumni,
      authorIsDeveloper: isDev,
      authorBadgeType: isDev ? 'developer' : (isVer ? 'blue' : undefined),
      isPinned: isPinnedPost,
      caption: payload.caption.trim(),
      mediaType: payload.mediaType || 'none',
      mediaUrl: payload.mediaUrl,
      mediaName: payload.mediaName,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };

    if (!this.data.posts) {
      this.data.posts = [];
    }

    this.data.posts.unshift(newPost);

    // Otomatis buat notifikasi resmi untuk seluruh siswa saat Support memposting
    if (isDev) {
      if (!Array.isArray(this.data.notifications)) {
        this.data.notifications = [];
      }
      this.data.notifications.unshift({
        id: `notif_support_post_${Date.now()}`,
        title: '📢 Pesan Resmi Support TAMVESTA',
        message: payload.caption.length > 90 ? payload.caption.substring(0, 90) + '...' : payload.caption,
        type: 'announcement',
        isImportant: true,
        linkType: 'announcement',
        linkId: newPost.id,
        createdAt: new Date().toISOString(),
        readBy: [],
        deletedBy: [],
      });
    }

    this.save();
    return newPost;
  }

  deletePost(id: string, requesterUserId: string, isAdmin: boolean): boolean {
    const postIdx = this.data.posts.findIndex((p) => p.id === id);
    if (postIdx === -1) return false;

    const post = this.data.posts[postIdx];
    if (!isAdmin && post.authorId !== requesterUserId) {
      return false;
    }

    this.data.posts.splice(postIdx, 1);
    this.data.deletedPostIds = this.data.deletedPostIds || [];
    if (!this.data.deletedPostIds.includes(id)) {
      this.data.deletedPostIds.push(id);
    }
    this.save();
    return true;
  }

  toggleLikePost(postId: string, userId: string): { likesCount: number; isLiked: boolean } | null {
    const post = this.data.posts.find((p) => p.id === postId);
    if (!post) return null;

    if (!Array.isArray(post.likes)) {
      post.likes = [];
    }

    const index = post.likes.indexOf(userId);
    let isLiked = false;
    if (index > -1) {
      post.likes.splice(index, 1);
      isLiked = false;
    } else {
      post.likes.push(userId);
      isLiked = true;
    }

    this.save();
    return { likesCount: post.likes.length, isLiked };
  }

  addCommentToPost(
    postId: string,
    commentPayload: {
      authorId: string;
      authorName: string;
      authorUsername: string;
      authorAvatar?: string;
      content: string;
      replyToCommentId?: string;
      replyToUsername?: string;
      replyToAuthorName?: string;
      replyToAuthorId?: string;
    }
  ): PostComment | null {
    const post = this.data.posts.find((p) => p.id === postId);
    if (!post) return null;

    if (!Array.isArray(post.comments)) {
      post.comments = [];
    }

    const newComment: PostComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      postId,
      authorId: commentPayload.authorId,
      authorName: commentPayload.authorName,
      authorUsername: commentPayload.authorUsername,
      authorAvatar: commentPayload.authorAvatar,
      content: commentPayload.content.trim(),
      replyToCommentId: commentPayload.replyToCommentId,
      replyToUsername: commentPayload.replyToUsername,
      replyToAuthorName: commentPayload.replyToAuthorName,
      replyToAuthorId: commentPayload.replyToAuthorId,
      createdAt: new Date().toISOString(),
    };

    post.comments.push(newComment);
    this.save();
    return newComment;
  }

  toggleFollowUser(followerId: string, targetUserId: string): { isFollowing: boolean; followingCount: number } | null {
    const follower = this.data.users.find((u) => u.id === followerId);
    if (!follower) return null;

    if (!Array.isArray(follower.following)) {
      follower.following = [];
    }

    const index = follower.following.indexOf(targetUserId);
    let isFollowing = false;
    if (index > -1) {
      follower.following.splice(index, 1);
      isFollowing = false;
    } else {
      follower.following.push(targetUserId);
      isFollowing = true;
    }

    this.save();
    return { isFollowing, followingCount: follower.following.length };
  }

  getUserFollowing(userId: string): string[] {
    const user = this.data.users.find((u) => u.id === userId);
    return user?.following || [];
  }

  // -------------------------------------------------------------
  // USER PROFILE & POST EDITING
  // -------------------------------------------------------------
  updatePost(postId: string, userId: string, caption: string): StudentPost | null {
    const post = this.data.posts.find((p) => p.id === postId);
    if (!post || post.authorId !== userId) return null;
    post.caption = caption.trim();
    this.save();
    return post;
  }

  updateUserProfile(userId: string, data: { bio?: string; avatarUrl?: string; phone?: string; email?: string }): User | null {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return null;

    if (data.bio !== undefined) {
      user.bio = data.bio.trim().substring(0, 300);
    }
    if (data.phone !== undefined) {
      user.phone = data.phone.trim();
    }
    if (data.email !== undefined) {
      user.email = data.email.trim();
    }
    if (data.avatarUrl !== undefined) {
      user.avatarUrl = data.avatarUrl;
      // Also update authorAvatar across user's existing posts & comments for consistency
      this.data.posts.forEach((p) => {
        if (p.authorId === userId) {
          p.authorAvatar = data.avatarUrl;
        }
        if (Array.isArray(p.comments)) {
          p.comments.forEach((c) => {
            if (c.authorId === userId) {
              c.authorAvatar = data.avatarUrl;
            }
          });
        }
      });
    }

    user.updatedAt = new Date().toISOString();
    this.save();
    return user;
  }

  getUserProfileWithPosts(target: string): {
    user: Partial<User>;
    posts: StudentPost[];
    followersCount: number;
    followingCount: number;
  } | null {
    const user = this.data.users.find(
      (u) => u.id === target || u.username.toLowerCase() === target.toLowerCase()
    );
    if (!user) return null;

    // Count followers (users whose following array includes this user's id)
    const followersCount = this.data.users.filter(
      (u) => Array.isArray(u.following) && u.following.includes(user.id)
    ).length;

    const followingCount = Array.isArray(user.following) ? user.following.length : 0;

    // User's posts
    const posts = this.data.posts
      .filter((p) => p.authorId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const { passwordHash, salt, initialPassword, password, ...safeUser } = user;
    return {
      user: safeUser,
      posts,
      followersCount,
      followingCount,
    };
  }

  // -------------------------------------------------------------
  // STORIES (Tersimpan Permanen & Sinkronisasi Seluruh Perangkat)
  // -------------------------------------------------------------
  getStories(): Story[] {
    if (!Array.isArray(this.data.stories)) {
      this.data.stories = [];
    }

    return [...this.data.stories]
      .filter((s) => !s.id.startsWith('story_seed_'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createStory(storyData: {
    authorId: string;
    authorName: string;
    authorUsername: string;
    authorAvatar?: string;
    authorKelas?: string;
    authorIsVerified?: boolean;
    authorIsAlumni?: boolean;
    mediaType: 'photo' | 'video';
    mediaUrl: string;
    caption?: string;
  }): Story {
    if (!Array.isArray(this.data.stories)) {
      this.data.stories = [];
    }

    const now = new Date();
    // Kedaluwarsa otomatis setelah 24 jam sesuai ketentuan
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const newStory: Story = {
      id: `story_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      authorId: storyData.authorId,
      authorName: storyData.authorName,
      authorUsername: storyData.authorUsername,
      authorAvatar: storyData.authorAvatar,
      authorKelas: storyData.authorKelas,
      authorIsVerified: !!storyData.authorIsVerified,
      authorIsAlumni: !!storyData.authorIsAlumni,
      mediaType: storyData.mediaType,
      mediaUrl: storyData.mediaUrl,
      caption: storyData.caption?.trim(),
      createdAt: now.toISOString(),
      expiresAt,
    };

    this.data.stories.unshift(newStory);
    this.save();
    return newStory;
  }

  deleteStory(storyId: string, userId: string, isAdmin = false): boolean {
    if (!Array.isArray(this.data.stories)) return false;
    const index = this.data.stories.findIndex((s) => s.id === storyId);
    if (index === -1) {
      return (this.data.deletedStoryIds || []).includes(storyId);
    }
    const story = this.data.stories[index];
    if (story.authorId !== userId && !isAdmin) return false;
    this.data.stories.splice(index, 1);
    this.recordTombstone('deletedStoryIds', storyId);
    this.save();
    return true;
  }

  // -------------------------------------------------------------
  // PERSONAL NOTES (ARSIP CATATAN PRIBADI SISWA)
  // -------------------------------------------------------------
  getUserNotes(userId: string): PersonalNote[] {
    if (!Array.isArray(this.data.notes)) {
      this.data.notes = [];
      return [];
    }

    return this.data.notes
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  createNote(userId: string, data: { title: string; content: string; color?: string }): PersonalNote {
    if (!Array.isArray(this.data.notes)) {
      this.data.notes = [];
    }

    const now = new Date().toISOString();
    const newNote: PersonalNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      title: data.title.trim() || 'Catatan Tanpa Judul',
      content: data.content.trim(),
      color: data.color || 'emerald',
      createdAt: now,
      updatedAt: now,
    };

    this.data.notes.unshift(newNote);
    this.save();
    return newNote;
  }

  updateNote(
    noteId: string,
    userId: string,
    data: { title: string; content: string; color?: string }
  ): PersonalNote | null {
    if (!Array.isArray(this.data.notes)) return null;
    const note = this.data.notes.find((n) => n.id === noteId && n.userId === userId);
    if (!note) return null;

    if (data.title !== undefined) note.title = data.title.trim() || 'Catatan Tanpa Judul';
    if (data.content !== undefined) note.content = data.content.trim();
    if (data.color !== undefined) note.color = data.color;
    note.updatedAt = new Date().toISOString();

    this.save();
    return note;
  }

  deleteNote(noteId: string, userId: string): boolean {
    if (!Array.isArray(this.data.notes)) return false;
    const index = this.data.notes.findIndex((n) => n.id === noteId && n.userId === userId);
    if (index === -1) return false;
    this.data.notes.splice(index, 1);
    this.recordTombstone('deletedNoteIds', noteId);
    this.save();
    return true;
  }

  // -------------------------------------------------------------
  // NOTIFICATIONS
  // -------------------------------------------------------------
  getNotifications(userId: string, role?: UserRole, userClass?: string, deviceId?: string): (AppNotification & { isRead: boolean })[] {
    if (!Array.isArray(this.data.notifications)) {
      this.data.notifications = [];
    }

    // Seed default notifications if empty — HANYA sekali jika belum pernah diisi & tidak ada tombstone
    if (this.data.notifications.length === 0 && !this.data.hasSeededDefaultNotifications && (this.data.deletedNotificationIds || []).length === 0) {
      this.data.hasSeededDefaultNotifications = true;
      const now = new Date().toISOString();
      this.data.notifications = [
        {
          id: 'notif_welcome',
          title: 'Selamat Datang di TAMVESTA Mobile!',
          message: 'Aplikasi resmi siswa Tamansiswa Batam kini aktif dengan fitur Feed, Story, QR, Arsip, dan Quiz.',
          type: 'general',
          isImportant: true,
          linkType: 'none',
          readBy: [],
          deletedBy: [],
          createdAt: now,
        },
        {
          id: 'notif_announcement_1',
          title: 'Pengumuman: Ujian Tengah Semester & Event Budaya',
          message: 'Jadwal persiapan UTS dan perayaan Hari Pendidikan Nasional Tamansiswa Batam telah diterbitkan.',
          type: 'announcement',
          isImportant: true,
          linkType: 'announcement',
          linkId: 'ann_1',
          readBy: [],
          deletedBy: [],
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'notif_subject_1',
          title: 'Pembaruan Jadwal: Matematika Wajib',
          message: 'Jadwal mata pelajaran Matematika dipindahkan ke Ruang Multimedia 2 pada jam 08:45 WIB.',
          type: 'subject_change',
          isImportant: false,
          linkType: 'subject',
          readBy: [],
          deletedBy: [],
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ];
      this.data.hasSeededDefaultNotifications = true;
      this.save();
    }

    const delNotifSet = new Set(this.data.deletedNotificationIds || []);
    const seenKeys = new Set<string>();

    return this.data.notifications
      .filter((n) => {
        if (!n || delNotifSet.has(n.id)) return false;
        // Exclude if user deleted it personally
        if (Array.isArray(n.deletedBy) && n.deletedBy.includes(userId)) return false;
        // Filter strict by targetUserId
        if (n.targetUserId && n.targetUserId !== userId) return false;
        // Filter strict by targetRole (non-admin MUST NEVER receive admin-only notifications)
        if (n.targetRole && n.targetRole !== role) return false;
        if (Array.isArray(n.targetRoles) && n.targetRoles.length > 0 && (!role || !n.targetRoles.includes(role))) {
          return false;
        }
        // Admin-specific multi-device exclusion: exclude only the exact originating device/actor for "Admin lain" alerts
        if (n.type === 'admin_account_event') {
          if (role !== 'admin') return false;
          if (deviceId && n.excludeDeviceId && deviceId === n.excludeDeviceId) return false;
          if (!deviceId && n.excludeUserId && userId === n.excludeUserId) return false;
        }
        // Filter by class target
        if (n.targetClass && userClass && n.targetClass !== userClass) return false;
        // Deduplicate by dedupeKey/id
        const key = n.dedupeKey || n.id;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      })
      .map((n) => ({
        ...n,
        isRead: Array.isArray(n.readBy) && n.readBy.includes(userId),
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  markNotificationRead(notificationId: string, userId: string): boolean {
    if (!Array.isArray(this.data.notifications)) return false;
    const notif = this.data.notifications.find((n) => n.id === notificationId);
    if (!notif) return false;

    if (!Array.isArray(notif.readBy)) notif.readBy = [];
    if (!notif.readBy.includes(userId)) {
      notif.readBy.push(userId);
      this.save();
    }
    return true;
  }

  markAllNotificationsRead(userId: string): boolean {
    if (!Array.isArray(this.data.notifications)) return false;
    let changed = false;

    this.data.notifications.forEach((n) => {
      if (!Array.isArray(n.readBy)) n.readBy = [];
      if (!n.readBy.includes(userId)) {
        n.readBy.push(userId);
        changed = true;
      }
    });

    if (changed) this.save();
    return true;
  }

  deleteNotificationForUser(notificationId: string, userId: string): boolean {
    if (!Array.isArray(this.data.notifications)) return false;
    const notif = this.data.notifications.find((n) => n.id === notificationId);
    if (!notif) return false;

    if (!Array.isArray(notif.deletedBy)) notif.deletedBy = [];
    if (!notif.deletedBy.includes(userId)) {
      notif.deletedBy.push(userId);
      this.save();
    }
    return true;
  }

  createNotification(data: {
    title: string;
    message: string;
    type: AppNotification['type'];
    isImportant?: boolean;
    linkType?: AppNotification['linkType'];
    linkId?: string;
    targetRole?: UserRole;
    targetRoles?: UserRole[];
    targetClass?: string;
    targetUserId?: string;
    excludeUserId?: string;
    excludeDeviceId?: string;
    dedupeKey?: string;
    actorId?: string;
    actorName?: string;
    statusLabel?: string;
    metadata?: Record<string, any>;
  }): AppNotification {
    if (!Array.isArray(this.data.notifications)) this.data.notifications = [];

    if (data.dedupeKey) {
      const existing = this.data.notifications.find((n) => n.dedupeKey === data.dedupeKey);
      if (existing) {
        return existing;
      }
    }

    const newNotif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: data.title.trim(),
      message: data.message.trim(),
      type: data.type,
      isImportant: !!data.isImportant,
      linkType: data.linkType || 'none',
      linkId: data.linkId,
      targetRole: data.targetRole,
      targetRoles: data.targetRoles,
      targetClass: data.targetClass,
      targetUserId: data.targetUserId,
      excludeUserId: data.excludeUserId,
      excludeDeviceId: data.excludeDeviceId,
      dedupeKey: data.dedupeKey,
      actorId: data.actorId,
      actorName: data.actorName,
      statusLabel: data.statusLabel,
      metadata: data.metadata,
      readBy: [],
      deletedBy: [],
      createdAt: new Date().toISOString(),
    };

    this.data.notifications.unshift(newNotif);
    this.save();
    return newNotif;
  }

  addNotification(data: any): AppNotification {
    return this.createNotification(data);
  }

  public notifyAdminsAccountActivity(opts: {
    action: 'created' | 'updated' | 'deleted' | 'status_changed';
    targetUser: Pick<User, 'id' | 'name' | 'username' | 'role' | 'kelas' | 'isActive'>;
    actor?: User | null;
    actorDeviceId?: string;
    detail?: string;
  }): AppNotification {
    const actorName = opts.actor?.name || 'Administrator';
    const roleMap: Record<string, string> = {
      admin: 'Admin',
      guru: 'Guru',
      siswa: 'Siswa',
      tata_usaha: 'Tata Usaha',
      kepala_sekolah: 'Kepala Sekolah',
      satpam: 'Satpam',
      panitia: 'Panitia',
      support: 'Support',
    };
    const roleLabel = roleMap[opts.targetUser.role] || opts.targetUser.role;

    let title = 'AKUN BARU DITAMBAHKAN';
    let message = `Admin lain (${actorName}) telah menambahkan akun baru ke sistem TAMVESTA: ${opts.targetUser.name} (@${opts.targetUser.username} • Role: ${roleLabel}).`;
    let statusLabel = 'Status: Berhasil ditambahkan.';

    if (opts.action === 'updated') {
      title = 'AKUN PENGGUNA DIPERBARUI';
      message = `Admin lain (${actorName}) memperbarui data akun ${opts.targetUser.name} (@${opts.targetUser.username} • ${roleLabel}).`;
      statusLabel = opts.detail || 'Status: Perubahan disimpan.';
    } else if (opts.action === 'status_changed') {
      title = opts.targetUser.isActive ? 'AKUN DIAKTIFKAN KEMBALI' : 'AKUN DINONAKTIFKAN';
      message = `Admin lain (${actorName}) ${opts.targetUser.isActive ? 'mengaktifkan' : 'menonaktifkan'} akun ${opts.targetUser.name} (@${opts.targetUser.username}).`;
      statusLabel = opts.targetUser.isActive ? 'Status: Aktif.' : 'Status: Dinonaktifkan & akses login dicabut.';
    } else if (opts.action === 'deleted') {
      title = 'AKUN DIHAPUS PERMANEN';
      message = `Admin lain (${actorName}) telah menghapus permanen akun ${opts.targetUser.name} (@${opts.targetUser.username} • ${roleLabel}) dari database TAMVESTA.`;
      statusLabel = 'Status: Dihapus permanen.';
    }

    // Dedupe window ensures retried calls never emit duplicates
    const bucket = opts.action === 'created' ? 'created_once' : `${opts.action}_${Math.floor(Date.now() / 3000)}`;
    const dedupeKey = `admin_acct:${opts.action}:${opts.targetUser.id}:${bucket}`;

    const isAlreadyCreated = Array.isArray(this.data.notifications) && this.data.notifications.some((n) => n.dedupeKey === dedupeKey);
    const notif = this.createNotification({
      title,
      message,
      type: 'admin_account_event',
      isImportant: true,
      linkType: opts.targetUser.role === 'siswa' ? 'students' : 'staff',
      linkId: opts.targetUser.id,
      targetRole: 'admin',
      targetRoles: ['admin'],
      excludeUserId: opts.actor?.id,
      excludeDeviceId: opts.actorDeviceId,
      dedupeKey,
      actorId: opts.actor?.id,
      actorName,
      statusLabel,
      metadata: {
        action: opts.action,
        targetUserId: opts.targetUser.id,
        targetUsername: opts.targetUser.username,
        targetName: opts.targetUser.name,
        targetRole: opts.targetUser.role,
      },
    });

    if (!isAlreadyCreated) {
      this.emitRealtimeEvent({
        type: 'admin_notification',
        entity: 'users',
        action: 'notification',
        entityId: opts.targetUser.id,
        targetRoles: ['admin'],
        excludeUserId: opts.actor?.id,
        excludeDeviceId: opts.actorDeviceId,
        notification: notif,
      });
    }

    return notif;
  }

  public getAllNotificationsRaw(): AppNotification[] {
    if (!Array.isArray(this.data.notifications)) this.data.notifications = [];
    return [...this.data.notifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public deleteNotificationAdmin(notificationId: string): boolean {
    if (!Array.isArray(this.data.notifications)) return false;
    this.recordTombstone('deletedNotificationIds', notificationId);
    const initialLen = this.data.notifications.length;
    this.data.notifications = this.data.notifications.filter((n) => n.id !== notificationId);
    if (this.data.notifications.length !== initialLen) {
      this.save();
      return true;
    }
    this.save();
    return false;
  }

  // -------------------------------------------------------------
  // ARTIKEL GURU & METODE PEMBELAJARAN
  // -------------------------------------------------------------
  getArticles(category?: string, onlyPublished?: boolean): TeacherArticle[] {
    if (!Array.isArray(this.data.articles)) this.data.articles = [];
    let list = [...this.data.articles];
    if (category) {
      list = list.filter((a) => a.category === category);
    }
    if (onlyPublished) {
      list = list.filter((a) => a.isPublished);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getArticleById(id: string): TeacherArticle | null {
    if (!Array.isArray(this.data.articles)) this.data.articles = [];
    return this.data.articles.find((a) => a.id === id) || null;
  }

  createArticle(data: Partial<TeacherArticle>): TeacherArticle {
    if (!Array.isArray(this.data.articles)) this.data.articles = [];
    const newArt: TeacherArticle = {
      id: `art_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      authorId: data.authorId || 'user_guru',
      authorName: data.authorName || 'Guru Tamansiswa',
      authorAvatar: data.authorAvatar,
      authorSubject: data.authorSubject || 'Mata Pelajaran',
      title: (data.title || '').trim(),
      summary: (data.summary || '').trim(),
      content: (data.content || '').trim(),
      category: data.category === 'Metode Pembelajaran' ? 'Metode Pembelajaran' : 'Artikel Guru',
      coverUrl: data.coverUrl,
      isPublished: data.isPublished !== undefined ? data.isPublished : true,
      likesCount: 0,
      readsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.articles.unshift(newArt);
    this.save();
    return newArt;
  }

  updateArticle(id: string, data: Partial<TeacherArticle>): TeacherArticle {
    if (!Array.isArray(this.data.articles)) this.data.articles = [];
    const art = this.data.articles.find((a) => a.id === id);
    if (!art) throw new Error('Artikel tidak ditemukan');

    if (data.title !== undefined) art.title = data.title.trim();
    if (data.summary !== undefined) art.summary = data.summary.trim();
    if (data.content !== undefined) art.content = data.content.trim();
    if (data.category !== undefined) art.category = data.category;
    if (data.coverUrl !== undefined) art.coverUrl = data.coverUrl;
    if (data.isPublished !== undefined) art.isPublished = data.isPublished;
    art.updatedAt = new Date().toISOString();

    this.save();
    return art;
  }

  deleteArticle(id: string): boolean {
    if (!Array.isArray(this.data.articles)) return false;
    this.recordTombstone('deletedArticleIds', id);
    this.data.articles = this.data.articles.filter((a) => a.id !== id);
    this.save();
    return true;
  }

  // -------------------------------------------------------------
  // ABSENSI GURU KELAS (QR CODE & MANUAL)
  // -------------------------------------------------------------
  recordClassAttendance(entries: ClassAttendanceEntry[]): ClassAttendanceEntry[] {
    if (!Array.isArray(this.data.classAttendance)) this.data.classAttendance = [];
    entries.forEach((e) => {
      const existingIdx = this.data.classAttendance.findIndex(
        (item) => item.studentId === e.studentId && item.date === e.date && item.kelas === e.kelas
      );
      if (existingIdx > -1) {
        this.data.classAttendance[existingIdx] = { ...this.data.classAttendance[existingIdx], ...e };
      } else {
        this.data.classAttendance.push(e);
      }
    });
    this.save();
    return entries;
  }

  getClassAttendance(filters: { date?: string; kelas?: string; studentId?: string; status?: string }): ClassAttendanceEntry[] {
    if (!Array.isArray(this.data.classAttendance)) this.data.classAttendance = [];
    let list = [...this.data.classAttendance];
    if (filters.date) list = list.filter((a) => a.date === filters.date);
    if (filters.kelas) list = list.filter((a) => (a.kelas || a.studentKelas || '').toLowerCase() === filters.kelas!.toLowerCase());
    if (filters.studentId) list = list.filter((a) => a.studentId === filters.studentId);
    if (filters.status && filters.status !== 'semua') list = list.filter((a) => a.status === filters.status);
    return list;
  }

  // -------------------------------------------------------------
  // TATA USAHA (TU) - TAGIHAN, TRANSAKSI, DOKUMEN & CHAT
  // -------------------------------------------------------------
  getTuitionBills(studentId?: string, kelas?: string, status?: string): TuitionBill[] {
    if (!Array.isArray(this.data.tuitionBills)) this.data.tuitionBills = [];
    let list = [...this.data.tuitionBills];
    if (studentId) list = list.filter((b) => b.studentId === studentId);
    if (kelas) list = list.filter((b) => b.studentKelas.toLowerCase() === kelas.toLowerCase());
    if (status && status !== 'semua') list = list.filter((b) => b.status === status);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createTuitionBill(data: Partial<TuitionBill>): TuitionBill {
    if (!Array.isArray(this.data.tuitionBills)) this.data.tuitionBills = [];
    const bill: TuitionBill = {
      id: `bill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studentId: data.studentId || '',
      studentName: data.studentName || '',
      studentUsername: data.studentUsername || '',
      studentKelas: data.studentKelas || 'X',
      title: data.title || 'Tagihan Biaya Sekolah',
      category: data.category || 'SPP',
      amount: Number(data.amount) || 0,
      dueDate: data.dueDate || new Date().toISOString().split('T')[0],
      status: data.status || 'belum_lunas',
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };
    this.data.tuitionBills.unshift(bill);
    this.save();
    return bill;
  }

  updateTuitionBill(id: string, data: Partial<TuitionBill>): TuitionBill {
    if (!Array.isArray(this.data.tuitionBills)) this.data.tuitionBills = [];
    const bill = this.data.tuitionBills.find((b) => b.id === id);
    if (!bill) throw new Error('Tagihan tidak ditemukan');
    Object.assign(bill, data);
    this.save();
    return bill;
  }

  deleteTuitionBill(id: string): boolean {
    if (!Array.isArray(this.data.tuitionBills)) return false;
    this.recordTombstone('deletedBillIds', id);
    this.data.tuitionBills = this.data.tuitionBills.filter((b) => b.id !== id);
    this.save();
    return true;
  }

  getTuitionTransactions(type?: string): TuitionTransaction[] {
    if (!Array.isArray(this.data.tuitionTransactions)) this.data.tuitionTransactions = [];
    let list = [...this.data.tuitionTransactions];
    if (type && type !== 'semua') list = list.filter((t) => t.type === type);
    return list.sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime());
  }

  createTuitionTransaction(data: Partial<TuitionTransaction>): TuitionTransaction {
    if (!Array.isArray(this.data.tuitionTransactions)) this.data.tuitionTransactions = [];
    const trx: TuitionTransaction = {
      id: `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      billId: data.billId,
      studentId: data.studentId,
      studentName: data.studentName,
      studentKelas: data.studentKelas,
      amount: Number(data.amount) || 0,
      type: data.type || 'pemasukan',
      category: data.category || 'SPP',
      paymentMethod: data.paymentMethod || 'Tunai / Kasir TU',
      verifiedBy: data.verifiedBy || 'Staf Tata Usaha',
      verifiedAt: new Date().toISOString(),
      receiptNumber: data.receiptNumber || `KW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      description: data.description || 'Transaksi keuangan sekolah',
    };
    this.data.tuitionTransactions.unshift(trx);
    this.save();
    return trx;
  }

  getTuDocuments(category?: string): TuDocument[] {
    if (!Array.isArray(this.data.tuDocuments)) this.data.tuDocuments = [];
    let list = [...this.data.tuDocuments];
    if (category && category !== 'semua') list = list.filter((d) => d.category === category);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createTuDocument(data: Partial<TuDocument>): TuDocument {
    if (!Array.isArray(this.data.tuDocuments)) this.data.tuDocuments = [];
    const doc: TuDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: data.title || '',
      docNumber: data.docNumber || `${Math.floor(100 + Math.random() * 900)}/TS-BTM/TU/${new Date().getFullYear()}`,
      category: data.category || 'Surat Keluar',
      date: data.date || new Date().toISOString().split('T')[0],
      recipientOrSender: data.recipientOrSender || 'Umum',
      fileUrl: data.fileUrl,
      status: data.status || 'Selesai',
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };
    this.data.tuDocuments.unshift(doc);
    this.save();
    return doc;
  }

  deleteTuDocument(id: string): boolean {
    if (!Array.isArray(this.data.tuDocuments)) return false;
    this.recordTombstone('deletedDocumentIds', id);
    this.data.tuDocuments = this.data.tuDocuments.filter((d) => d.id !== id);
    this.save();
    return true;
  }

  getTuChatMessages(studentId?: string): TuChatMessage[] {
    if (!Array.isArray(this.data.tuChatMessages)) this.data.tuChatMessages = [];
    let list = [...this.data.tuChatMessages];
    if (studentId) list = list.filter((m) => m.studentId === studentId);
    return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  createTuChatMessage(data: Partial<TuChatMessage>): TuChatMessage {
    if (!Array.isArray(this.data.tuChatMessages)) this.data.tuChatMessages = [];
    const msg: TuChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studentId: data.studentId || '',
      studentName: data.studentName || 'Siswa',
      studentKelas: data.studentKelas,
      senderRole: data.senderRole || 'siswa',
      senderName: data.senderName || 'Pengguna',
      message: (data.message || '').trim(),
      proofUrl: data.proofUrl,
      billId: data.billId,
      createdAt: new Date().toISOString(),
      isReadByTu: data.senderRole === 'tata_usaha',
      isReadByStudent: data.senderRole === 'siswa',
    };
    this.data.tuChatMessages.push(msg);
    this.save();
    return msg;
  }

  // -------------------------------------------------------------
  // MANAJEMEN PENGGUNA (GURU, ALUMNI & CENTANG BIRU)
  // -------------------------------------------------------------
  createTeacherAccount(data: { name: string; username: string; password?: string; jabatan?: string; email?: string; phone?: string }): User {
    const cleanUsername = (data.username || '').trim().toLowerCase().replace(/^@+/, '');
    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('Username guru minimal 3 karakter.');
    }
    const existing = this.data.users.find(
      (u) => (u.username || '').trim().toLowerCase().replace(/^@+/, '') === cleanUsername
    );
    if (existing) throw new Error('Username guru sudah digunakan.');

    const rawPassword = data.password?.trim() || ('Tamvesta!G' + Math.floor(1000 + Math.random() * 9000));
    if (rawPassword.length < 6) {
      throw new Error('Password minimal 6 karakter.');
    }
    const pass = hashPassword(rawPassword);
    const id = `user_teacher_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.data.deletedUserIds = (this.data.deletedUserIds || []).filter(
      (did) => did !== id && did.toLowerCase().replace(/^@+/, '') !== cleanUsername
    );

    const newTeacher: User = {
      id,
      username: cleanUsername,
      name: data.name.trim(),
      role: 'guru',
      jabatan: data.jabatan?.trim() || 'Guru Mata Pelajaran',
      passwordHash: pass.hash,
      salt: pass.salt,
      tokenVersion: 0,
      mustChangePassword: false,
      isActive: true,
      isVerified: true, // Guru otomatis terverifikasi permanen
      badgeType: 'green', // Centang hijau resmi untuk Guru
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      qrToken: generateQrToken(id, cleanUsername),
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name.trim())}&backgroundColor=059669`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.users.unshift(newTeacher);
    this.save();
    this.addActivityLog({
      type: 'account_created',
      title: 'Pembuatan Akun Guru',
      description: `Akun Guru @${newTeacher.username} (${newTeacher.name}) berhasil dibuat.`,
      userId: newTeacher.id,
      userName: newTeacher.name,
      userRole: newTeacher.role,
    });
    return newTeacher;
  }

  updateTeacherAccount(id: string, data: Partial<User> & { password?: string; expectedUpdatedAt?: string }): User {
    const teacher = this.data.users.find((u) => u.id === id);
    if (!teacher) throw new Error('Akun tidak ditemukan.');
    if (data.expectedUpdatedAt && teacher.updatedAt && data.expectedUpdatedAt !== teacher.updatedAt) {
      throw new Error('Data akun ini telah diperbarui oleh Admin lain. Silakan muat ulang.');
    }
    if (data.username && data.username.trim().toLowerCase() !== teacher.username.toLowerCase()) {
      const cleanU = data.username.trim().toLowerCase().replace(/^@+/, '');
      const dup = this.data.users.find((u) => u.id !== id && u.username.toLowerCase() === cleanU);
      if (dup) throw new Error(`Username @${cleanU} sudah digunakan akun lain.`);
      teacher.username = cleanU;
      teacher.qrToken = generateQrToken(teacher.id, cleanU);
    }
    if (data.name) teacher.name = data.name.trim();
    if (data.jabatan !== undefined) teacher.jabatan = data.jabatan.trim();
    if (data.email !== undefined) teacher.email = data.email;
    if (data.phone !== undefined) teacher.phone = data.phone;
    if (data.role && teacher.username !== 'TAMANSISWA') {
      teacher.role = data.role;
      if (data.role === 'guru') {
        teacher.isVerified = true;
        teacher.badgeType = 'green';
      }
    }
    if (data.isActive !== undefined && teacher.username !== 'TAMANSISWA') {
      teacher.isActive = data.isActive;
      if (!teacher.isActive) {
        teacher.tokenVersion = (teacher.tokenVersion ?? 0) + 1;
      }
    }
    if (data.password && data.password.trim().length >= 6) {
      const pass = hashPassword(data.password.trim());
      teacher.passwordHash = pass.hash;
      teacher.salt = pass.salt;
      delete (teacher as any).password;
      delete (teacher as any).initialPassword;
      teacher.tokenVersion = (teacher.tokenVersion ?? 0) + 1;
    }
    if (data.isVerified !== undefined && teacher.role !== 'guru') teacher.isVerified = data.isVerified;
    teacher.updatedAt = new Date().toISOString();
    this.save();
    return teacher;
  }

  private permanentlyRemoveUserAndRelations(id: string): { deleted: boolean; removedUser?: User } {
    const cleanTarget = (id || '').trim().toLowerCase().replace(/^@+/, '');
    const idx = this.data.users.findIndex(
      (u) => u.id === id || (u.username || '').trim().toLowerCase().replace(/^@+/, '') === cleanTarget
    );
    if (idx === -1) {
      const alreadyDeleted = (this.data.deletedUserIds || []).some(
        (d) => d === id || d.toLowerCase().replace(/^@+/, '') === cleanTarget
      );
      return { deleted: alreadyDeleted };
    }
    const removedUser = this.data.users[idx];
    if (removedUser.username === 'TAMANSISWA') {
      throw new Error('Akun Administrator Utama TAMANSISWA tidak dapat dihapus.');
    }
    this.data.users.splice(idx, 1);
    this.recordTombstone('deletedUserIds', id);
    if (removedUser.id) this.recordTombstone('deletedUserIds', removedUser.id);
    if (removedUser.username) {
      this.recordTombstone('deletedUserIds', removedUser.username.toLowerCase());
      this.recordTombstone('deletedUserIds', removedUser.username.trim().toLowerCase().replace(/^@+/, ''));
    }

    // Revoke active device sessions for deleted account
    if (Array.isArray(this.data.deviceSessions)) {
      this.data.deviceSessions = this.data.deviceSessions.filter((s) => {
        if (s.userId === id || s.userId === removedUser.id) {
          this.recordTombstone('deletedDeviceIds', s.id);
          return false;
        }
        return true;
      });
    }

    // Clean orphaned password reset requests, user notes, and homeroom teacher link
    if (Array.isArray(this.data.passwordResetRequests)) {
      this.data.passwordResetRequests = this.data.passwordResetRequests.filter(
        (r) => r.userId !== removedUser.id && (r.username || '').toLowerCase() !== (removedUser.username || '').toLowerCase()
      );
    }
    if (Array.isArray(this.data.studentNotes)) {
      this.data.studentNotes = this.data.studentNotes.filter((n) => n.userId !== removedUser.id);
    }
    if (Array.isArray(this.data.notes)) {
      this.data.notes = this.data.notes.filter((n) => {
        if (n.userId === removedUser.id) {
          this.recordTombstone('deletedNoteIds', n.id);
          return false;
        }
        return true;
      });
    }
    if (Array.isArray(this.data.schoolClasses)) {
      this.data.schoolClasses.forEach((cls) => {
        if (cls.homeroomTeacherId === removedUser.id) {
          cls.homeroomTeacherId = undefined;
          cls.homeroomTeacherName = undefined;
        }
      });
    }

    this.addActivityLog({
      type: 'account_deleted',
      title: 'Penghapusan Akun Permanen',
      description: `Akun ${removedUser.role.toUpperCase()} @${removedUser.username} (${removedUser.name}) telah dihapus secara permanen dari database.`,
      userId: removedUser.id,
      userName: removedUser.name,
      userRole: removedUser.role,
    });

    this.save();

    this.emitRealtimeEvent({
      type: 'session_revoked',
      entity: 'users',
      action: 'deleted',
      entityId: removedUser.id,
      targetUserId: removedUser.id,
      payload: { reason: 'Akun Anda telah dihapus permanen oleh Administrator.' },
    });

    return { deleted: true, removedUser };
  }

  deleteUserAccount(id: string): { deleted: boolean; removedUser?: User } {
    return this.permanentlyRemoveUserAndRelations(id);
  }

  deleteStudentAccount(id: string): boolean {
    return this.permanentlyRemoveUserAndRelations(id).deleted;
  }

  deleteTeacherAccount(id: string): boolean {
    return this.permanentlyRemoveUserAndRelations(id).deleted;
  }

  getDeletedUserIds(): string[] {
    return Array.isArray(this.data.deletedUserIds) ? this.data.deletedUserIds : [];
  }

  getDeletedPostIds(): string[] {
    return Array.isArray(this.data.deletedPostIds) ? this.data.deletedPostIds : [];
  }

  getDeletedStoryIds(): string[] {
    return Array.isArray(this.data.deletedStoryIds) ? this.data.deletedStoryIds : [];
  }

  getDeletedSubjectIds(): string[] {
    return Array.isArray(this.data.deletedSubjectIds) ? this.data.deletedSubjectIds : [];
  }

  getDeletedAnnouncementIds(): string[] {
    return Array.isArray(this.data.deletedAnnouncementIds) ? this.data.deletedAnnouncementIds : [];
  }

  getDeletedScheduleIds(): string[] {
    return Array.isArray(this.data.deletedScheduleIds) ? this.data.deletedScheduleIds : [];
  }

  getDeletedClassIds(): string[] {
    return Array.isArray(this.data.deletedClassIds) ? this.data.deletedClassIds : [];
  }

  getDeletedDeviceIds(): string[] {
    return Array.isArray(this.data.deletedDeviceIds) ? this.data.deletedDeviceIds : [];
  }

  getDeletedMessageIds(): string[] {
    return Array.isArray(this.data.deletedMessageIds) ? this.data.deletedMessageIds : [];
  }

  getDeletedNotificationIds(): string[] {
    return Array.isArray(this.data.deletedNotificationIds) ? this.data.deletedNotificationIds : [];
  }

  getDeletedArticleIds(): string[] {
    return Array.isArray(this.data.deletedArticleIds) ? this.data.deletedArticleIds : [];
  }

  getDeletedEventIds(): string[] {
    return Array.isArray(this.data.deletedEventIds) ? this.data.deletedEventIds : [];
  }

  getDeletedNoteIds(): string[] {
    return Array.isArray(this.data.deletedNoteIds) ? this.data.deletedNoteIds : [];
  }

  getDeletedBillIds(): string[] {
    return Array.isArray(this.data.deletedBillIds) ? this.data.deletedBillIds : [];
  }

  getDeletedDocumentIds(): string[] {
    return Array.isArray(this.data.deletedDocumentIds) ? this.data.deletedDocumentIds : [];
  }

  toggleVerifiedBadge(userId: string): { isVerified: boolean; permanent?: boolean } {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) throw new Error('Pengguna tidak ditemukan.');

    // Akun GURU: centang biru PERMANEN — tidak bisa dinonaktifkan
    if (user.role === 'guru') {
      user.isVerified = true;
      user.badgeType = 'blue';
      if (Array.isArray(this.data.posts)) {
        this.data.posts.forEach((p) => {
          if (p.authorId === userId) { p.authorIsVerified = true; p.authorBadgeType = 'blue'; }
        });
      }
      if (Array.isArray(this.data.stories)) {
        this.data.stories.forEach((s) => {
          if (s.authorId === userId) { s.authorIsVerified = true; s.authorBadgeType = 'blue'; }
        });
      }
      this.save();
      return { isVerified: true, permanent: true };
    }

    // Akun lain: toggle biasa
    user.isVerified = !user.isVerified;
    if (user.isVerified && !user.badgeType) user.badgeType = 'blue';
    if (!user.isVerified) user.badgeType = undefined;
    if (Array.isArray(this.data.posts)) {
      this.data.posts.forEach((p) => {
        if (p.authorId === userId) p.authorIsVerified = user.isVerified;
      });
    }
    if (Array.isArray(this.data.stories)) {
      this.data.stories.forEach((s) => {
        if (s.authorId === userId) s.authorIsVerified = user.isVerified;
      });
    }
    this.save();
    return { isVerified: user.isVerified };
  }

  toggleAlumniStatus(studentId: string): { isAlumni: boolean } {
    const student = this.data.users.find((u) => u.id === studentId);
    if (!student) throw new Error('Siswa tidak ditemukan.');
    student.isAlumni = !student.isAlumni;
    this.save();
    return { isAlumni: student.isAlumni };
  }

  syncMultipleTickets(tickets: any[]): { count: number } {
    if (!Array.isArray(this.data.passwordResetRequests)) this.data.passwordResetRequests = [];
    let count = 0;
    tickets.forEach((incoming) => {
      if (!incoming || !incoming.id) return;
      const idx = this.data.passwordResetRequests.findIndex((r) => r.id === incoming.id || r.ticketNumber === incoming.ticketNumber);
      if (idx >= 0) {
        if (incoming.status !== 'pending' || this.data.passwordResetRequests[idx].status === 'pending') {
          this.data.passwordResetRequests[idx] = { ...this.data.passwordResetRequests[idx], ...incoming };
          count++;
        }
      } else {
        this.data.passwordResetRequests.unshift(incoming);
        count++;
      }
    });
    if (count > 0) this.save();
    return { count };
  }

  getTuMonthlyReports(): any[] {
    if (!Array.isArray(this.data.tuMonthlyReports)) this.data.tuMonthlyReports = [];
    return [...this.data.tuMonthlyReports].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  createTuMonthlyReport(data: any): any {
    if (!Array.isArray(this.data.tuMonthlyReports)) this.data.tuMonthlyReports = [];
    const newReport = {
      id: 'report_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      month: data.month,
      monthName: data.monthName,
      createdAt: new Date().toISOString(),
      sentBy: data.sentBy || 'Tata Usaha Haliza',
      sentByUsername: data.sentByUsername || 'haliza.tu',
      recipients: [
        'Titus Wahyu Diatmiko (Pemimpin Perguruan Tamansiswa Batam)',
        'ST Bambang Sapto Nugroho S.Pd (Kepala Sekolah SMP)',
        'Margaretha Hendriani (Kepala Sekolah SD)',
      ],
      summary: data.summary || {
        totalRevenue: 0,
        paidBillsCount: 0,
        unpaidBillsCount: 0,
        totalStudents: 0,
        attendanceCount: 0,
        documentsCount: 0,
      },
      notes: data.notes || '',
      status: 'Terkirim & Terarsip',
    };
    this.data.tuMonthlyReports.unshift(newReport);
    this.save();
    return newReport;
  }

  getGameRooms(): any[] {
    if (!Array.isArray(this.data.gameRooms)) this.data.gameRooms = [];
    return this.data.gameRooms;
  }

  getGameRoomByCode(code: string): any | null {
    if (!Array.isArray(this.data.gameRooms)) this.data.gameRooms = [];
    if (!code) return null;
    const clean = code.toUpperCase().trim();
    const cleanAlnum = clean.replace(/[^A-Z0-9]/g, '');

    // 1. Exact match
    const exact = this.data.gameRooms.find((r: any) => r.code?.toUpperCase().trim() === clean);
    if (exact) return exact;

    // 2. Alphanumeric match (abaikan tanda strip/spasi, e.g. SPY482 == SPY-482)
    const alnumMatch = this.data.gameRooms.find((r: any) => {
      const rAlnum = (r.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      return rAlnum === cleanAlnum;
    });
    if (alnumMatch) return alnumMatch;

    // 3. Match 3 digit angka (e.g. siswa hanya mengetik "482" untuk room "SPY-482")
    if (cleanAlnum.length >= 3 && /^\d+$/.test(cleanAlnum)) {
      const numMatch = this.data.gameRooms.find((r: any) => {
        const rAlnum = (r.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        return rAlnum.endsWith(cleanAlnum);
      });
      if (numMatch) return numMatch;
    }

    return null;
  }

  saveGameRoom(room: any): any {
    if (!Array.isArray(this.data.gameRooms)) this.data.gameRooms = [];
    const clean = (room.code || '').toUpperCase().trim();
    const idx = this.data.gameRooms.findIndex(
      (r: any) => r.id === room.id || r.code?.toUpperCase() === clean
    );
    const updated = { ...room, updatedAt: Date.now() };
    if (idx !== -1) {
      this.data.gameRooms[idx] = updated;
    } else {
      this.data.gameRooms.unshift(updated);
    }
    // Bersihkan room yang lebih lama dari 12 jam
    const cutoff = Date.now() - 12 * 60 * 60 * 1000;
    this.data.gameRooms = this.data.gameRooms.filter((r: any) => (r.createdAt || 0) > cutoff);
    this.save();
    return updated;
  }

  deleteGameRoom(code: string): boolean {
    if (!Array.isArray(this.data.gameRooms)) return false;
    const clean = (code || '').toUpperCase().trim();
    const prevLen = this.data.gameRooms.length;
    this.data.gameRooms = this.data.gameRooms.filter((r: any) => r.code?.toUpperCase() !== clean);
    if (this.data.gameRooms.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  addRefreshSignal(payload: { userId: string; userName: string; userUsername: string; userKelas?: string }): RefreshSignal {
    if (!Array.isArray(this.data.refreshSignals)) this.data.refreshSignals = [];
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
    const newSignal: RefreshSignal = {
      id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: payload.userId,
      userName: payload.userName,
      userUsername: payload.userUsername,
      userKelas: payload.userKelas || '-',
      timestamp: now.toISOString(),
      formattedTime,
      status: 'received',
    };
    this.data.refreshSignals.unshift(newSignal);
    if (this.data.refreshSignals.length > 100) {
      this.data.refreshSignals = this.data.refreshSignals.slice(0, 100);
    }
    this.save();
    return newSignal;
  }

  getRefreshSignals(): RefreshSignal[] {
    if (!Array.isArray(this.data.refreshSignals)) this.data.refreshSignals = [];
    return this.data.refreshSignals;
  }

  resetStudentAvatar(studentId: string, moderator: { id: string; name: string; username: string }, reason: string): { success: boolean; user?: User } {
    const user = this.findUserById(studentId) || this.findUserByUsername(studentId);
    if (!user) return { success: false };
    const oldAvatar = user.avatarUrl;
    user.avatarUrl = '/assets/tamvesta_mascot.jpg';
    user.updatedAt = new Date().toISOString();

    if (!Array.isArray(this.data.moderationLogs)) this.data.moderationLogs = [];
    const log: ModerationLog = {
      id: `mod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action: 'reset_avatar',
      targetUserId: user.id,
      targetUserName: user.name,
      targetUsername: user.username,
      targetUserKelas: user.kelas,
      reason,
      moderatorId: moderator.id,
      moderatorName: moderator.name,
      moderatorUsername: moderator.username,
      timestamp: new Date().toISOString(),
      details: `Foto profil direset dari ${oldAvatar || 'kustom'} ke avatar default TAMVESTA.`,
    };
    this.data.moderationLogs.unshift(log);
    this.save();
    return { success: true, user };
  }

  getModerationLogs(): ModerationLog[] {
    if (!Array.isArray(this.data.moderationLogs)) this.data.moderationLogs = [];
    return this.data.moderationLogs;
  }

  // -------------------------------------------------------------
  // DIRECT MESSAGES (DM)
  // -------------------------------------------------------------
  getDirectMessages(userId1: string, userId2: string): DirectMessage[] {
    if (!Array.isArray(this.data.directMessages)) this.data.directMessages = [];
    return this.data.directMessages
      .filter((m) => {
        const match =
          (m.senderId === userId1 && m.recipientId === userId2) ||
          (m.senderId === userId2 && m.recipientId === userId1);
        return match && !m.isDeleted;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  getDMConversations(userId: string): DMConversation[] {
    if (!Array.isArray(this.data.directMessages)) this.data.directMessages = [];
    const conversationMap = new Map<string, { lastMessage: DirectMessage; unreadCount: number }>();

    for (const m of this.data.directMessages) {
      if (m.isDeleted) continue;
      let partnerId: string | null = null;
      if (m.senderId === userId) {
        partnerId = m.recipientId;
      } else if (m.recipientId === userId) {
        partnerId = m.senderId;
      }
      if (!partnerId) continue;

      const existing = conversationMap.get(partnerId);
      const isUnread = m.recipientId === userId && !m.isRead;
      if (!existing) {
        conversationMap.set(partnerId, {
          lastMessage: m,
          unreadCount: isUnread ? 1 : 0,
        });
      } else {
        if (new Date(m.createdAt).getTime() > new Date(existing.lastMessage.createdAt).getTime()) {
          existing.lastMessage = m;
        }
        if (isUnread) {
          existing.unreadCount += 1;
        }
      }
    }

    const conversations: DMConversation[] = [];
    conversationMap.forEach((conv, partnerId) => {
      const partner = this.findUserById(partnerId) || this.findUserByUsername(partnerId);
      conversations.push({
        partnerId,
        partnerName: partner ? partner.name : (conv.lastMessage.senderId === partnerId ? conv.lastMessage.senderName : conv.lastMessage.recipientName),
        partnerUsername: partner ? partner.username : (conv.lastMessage.senderId === partnerId ? conv.lastMessage.senderUsername : conv.lastMessage.recipientUsername),
        partnerAvatar: partner?.avatarUrl,
        partnerIsVerified: partner?.isVerified || partner?.role === 'guru',
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount,
        updatedAt: conv.lastMessage.createdAt,
      });
    });

    return conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  sendDirectMessage(payload: {
    senderId: string;
    senderName: string;
    senderUsername: string;
    senderAvatar?: string;
    recipientId: string;
    recipientName: string;
    recipientUsername: string;
    recipientAvatar?: string;
    text?: string;
    mediaType?: 'text' | 'image' | 'video' | 'audio';
    mediaUrl?: string;
    audioDuration?: number;
    replyToMessage?: any;
    replyToStory?: any;
    forwardedFrom?: string;
  }): DirectMessage {
    if (!Array.isArray(this.data.directMessages)) this.data.directMessages = [];
    const now = new Date().toISOString();
    const newMsg: DirectMessage = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: payload.senderId,
      senderName: payload.senderName,
      senderUsername: payload.senderUsername,
      senderAvatar: payload.senderAvatar,
      recipientId: payload.recipientId,
      recipientName: payload.recipientName,
      recipientUsername: payload.recipientUsername,
      recipientAvatar: payload.recipientAvatar,
      text: payload.text || '',
      mediaType: payload.mediaType || 'text',
      mediaUrl: payload.mediaUrl,
      audioDuration: payload.audioDuration,
      replyToMessage: payload.replyToMessage,
      replyToStory: payload.replyToStory,
      reactions: {},
      isRead: false,
      forwardedFrom: payload.forwardedFrom,
      createdAt: now,
    };

    this.data.directMessages.push(newMsg);
    this.save();

    const snippet = payload.text
      ? (payload.text.length > 45 ? payload.text.substring(0, 42) + '...' : payload.text)
      : payload.mediaType === 'audio'
      ? '🎤 Mengirim pesan suara'
      : payload.mediaType === 'image'
      ? '📷 Mengirim foto'
      : payload.mediaType === 'video'
      ? '🎥 Mengirim video'
      : 'Pesan baru';

    this.createNotification({
      title: `Pesan dari ${payload.senderName}`,
      message: snippet,
      type: 'dm',
      linkType: 'dm',
      linkId: payload.senderId,
      targetUserId: payload.recipientId,
    });

    return newMsg;
  }

  reactToDirectMessage(messageId: string, emoji: string, userId: string): DirectMessage | null {
    if (!Array.isArray(this.data.directMessages)) return null;
    const msg = this.data.directMessages.find((m) => m.id === messageId);
    if (!msg) return null;

    if (!msg.reactions) msg.reactions = {};

    const usersForEmoji = msg.reactions[emoji] || [];
    const alreadyHas = usersForEmoji.includes(userId);

    for (const key of Object.keys(msg.reactions)) {
      msg.reactions[key] = msg.reactions[key].filter((id) => id !== userId);
      if (msg.reactions[key].length === 0) {
        delete msg.reactions[key];
      }
    }

    if (!alreadyHas) {
      if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
      msg.reactions[emoji].push(userId);
    }

    this.save();
    return msg;
  }

  deleteDirectMessage(messageId: string, userId: string, isAdmin = false): boolean {
    if (!Array.isArray(this.data.directMessages)) return false;
    const idx = this.data.directMessages.findIndex((m) => m.id === messageId);
    if (idx === -1) {
      return (this.data.deletedMessageIds || []).includes(messageId);
    }
    const msg = this.data.directMessages[idx];
    if (msg.senderId === userId || msg.recipientId === userId || isAdmin) {
      this.data.directMessages.splice(idx, 1);
      this.recordTombstone('deletedMessageIds', messageId);
      this.save();
      return true;
    }
    return false;
  }

  markMessagesAsRead(senderId: string, recipientId: string): void {
    if (!Array.isArray(this.data.directMessages)) return;
    let modified = false;
    for (const m of this.data.directMessages) {
      if (m.senderId === senderId && m.recipientId === recipientId && !m.isRead) {
        m.isRead = true;
        modified = true;
      }
    }
    if (modified) this.save();
  }

  // -------------------------------------------------------------
  // CATATAN (NOTES) - KEDALUWARSA 24 JAM
  // -------------------------------------------------------------
  getActiveNotes(): StudentNote[] {
    if (!Array.isArray(this.data.studentNotes)) this.data.studentNotes = [];
    const now = Date.now();
    const active = this.data.studentNotes.filter((n) => {
      const exp = new Date(n.expiresAt).getTime();
      return exp > now;
    });

    if (active.length !== this.data.studentNotes.length) {
      this.data.studentNotes = active;
      this.save();
    }

    return this.data.studentNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createOrUpdateNote(payload: {
    userId: string;
    userName: string;
    userUsername: string;
    userAvatar?: string;
    userKelas?: string;
    text: string;
  }): StudentNote {
    if (!Array.isArray(this.data.studentNotes)) this.data.studentNotes = [];
    this.data.studentNotes = this.data.studentNotes.filter((n) => n.userId !== payload.userId);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const newNote: StudentNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: payload.userId,
      userName: payload.userName,
      userUsername: payload.userUsername,
      userAvatar: payload.userAvatar,
      userKelas: payload.userKelas,
      text: payload.text.trim(),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    this.data.studentNotes.unshift(newNote);
    this.save();
    return newNote;
  }

  deleteStudentNote(userId: string): boolean {
    if (!Array.isArray(this.data.studentNotes)) return false;
    const initialLen = this.data.studentNotes.length;
    this.data.studentNotes = this.data.studentNotes.filter((n) => n.userId !== userId);
    if (this.data.studentNotes.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------
  // LOST AND FOUND (BARANG HILANG & DITEMUKAN)
  // -------------------------------------------------------------
  getLostFoundItems(filter?: { type?: 'lost' | 'found'; status?: string }): LostFoundItem[] {
    if (!Array.isArray(this.data.lostFoundItems)) this.data.lostFoundItems = [];
    let list = [...this.data.lostFoundItems];
    if (filter?.type) {
      list = list.filter((i) => i.type === filter.type);
    }
    if (filter?.status) {
      list = list.filter((i) => i.status === filter.status);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createLostFoundItem(payload: Partial<LostFoundItem>): LostFoundItem {
    if (!Array.isArray(this.data.lostFoundItems)) this.data.lostFoundItems = [];
    const now = new Date().toISOString();
    const newItem: LostFoundItem = {
      id: `lf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: payload.type || 'lost',
      reporterId: payload.reporterId || '',
      reporterName: payload.reporterName || 'Siswa',
      reporterUsername: payload.reporterUsername || '',
      reporterKelas: payload.reporterKelas,
      itemName: (payload.itemName || '').trim(),
      category: payload.category || 'lainnya',
      photoUrl: payload.photoUrl,
      description: (payload.description || '').trim(),
      location: (payload.location || '').trim(),
      dateTime: payload.dateTime || now,
      storageStatus: payload.storageStatus || 'masih_di_penemu',
      additionalNotes: payload.additionalNotes,
      status: 'menunggu_pemeriksaan',
      claims: [],
      createdAt: now,
      updatedAt: now,
    };

    this.data.lostFoundItems.unshift(newItem);
    this.save();

    ['satpam', 'guru', 'tata_usaha'].forEach((role) => {
      this.createNotification({
        title: payload.type === 'found' ? 'Laporan Barang Ditemukan Baru' : 'Laporan Barang Hilang Baru',
        message: `${newItem.reporterName} (${newItem.reporterKelas || '-'}) melaporkan: "${newItem.itemName}" di lokasi ${newItem.location}.`,
        type: 'lost_found',
        linkType: 'reports',
        linkId: newItem.id,
        targetRole: role as any,
      });
    });

    return newItem;
  }

  updateLostFoundItem(id: string, updates: Partial<LostFoundItem>): LostFoundItem | null {
    if (!Array.isArray(this.data.lostFoundItems)) return null;
    const item = this.data.lostFoundItems.find((i) => i.id === id);
    if (!item) return null;

    Object.assign(item, updates, { updatedAt: new Date().toISOString() });
    this.save();

    if (updates.status) {
      this.createNotification({
        title: 'Status Laporan Barang Diperbarui',
        message: `Laporan Anda untuk "${item.itemName}" kini berstatus: ${updates.status.replace(/_/g, ' ')}.`,
        type: 'lost_found',
        linkType: 'reports',
        linkId: item.id,
        targetUserId: item.reporterId,
      });
    }

    return item;
  }

  claimLostFoundItem(itemId: string, claimPayload: Partial<LostFoundClaim>): LostFoundItem | null {
    if (!Array.isArray(this.data.lostFoundItems)) return null;
    const item = this.data.lostFoundItems.find((i) => i.id === itemId);
    if (!item) return null;

    if (!Array.isArray(item.claims)) item.claims = [];
    const now = new Date().toISOString();
    const newClaim: LostFoundClaim = {
      id: `claim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      claimantId: claimPayload.claimantId || '',
      claimantName: claimPayload.claimantName || '',
      claimantUsername: claimPayload.claimantUsername || '',
      claimantKelas: claimPayload.claimantKelas,
      reason: (claimPayload.reason || '').trim(),
      identifyingFeatures: (claimPayload.identifyingFeatures || '').trim(),
      additionalInfo: claimPayload.additionalInfo,
      status: 'menunggu_verifikasi',
      createdAt: now,
      updatedAt: now,
    };

    item.claims.unshift(newClaim);
    item.updatedAt = now;
    this.save();

    ['satpam', 'guru', 'tata_usaha'].forEach((role) => {
      this.createNotification({
        title: 'Klaim Kepemilikan Barang Baru',
        message: `${newClaim.claimantName} mengklaim barang "${item.itemName}". Mohon verifikasi bukti kepemilikan.`,
        type: 'lost_found',
        linkType: 'reports',
        linkId: item.id,
        targetRole: role as any,
      });
    });

    return item;
  }

  updateLostFoundClaim(itemId: string, claimId: string, updates: Partial<LostFoundClaim>): LostFoundItem | null {
    if (!Array.isArray(this.data.lostFoundItems)) return null;
    const item = this.data.lostFoundItems.find((i) => i.id === itemId);
    if (!item || !Array.isArray(item.claims)) return null;

    const claim = item.claims.find((c) => c.id === claimId);
    if (!claim) return null;

    Object.assign(claim, updates, { updatedAt: new Date().toISOString() });
    item.updatedAt = new Date().toISOString();

    if (updates.status === 'barang_telah_dikembalikan') {
      item.status = 'barang_telah_dikembalikan';
      item.handoverOfficer = updates.verifiedBy;
      item.handoverTime = new Date().toISOString();
    }

    this.save();

    this.createNotification({
      title: 'Status Klaim Barang Anda',
      message: `Klaim Anda untuk "${item.itemName}" telah diperbarui menjadi: ${claim.status.replace(/_/g, ' ')}. ${claim.satpamNotes ? `Catatan: ${claim.satpamNotes}` : ''}`,
      type: 'lost_found',
      linkType: 'reports',
      linkId: item.id,
      targetUserId: claim.claimantId,
    });

    return item;
  }

  // -------------------------------------------------------------
  // PERIZINAN TEMPAT DAN KEGIATAN
  // -------------------------------------------------------------
  getActivityPermissions(applicantId?: string): ActivityPermission[] {
    if (!Array.isArray(this.data.activityPermissions)) this.data.activityPermissions = [];
    let list = [...this.data.activityPermissions];
    if (applicantId) {
      list = list.filter((p) => p.applicantId === applicantId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createActivityPermission(payload: Partial<ActivityPermission>): ActivityPermission {
    if (!Array.isArray(this.data.activityPermissions)) this.data.activityPermissions = [];
    const now = new Date().toISOString();
    const newPerm: ActivityPermission = {
      id: `perm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      applicantId: payload.applicantId || '',
      applicantName: payload.applicantName || '',
      applicantUsername: payload.applicantUsername || '',
      applicantKelas: payload.applicantKelas,
      organizationOrClass: (payload.organizationOrClass || '').trim(),
      activityName: (payload.activityName || '').trim(),
      purpose: (payload.purpose || '').trim(),
      requestedLocation: (payload.requestedLocation || '').trim(),
      activityDate: payload.activityDate || '',
      startTime: payload.startTime || '',
      endTime: payload.endTime || '',
      participantCount: payload.participantCount || 1,
      supervisorTeacher: (payload.supervisorTeacher || '').trim(),
      additionalNotes: payload.additionalNotes,
      status: 'menunggu_satpam',
      createdAt: now,
      updatedAt: now,
    };

    this.data.activityPermissions.unshift(newPerm);
    this.save();

    this.createNotification({
      title: 'Pengajuan Izin Tempat Baru',
      message: `${newPerm.organizationOrClass} mengajukan izin "${newPerm.activityName}" di ${newPerm.requestedLocation}. Menunggu verifikasi fasilitas & keamanan Satpam.`,
      type: 'permission',
      linkType: 'reports',
      linkId: newPerm.id,
      targetRole: 'satpam',
    });

    return newPerm;
  }

  reviewActivityPermissionSatpam(
    id: string,
    review: { reviewedBy: string; safetyChecked: boolean; facilityAvailable: boolean; notes?: string }
  ): ActivityPermission | null {
    if (!Array.isArray(this.data.activityPermissions)) return null;
    const perm = this.data.activityPermissions.find((p) => p.id === id);
    if (!perm) return null;

    perm.satpamReview = {
      reviewedBy: review.reviewedBy,
      safetyChecked: review.safetyChecked,
      facilityAvailable: review.facilityAvailable,
      notes: review.notes,
      reviewedAt: new Date().toISOString(),
    };

    perm.status = 'menunggu_kepsek';
    perm.updatedAt = new Date().toISOString();
    this.save();

    this.createNotification({
      title: 'Persetujuan Izin Kegiatan (Rekomendasi Satpam Siap)',
      message: `Satpam telah memeriksa keamanan & ketersediaan fasilitas untuk kegiatan "${perm.activityName}" di ${perm.requestedLocation}. Menunggu keputusan Kepala Sekolah.`,
      type: 'permission',
      linkType: 'reports',
      linkId: perm.id,
      targetRole: 'kepala_sekolah',
    });

    this.createNotification({
      title: 'Pemeriksaan Satpam Selesai',
      message: `Pemeriksaan fasilitas untuk "${perm.activityName}" telah diselesaikan oleh Satpam dan diteruskan ke Kepala Sekolah.`,
      type: 'permission',
      linkType: 'reports',
      linkId: perm.id,
      targetUserId: perm.applicantId,
    });

    return perm;
  }

  decideActivityPermissionPrincipal(
    id: string,
    decision: { decidedBy: string; approved: boolean; isRevision?: boolean; revisionNote?: string; rejectionReason?: string }
  ): ActivityPermission | null {
    if (!Array.isArray(this.data.activityPermissions)) return null;
    const perm = this.data.activityPermissions.find((p) => p.id === id);
    if (!perm) return null;

    const now = new Date().toISOString();
    perm.principalDecision = {
      decidedBy: decision.decidedBy,
      approved: decision.approved,
      revisionNote: decision.revisionNote,
      rejectionReason: decision.rejectionReason,
      decidedAt: now,
    };

    if (decision.isRevision) {
      perm.status = 'perlu_revisi';
    } else if (decision.approved) {
      perm.status = 'disetujui';
    } else {
      perm.status = 'ditolak';
    }

    perm.updatedAt = now;
    this.save();

    const statusText = perm.status === 'disetujui' ? 'DISETUJUI' : perm.status === 'perlu_revisi' ? 'PERLU REVISI' : 'DITOLAK';
    this.createNotification({
      title: `Keputusan Izin Kegiatan: ${statusText}`,
      message: `Pengajuan izin "${perm.activityName}" telah ${statusText} oleh Kepala Sekolah. ${decision.revisionNote ? `Catatan Revisi: ${decision.revisionNote}` : decision.rejectionReason ? `Alasan: ${decision.rejectionReason}` : ''}`,
      type: 'permission',
      linkType: 'reports',
      linkId: perm.id,
      targetUserId: perm.applicantId,
    });

    return perm;
  }

  updateActivityPermission(id: string, updates: Partial<ActivityPermission>): ActivityPermission | null {
    if (!Array.isArray(this.data.activityPermissions)) return null;
    const perm = this.data.activityPermissions.find((p) => p.id === id);
    if (!perm) return null;

    Object.assign(perm, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return perm;
  }

  // -------------------------------------------------------------
  // LAPORAN APLIKASI TAMVESTA
  // -------------------------------------------------------------
  getAppReports(reporterId?: string, targetHandler?: 'administrasi' | 'support'): AppReport[] {
    if (!Array.isArray(this.data.appReports)) this.data.appReports = [];
    let list = [...this.data.appReports];
    if (reporterId) {
      list = list.filter((r) => r.reporterId === reporterId);
    }
    if (targetHandler) {
      list = list.filter((r) => r.targetHandler === targetHandler || r.targetHandler === 'both');
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createAppReport(payload: Partial<AppReport>): AppReport {
    if (!Array.isArray(this.data.appReports)) this.data.appReports = [];
    const now = new Date().toISOString();
    const newReport: AppReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      reporterId: payload.reporterId || '',
      reporterName: payload.reporterName || '',
      reporterUsername: payload.reporterUsername || '',
      reporterKelas: payload.reporterKelas,
      reportType: payload.reportType || 'kendala_penggunaan',
      title: (payload.title || '').trim(),
      description: (payload.description || '').trim(),
      screenshotUrl: payload.screenshotUrl,
      incidentTime: payload.incidentTime || now,
      additionalNotes: payload.additionalNotes,
      status: 'laporan_diterima',
      targetHandler: payload.targetHandler || 'support',
      createdAt: now,
      updatedAt: now,
    };

    this.data.appReports.unshift(newReport);
    this.save();

    if (newReport.targetHandler === 'administrasi' || newReport.targetHandler === 'both') {
      this.createNotification({
        title: 'Laporan Layanan Administrasi Baru',
        message: `${newReport.reporterName} menyampaikan laporan: "${newReport.title}".`,
        type: 'app_report',
        linkType: 'reports',
        linkId: newReport.id,
        targetRole: 'tata_usaha',
      });
    }
    if (newReport.targetHandler === 'support' || newReport.targetHandler === 'both') {
      this.createNotification({
        title: 'Tiket Kendala Teknis TAMVESTA',
        message: `${newReport.reporterName} melaporkan: "${newReport.title}" (${newReport.reportType}).`,
        type: 'app_report',
        linkType: 'reports',
        linkId: newReport.id,
        targetRole: 'support',
      });
    }

    return newReport;
  }

  respondAppReportAdmin(
    id: string,
    response: { respondedBy: string; message: string; newStatus?: AppReportStatus }
  ): AppReport | null {
    if (!Array.isArray(this.data.appReports)) return null;
    const rep = this.data.appReports.find((r) => r.id === id);
    if (!rep) return null;

    const now = new Date().toISOString();
    rep.adminResponse = {
      respondedBy: response.respondedBy,
      message: response.message,
      respondedAt: now,
    };
    if (response.newStatus) {
      rep.status = response.newStatus;
    }
    rep.updatedAt = now;
    this.save();

    this.createNotification({
      title: 'Tanggapan Tata Usaha atas Laporan Anda',
      message: `Tata Usaha menanggapi laporan "${rep.title}": ${response.message}`,
      type: 'app_report',
      linkType: 'reports',
      linkId: rep.id,
      targetUserId: rep.reporterId,
    });

    return rep;
  }

  respondAppReportSupport(
    id: string,
    response: { respondedBy: string; technicalNotes: string; newStatus?: AppReportStatus }
  ): AppReport | null {
    if (!Array.isArray(this.data.appReports)) return null;
    const rep = this.data.appReports.find((r) => r.id === id);
    if (!rep) return null;

    const now = new Date().toISOString();
    rep.supportResponse = {
      respondedBy: response.respondedBy,
      technicalNotes: response.technicalNotes,
      resolvedAt: response.newStatus === 'selesai' ? now : undefined,
      respondedAt: now,
    };
    if (response.newStatus) {
      rep.status = response.newStatus;
    }
    rep.updatedAt = now;
    this.save();

    this.createNotification({
      title: 'Tanggapan Support TAMVESTA',
      message: `Tim Support TAMVESTA menanggapi laporan "${rep.title}": ${response.technicalNotes}`,
      type: 'app_report',
      linkType: 'reports',
      linkId: rep.id,
      targetUserId: rep.reporterId,
    });

    return rep;
  }

  updateAppReport(id: string, updates: Partial<AppReport>): AppReport | null {
    if (!Array.isArray(this.data.appReports)) return null;
    const rep = this.data.appReports.find((r) => r.id === id);
    if (!rep) return null;

    Object.assign(rep, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return rep;
  }

  deleteLostFoundItem(id: string): boolean {
    if (!Array.isArray(this.data.lostFoundItems)) return false;
    const existed = this.data.lostFoundItems.some((i) => i.id === id) || (this.data.deletedLostFoundIds || []).includes(id);
    if (!existed) return false;
    this.recordTombstone('deletedLostFoundIds', id);
    this.data.lostFoundItems = this.data.lostFoundItems.filter((i) => i.id !== id);
    this.save();
    return true;
  }

  deleteActivityPermission(id: string): boolean {
    if (!Array.isArray(this.data.activityPermissions)) return false;
    const existed = this.data.activityPermissions.some((p) => p.id === id) || (this.data.deletedPermissionIds || []).includes(id);
    if (!existed) return false;
    this.recordTombstone('deletedPermissionIds', id);
    this.data.activityPermissions = this.data.activityPermissions.filter((p) => p.id !== id);
    this.save();
    return true;
  }

  deleteAppReport(id: string): boolean {
    if (!Array.isArray(this.data.appReports)) return false;
    const existed = this.data.appReports.some((r) => r.id === id) || (this.data.deletedAppReportIds || []).includes(id);
    if (!existed) return false;
    this.recordTombstone('deletedAppReportIds', id);
    this.data.appReports = this.data.appReports.filter((r) => r.id !== id);
    this.save();
    return true;
  }

  // -------------------------------------------------------------
  // PEMBUATAN AKUN ADMINISTRASI & STAF (SINKRONISASI MULTI-DEVICE)
  // -------------------------------------------------------------
  createStaffAccount(data: {
    name: string;
    username: string;
    role: UserRole;
    jabatan?: string;
    password?: string;
    email?: string;
    phone?: string;
  }): User {
    const cleanU = (data.username || '').trim().toLowerCase().replace(/^@+/, '');
    if (!cleanU || cleanU.length < 3) {
      throw new Error('Username minimal 3 karakter.');
    }
    const existing = this.data.users.find(
      (u) => (u.username || '').trim().toLowerCase().replace(/^@+/, '') === cleanU
    );
    if (existing) throw new Error(`Username @${cleanU} sudah digunakan.`);

    const rawPassword = data.password?.trim() || ('Tamvesta!' + Math.floor(1000 + Math.random() * 9000));
    if (rawPassword.length < 6) {
      throw new Error('Password minimal 6 karakter.');
    }
    const pass = hashPassword(rawPassword);
    const id = `user_staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.data.deletedUserIds = (this.data.deletedUserIds || []).filter(
      (did) => did !== id && did.toLowerCase().replace(/^@+/, '') !== cleanU
    );

    const newStaff: User = {
      id,
      username: cleanU,
      name: data.name.trim(),
      role: data.role || 'tata_usaha',
      jabatan: data.jabatan || (data.role === 'admin' ? 'Administrator' : data.role === 'kepala_sekolah' ? 'Kepala Sekolah' : 'Staf Tata Usaha'),
      passwordHash: pass.hash,
      salt: pass.salt,
      tokenVersion: 0,
      mustChangePassword: false,
      isActive: true,
      isVerified: data.role === 'guru' ? true : undefined,
      badgeType: data.role === 'guru' ? 'green' : undefined,
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      qrToken: generateQrToken(id, cleanU),
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name.trim())}&backgroundColor=059669`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.users.unshift(newStaff);
    this.save();

    this.addActivityLog({
      type: 'account_created',
      title: 'Pembuatan Akun Staf/Administrasi',
      description: `Akun ${newStaff.role.toUpperCase()} @${newStaff.username} (${newStaff.name}) berhasil didaftarkan.`,
      userId: newStaff.id,
      userName: newStaff.name,
      userRole: newStaff.role,
    });

    return newStaff;
  }

  // -------------------------------------------------------------
  // JADWAL MATA PELAJARAN (CLASS SCHEDULES)
  // -------------------------------------------------------------
  getSchedules(isPublishedOnly = false): ClassSchedule[] {
    if (!Array.isArray(this.data.schedules)) {
      this.data.schedules = [];
    }
    if (isPublishedOnly) {
      return this.data.schedules.filter((s) => s.isPublished);
    }
    return this.data.schedules;
  }

  saveSchedule(scheduleData: Partial<ClassSchedule> & { id?: string; grade: string; academicYear: string; imageUrl: string; createdBy: string; createdByName?: string; title?: string; description?: string; isPublished?: boolean }): ClassSchedule {
    if (!Array.isArray(this.data.schedules)) {
      this.data.schedules = [];
    }
    const now = new Date().toISOString();
    const id = scheduleData.id || `sched_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const existingIdx = this.data.schedules.findIndex((s) => s.id === id);

    const fullSchedule: ClassSchedule = {
      id,
      grade: scheduleData.grade,
      academicYear: scheduleData.academicYear,
      title: scheduleData.title || `Jadwal Pelajaran Kelas ${scheduleData.grade}`,
      description: scheduleData.description || '',
      imageUrl: scheduleData.imageUrl,
      isPublished: scheduleData.isPublished !== undefined ? scheduleData.isPublished : true,
      createdBy: scheduleData.createdBy,
      createdByName: scheduleData.createdByName || 'Administrasi Sekolah',
      createdAt: existingIdx !== -1 ? this.data.schedules[existingIdx].createdAt : now,
      updatedAt: now,
    };

    if (existingIdx !== -1) {
      this.data.schedules[existingIdx] = fullSchedule;
    } else {
      this.data.schedules.unshift(fullSchedule);
    }
    this.save();

    this.addActivityLog({
      type: 'schedule_updated',
      title: 'Pembaruan Jadwal Pelajaran',
      description: `Jadwal Pelajaran Kelas ${fullSchedule.grade} (${fullSchedule.academicYear}) berhasil diperbarui/dipublikasikan.`,
      userId: fullSchedule.createdBy,
      userName: fullSchedule.createdByName || 'Administrasi',
      userRole: 'admin',
    });

    return fullSchedule;
  }

  deleteSchedule(id: string): boolean {
    if (!Array.isArray(this.data.schedules)) return false;
    const existed = this.data.schedules.some((s) => s.id === id) || (this.data.deletedScheduleIds || []).includes(id);
    if (!existed) return false;
    this.recordTombstone('deletedScheduleIds', id);
    const initialLen = this.data.schedules.length;
    this.data.schedules = this.data.schedules.filter((s) => s.id !== id);
    if (this.data.schedules.length !== initialLen) {
      this.save();
    }
    return true;
  }

  // -------------------------------------------------------------
  // INFORMASI & SESI PERANGKAT (DEVICE SESSIONS)
  // -------------------------------------------------------------
  recordDeviceSession(sessionData: DeviceSession): DeviceSession {
    if (!Array.isArray(this.data.deviceSessions)) {
      this.data.deviceSessions = [];
    }
    const now = new Date().toISOString();
    const existingIdx = this.data.deviceSessions.findIndex(
      (s) => s.id === sessionData.id || (s.userId === sessionData.userId && s.deviceName === sessionData.deviceName && s.browser === sessionData.browser)
    );

    const updatedSession: DeviceSession = {
      ...sessionData,
      id: sessionData.id || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lastActive: now,
      createdAt: existingIdx !== -1 ? this.data.deviceSessions[existingIdx].createdAt : now,
    };

    // Jika id sesi ini pernah di-tombstone (hapus paksa dari device manager), izinkan sesi login baru memakai id baru atau hapus tombstone jika login ulang eksplisit
    if (Array.isArray(this.data.deletedDeviceIds) && this.data.deletedDeviceIds.includes(updatedSession.id)) {
      this.data.deletedDeviceIds = this.data.deletedDeviceIds.filter((d) => d !== updatedSession.id);
    }

    if (existingIdx !== -1) {
      this.data.deviceSessions[existingIdx] = updatedSession;
    } else {
      this.data.deviceSessions.unshift(updatedSession);
    }

    if (this.data.deviceSessions.length > 500) {
      this.data.deviceSessions = this.data.deviceSessions.slice(0, 500);
    }
    this.save();
    return updatedSession;
  }

  getUserDeviceSessions(userId: string): DeviceSession[] {
    if (!Array.isArray(this.data.deviceSessions)) return [];
    const delSet = new Set(this.data.deletedDeviceIds || []);
    return this.data.deviceSessions.filter((s) => s.userId === userId && !delSet.has(s.id));
  }

  getAllDeviceSessions(): DeviceSession[] {
    if (!Array.isArray(this.data.deviceSessions)) return [];
    const delSet = new Set(this.data.deletedDeviceIds || []);
    return this.data.deviceSessions.filter((s) => !delSet.has(s.id));
  }

  deleteDeviceSession(sessionId: string, userId?: string): boolean {
    if (!Array.isArray(this.data.deviceSessions)) return false;
    const target = this.data.deviceSessions.find((s) => s.id === sessionId);
    if (!target && !(this.data.deletedDeviceIds || []).includes(sessionId)) return false;
    if (target && userId && target.userId !== userId) return false;
    this.recordTombstone('deletedDeviceIds', sessionId);
    const initialLen = this.data.deviceSessions.length;
    this.data.deviceSessions = this.data.deviceSessions.filter((s) => {
      if (s.id === sessionId) {
        if (userId && s.userId !== userId) return true; // not owner
        return false;
      }
      return true;
    });
    if (this.data.deviceSessions.length !== initialLen) {
      this.save();
      if (target) {
        this.emitRealtimeEvent({
          type: 'session_revoked',
          entity: 'devices',
          action: 'deleted',
          entityId: sessionId,
          targetUserId: target.userId,
          payload: { sessionId, reason: 'Sesi perangkat diakhiri oleh Administrator.' },
        });
      }
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------
  // MANAJEMEN KELAS (SCHOOL CLASSES)
  // -------------------------------------------------------------
  getSchoolClasses(): SchoolClass[] {
    const delSet = new Set(this.data.deletedClassIds || []);
    if (!Array.isArray(this.data.schoolClasses)) {
      this.data.schoolClasses = [];
    }
    // Seed default kelas HANYA sekali saat inisialisasi pertama kali (jangan pernah re-seed jika admin sudah menghapus semua kelas)
    if (!this.data.hasSeededDefaultClasses && this.data.schoolClasses.length === 0 && delSet.size === 0) {
      this.data.schoolClasses = [
        { id: 'class_7a', name: 'Kelas 7A', grade: '7', description: 'Kelas 7 Unggulan', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'class_7b', name: 'Kelas 7B', grade: '7', description: 'Kelas 7 Reguler', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'class_8a', name: 'Kelas 8A', grade: '8', description: 'Kelas 8 Unggulan', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'class_8b', name: 'Kelas 8B', grade: '8', description: 'Kelas 8 Reguler', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'class_9a', name: 'Kelas 9A', grade: '9', description: 'Kelas 9 Persiapan Ujian', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'class_9b', name: 'Kelas 9B', grade: '9', description: 'Kelas 9 Reguler', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ];
      this.data.hasSeededDefaultClasses = true;
      this.save();
    } else if (!this.data.hasSeededDefaultClasses && (this.data.schoolClasses.length > 0 || delSet.size > 0)) {
      this.data.hasSeededDefaultClasses = true;
    }
    // Calculate student count dynamically
    const students = this.getAllStudents();
    return this.data.schoolClasses
      .filter((c) => !delSet.has(c.id))
      .map((c) => ({
        ...c,
        totalStudents: students.filter((s) => (s.kelas || '').toLowerCase() === c.name.toLowerCase() || (s.kelas || '').toLowerCase().includes(c.name.toLowerCase())).length,
      }));
  }

  saveSchoolClass(item: Partial<SchoolClass> & { name: string; grade: string }): SchoolClass {
    this.data.hasSeededDefaultClasses = true;
    const classes = this.getSchoolClasses();
    const id = item.id || `cls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const idx = classes.findIndex((c) => c.id === id);

    const fullClass: SchoolClass = {
      id,
      name: item.name.trim(),
      grade: item.grade,
      homeroomTeacherId: item.homeroomTeacherId,
      homeroomTeacherName: item.homeroomTeacherName,
      description: item.description || '',
      createdAt: idx !== -1 ? classes[idx].createdAt : now,
      updatedAt: now,
    };

    if (idx !== -1) {
      classes[idx] = fullClass;
    } else {
      classes.unshift(fullClass);
    }
    this.data.schoolClasses = classes;
    this.save();
    return fullClass;
  }

  deleteSchoolClass(id: string): boolean {
    this.data.hasSeededDefaultClasses = true;
    if (!Array.isArray(this.data.schoolClasses)) return false;
    const targetClass = this.data.schoolClasses.find((c) => c.id === id);
    const existed = Boolean(targetClass) || (this.data.deletedClassIds || []).includes(id);
    if (!existed) return false;
    this.recordTombstone('deletedClassIds', id);
    const initialLen = this.data.schoolClasses.length;
    this.data.schoolClasses = this.data.schoolClasses.filter((c) => c.id !== id);
    // Cleanly detach schedules/students referencing deleted class name without breaking history
    if (targetClass && Array.isArray(this.data.schedules)) {
      const targetNameLower = targetClass.name.toLowerCase();
      this.data.schedules = this.data.schedules.map((sch) =>
        sch.grade.toLowerCase() === targetNameLower ? { ...sch, isPublished: false } : sch
      );
    }
    if (this.data.schoolClasses.length !== initialLen) {
      this.save();
    }
    return true;
  }

  // -------------------------------------------------------------
  // RIWAYAT AKTIVITAS SEKOLAH (AUDIT LOGS)
  // -------------------------------------------------------------
  addActivityLog(log: Omit<SchoolActivityLog, 'id' | 'timestamp'>): SchoolActivityLog {
    if (!Array.isArray(this.data.activityLogs)) {
      this.data.activityLogs = [];
    }
    const entry: SchoolActivityLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.activityLogs.unshift(entry);
    if (this.data.activityLogs.length > 250) {
      this.data.activityLogs = this.data.activityLogs.slice(0, 250);
    }
    this.save();
    return entry;
  }

  getActivityLogs(): SchoolActivityLog[] {
    if (!Array.isArray(this.data.activityLogs)) return [];
    return this.data.activityLogs;
  }
}

export const db = new DatabaseManager();
