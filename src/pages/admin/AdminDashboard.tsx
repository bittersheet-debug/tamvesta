import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  UserPlus,
  BookOpen,
  Library,
  Bell,
  HelpCircle,
  QrCode,
  ScanLine,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Key,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  Shield,
  ShieldCheck,
  Clock,
  Award,
  GraduationCap,
  Eye,
  EyeOff,
  Copy,
  Check,
  FileSpreadsheet,
  FileDown,
  FileText,
  Maximize2,
  Filter,
  RefreshCw,
  X,
  Phone,
  Mail,
  MessageCircle,
  Send,
  Contact,
  Share2,
  Radio,
  LifeBuoy,
  Wrench,
  LayoutDashboard,
  Smartphone,
  History,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { SchoolOverviewTab } from './SchoolOverviewTab.tsx';
import { ClassManagementTab } from './ClassManagementTab.tsx';
import { ScheduleManagementTab } from './ScheduleManagementTab.tsx';
import { SocialMonitorTab } from './SocialMonitorTab.tsx';
import { DeviceManagementTab } from './DeviceManagementTab.tsx';
import { ActivityLogTab } from './ActivityLogTab.tsx';
import { DirectMessagesPage } from '../dm/DirectMessagesPage.tsx';
import { api } from '../../lib/api.ts';
import type {
  User,
  UserRole,
  Subject,
  DigitalBook,
  Announcement,
  Quiz,
  QuizAttempt,
  AttendanceEvent,
  PasswordResetRequest,
  RefreshSignal,
  AppReport,
  AppReportStatus,
  SchoolClass,
  ClassSchedule,
  DeviceSession,
  SchoolActivityLog,
  StudentPost,
  Story,
  AppNotification,
} from '../../types/index.ts';
import { StudentProfileModal } from '../../components/StudentProfileModal.tsx';
import { ImageLightboxModal } from '../../components/ImageLightboxModal.tsx';
import { VerifiedBadge } from '../../components/VerifiedBadge.tsx';
import { NotificationBroadcastPanel } from '../../components/NotificationBroadcastPanel.tsx';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal.tsx';
import { useToast } from '../../context/ToastContext.tsx';

type AdminTab =
  | 'overview'
  | 'students'
  | 'contacts'
  | 'staff'
  | 'classes'
  | 'schedules'
  | 'announcements'
  | 'dm'
  | 'social_monitor'
  | 'devices'
  | 'activity_log'
  | 'subjects'
  | 'quizzes'
  | 'events'
  | 'tickets'
  | 'support_tickets'
  | 'notifications';

export const AdminDashboard: React.FC<{ onOpenScanner: () => void }> = ({ onOpenScanner }) => {
  const { showSuccess, showError, showInfo } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState<(AppNotification & { isRead: boolean })[]>([]);
  const [showAdminNotifDrawer, setShowAdminNotifDrawer] = useState(false);
  const [pendingDeleteModal, setPendingDeleteModal] = useState<{
    title: string;
    itemName: string;
    message?: string;
    onExecute: () => Promise<void>;
  } | null>(null);
  const [confirmDeleteLoading, setConfirmDeleteLoading] = useState(false);
  const [creatingTeacherLoading, setCreatingTeacherLoading] = useState(false);

  // --- New Admin Features State (Dashboard Sekolah, Kelas, Jadwal, DM, Social Monitor, Devices, Activity Log) ---
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([]);
  const [activityLogs, setActivityLogs] = useState<SchoolActivityLog[]>([]);
  const [feedPosts, setFeedPosts] = useState<StudentPost[]>([]);
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [newStaffRole, setNewStaffRole] = useState<'guru' | 'admin' | 'tata_usaha' | 'kepala_sekolah' | 'satpam' | 'panitia'>('guru');
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isSyncingMultiDevice, setIsSyncingMultiDevice] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title?: string } | null>(null);

  // --- Support Tickets State (Subkategori B Laporan Aplikasi) ---
  const [supportReports, setSupportReports] = useState<AppReport[]>([]);
  const [respondingSupportId, setRespondingSupportId] = useState<string | null>(null);
  const [supportTechnicalNote, setSupportTechnicalNote] = useState<string>('');
  const [supportTicketStatus, setSupportTicketStatus] = useState<AppReportStatus>('sedang_ditangani');
  const [supportProcessing, setSupportProcessing] = useState<boolean>(false);

  // --- Student Management State ---
  const [students, setStudents] = useState<User[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentUsername, setNewStudentUsername] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [newStudentNisn, setNewStudentNisn] = useState('');
  const [newStudentKelas, setNewStudentKelas] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [studentKelasFilter, setStudentKelasFilter] = useState<string>('all');
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>('all');
  const [isRefreshingStudents, setIsRefreshingStudents] = useState(false);
  const [refreshStudentsNotice, setRefreshStudentsNotice] = useState<string | null>(null);
  const [lastStudentRefreshTime, setLastStudentRefreshTime] = useState<string | null>(null);

  // --- Sinyal Refresh Siswa (Real-time Monitoring) ---
  const [refreshSignals, setRefreshSignals] = useState<RefreshSignal[]>([]);
  const [isFetchingSignals, setIsFetchingSignals] = useState(false);

  // --- Student Contact Management State ---
  const [contactSearch, setContactSearch] = useState('');
  const [contactKelasFilter, setContactKelasFilter] = useState('all');
  const [contactStatusFilter, setContactStatusFilter] = useState<'all' | 'complete' | 'phone_only' | 'email_only' | 'missing'>('all');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [editingContactStudent, setEditingContactStudent] = useState<User | null>(null);
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // Edit Student Modal state
  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [editFormName, setEditFormName] = useState('');
  const [editFormGender, setEditFormGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [editFormKelas, setEditFormKelas] = useState('');
  const [editFormUsername, setEditFormUsername] = useState('');
  const [editFormPhone, setEditFormPhone] = useState('');
  const [editFormEmail, setEditFormEmail] = useState('');
  const [editFormPassword, setEditFormPassword] = useState('');
  const [editFormActive, setEditFormActive] = useState(true);
  const [editStudentLoading, setEditStudentLoading] = useState(false);

  // Delete Student Modal state
  const [deletingStudent, setDeletingStudent] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Ticket processing modals & state
  const [ticketFilterStatus, setTicketFilterStatus] = useState<string>('all');
  const [ticketDetailModal, setTicketDetailModal] = useState<PasswordResetRequest | null>(null);
  const [rejectingTicket, setRejectingTicket] = useState<PasswordResetRequest | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [ticketProcessing, setTicketProcessing] = useState(false);
  const [studentFormSuccess, setStudentFormSuccess] = useState<string | null>(null);
  const [studentFormError, setStudentFormError] = useState<string | null>(null);
  const [studentFormLoading, setStudentFormLoading] = useState(false);

  // Reset password modal for student
  const [resettingStudent, setResettingStudent] = useState<User | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  // Student QR Preview
  const [previewQrStudent, setPreviewQrStudent] = useState<User | null>(null);

  // --- Subjects State ---
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    teacherName: '',
    description: '',
    grade: 'Kelas X',
    schedule: '',
    imageUrl: '',
    room: 'Ruang Kelas',
  });

  // --- Books State ---
  const [books, setBooks] = useState<DigitalBook[]>([]);
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState<DigitalBook | null>(null);
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    category: 'Sains & Teknologi',
    coverUrl: '',
    description: '',
    totalPages: 120,
    publishedYear: '2024',
    content: ['BAB I: Pengantar Buku Digital Siswa Tamansiswa Batam.'],
  });

  // --- Announcements State ---
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [annForm, setAnnForm] = useState({
    title: '',
    content: '',
    category: 'Penting' as 'Penting' | 'Akademik' | 'Kegiatan' | 'Umum',
  });

  // --- Quizzes State ---
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizForm, setQuizForm] = useState({
    title: '',
    subjectName: 'Matematika Peminatan',
    description: '',
    durationMinutes: 15,
    passingScore: 75,
    questions: [
      {
        id: 'q_sample_1',
        question: 'Contoh soal pilihan ganda baru?',
        options: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
        correctOptionIndex: 0,
        explanation: 'Kunci jawaban dan pembahasan.',
      },
    ],
  });

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (uploadEvent.target?.result) {
        callback(uploadEvent.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const addQuizQuestion = () => {
    setQuizForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: `q_${Date.now()}_${prev.questions.length + 1}`,
          question: '',
          options: ['', '', '', ''],
          correctOptionIndex: 0,
          explanation: '',
        },
      ],
    }));
  };

  const removeQuizQuestion = (index: number) => {
    if (quizForm.questions.length <= 1) return;
    setQuizForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  // --- Attendance Events State ---
  const [events, setEvents] = useState<(AttendanceEvent & { totalAttendees?: number })[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    name: '',
    category: 'Event Sekolah' as const,
    description: '',
    location: 'Auditorium Tamansiswa Batam',
    eventDate: new Date().toISOString().slice(0, 10),
    startTime: '08:00',
    endTime: '14:00',
  });

  // --- Student Category & Verified State ---
  const [studentCategoryFilter, setStudentCategoryFilter] = useState<'all' | 'siswa' | 'alumni'>('all');

  // --- Staff & Teacher Management State ---
  const [staffList, setStaffList] = useState<User[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>('all');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedStaffKey, setCopiedStaffKey] = useState<string | null>(null);
  const [staffActionSuccess, setStaffActionSuccess] = useState<string | null>(null);
  const [staffActionError, setStaffActionError] = useState<string | null>(null);

  // Teacher Modals State
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [showEditTeacherModal, setShowEditTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
  const [newTeacherForm, setNewTeacherForm] = useState({
    name: '',
    jabatan: 'Guru Mata Pelajaran',
    username: '',
    password: '',
    email: '',
    phone: '',
  });
  const [editTeacherForm, setEditTeacherForm] = useState({
    name: '',
    jabatan: '',
    email: '',
    phone: '',
    role: 'guru' as UserRole,
    password: '',
    isActive: true,
  });

  // --- Excel Backup State ---
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupStartDate, setBackupStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [backupEndDate, setBackupEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [backupKelas, setBackupKelas] = useState('semua');
  const [backupStudentSearch, setBackupStudentSearch] = useState('');
  const [backupStatusFilter, setBackupStatusFilter] = useState('semua');
  const [backupExporting, setBackupExporting] = useState(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);

  // Generator Helpers for Teachers
  const handleAutoGenerateTeacherCredentials = (name: string, jabatan: string) => {
    const cleanName = (name || jabatan || 'guru')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');
    const randNum = Math.floor(100 + Math.random() * 900);
    const generatedUsername = `guru.${cleanName || 'baru'}`;
    const generatedPassword = `Tamvesta!${randNum}`;

    setNewTeacherForm((prev) => ({
      ...prev,
      username: generatedUsername,
      password: generatedPassword,
    }));
  };

  const handleToggleAlumni = async (studentId: string) => {
    try {
      const res = await api.toggleAlumniStatus(studentId);
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, isAlumni: res.isAlumni } : s))
      );
      showSuccess('Kategori Diperbarui', `Status berubah menjadi ${res.isAlumni ? 'Alumni' : 'Siswa Aktif'}.`);
    } catch (err: any) {
      showError('Gagal Mengubah Kategori', err.message || 'Gagal mengubah status kategori alumni.');
    }
  };

  const notifyMultiDeviceSync = () => {
    try {
      const channel = new BroadcastChannel('tamvesta_admin_sync');
      channel.postMessage({ type: 'REFRESH_ALL', timestamp: Date.now() });
      channel.close();
    } catch (_) {}
  };

  const handleToggleVerified = async (userId: string) => {
    // Jangan toggle jika user adalah guru (permanen)
    const targetStaff = staffList.find((s) => s.id === userId);
    if (targetStaff?.role === 'guru') return;
    try {
      const res = await api.toggleVerifiedBadge(userId);
      setStudents((prev) =>
        prev.map((s) => (s.id === userId ? { ...s, isVerified: res.isVerified } : s))
      );
      setStaffList((prev) =>
        prev.map((s) => (s.id === userId ? { ...s, isVerified: res.isVerified } : s))
      );
      showSuccess('Verifikasi Diperbarui', `Centang verifikasi kini ${res.isVerified ? 'Aktif' : 'Nonaktif'}.`);
      // Kirim sinyal sinkronisasi ke seluruh aplikasi & perangkat
      notifyMultiDeviceSync();
    } catch (err: any) {
      showError('Gagal Mengubah Verifikasi', err.message || 'Gagal mengubah status verifikasi centang biru.');
    }
  };

  const handleSaveClass = async (data: Partial<SchoolClass> & { name: string; grade: string }) => {
    await api.saveSchoolClass(data);
    const updated = await api.getSchoolClasses();
    setSchoolClasses(updated);
    notifyMultiDeviceSync();
  };

  const handleDeleteClass = async (id: string) => {
    await api.deleteSchoolClass(id);
    const updated = await api.getSchoolClasses();
    setSchoolClasses(updated);
    notifyMultiDeviceSync();
  };

  const handleSaveSchedule = async (
    data: Partial<ClassSchedule> & { grade: string; academicYear: string; imageUrl: string; title?: string; description?: string; isPublished?: boolean }
  ) => {
    await api.saveSchedule(data);
    const updated = await api.getSchedules();
    setSchedules(updated);
    notifyMultiDeviceSync();
  };

  const handleDeleteSchedule = async (id: string) => {
    await api.deleteSchedule(id);
    const updated = await api.getSchedules();
    setSchedules(updated);
    notifyMultiDeviceSync();
  };

  const handleDeletePost = async (postId: string) => {
    await api.deletePost(postId);
    const updated = await api.getPosts();
    setFeedPosts(updated);
    notifyMultiDeviceSync();
  };

  const handleDeleteStory = async (storyId: string) => {
    await api.deleteStory(storyId);
    const updated = await api.getStories();
    setAllStories(updated);
    notifyMultiDeviceSync();
  };

  const handleTerminateSession = async (sessionId: string) => {
    await api.terminateDeviceSession(sessionId);
    const updated = await api.getAllAdminDeviceSessions();
    setDeviceSessions(updated);
    notifyMultiDeviceSync();
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherForm.name.trim() || !newTeacherForm.username.trim() || !newTeacherForm.password.trim()) {
      showError('Validasi Gagal', 'Nama, username, dan password akun wajib diisi.');
      return;
    }

    setCreatingTeacherLoading(true);
    try {
      let res: any;
      if (newStaffRole === 'guru') {
        res = await api.createTeacherAccount(newTeacherForm);
      } else {
        res = await api.createStaffAccount({
          name: newTeacherForm.name.trim(),
          username: newTeacherForm.username.trim().toLowerCase(),
          password: newTeacherForm.password.trim(),
          role: newStaffRole,
          jabatan: newTeacherForm.jabatan.trim() || newStaffRole.toUpperCase(),
          email: newTeacherForm.email,
          phone: newTeacherForm.phone,
        });
      }
      const createdTeacher = (res as any)?.teacher || (res as any)?.staff;
      if (createdTeacher) {
        setStaffList((prev) => [
          createdTeacher,
          ...prev.filter(
            (s) =>
              s.id !== createdTeacher.id &&
              (s.username || '').toLowerCase() !== (createdTeacher.username || '').toLowerCase()
          ),
        ]);
      }

      setStaffSearch('');
      setStaffRoleFilter('all');

      const successMsg = res.message || `Akun ${newTeacherForm.name.trim()} berhasil ditambahkan dan disinkronkan.`;
      setStaffActionSuccess(successMsg);
      showSuccess('Akun Berhasil Ditambahkan', successMsg);
      setShowAddTeacherModal(false);
      setNewTeacherForm({
        name: '',
        jabatan: 'Guru Mata Pelajaran',
        username: '',
        password: '',
        email: '',
        phone: '',
      });

      const updatedStaff = await api.getStaff();
      if (Array.isArray(updatedStaff)) {
        setStaffList(updatedStaff);
      }
      notifyMultiDeviceSync();
      setTimeout(() => setStaffActionSuccess(null), 4000);
    } catch (err: any) {
      const msg = err.message || 'Gagal menambahkan akun.';
      setStaffActionError(msg);
      showError('Gagal Menambahkan Akun', msg);
      setTimeout(() => setStaffActionError(null), 5000);
    } finally {
      setCreatingTeacherLoading(false);
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    try {
      const payload: any = {
        name: editTeacherForm.name.trim(),
        jabatan: editTeacherForm.jabatan.trim(),
        email: editTeacherForm.email.trim(),
        phone: editTeacherForm.phone.trim(),
        role: editTeacherForm.role,
        isActive: editTeacherForm.isActive,
        expectedUpdatedAt: editingTeacher.updatedAt,
      };
      if (editTeacherForm.password && editTeacherForm.password.trim().length > 0) {
        if (editTeacherForm.password.trim().length < 3) {
          showError('Validasi Gagal', 'Password baru minimal 3 karakter.');
          return;
        }
        payload.password = editTeacherForm.password.trim();
      }
      const res = await api.updateTeacher(editingTeacher.id, payload);
      const msg = res.message || 'Informasi akun berhasil diperbarui & tersinkron.';
      setStaffActionSuccess(msg);
      showSuccess('Akun Diperbarui', msg);
      setShowEditTeacherModal(false);
      setEditingTeacher(null);
      const updatedStaff = await api.getStaff();
      setStaffList(updatedStaff);
      notifyMultiDeviceSync();
      setTimeout(() => setStaffActionSuccess(null), 4000);
    } catch (err: any) {
      const msg = err.message || 'Gagal memperbarui data akun.';
      setStaffActionError(msg);
      showError('Gagal Memperbarui Akun', msg);
      setTimeout(() => setStaffActionError(null), 4000);
    }
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    setPendingDeleteModal({
      title: 'Hapus Akun Guru / Staf Permanen?',
      itemName: name,
      message: 'Apakah Anda yakin ingin menghapus data ini secara permanen?',
      onExecute: async () => {
        const res = await api.deleteTeacher(id);
        setStaffList((prev) => prev.filter((s) => s.id !== id));
        showSuccess('Akun Dihapus Permanen', res.message || `Akun ${name} telah dihapus selamanya.`);
        notifyMultiDeviceSync();
      },
    });
  };

  // EXPORT EXCEL HANDLER: CRITICAL PRIVACY (NO ID / NO USERNAME)
  const handleExportExcel = async () => {
    setBackupExporting(true);
    setBackupSuccessMessage(null);
    try {
      const records = await api.getClassAttendance({
        date: undefined, // fetch all to filter locally
        kelas: backupKelas === 'semua' ? undefined : backupKelas,
        status: backupStatusFilter === 'semua' ? undefined : backupStatusFilter,
      });

      // Filter by date range and search
      const filtered = records.filter((rec: any) => {
        const d = rec.date || '';
        const inDate = (!backupStartDate || d >= backupStartDate) && (!backupEndDate || d <= backupEndDate);
        const inName = !backupStudentSearch || (rec.studentName || '').toLowerCase().includes(backupStudentSearch.toLowerCase());
        const inKelas = backupKelas === 'semua' || rec.studentKelas === backupKelas;
        const inStatus = backupStatusFilter === 'semua' || (rec.status || '').toLowerCase() === backupStatusFilter.toLowerCase();
        return inDate && inName && inKelas && inStatus;
      });

      if (filtered.length === 0) {
        showError('Data Kosong', 'Tidak ada data absensi yang sesuai dengan filter yang dipilih.');
        setBackupExporting(false);
        return;
      }

      // STRICT PRIVACY: Hilangkan kolom Username atau ID Siswa dari file Excel tanpa menghapus data tersebut dari database
      const rows = filtered.map((rec: any, idx: number) => ({
        'No': idx + 1,
        'Nama Siswa': rec.studentName || '-',
        'Kelas': rec.studentKelas || '-',
        'Tanggal': rec.date || '-',
        'Status Kehadiran': (rec.status || 'HADIR').toUpperCase(),
        'Petugas / Guru Pencatat': rec.recordedBy || 'Guru Pengampu',
        'Keterangan': rec.notes || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 28 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 26 },
        { wch: 30 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absensi Siswa');
      const filename = `Data_Absensi_TAMVESTA_${backupStartDate}_sd_${backupEndDate}.xlsx`;
      XLSX.writeFile(wb, filename);

      setBackupSuccessMessage(`Berhasil mengekspor ${rows.length} data absensi ke file ${filename}. Kolom Username dan ID Siswa dihilangkan sesuai ketentuan privasi.`);
      showSuccess('Ekspor Berhasil', `${rows.length} data absensi diekspor ke ${filename}.`);
    } catch (err: any) {
      showError('Gagal Ekspor Excel', err.message || 'Gagal mengekspor file Excel.');
    } finally {
      setBackupExporting(false);
    }
  };

  const loadRefreshSignals = async () => {
    setIsFetchingSignals(true);
    try {
      const sigs = await api.getRefreshSignals();
      setRefreshSignals(sigs || []);
    } catch (err) {
      console.warn('Gagal memuat sinyal refresh:', err);
    } finally {
      setIsFetchingSignals(false);
    }
  };

  const loadAllData = async () => {
    try {
      // Sync any local student accounts to cloud server so they are visible across all devices
      try {
        await api.syncLocalUsersToServer();
      } catch (_) {}

      const [stu, subs, bks, anns, qzs, atts, evs, staff, reqs, sigs, reps, cls, sch, devs, logs, posts, stories] = await Promise.all([
        api.getStudents(),
        api.getSubjects(),
        api.getBooks().catch(() => []),
        api.getAnnouncements(),
        api.getQuizzes(),
        api.getQuizAttempts(),
        api.getAttendanceEvents(),
        api.getStaff(),
        api.getPasswordResetRequests(),
        api.getRefreshSignals().catch(() => []),
        api.getAppReports().catch(() => []),
        api.getSchoolClasses().catch(() => []),
        api.getSchedules().catch(() => []),
        api.getAllAdminDeviceSessions().catch(() => []),
        api.getActivityLogs().catch(() => []),
        api.getPosts().catch(() => []),
        api.getStories().catch(() => []),
      ]);
      setResetRequests(reqs || []);
      setStudents(stu);
      setSubjects(subs);
      setBooks(bks || []);
      setAnnouncements(anns);
      setQuizzes(qzs);
      setQuizAttempts(atts);
      setEvents(evs);
      setStaffList(staff);
      setRefreshSignals(sigs || []);
      setSupportReports(reps || []);
      setSchoolClasses(cls || []);
      setSchedules(sch || []);
      setDeviceSessions(devs || []);
      setActivityLogs(logs || []);
      setFeedPosts(posts || []);
      setAllStories(stories || []);
      await loadAdminNotifications();
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  const handleRespondSupport = async (reportId: string) => {
    if (!supportTechnicalNote.trim()) {
      showError('Validasi Gagal', 'Masukkan catatan teknis perbaikan sistem.');
      return;
    }
    setSupportProcessing(true);
    try {
      const updated = await api.respondAppReportSupport(reportId, {
        technicalNotes: supportTechnicalNote,
        newStatus: supportTicketStatus,
      });
      setSupportReports(prev => prev.map(r => r.id === reportId ? updated : r));
      setRespondingSupportId(null);
      setSupportTechnicalNote('');
      showSuccess('Tanggapan Disimpan', 'Tanggapan teknis perbaikan sistem berhasil disimpan!');
    } catch (err: any) {
      showError('Gagal Menyimpan', err.message || 'Terjadi kesalahan saat menyimpan tanggapan.');
    } finally {
      setSupportProcessing(false);
    }
  };

  const handleResetStaffToInitial = async (staffUser: User) => {
    setStaffActionSuccess(null);
    setStaffActionError(null);
    try {
      const res = await api.resetStaffPasswordToInitial(staffUser.id);
      setStaffActionSuccess(res.message);
      const updatedStaff = await api.getStaff();
      setStaffList(updatedStaff);
    } catch (err: any) {
      setStaffActionError(err.message || 'Gagal mereset password.');
    }
  };

  const loadAdminNotifications = async () => {
    try {
      const all = await api.getNotifications();
      if (Array.isArray(all)) {
        const adminOnly = all.filter(
          (n) => n.type === 'admin_account_event' || n.targetRole === 'admin'
        );
        const seen = new Set<string>();
        const deduped = adminOnly.filter((n) => {
          const key = n.dedupeKey || n.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setAdminNotifications(deduped);
      }
    } catch (_) {}
  };

  const handleMarkAdminNotifRead = async (notifId: string) => {
    setAdminNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    );
    try {
      await api.markNotificationRead(notifId);
      window.dispatchEvent(new CustomEvent('tamvesta_refresh_notifications'));
    } catch (_) {}
  };

  const handleMarkAllAdminNotifsRead = async () => {
    setAdminNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.markAllNotificationsRead();
      window.dispatchEvent(new CustomEvent('tamvesta_refresh_notifications'));
    } catch (_) {}
  };

  const syncDataSilently = async () => {
    try {
      setIsSyncingMultiDevice(true);
      const [stu, subs, anns, qzs, atts, evs, staff, reqs, cls, sch, devs, logs, posts, stories] = await Promise.all([
        api.getStudents().catch(() => null),
        api.getSubjects().catch(() => null),
        api.getAnnouncements().catch(() => null),
        api.getQuizzes().catch(() => null),
        api.getQuizAttempts().catch(() => null),
        api.getAttendanceEvents().catch(() => null),
        api.getStaff().catch(() => null),
        api.getPasswordResetRequests().catch(() => null),
        api.getSchoolClasses().catch(() => null),
        api.getSchedules().catch(() => null),
        api.getAllAdminDeviceSessions().catch(() => null),
        api.getActivityLogs().catch(() => null),
        api.getPosts().catch(() => null),
        api.getStories().catch(() => null),
      ]);

      if (Array.isArray(stu)) setStudents(stu);
      if (Array.isArray(subs)) setSubjects(subs);
      if (Array.isArray(anns)) setAnnouncements(anns);
      if (Array.isArray(qzs)) setQuizzes(qzs);
      if (Array.isArray(atts)) setQuizAttempts(atts);
      if (Array.isArray(evs)) setEvents(evs);
      if (Array.isArray(staff)) setStaffList(staff);
      if (Array.isArray(reqs)) setResetRequests(reqs);
      if (Array.isArray(cls)) setSchoolClasses(cls);
      if (Array.isArray(sch)) setSchedules(sch);
      if (Array.isArray(devs)) setDeviceSessions(devs);
      if (Array.isArray(logs)) setActivityLogs(logs);
      if (Array.isArray(posts)) setFeedPosts(posts);
      if (Array.isArray(stories)) setAllStories(stories);

      await loadAdminNotifications();
      setLastSyncTime(new Date());
    } catch (err) {
      console.debug('Background multi-device auto-sync skipped:', err);
    } finally {
      setIsSyncingMultiDevice(false);
    }
  };

  const handleDownloadWordStaff = () => {
    const currentDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const currentTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const staffRowsHtml = staffList
      .map((staff, idx) => {
        const displayPass =
          staff.initialPassword ||
          (staff.username === 'TAMANSISWA' ? 'TAMVESTA123' : 'Tamvesta!1234');
        const roleName =
          staff.role === 'admin'
            ? 'Administrator Sistem'
            : staff.role === 'kepala_sekolah'
            ? 'Kepala Sekolah / Yayasan'
            : staff.role === 'panitia'
            ? 'Staf / Tenaga Kependidikan'
            : 'Dewan Guru Pengampu';
        const statusText = staff.isVerified
          ? 'Terverifikasi (Centang Biru)'
          : 'Akun Aktif (Siap Login)';

        return `
          <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center; font-weight: bold; color: #475569; font-size: 10pt;">${idx + 1}</td>
            <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-weight: bold; color: #0f172a; font-size: 10.5pt;">${staff.name}</td>
            <td style="border: 1px solid #cbd5e1; padding: 10px 12px; color: #334155; font-size: 10pt;">${staff.jabatan || roleName}</td>
            <td style="border: 1px solid #cbd5e1; padding: 10px 12px; color: #1e293b; font-size: 10pt;">${roleName}</td>
            <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-family: 'Consolas', 'Courier New', monospace; font-weight: bold; color: #065f46; background-color: #ecfdf5; text-align: center; font-size: 10.5pt;">${staff.username}</td>
            <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-family: 'Consolas', 'Courier New', monospace; font-weight: bold; color: #1e3a8a; background-color: #eff6ff; text-align: center; font-size: 10.5pt;">${displayPass}</td>
            <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center; color: #047857; font-weight: bold; font-size: 9.5pt;">${statusText}</td>
          </tr>
        `;
      })
      .join('');

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>DAFTAR KREDENSIAL RESMI AKUN GURU & TENAGA KEPENDIDIKAN TAMVESTA</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 21.0cm 29.7cm;
            margin: 2.0cm 2.0cm 2.0cm 2.0cm;
            mso-page-orientation: portrait;
          }
          body {
            font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
            color: #1e293b;
            font-size: 11pt;
            line-height: 1.5;
            margin: 0;
            padding: 0;
          }
          .header-kop {
            text-align: center;
            border-bottom: 3px double #0f172a;
            padding-bottom: 14px;
            margin-bottom: 24px;
          }
          .inst-title {
            font-size: 16pt;
            font-weight: 800;
            color: #064e3b;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .inst-sub {
            font-size: 13pt;
            font-weight: 700;
            color: #0f172a;
            margin: 4px 0 0 0;
          }
          .inst-address {
            font-size: 9pt;
            color: #64748b;
            margin: 5px 0 0 0;
          }
          .doc-badge {
            display: inline-block;
            background-color: #047857;
            color: #ffffff;
            padding: 7px 18px;
            font-size: 11pt;
            font-weight: bold;
            border-radius: 4px;
            margin: 16px 0 8px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-bar {
            background-color: #f1f5f9;
            border-left: 4px solid #059669;
            padding: 10px 14px;
            margin-bottom: 20px;
            font-size: 10pt;
            line-height: 1.6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14px;
            margin-bottom: 24px;
          }
          th {
            background-color: #064e3b;
            color: #ffffff;
            padding: 11px 8px;
            font-size: 10pt;
            text-transform: uppercase;
            border: 1px solid #047857;
            text-align: center;
            font-weight: bold;
          }
          .footer-notice {
            margin-top: 25px;
            padding: 14px 18px;
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            font-size: 9.5pt;
            color: #991b1b;
            line-height: 1.6;
          }
          .sign-area {
            margin-top: 40px;
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div class="header-kop">
          <h1 class="inst-title">YAYASAN PERSATUAN PERGURUAN TAMANSISWA</h1>
          <h2 class="inst-sub">CABANG BATAM — KOTA BATAM</h2>
          <p class="inst-address">Alamat: Jl. Tamansiswa No. 1, Batam, Kepulauan Riau • Telp: (0778) 462155 • Portal: https://tamvesta.vercel.app</p>
          <div style="margin-top: 10px;">
            <span class="doc-badge">DAFTAR KREDENSIAL RESMI AKUN GURU & TENAGA KEPENDIDIKAN</span>
          </div>
          <p style="font-size: 10pt; color: #475569; margin: 4px 0 0 0;">Dokumen Distribusi Akun Sistem Informasi TAMVESTA</p>
        </div>

        <div class="info-bar">
          <strong>Tanggal Cetak:</strong> ${currentDate} pukul ${currentTime} WIB<br/>
          <strong>Total Akun Terdaftar:</strong> ${staffList.length} Akun Guru & Staf Aktif Siap Login<br/>
          <strong>Klasifikasi Dokumen:</strong> Dokumen Internal Resmi (Distribusi Langsung)
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 5%;">No</th>
              <th style="width: 25%;">Nama Lengkap</th>
              <th style="width: 18%;">Jabatan / Tugas</th>
              <th style="width: 15%;">Hak Akses (Role)</th>
              <th style="width: 14%;">Username</th>
              <th style="width: 13%;">Password Awal</th>
              <th style="width: 10%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${staffRowsHtml}
          </tbody>
        </table>

        <div class="footer-notice">
          <strong>PEMBERITAHUAN PENTING & KEBIJAKAN KERAHASIAAN:</strong>
          <ol style="margin: 6px 0 0 0; padding-left: 20px;">
            <li>Dokumen ini bersifat <strong>RAHASIA (CONFIDENTIAL)</strong> dan hanya diperuntukkan bagi internal dewan guru serta tenaga kependidikan Perguruan Tamansiswa Batam.</li>
            <li>Kredensial (Username dan Password) di atas digunakan untuk masuk ke aplikasi TAMVESTA (Web & Android).</li>
            <li>Akun guru dan tenaga kependidikan tidak diwajibkan mengganti kata sandi secara paksa demi kemudahan operasional sekolah.</li>
            <li>Dilarang keras menyebarluaskan dokumen ini kepada pihak luar tanpa persetujuan tertulis dari Pimpinan Perguruan Tamansiswa Batam.</li>
          </ol>
        </div>

        <table class="sign-area" style="border: none; margin-top: 50px;">
          <tr style="border: none; background: transparent;">
            <td style="border: none; width: 60%; text-align: left; vertical-align: top;">
              <p style="font-size: 10pt; color: #64748b; line-height: 1.6;">
                Dicetak secara otomatis melalui:<br/>
                <strong>TAMVESTA Admin Control Panel</strong><br/>
                Perguruan Tamansiswa Batam
              </p>
            </td>
            <td style="border: none; width: 40%; text-align: center; vertical-align: top;">
              <p style="font-size: 10pt; margin: 0;">Batam, ${currentDate}</p>
              <p style="font-size: 10pt; font-weight: bold; margin: 2px 0 0 0;">Mengetahui & Menyetujui,</p>
              <p style="font-size: 10pt; color: #475569; margin: 0 0 65px 0;">Pemimpin Perguruan Tamansiswa Batam</p>
              <p style="font-size: 10pt; font-weight: bold; text-decoration: underline; margin: 0;">( Titus Wahyu Diatmiko )</p>
              <p style="font-size: 9pt; color: #64748b; margin: 2px 0 0 0;">Pemimpin Perguruan Tamansiswa Batam</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + wordHtml], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KREDENSIAL_GURU_DAN_STAF_TAMANSISWA_BATAM_${Date.now()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStaffKey(key);
    setTimeout(() => {
      setCopiedStaffKey(null);
    }, 2000);
  };

  useEffect(() => {
    loadAllData();

    // Backup polling interval (15s) alongside real-time SSE push stream
    const intervalId = setInterval(() => {
      syncDataSilently();
    }, 15000);

    // Real-time event listener from SSE/WebSync stream
    const handleRealtimeEvent = () => {
      syncDataSilently();
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncDataSilently();
      }
    };

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('tamvesta_admin_sync');
      channel.onmessage = (msg) => {
        if (msg.data?.type === 'REFRESH_ALL' || msg.data?.type === 'REFRESH_SIGNAL_SENT') {
          syncDataSilently();
          loadRefreshSignals();
        }
      };
    } catch (_) {}

    window.addEventListener('tamvesta_realtime_sync', handleRealtimeEvent);
    window.addEventListener('tamvesta_admin_notification', handleRealtimeEvent);
    window.addEventListener('tamvesta_refresh_notifications', loadAdminNotifications);
    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('tamvesta_realtime_sync', handleRealtimeEvent);
      window.removeEventListener('tamvesta_admin_notification', handleRealtimeEvent);
      window.removeEventListener('tamvesta_refresh_notifications', loadAdminNotifications);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      if (channel) {
        try {
          channel.close();
        } catch (_) {}
      }
    };
  }, []);

  // --- 1. STUDENT REGISTRATION & ACTIONS ---
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentFormSuccess(null);
    setStudentFormError(null);
    setStudentFormLoading(true);

    try {
      const res = await api.createStudent({
        name: newStudentName.trim(),
        username: newStudentUsername.trim().toLowerCase(),
        password: newStudentPassword,
        gender: newStudentGender,
        kelas: newStudentKelas.trim() || 'Kelas 7',
      });

      // Instantly prepend created student to state so it appears immediately!
      const createdStudent = (res as any)?.student || (res as any)?.user;
      if (createdStudent) {
        setStudents((prev) => [
          createdStudent,
          ...prev.filter(
            (s) =>
              s.id !== createdStudent.id &&
              (s.username || '').toLowerCase() !== (createdStudent.username || '').toLowerCase()
          ),
        ]);
      }

      // Reset search and filters so the new account is never hidden!
      setStudentSearch('');
      setStudentCategoryFilter('all');
      setStudentKelasFilter('all');
      setStudentStatusFilter('all');

      setStudentFormSuccess(res.message || 'Akun siswa berhasil didaftarkan ke database.');
      handleResetStudentForm();

      const updated = await api.getStudents(true);
      if (Array.isArray(updated) && updated.length > 0) {
        if (
          createdStudent &&
          !updated.some(
            (s) =>
              s.id === createdStudent.id ||
              (s.username || '').toLowerCase() === (createdStudent.username || '').toLowerCase()
          )
        ) {
          setStudents([createdStudent, ...updated]);
        } else {
          setStudents(updated);
        }
      }
      notifyMultiDeviceSync();
      // Send cloud refresh signal to all devices
      api.sendRefreshSignal({
        userName: `Akun siswa baru ${newStudentName.trim()}`,
      }).catch(() => {});
    } catch (err: any) {
      setStudentFormError(err.message || 'Gagal mendaftarkan akun siswa.');
    } finally {
      setStudentFormLoading(false);
    }
  };

  const handleOpenEditStudent = (stu: User) => {
    setEditingStudent(stu);
    setEditFormName(stu.name);
    setEditFormGender(stu.gender || 'Laki-laki');
    setEditFormKelas(stu.kelas || 'Kelas 7');
    setEditFormUsername(stu.username);
    setEditFormPhone(stu.phone || '');
    setEditFormEmail(stu.email || '');
    setEditFormPassword('');
    setEditFormActive(stu.isActive !== false);
  };

  const handleSaveEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditStudentLoading(true);
    try {
      await api.updateStudent(editingStudent.id, {
        name: editFormName.trim(),
        gender: editFormGender,
        kelas: editFormKelas.trim(),
        username: editFormUsername.trim().toLowerCase(),
        phone: editFormPhone.trim() || undefined,
        email: editFormEmail.trim() || undefined,
        isActive: editFormActive,
        ...(editFormPassword.trim() ? { password: editFormPassword.trim() } : {}),
        expectedUpdatedAt: editingStudent.updatedAt,
      });
      showSuccess('Profil Siswa Diperbarui', 'Data profil & akses login siswa berhasil diperbarui dan tersinkronisasi!');
      setEditingStudent(null);
      const updated = await api.getStudents();
      setStudents(updated);
      notifyMultiDeviceSync();
    } catch (err: any) {
      showError('Gagal Memperbarui', err.message || 'Gagal memperbarui data siswa.');
    } finally {
      setEditStudentLoading(false);
    }
  };

  const [isRefreshingTickets, setIsRefreshingTickets] = useState(false);
  const [isRefreshingContacts, setIsRefreshingContacts] = useState(false);

  const handleRefreshTickets = async () => {
    setIsRefreshingTickets(true);
    try {
      try {
        await api.syncLocalTicketsToServer();
      } catch (_) {}
      const tickets = await api.getPasswordResetRequests();
      setResetRequests(tickets || []);
      notifyMultiDeviceSync();
    } catch (err: any) {
      console.warn('Gagal memuat tiket:', err);
    } finally {
      setIsRefreshingTickets(false);
    }
  };

  const handleRefreshStudents = async () => {
    setIsRefreshingStudents(true);
    setRefreshStudentsNotice(null);
    const prevCount = students.length;
    try {
      try {
        await api.syncPublicUsers(true);
      } catch (_) {}
      try {
        await api.syncLocalUsersToServer();
      } catch (_) {}
      const updated = await api.getStudents(true);
      if (Array.isArray(updated)) {
        setStudents(updated);
        notifyMultiDeviceSync();
        loadRefreshSignals();
        const diff = updated.length - prevCount;
        const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastStudentRefreshTime(nowStr);
        if (diff > 0) {
          setRefreshStudentsNotice(`🎉 Ditemukan ${diff} akun siswa baru dari device lain! Total sekarang: ${updated.length} siswa.`);
        } else if (diff < 0) {
          setRefreshStudentsNotice(`🗑️ ${Math.abs(diff)} akun yang dihapus di device lain telah dibersihkan secara permanen. Total sekarang: ${updated.length} siswa.`);
        } else {
          setRefreshStudentsNotice(`✅ Data akun siswa mutakhir dan sinkron antar-perangkat (${updated.length} siswa terdaftar). Tidak ada penambahan akun baru dari device lain.`);
        }
      }
    } catch (err: any) {
      console.warn('Gagal menyegarkan akun siswa:', err);
      setRefreshStudentsNotice(err.message || 'Gagal menyegarkan akun siswa dari server.');
    } finally {
      setIsRefreshingStudents(false);
      setTimeout(() => setRefreshStudentsNotice(null), 7000);
    }
  };

  const handleRefreshContacts = async () => {
    setIsRefreshingContacts(true);
    try {
      try {
        await api.syncLocalUsersToServer();
      } catch (_) {}
      const updated = await api.getStudents();
      setStudents(updated || []);
      notifyMultiDeviceSync();
    } catch (err: any) {
      console.warn('Gagal memuat kontak siswa:', err);
    } finally {
      setIsRefreshingContacts(false);
    }
  };

  const handleConfirmDeleteStudent = async () => {
    if (!deletingStudent) return;
    const targetId = deletingStudent.id;
    const deletedName = deletingStudent.name;
    const deletedUser = deletingStudent.username;
    setDeleteLoading(true);
    try {
      await api.deleteStudent(targetId);
      setStudents((prev) => prev.filter((s) => s.id !== targetId));
      showSuccess('Akun Siswa Dihapus Permanen', `Akun "${deletedName}" (@${deletedUser}) telah dihapus selamanya dari database.`);
      setDeletingStudent(null);
      const updated = await api.getStudents();
      setStudents(updated);
      notifyMultiDeviceSync();
    } catch (err: any) {
      showError('Gagal Menghapus Siswa', err.message || 'Gagal menghapus akun siswa.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleApproveTicket = async (tkt: PasswordResetRequest) => {
    setTicketProcessing(true);
    try {
      const res = await api.processPasswordResetRequest(tkt.id, 'approved', 'Telah Disetujui');

      setResetRequests((prev) =>
        prev.map((r) =>
          r.id === tkt.id
            ? { ...r, status: 'approved', processedAt: new Date().toISOString(), processedBy: 'Administrator', adminNote: 'Telah Disetujui' }
            : r
        )
      );

      const updatedReqs = await api.getPasswordResetRequests();
      if (Array.isArray(updatedReqs)) setResetRequests(updatedReqs);
      const updatedStu = await api.getStudents(true);
      if (Array.isArray(updatedStu)) setStudents(updatedStu);

      notifyMultiDeviceSync();
      api.sendRefreshSignal({
        userName: `${tkt.name} (@${tkt.username})`,
      }).catch(() => {});

      showSuccess('Tiket Disetujui (ACC)', res.message || `Tiket ganti sandi ${tkt.name} disetujui.`);
    } catch (err: any) {
      showError('Gagal Memproses Tiket', err.message || 'Gagal memproses tiket.');
    } finally {
      setTicketProcessing(false);
    }
  };

  const handleRejectTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTicket) return;
    setTicketProcessing(true);
    try {
      const res = await api.processPasswordResetRequest(rejectingTicket.id, 'rejected', rejectReasonText.trim() || 'Alasan administratif');
      showInfo('Tiket Ditolak', res.message || 'Pengajuan ganti sandi telah ditolak.');
      setRejectingTicket(null);
      setRejectReasonText('');
      const updatedReqs = await api.getPasswordResetRequests();
      setResetRequests(updatedReqs || []);
      notifyMultiDeviceSync();
    } catch (err: any) {
      showError('Gagal Menolak Tiket', err.message || 'Gagal menolak tiket.');
    } finally {
      setTicketProcessing(false);
    }
  };

  const handleResetStudentForm = () => {
    setNewStudentName('');
    setNewStudentUsername('');
    setNewStudentPassword('');
    setNewStudentNisn('');
    setNewStudentKelas('');
  };

  const handleToggleStudentActive = async (student: User) => {
    try {
      const res = await api.toggleStudentActive(student.id);
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, isActive: res.isActive } : s))
      );
      showSuccess('Status Akun Diperbarui', `${student.name} kini ${res.isActive ? 'AKTIF' : 'NONAKTIF'}.`);
      notifyMultiDeviceSync();
    } catch (err: any) {
      showError('Gagal Mengubah Status', err.message || 'Gagal mengubah status akun.');
    }
  };

  const handleApproveStudent = async (student: User) => {
    try {
      await api.approveStudentRegistration(student.id);
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, isActive: true, registrationStatus: 'approved' } : s))
      );
      showSuccess('Pendaftaran Disetujui (ACC)', `Akun "${student.name}" kini aktif dan siap digunakan login.`);
      notifyMultiDeviceSync();
    } catch (err: any) {
      showError('Gagal ACC Pendaftaran', err.message || 'Gagal menyetujui pendaftaran siswa.');
    }
  };

  const handleRejectStudent = (student: User) => {
    setPendingDeleteModal({
      title: 'Tolak Pendaftaran Calon Siswa?',
      itemName: `${student.name} (@${student.username})`,
      message: `Apakah Anda yakin ingin menolak pendaftaran siswa "${student.name}" secara permanen?`,
      onExecute: async () => {
        await api.rejectStudentRegistration(student.id);
        setStudents((prev) =>
          prev.map((s) => (s.id === student.id ? { ...s, isActive: false, registrationStatus: 'rejected' } : s))
        );
        showInfo('Pendaftaran Ditolak', `Pendaftaran ${student.name} telah ditolak.`);
        notifyMultiDeviceSync();
      },
    });
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingStudent || !resetNewPassword) return;
    setResetSuccess(null);
    setResetError(null);

    try {
      const res = await api.resetStudentPassword(resettingStudent.id, resetNewPassword);
      setResetSuccess(res.message);
      setTimeout(() => {
        setResettingStudent(null);
        setResetNewPassword('');
        setResetSuccess(null);
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || 'Gagal mereset password.');
    }
  };

  // --- 2. SUBJECT ACTIONS ---
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await api.updateSubject(editingSubject.id, subjectForm);
      } else {
        await api.addSubject(subjectForm);
      }
      setShowSubjectModal(false);
      setEditingSubject(null);
      const updated = await api.getSubjects();
      setSubjects(updated);
      notifyMultiDeviceSync();
      showSuccess('Mata Pelajaran Disimpan', 'Data mata pelajaran tersinkron ke seluruh perangkat.');
    } catch (err: any) {
      showError('Gagal Menyimpan Mapel', err.message || 'Gagal menyimpan mata pelajaran.');
    }
  };

  const handleDeleteSubject = (id: string) => {
    const target = subjects.find((s) => s.id === id);
    setPendingDeleteModal({
      title: 'Hapus Mata Pelajaran Permanen?',
      itemName: target ? `${target.name} (${target.code})` : id,
      message: 'Apakah Anda yakin ingin menghapus data ini secara permanen?',
      onExecute: async () => {
        await api.deleteSubject(id);
        setSubjects((prev) => prev.filter((s) => s.id !== id));
        showSuccess('Mata Pelajaran Dihapus', 'Mata pelajaran dihapus permanen dari database.');
        notifyMultiDeviceSync();
      },
    });
  };

  // --- 3. BOOK ACTIONS ---
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBook) {
        await api.updateBook(editingBook.id, bookForm);
      } else {
        await api.addBook(bookForm);
      }
      setShowBookModal(false);
      setEditingBook(null);
      const updated = await api.getBooks();
      setBooks(updated);
      showSuccess('Buku Digital Disimpan', 'Data buku digital berhasil disimpan.');
    } catch (err: any) {
      showError('Gagal Menyimpan Buku', err.message || 'Gagal menyimpan buku digital.');
    }
  };

  const handleDeleteBook = (id: string) => {
    const target = books.find((b) => b.id === id);
    setPendingDeleteModal({
      title: 'Hapus Buku Digital Permanen?',
      itemName: target ? target.title : id,
      message: 'Apakah Anda yakin ingin menghapus data ini secara permanen?',
      onExecute: async () => {
        await api.deleteBook(id);
        setBooks((prev) => prev.filter((b) => b.id !== id));
        showSuccess('Buku Dihapus', 'Buku berhasil dihapus permanen dari database.');
      },
    });
  };

  // --- 4. ANNOUNCEMENT ACTIONS ---
  const handleSaveAnn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAnn) {
        await api.updateAnnouncement(editingAnn.id, annForm);
      } else {
        await api.addAnnouncement(annForm);
      }
      setShowAnnModal(false);
      setEditingAnn(null);
      const updated = await api.getAnnouncements();
      setAnnouncements(updated);
      showSuccess('Pengumuman Disimpan', 'Pengumuman diterbitkan & tersinkron real-time ke seluruh portal.');
    } catch (err: any) {
      showError('Gagal Menyimpan Pengumuman', err.message || 'Gagal menyimpan pengumuman.');
    }
  };

  const handleDeleteAnn = (id: string) => {
    const target = announcements.find((a) => a.id === id);
    setPendingDeleteModal({
      title: 'Hapus Pengumuman Permanen?',
      itemName: target ? target.title : id,
      message: 'Apakah Anda yakin ingin menghapus data ini secara permanen?',
      onExecute: async () => {
        await api.deleteAnnouncement(id);
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        showSuccess('Pengumuman Dihapus', 'Pengumuman telah dihapus permanen dari seluruh portal.');
      },
    });
  };

  // --- 5. QUIZ ACTIONS ---
  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addQuiz({
        title: quizForm.title,
        subjectName: quizForm.subjectName,
        description: quizForm.description,
        durationMinutes: Number(quizForm.durationMinutes),
        passingScore: Number(quizForm.passingScore),
        questions: quizForm.questions,
        isActive: true,
      });
      setShowQuizModal(false);
      const updated = await api.getQuizzes();
      setQuizzes(updated);
      showSuccess('Quiz Disimpan', 'Quiz berhasil disimpan ke database utama.');
    } catch (err: any) {
      showError('Gagal Menyimpan Quiz', err.message || 'Gagal menyimpan quiz.');
    }
  };

  const handleDeleteQuiz = (quizOrId: Quiz | string) => {
    if (typeof quizOrId === 'object' && quizOrId !== null) {
      setQuizToDelete(quizOrId);
      return;
    }
    const target = quizzes.find((q) => q.id === quizOrId);
    if (target) {
      setQuizToDelete(target);
      return;
    }
    confirmExecuteDeleteQuiz(quizOrId);
  };

  const confirmExecuteDeleteQuiz = async (id: string) => {
    setQuizToDelete(null);
    try {
      await api.deleteQuiz(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      setQuizAttempts((prev) => prev.filter((a) => a.quizId !== id));
      showSuccess('Quiz Dihapus Permanen', 'Quiz dan seluruh nilainya telah dihapus selamanya.');
    } catch (err: any) {
      showError('Gagal Menghapus Quiz', err.message || 'Gagal menghapus quiz.');
    }
  };

  // --- 6. ATTENDANCE EVENT ACTIONS ---
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAttendanceEvent(eventForm);
      setShowEventModal(false);
      const updated = await api.getAttendanceEvents();
      setEvents(updated);
      showSuccess('Kegiatan Dibuat', 'Event absensi QR baru berhasil dibuat.');
    } catch (err: any) {
      showError('Gagal Membuat Kegiatan', err.message || 'Gagal membuat kegiatan absensi.');
    }
  };

  const handleToggleEventSession = async (id: string) => {
    try {
      const res = await api.toggleEventSession(id);
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, isOpen: res.isOpen } : e))
      );
      showSuccess('Sesi Diperbarui', `Sesi absensi kini ${res.isOpen ? 'DIBUKA' : 'DITUTUP'}.`);
    } catch (err: any) {
      showError('Gagal Mengubah Sesi', err.message || 'Gagal mengubah status sesi.');
    }
  };

  const handleDeleteEvent = (id: string) => {
    const target = events.find((e) => e.id === id);
    setPendingDeleteModal({
      title: 'Hapus Kegiatan Absensi Permanen?',
      itemName: target ? target.name : id,
      message: 'Apakah Anda yakin ingin menghapus data ini secara permanen?',
      onExecute: async () => {
        await api.deleteAttendanceEvent(id);
        setEvents((prev) => prev.filter((e) => e.id !== id));
        showSuccess('Kegiatan Dihapus', 'Kegiatan absensi berhasil dihapus permanen.');
      },
    });
  };

  // --- 7. STUDENT CONTACT ACTIONS ---
  const handleCopyContact = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(key);
    setTimeout(() => setCopiedItem(null), 2500);
  };

  const handleCopyAllPhones = () => {
    const validPhones = filteredContacts
      .map((s) => s.phone?.trim())
      .filter((p): p is string => Boolean(p && p.length >= 7));
    if (validPhones.length === 0) {
      showError('Kontak Kosong', 'Tidak ada nomor WhatsApp yang tersedia pada daftar kontak saat ini.');
      return;
    }
    const joined = validPhones.join(', ');
    navigator.clipboard.writeText(joined);
    setCopiedItem('all_phones');
    showSuccess('Nomor Disalin', `${validPhones.length} nomor WhatsApp berhasil disalin.`);
    setTimeout(() => setCopiedItem(null), 3000);
  };

  const handleExportContacts = () => {
    if (filteredContacts.length === 0) {
      showError('Data Kosong', 'Tidak ada data kontak siswa yang sesuai filter untuk diekspor.');
      return;
    }
    const data = filteredContacts.map((s, idx) => ({
      'No': idx + 1,
      'Nama Siswa': s.name,
      'Username': `@${s.username}`,
      'Kelas': s.kelas || '-',
      'Nomor WhatsApp / HP': s.phone || '-',
      'Format Internasional WA': s.phone ? (s.phone.startsWith('0') ? `62${s.phone.slice(1)}` : s.phone) : '-',
      'Alamat Gmail': s.email || '-',
      'Bio Profil': s.bio || '-',
      'Status Kontak': s.phone && s.email ? 'Lengkap (WA & Gmail)' : s.phone ? 'Hanya WhatsApp' : s.email ? 'Hanya Gmail' : 'Belum Ada Kontak',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kontak Siswa TAMVESTA');
    XLSX.writeFile(wb, `Kontak_Siswa_TAMVESTA_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleOpenEditContact = (stu: User) => {
    setEditingContactStudent(stu);
    setEditContactPhone(stu.phone || '');
    setEditContactEmail(stu.email || '');
  };

  const handleSaveEditContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContactStudent) return;
    setSavingContact(true);
    try {
      await api.updateStudent(editingContactStudent.id, {
        phone: editContactPhone.trim(),
        email: editContactEmail.trim(),
      });
      setStudents((prev) =>
        prev.map((s) =>
          s.id === editingContactStudent.id
            ? { ...s, phone: editContactPhone.trim(), email: editContactEmail.trim() }
            : s
        )
      );
      setEditingContactStudent(null);
      notifyMultiDeviceSync();
      showSuccess('Kontak Disimpan', 'Kontak siswa berhasil diperbarui dan tersinkronisasi.');
    } catch (err: any) {
      showError('Gagal Menyimpan Kontak', err.message || 'Gagal menyimpan kontak siswa.');
    } finally {
      setSavingContact(false);
    }
  };

  const pendingRegistrationsCount = students.filter(
    (s) => s.registrationStatus === 'pending' || (s.isActive === false && !!(s as any).registrationNumber)
  ).length;

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.username.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.nisn && s.nisn.includes(studentSearch)) ||
      (s.kelas && s.kelas.toLowerCase().includes(studentSearch.toLowerCase()));

    const matchesCategory =
      studentCategoryFilter === 'all' ||
      (studentCategoryFilter === 'siswa' && !s.isAlumni) ||
      (studentCategoryFilter === 'alumni' && !!s.isAlumni);

    const matchesStatus =
      studentStatusFilter === 'all' ||
      (studentStatusFilter === 'pending' && (s.registrationStatus === 'pending' || (s.isActive === false && !!(s as any).registrationNumber))) ||
      (studentStatusFilter === 'active' && s.isActive !== false && s.registrationStatus !== 'pending') ||
      (studentStatusFilter === 'inactive' && s.isActive === false && s.registrationStatus !== 'pending');

    const matchesKelas =
      studentKelasFilter === 'all' ||
      (s.kelas && (s.kelas.toLowerCase() === studentKelasFilter.toLowerCase() ||
        (studentKelasFilter.startsWith('Kelas ') && s.kelas.toLowerCase().includes(studentKelasFilter.toLowerCase())) ||
        (s.kelas.toLowerCase().includes(studentKelasFilter.replace('Kelas ', '').toLowerCase()))
      ));

    return matchesSearch && matchesCategory && matchesStatus && matchesKelas;
  });

  const filteredStaff = staffList.filter((staff) => {
    const q = staffSearch.toLowerCase();
    const matchesQuery =
      staff.name.toLowerCase().includes(q) ||
      staff.username.toLowerCase().includes(q) ||
      (staff.jabatan && staff.jabatan.toLowerCase().includes(q));

    const matchesRole =
      staffRoleFilter === 'all' || staff.role === staffRoleFilter;

    return matchesQuery && matchesRole;
  });

  const filteredContacts = students.filter((s) => {
    const q = contactSearch.toLowerCase();
    const matchesSearch =
      !contactSearch ||
      s.name.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(contactSearch)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.kelas && s.kelas.toLowerCase().includes(q));

    const matchesKelas = contactKelasFilter === 'all' || s.kelas === contactKelasFilter;

    let matchesStatus = true;
    if (contactStatusFilter === 'complete') matchesStatus = Boolean(s.phone && s.email);
    else if (contactStatusFilter === 'phone_only') matchesStatus = Boolean(s.phone && !s.email);
    else if (contactStatusFilter === 'email_only') matchesStatus = Boolean(!s.phone && s.email);
    else if (contactStatusFilter === 'missing') matchesStatus = Boolean(!s.phone && !s.email);

    return matchesSearch && matchesKelas && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-4 sm:p-7 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-700/50">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition shrink-0 mt-0.5"
            aria-label="Buka menu navigasi Admin"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold tracking-wide">
                ADMINISTRATOR UTAMA
              </span>
              <span className="text-xs text-slate-400">TAMANSISWA BATAM</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black mt-1 truncate">Dashboard Kontrol Admin</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5 line-clamp-2">
              Kelola akun siswa, guru & staf, rombel kelas, jadwal pelajaran, pesan DM, pengumuman, quiz, dan absensi QR
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl text-[11px] font-bold text-emerald-200 backdrop-blur-sm shadow-inner">
            <span className={`w-2.5 h-2.5 rounded-full ${isSyncingMultiDevice ? 'bg-amber-400 animate-spin' : 'bg-emerald-400 animate-pulse'}`} />
            <span className="hidden sm:inline">Sync Multi-Device:</span>
            <span className="text-emerald-300 font-mono">Aktif ({lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})</span>
          </div>

          <button
            type="button"
            onClick={() => setShowAdminNotifDrawer(true)}
            className="relative flex items-center gap-2 px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-400/30 rounded-2xl font-black text-xs shadow-md transition active:scale-95"
            title="Notifikasi Khusus Admin Portal Dashboard"
          >
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifikasi Admin</span>
            {adminNotifications.filter((n) => !n.isRead).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                {adminNotifications.filter((n) => !n.isRead).length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowBackupModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-teal-600/30 transition active:scale-95"
            title="Unduh backup data absensi dalam format file Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-200" />
            <span className="hidden sm:inline">Backup Absensi (.xlsx)</span>
            <span className="sm:hidden">Backup</span>
          </button>

          <button
            type="button"
            onClick={onOpenScanner}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-600/30 transition active:scale-95 group"
          >
            <ScanLine className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Buka Scanner QR</span>
            <span className="sm:hidden">Scanner</span>
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer (< lg) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[90] lg:hidden bg-slate-950/60 backdrop-blur-xs flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] bg-white h-full shadow-2xl border-r border-slate-200 flex flex-col drawer-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <h2 className="font-black text-sm">Menu Admin TAMVESTA</h2>
                <p className="text-[11px] text-emerald-300">Navigasi Portal Terpadu</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {[
                { id: 'overview' as AdminTab, label: 'Dashboard Utama', icon: LayoutDashboard },
                { id: 'students' as AdminTab, label: `Akun Siswa (${students.length})`, icon: Users },
                { id: 'staff' as AdminTab, label: `Guru & Staf (${staffList.length})`, icon: GraduationCap },
                { id: 'classes' as AdminTab, label: `Kelas (${schoolClasses.length})`, icon: Layers },
                { id: 'schedules' as AdminTab, label: `Jadwal (${schedules.length})`, icon: Calendar },
                { id: 'announcements' as AdminTab, label: 'Pengumuman', icon: Bell },
                { id: 'subjects' as AdminTab, label: 'Mata Pelajaran', icon: BookOpen },
                { id: 'quizzes' as AdminTab, label: 'Quiz & Nilai', icon: HelpCircle },
                { id: 'events' as AdminTab, label: 'Absensi QR', icon: QrCode },
                { id: 'contacts' as AdminTab, label: 'Kontak Siswa', icon: Phone },
                { id: 'dm' as AdminTab, label: 'Pesan DM', icon: MessageCircle },
                { id: 'social_monitor' as AdminTab, label: 'Feed & Story', icon: Sparkles },
                { id: 'devices' as AdminTab, label: `Perangkat (${deviceSessions.length})`, icon: Smartphone },
                { id: 'activity_log' as AdminTab, label: 'Riwayat Aktivitas', icon: History },
                { id: 'tickets' as AdminTab, label: 'Tiket Sandi', icon: Shield, badge: resetRequests.filter((r) => r.status === 'pending').length },
                { id: 'support_tickets' as AdminTab, label: 'Kendala Sistem', icon: LifeBuoy },
                { id: 'notifications' as AdminTab, label: 'Siaran Notifikasi', icon: Radio },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                      isActive ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge && item.badge > 0 ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Responsive Layout: Collapsible Desktop Sidebar + Active Content Area */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <aside
          className={`hidden lg:flex flex-col shrink-0 bg-white rounded-3xl border border-slate-200 shadow-xs p-2.5 sticky top-20 transition-all duration-200 ${
            sidebarCollapsed ? 'w-16' : 'w-60'
          }`}
        >
          <div className="flex items-center justify-between px-2 py-1.5 mb-2 border-b border-slate-100">
            {!sidebarCollapsed && (
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Navigasi Admin
              </span>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition ml-auto"
              title={sidebarCollapsed ? 'Perlebar Sidebar' : 'Kecilkan Sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          <nav className="space-y-1 max-h-[calc(100vh-11rem)] overflow-y-auto no-scrollbar">
            {[
              { id: 'overview' as AdminTab, label: 'Dashboard', icon: LayoutDashboard },
              { id: 'students' as AdminTab, label: 'Akun Siswa', icon: Users, count: students.length },
              { id: 'staff' as AdminTab, label: 'Guru & Staf', icon: GraduationCap, count: staffList.length },
              { id: 'classes' as AdminTab, label: 'Kelas', icon: Layers, count: schoolClasses.length },
              { id: 'schedules' as AdminTab, label: 'Jadwal', icon: Calendar, count: schedules.length },
              { id: 'announcements' as AdminTab, label: 'Pengumuman', icon: Bell },
              { id: 'subjects' as AdminTab, label: 'Mata Pelajaran', icon: BookOpen },
              { id: 'quizzes' as AdminTab, label: 'Quiz & Nilai', icon: HelpCircle },
              { id: 'events' as AdminTab, label: 'Absensi QR', icon: QrCode },
              { id: 'contacts' as AdminTab, label: 'Kontak Siswa', icon: Phone },
              { id: 'dm' as AdminTab, label: 'Pesan DM', icon: MessageCircle },
              { id: 'social_monitor' as AdminTab, label: 'Feed & Story', icon: Sparkles },
              { id: 'devices' as AdminTab, label: 'Perangkat', icon: Smartphone, count: deviceSessions.length },
              { id: 'activity_log' as AdminTab, label: 'Aktivitas', icon: History },
              { id: 'tickets' as AdminTab, label: 'Tiket Sandi', icon: Shield, badge: resetRequests.filter((r) => r.status === 'pending').length },
              { id: 'support_tickets' as AdminTab, label: 'Kendala Sistem', icon: LifeBuoy },
              { id: 'notifications' as AdminTab, label: 'Siaran Notifikasi', icon: Radio },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? item.id === 'notifications'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : item.id === 'support_tickets'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </span>
                  {!sidebarCollapsed && item.badge && item.badge > 0 ? (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  ) : !sidebarCollapsed && item.count !== undefined ? (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* Quick Mobile Menu Bar (< lg) */}
          <div className="lg:hidden flex items-center justify-between gap-2 bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              <Menu className="w-4 h-4" />
              <span>Menu Portal</span>
            </button>
            <span className="text-xs font-black text-emerald-700 uppercase tracking-wide truncate px-2">
              {activeTab.replace('_', ' ')}
            </span>
          </div>

          {/* Dedicated Admin Portal Dashboard Notification Banner / Feed (Admin Only) */}
          {activeTab === 'overview' && adminNotifications.length > 0 && (
            <div className="bg-white rounded-3xl border border-emerald-200 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span>Notifikasi Khusus Admin Portal Dashboard</span>
                      {adminNotifications.filter((n) => !n.isRead).length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                          {adminNotifications.filter((n) => !n.isRead).length} Baru
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Pembaruan real-time penambahan & perubahan akun oleh Admin di perangkat lain
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {adminNotifications.some((n) => !n.isRead) && (
                    <button
                      type="button"
                      onClick={handleMarkAllAdminNotifsRead}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Tandai Semua Dibaca</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAdminNotifDrawer(true)}
                    className="px-3 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  >
                    Lihat Semua ({adminNotifications.length})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {adminNotifications.slice(0, 4).map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.isRead && handleMarkAdminNotifRead(notif.id)}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                      !notif.isRead
                        ? 'bg-emerald-50/75 border-emerald-300 shadow-2xs'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-slate-900 truncate">{notif.title}</span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{notif.message}</p>
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        {notif.statusLabel && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                            {notif.statusLabel}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {new Date(notif.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 0: DASHBOARD SEKOLAH */}
          {activeTab === 'overview' && (
        <SchoolOverviewTab
          students={students}
          staffList={staffList}
          schoolClasses={schoolClasses}
          schedules={schedules}
          announcements={announcements}
          quizzes={quizzes}
          activityLogs={activityLogs}
          deviceSessions={deviceSessions}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      )}

      {/* TAB: MANAJEMEN KELAS */}
      {activeTab === 'classes' && (
        <ClassManagementTab
          classes={schoolClasses}
          teachers={staffList.filter((s) => s.role === 'guru')}
          students={students}
          onSaveClass={handleSaveClass}
          onDeleteClass={handleDeleteClass}
          onRefresh={loadAllData}
        />
      )}

      {/* TAB: JADWAL MATA PELAJARAN */}
      {activeTab === 'schedules' && (
        <ScheduleManagementTab
          schedules={schedules}
          onSaveSchedule={handleSaveSchedule}
          onDeleteSchedule={handleDeleteSchedule}
          onRefresh={loadAllData}
        />
      )}

      {/* TAB: DIRECT MESSAGES (DM) */}
      {activeTab === 'dm' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs h-[85vh]">
          <DirectMessagesPage />
        </div>
      )}

      {/* TAB: MANAJEMEN FEED & STORY */}
      {activeTab === 'social_monitor' && (
        <SocialMonitorTab
          posts={feedPosts}
          stories={allStories}
          onDeletePost={handleDeletePost}
          onDeleteStory={handleDeleteStory}
          onRefresh={loadAllData}
        />
      )}

      {/* TAB: MANAJEMEN DEVICE */}
      {activeTab === 'devices' && (
        <DeviceManagementTab
          sessions={deviceSessions}
          onTerminateSession={handleTerminateSession}
          onRefresh={loadAllData}
        />
      )}

      {/* TAB: RIWAYAT AKTIVITAS */}
      {activeTab === 'activity_log' && (
        <ActivityLogTab logs={activityLogs} onRefresh={loadAllData} />
      )}

      {/* TAB 1: PENDAFTARAN & MANAJEMEN AKUN SISWA (Section 4 Requirements) */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Registration Form Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-3">
              <div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                  MENU KHUSUS PENDAFTARAN
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  Pendaftaran Akun Siswa Baru
                </h2>
                <p className="text-xs text-slate-500">
                  Formulir pendaftaran akun Siswa resmi. Data tersimpan permanen di database server dan siap digunakan login langsung.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefreshStudents}
                disabled={isRefreshingStudents}
                title="Segarkan data akun siswa dari server / device lain"
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStudents ? 'animate-spin' : ''}`} />
                <span>{isRefreshingStudents ? 'Menyinkronkan...' : 'Segarkan Data Siswa'}</span>
              </button>
            </div>

            {studentFormSuccess && (
              <div className="mb-5 flex items-center gap-2.5 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{studentFormSuccess}</span>
              </div>
            )}

            {studentFormError && (
              <div className="mb-5 flex items-center gap-2.5 p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs font-bold">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{studentFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Nama lengkap */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    1. Nama Lengkap Siswa *
                  </label>
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    required
                    placeholder="Contoh: Muhammad Farhan"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                {/* 2. Jenis Kelamin (Dropdown) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    2. Jenis Kelamin *
                  </label>
                  <select
                    value={newStudentGender}
                    onChange={(e) => setNewStudentGender(e.target.value as any)}
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                {/* 3. Kelas (Dropdown 1-9) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    3. Kelas Siswa (Kelas 1 - 9) *
                  </label>
                  <select
                    value={newStudentKelas}
                    onChange={(e) => setNewStudentKelas(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="">Pilih Kelas</option>
                    <option value="Kelas 1">Kelas 1</option>
                    <option value="Kelas 2">Kelas 2</option>
                    <option value="Kelas 3">Kelas 3</option>
                    <option value="Kelas 4">Kelas 4</option>
                    <option value="Kelas 5">Kelas 5</option>
                    <option value="Kelas 6">Kelas 6</option>
                    <option value="Kelas 7">Kelas 7</option>
                    <option value="Kelas 8">Kelas 8</option>
                    <option value="Kelas 9">Kelas 9</option>
                  </select>
                </div>

                {/* 4. Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    4. Username (Unik) *
                  </label>
                  <input
                    type="text"
                    value={newStudentUsername}
                    onChange={(e) => setNewStudentUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                    required
                    placeholder="Contoh: farhan.siswa"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>

                {/* 5. Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    5. Password (Min. 3 Karakter) *
                  </label>
                  <input
                    type="password"
                    value={newStudentPassword}
                    onChange={(e) => setNewStudentPassword(e.target.value)}
                    required
                    minLength={3}
                    placeholder="Masukkan password akun (boleh sama dgn username)"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetStudentForm}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition"
                >
                  Reset Formulir
                </button>

                <button
                  type="submit"
                  disabled={studentFormLoading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{studentFormLoading ? 'Menyimpan...' : 'Daftarkan Akun Siswa'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 📡 LOG SINYAL REFRESH SISWA (REAL-TIME MONITORING) */}
          {/* ------------------------------------------------------------- */}
          <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-teal-800/60 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-black text-white">
                      📡 Log Sinyal Refresh Siswa (Terhubung Real-Time)
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold">
                      Online • Auto Sync
                    </span>
                  </div>
                  <p className="text-xs text-teal-200/80 mt-0.5">
                    Menampilkan konfirmasi aktivitas penekanan tombol Refresh dari dashboard akun siswa.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadRefreshSignals}
                  disabled={isFetchingSignals}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold transition active:scale-95 disabled:opacity-50"
                  title="Segarkan log sinyal aktivitas refresh dari siswa"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingSignals ? 'animate-spin text-emerald-300' : ''}`} />
                  <span>{isFetchingSignals ? 'Mengecek...' : 'Segarkan Log Sinyal'}</span>
                </button>
              </div>
            </div>

            {/* List Sinyal */}
            {refreshSignals.length === 0 ? (
              <div className="py-6 text-center text-xs text-teal-200/60 border border-teal-800/40 rounded-2xl bg-black/20">
                Belum ada catatan aktivitas refresh dari siswa hari ini. Sinyal akan langsung muncul di sini ketika siswa menekan tombol Refresh di dashboard.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {refreshSignals.slice(0, 10).map((sig) => (
                  <div
                    key={sig.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-black text-xs shrink-0">
                        {sig.userName ? sig.userName.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2 flex-wrap">
                          <span>{sig.userName}</span>
                          <span className="text-teal-300 font-mono text-[11px]">@{sig.userUsername}</span>
                          <span className="px-1.5 py-0.2 rounded-md bg-white/10 text-teal-200 text-[10px] font-bold">
                            {sig.userKelas || 'Tamansiswa'}
                          </span>
                        </div>
                        <div className="text-[10px] text-teal-200/70 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-teal-300" />
                          <span>
                            {new Date(sig.timestamp).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            pk{' '}
                            {new Date(sig.timestamp).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}{' '}
                            WIB
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Sinyal Diterima Admin (200 OK)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Student Accounts Table & Management */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-base font-bold text-slate-900">
                    Daftar Akun Siswa Terdaftar ({students.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleRefreshStudents}
                    disabled={isRefreshingStudents}
                    title="Segarkan data untuk mengetahui apakah ada penambahan akun siswa baru di device lain"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStudents ? 'animate-spin' : ''}`} />
                    <span>{isRefreshingStudents ? 'Mengecek Server...' : 'Refresh Akun Siswa'}</span>
                  </button>
                  {lastStudentRefreshTime && (
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">
                      Dicek pk {lastStudentRefreshTime}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Kelola aktivasi akun, kategori Siswa/Alumni, centang biru, kartu QR siswa, dan pantau penambahan akun dari device lain secara realtime.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleRefreshStudents}
                  disabled={isRefreshingStudents}
                  title="Cek apakah ada penambahan atau perubahan akun siswa di device lain"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStudents ? 'animate-spin' : ''}`} />
                  <span>{isRefreshingStudents ? 'Mengecek Device Lain...' : 'Cek Akun Baru di Device Lain'}</span>
                </button>

                {/* Search */}
                <div className="relative w-full sm:w-56">
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Cari nama / username..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                {/* Filter Kategori Siswa / Alumni */}
                <select
                  value={studentCategoryFilter}
                  onChange={(e) => setStudentCategoryFilter(e.target.value as any)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                >
                  <option value="all">Semua Kategori (Siswa & Alumni)</option>
                  <option value="siswa">Hanya Siswa Aktif</option>
                  <option value="alumni">Hanya Alumni</option>
                </select>

                {/* Filter Kelas */}
                <select
                  value={studentKelasFilter}
                  onChange={(e) => setStudentKelasFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                >
                  <option value="all">Semua Kelas</option>
                  <option value="Kelas 1">Kelas 1</option>
                  <option value="Kelas 2">Kelas 2</option>
                  <option value="Kelas 3">Kelas 3</option>
                  <option value="Kelas 4">Kelas 4</option>
                  <option value="Kelas 5">Kelas 5</option>
                  <option value="Kelas 6">Kelas 6</option>
                  <option value="Kelas 7">Kelas 7</option>
                  <option value="Kelas 8">Kelas 8</option>
                  <option value="Kelas 9">Kelas 9</option>
                </select>

                {/* Filter Status */}
                <select
                  value={studentStatusFilter}
                  onChange={(e) => setStudentStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                >
                  <option value="all">Semua Status Akun</option>
                  <option value="pending">Menunggu ACC ({pendingRegistrationsCount})</option>
                  <option value="active">Aktif Saja</option>
                  <option value="inactive">Nonaktif Saja</option>
                </select>
              </div>
            </div>

            

            {refreshStudentsNotice && (
              <div className="flex items-center justify-between gap-2 p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{refreshStudentsNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRefreshStudentsNotice(null)}
                  className="px-2 py-0.5 hover:bg-emerald-200/60 rounded-lg text-emerald-800 text-[10px] font-bold transition"
                >
                  Tutup
                </button>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-center w-10">No</th>
                    <th className="p-3">Siswa / Alumni</th>
                    <th className="p-3">Gender</th>
                    <th className="p-3">Kelas</th>
                    <th className="p-3">Username</th>
                    <th className="p-3">Tgl Daftar</th>
                    <th className="p-3 text-center">Status Akun</th>
                    <th className="p-3 text-center">Tindakan (QR • Status • Verif)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                        Belum ada siswa terdaftar yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((stu, sIdx) => (
                      <tr key={stu.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 text-center font-bold text-slate-400">
                          {sIdx + 1}
                        </td>
                        <td className="p-3">
                          <div
                            className="flex items-center gap-2.5 cursor-pointer group"
                            onClick={() => setPreviewQrStudent(stu)}
                            title="Klik untuk melihat profil lengkap & QR siswa"
                          >
                            <div
                              className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0 group-hover:ring-2 ring-emerald-500 transition relative cursor-zoom-in"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage({
                                  url: stu.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(stu.name)}&backgroundColor=0284c7`,
                                  title: `Foto Profil • ${stu.name}`,
                                });
                              }}
                              title="Klik foto untuk memperbesar"
                            >
                              <img
                                src={stu.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(stu.name)}&backgroundColor=0284c7`}
                                alt={stu.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-emerald-700 flex items-center gap-1.5 flex-wrap transition">
                                <span>{stu.name}</span>
                                {stu.isAlumni ? (
                                  <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded text-[9px] font-black border border-purple-200">
                                    ALUMNI
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold border border-emerald-200">
                                    SISWA
                                  </span>
                                )}
                                {stu.isVerified && <VerifiedBadge size="xs" />}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400 font-mono">ID: {stu.id}</span>
                                {stu.registrationNumber && (
                                  <span className="text-[10px] text-amber-700 font-mono font-bold bg-amber-50 px-1 rounded border border-amber-200">
                                    {stu.registrationNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 font-semibold">
                          {stu.gender || 'Laki-laki'}
                        </td>
                        <td className="p-3 font-bold text-slate-800">
                          {stu.kelas || '-'}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-800">
                          @{stu.username}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {new Date(stu.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="p-3 text-center">
                          {stu.registrationStatus === 'pending' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                              MENUNGGU ACC
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleStudentActive(stu)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border transition ${
                                stu.isActive !== false
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                              }`}
                              title="Klik untuk mengubah status aktif/nonaktif"
                            >
                              {stu.isActive !== false ? 'AKTIF' : 'NONAKTIF'}
                            </button>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Tombol ACC Cepat untuk Pendaftaran Siswa */}
                            {stu.registrationStatus === 'pending' && (
                              <button
                                onClick={() => handleApproveStudent(stu)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-xs transition cursor-pointer"
                                title="Setujui pendaftaran calon siswa (ACC)"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>ACC</span>
                              </button>
                            )}
                            {stu.registrationStatus === 'pending' && (
                              <button
                                onClick={() => handleRejectStudent(stu)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
                                title="Tolak pendaftaran calon siswa"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            )}

                            {/* Detail / QR */}
                            <button
                              onClick={() => setPreviewQrStudent(stu)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                              title="Lihat Detail Profil & Kartu QR Siswa"
                            >
                              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                            </button>

                            {/* Status Siswa / Alumni Tepat Di Sebelah QR */}
                            <button
                              onClick={() => handleToggleAlumni(stu.id)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-black border transition inline-flex items-center gap-1 shadow-2xs ${
                                stu.isAlumni
                                  ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                              title={
                                stu.isAlumni
                                  ? 'Kategori: Alumni (Klik untuk ubah jadi Siswa Aktif)'
                                  : 'Kategori: Siswa (Klik untuk ubah jadi Alumni)'
                              }
                            >
                              <GraduationCap className="w-3 h-3 shrink-0" />
                              <span>{stu.isAlumni ? 'Alumni' : 'Siswa'}</span>
                            </button>

                            {/* Centang Biru (Verifikasi) */}
                            <button
                              onClick={() => handleToggleVerified(stu.id)}
                              className={`px-2 py-1 rounded-lg border transition inline-flex items-center gap-1 text-[10px] font-bold ${
                                stu.isVerified
                                  ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'
                              }`}
                              title={
                                stu.isVerified
                                  ? 'Centang Biru: Terverifikasi (Klik untuk nonaktifkan)'
                                  : 'Centang Biru: Belum Verifikasi (Klik untuk verifikasi)'
                              }
                            >
                              <CheckCircle2
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  stu.isVerified ? 'fill-blue-500 text-white' : 'text-slate-400'
                                }`}
                              />
                              <span className="hidden xl:inline">{stu.isVerified ? 'Verif' : 'Verif'}</span>
                            </button>

                            {/* Edit Data */}
                            <button
                              onClick={() => handleOpenEditStudent(stu)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                              title="Edit Data Siswa"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                            <button
                              onClick={() => {
                                setResettingStudent(stu);
                                setResetNewPassword('');
                                setResetSuccess(null);
                                setResetError(null);
                              }}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                              title="Reset Password Siswa"
                            >
                              <Key className="w-3.5 h-3.5 text-amber-600" />
                            </button>

                            {/* Hapus Akun */}
                            <button
                              onClick={() => setDeletingStudent(stu)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus Akun Siswa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: BUKU KONTAK & DATABASE NOMOR/EMAIL SISWA */}
      {activeTab === 'contacts' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Official Contact Banner */}
          <div className="bg-gradient-to-r from-teal-900 via-emerald-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-700/40">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-bold text-emerald-200 border border-white/15">
                <Phone className="w-4 h-4 text-amber-300" />
                <span>DATABASE RESMI • BUKU KONTAK SISWA TAMVESTA</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Buku Kontak & Saluran Komunikasi Siswa
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 max-w-3xl leading-relaxed">
                Database nomor WhatsApp dan akun Gmail siswa untuk koordinasi sekolah, wali kelas, guru piket, dan notifikasi resmi. Data kontak terisi otomatis saat siswa pertama kali masuk aplikasi atau memperbarui profil mereka.
              </p>

              {/* Statistics Chips */}
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
                  <span className="block text-[10px] text-emerald-200 font-bold uppercase tracking-wider">Total Siswa</span>
                  <span className="text-xl font-black text-white">{students.length}</span>
                </div>
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
                  <span className="block text-[10px] text-emerald-200 font-bold uppercase tracking-wider">Kontak Lengkap</span>
                  <span className="text-xl font-black text-emerald-300">{students.filter((s) => s.phone && s.email).length}</span>
                </div>
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
                  <span className="block text-[10px] text-emerald-200 font-bold uppercase tracking-wider">Ada WhatsApp</span>
                  <span className="text-xl font-black text-teal-300">{students.filter((s) => s.phone).length}</span>
                </div>
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
                  <span className="block text-[10px] text-emerald-200 font-bold uppercase tracking-wider">Ada Gmail</span>
                  <span className="text-xl font-black text-cyan-300">{students.filter((s) => s.email).length}</span>
                </div>
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center col-span-2 sm:col-span-1">
                  <span className="block text-[10px] text-rose-200 font-bold uppercase tracking-wider">Belum Isi Kontak</span>
                  <span className="text-xl font-black text-rose-300">{students.filter((s) => !s.phone && !s.email).length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls: Search, Filters, Bulk Copy, Export */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Search */}
                <div className="relative min-w-[240px] flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Cari siswa, username, nomor WA, gmail, kelas..."
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  {contactSearch && (
                    <button
                      onClick={() => setContactSearch('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Kelas */}
                <div className="w-full sm:w-auto">
                  <select
                    value={contactKelasFilter}
                    onChange={(e) => setContactKelasFilter(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">Semua Kelas</option>
                    {Array.from(new Set(students.map((s) => s.kelas).filter(Boolean))).sort().map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Status Kontak */}
                <div className="w-full sm:w-auto">
                  <select
                    value={contactStatusFilter}
                    onChange={(e) => setContactStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">Semua Status Kontak</option>
                    <option value="complete">Lengkap (WA & Gmail)</option>
                    <option value="phone_only">Hanya Nomor WhatsApp</option>
                    <option value="email_only">Hanya Alamat Gmail</option>
                    <option value="missing">Belum Mengisi Kontak</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons: Refresh, Bulk Copy & Export */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshContacts}
                  disabled={isRefreshingContacts}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-black shadow-xs transition active:scale-95 disabled:opacity-50"
                  title="Segarkan data kontak siswa dari server"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshingContacts ? 'animate-spin' : ''}`} />
                  <span>{isRefreshingContacts ? 'Memperbarui...' : 'Segarkan Kontak'}</span>
                </button>

                <button
                  onClick={handleCopyAllPhones}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black transition active:scale-95"
                  title="Salin seluruh nomor WA siswa yang tampil untuk broadcast WA"
                >
                  {copiedItem === 'all_phones' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-emerald-600" />
                      <span>Salin Semua Nomor WA</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleExportContacts}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-md transition active:scale-95"
                  title="Unduh seluruh data kontak siswa ke dalam file Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-teal-200" />
                  <span>Export Kontak (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-center w-10">No</th>
                    <th className="p-3">Foto Profil & Siswa</th>
                    <th className="p-3">Kelas</th>
                    <th className="p-3">Nomor WhatsApp / HP</th>
                    <th className="p-3">Alamat Gmail</th>
                    <th className="p-3">Bio Profil Siswa</th>
                    <th className="p-3 text-center">Status Kontak</th>
                    <th className="p-3 text-center">Aksi Hubungi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400 italic">
                        Tidak ada data kontak siswa yang sesuai dengan filter atau kata kunci pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map((stu, cIdx) => {
                      const cleanPhone = (stu.phone || '').trim().replace(/[^0-9+]/g, '');
                      let waPhone = cleanPhone;
                      if (waPhone.startsWith('0')) waPhone = '62' + waPhone.slice(1);
                      else if (waPhone.startsWith('+')) waPhone = waPhone.slice(1);

                      return (
                        <tr key={stu.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 text-center font-bold text-slate-400">
                            {cIdx + 1}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              {/* Avatar with click to zoom */}
                              <div
                                className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0 hover:ring-2 ring-emerald-500 transition relative cursor-zoom-in group shadow-xs"
                                onClick={() =>
                                  setLightboxImage({
                                    url: stu.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(stu.name)}&backgroundColor=0284c7`,
                                    title: `Foto Profil • ${stu.name}`,
                                  })
                                }
                                title="Klik untuk memperbesar foto profil"
                              >
                                <img
                                  src={stu.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(stu.name)}&backgroundColor=0284c7`}
                                  alt={stu.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer transition truncate"
                                    onClick={() => setPreviewQrStudent(stu)}
                                    title="Klik untuk membuka kartu profil lengkap"
                                  >
                                    {stu.name}
                                  </span>
                                  {stu.isVerified && <VerifiedBadge size="sm" />}
                                </div>
                                <span className="text-[11px] font-mono text-emerald-800">
                                  @{stu.username}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200">
                              {stu.kelas || '-'}
                            </span>
                          </td>
                          <td className="p-3">
                            {stu.phone ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{stu.phone}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={`https://wa.me/${waPhone}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black transition active:scale-95"
                                    title="Langsung chat siswa via WhatsApp Web / App"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>Chat WA</span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                                  </a>
                                  <button
                                    onClick={() => handleCopyContact(stu.phone!, `phone_${stu.id}`)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition"
                                    title="Salin nomor WhatsApp"
                                  >
                                    {copiedItem === `phone_${stu.id}` ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        <span className="text-emerald-700">Tersalin</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 text-slate-500" />
                                        <span>Salin</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px] flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Belum diisi
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {stu.email ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-800 font-medium truncate max-w-[200px]" title={stu.email}>
                                  <Mail className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                                  <span className="truncate">{stu.email}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={`mailto:${stu.email}`}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-black transition active:scale-95"
                                    title="Kirim email langsung melalui aplikasi email default"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Kirim Email</span>
                                  </a>
                                  <button
                                    onClick={() => handleCopyContact(stu.email!, `email_${stu.id}`)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition"
                                    title="Salin alamat email"
                                  >
                                    {copiedItem === `email_${stu.id}` ? (
                                      <>
                                        <Check className="w-3 h-3 text-cyan-600" />
                                        <span className="text-cyan-700">Tersalin</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 text-slate-500" />
                                        <span>Salin</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px] flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Belum diisi
                              </span>
                            )}
                          </td>
                          <td className="p-3 max-w-[220px]">
                            {stu.bio ? (
                              <p className="text-slate-600 text-[11px] italic line-clamp-2" title={stu.bio}>
                                “{stu.bio}”
                              </p>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                Belum menulis bio profil
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {stu.phone && stu.email ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Lengkap
                              </span>
                            ) : stu.phone ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 border border-teal-200">
                                Ada WA
                              </span>
                            ) : stu.email ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-cyan-100 text-cyan-800 border border-cyan-200">
                                Ada Gmail
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                Belum Ada
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditContact(stu)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition"
                                title="Perbarui / tambahkan nomor WhatsApp & Gmail siswa"
                              >
                                <Edit2 className="w-3 h-3 text-emerald-600" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => setPreviewQrStudent(stu)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                                title="Lihat profil lengkap dan QR Code siswa"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAFTAR USERNAME & PASSWORD AWAL GURU DAN STAF */}
      {activeTab === 'staff' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Official Document Banner */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-bold text-emerald-200 border border-white/15">
                <GraduationCap className="w-4 h-4 text-amber-300" />
                <span>TAMVESTA • DAFTAR USERNAME & PASSWORD AWAL</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Akun Guru & Tenaga Kependidikan
              </h2>
              <p className="text-xs sm:text-sm text-teal-100 max-w-2xl leading-relaxed">
                Dokumen internal — untuk distribusi akun kepada guru, kepala sekolah, dan staf Tamansiswa Batam.
                Seluruh 17 akun di bawah telah terdaftar dan aktif di sistem TAMVESTA sehingga guru dan staf dapat langsung login.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-xl bg-amber-400/20 border border-amber-300/30 text-amber-200 font-semibold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-300" />
                  Guru & Staf menggunakan akun resmi tanpa kewajiban ganti password paksa
                </span>
              </div>
            </div>
          </div>

          {/* Alert messages */}
          {staffActionSuccess && (
            <div className="flex items-center justify-between gap-2 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{staffActionSuccess}</span>
              </div>
              <button onClick={() => setStaffActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
                ✕
              </button>
            </div>
          )}

          {staffActionError && (
            <div className="flex items-center justify-between gap-2 p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs font-bold animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{staffActionError}</span>
              </div>
              <button onClick={() => setStaffActionError(null)} className="text-rose-600 hover:text-rose-900">
                ✕
              </button>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Akun Staf</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{staffList.length}</span>
                <span className="text-xs text-emerald-600 font-bold">Siap Login</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Guru Pengampu</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-indigo-700">
                  {staffList.filter((s) => s.role === 'guru').length}
                </span>
                <span className="text-xs text-slate-400">Pendidik</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pimpinan & Kepala</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-purple-700">
                  {staffList.filter((s) => s.role === 'kepala_sekolah').length}
                </span>
                <span className="text-xs text-slate-400">Kepsek & Yayasan</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admin & Operasional</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-700">
                  {staffList.filter((s) => s.role === 'admin' || s.role === 'panitia').length}
                </span>
                <span className="text-xs text-slate-400">Dapodik & Satpam</span>
              </div>
            </div>
          </div>

          {/* Search, Filter, and Table Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Daftar Kredensial Resmi Guru & Staf</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold font-mono">
                    {filteredStaff.length} Akun
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Username dan password awal sesuai surat keputusan distribusi akun internal TAMVESTA
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setNewTeacherForm({
                      name: '',
                      jabatan: 'Guru Mata Pelajaran',
                      username: '',
                      password: '',
                      email: '',
                      phone: '',
                    });
                    setShowAddTeacherModal(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Akun Guru</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadWordStaff}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                  title="Unduh Kredensial Resmi Guru & Tenaga Kependidikan ke Microsoft Word (.doc)"
                >
                  <FileDown className="w-4 h-4 text-blue-200" />
                  <span>Unduh Dokumen Word</span>
                </button>

                <div className="relative w-full sm:w-60">
                  <input
                    type="text"
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder="Cari nama, jabatan, username..."
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                <select
                  value={staffRoleFilter}
                  onChange={(e) => setStaffRoleFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-700"
                >
                  <option value="all">Semua Jabatan</option>
                  <option value="guru">Guru Pengampu</option>
                  <option value="kepala_sekolah">Kepala Sekolah / Yayasan</option>
                  <option value="admin">Administrasi & Operator</option>
                  <option value="panitia">Satpam / Staf</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 w-12 text-center">No</th>
                    <th className="p-3.5">Nama</th>
                    <th className="p-3.5">Jabatan</th>
                    <th className="p-3.5">Username</th>
                    <th className="p-3.5">Password Awal</th>
                    <th className="p-3.5 text-center">Centang Hijau</th>
                    <th className="p-3.5">Role Akses</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Tidak ada akun guru/staf yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff, idx) => {
                      const isRevealed = !!revealedPasswords[staff.id];
                      const displayPass = staff.initialPassword || (staff.username === 'TAMANSISWA' ? 'TAMVESTA123' : 'Tamvesta!1234');
                      const roleBadgeStyles: Record<string, string> = {
                        admin: 'bg-rose-100 text-rose-800 border-rose-200',
                        guru: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                        kepala_sekolah: 'bg-purple-100 text-purple-800 border-purple-200',
                        panitia: 'bg-amber-100 text-amber-800 border-amber-200',
                        siswa: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      };

                      return (
                        <tr key={staff.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-3.5 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{staff.name}</span>
                              {staff.isVerified && <VerifiedBadge size="xs" />}
                            </div>
                            {staff.username === 'TAMANSISWA' && (
                              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                                Akun Admin Utama
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-700 font-medium">
                            {staff.jabatan || staff.role.toUpperCase()}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <code className="font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                                {staff.username}
                              </code>
                              <button
                                onClick={() => copyToClipboard(staff.username, `user_${staff.id}`)}
                                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded transition"
                                title="Salin Username"
                              >
                                {copiedStaffKey === `user_${staff.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {isRevealed ? displayPass : '••••••••••••'}
                              </span>
                              <button
                                onClick={() =>
                                  setRevealedPasswords((prev) => ({
                                    ...prev,
                                    [staff.id]: !prev[staff.id],
                                  }))
                                }
                                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded transition"
                                title={isRevealed ? 'Sembunyikan Password' : 'Lihat Password'}
                              >
                                {isRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => copyToClipboard(displayPass, `pass_${staff.id}`)}
                                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded transition"
                                title="Salin Password"
                              >
                                {copiedStaffKey === `pass_${staff.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            {staff.role === 'guru' ? (
                              // Guru: centang PERMANEN — tidak bisa dinonaktifkan
                              <span
                                className="p-1.5 rounded-lg border inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 border-emerald-300 cursor-default"
                                title="Guru Terverifikasi Permanen (Centang Hijau Resmi)"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                                <span className="text-[10px]">Permanen</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleToggleVerified(staff.id)}
                                className={`p-1.5 rounded-lg border transition inline-flex items-center gap-1 text-[11px] font-bold ${
                                  staff.isVerified
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                                }`}
                                title={staff.isVerified ? 'Hilangkan centang biru' : 'Berikan centang biru resmi'}
                              >
                                <ShieldCheck className={`w-3.5 h-3.5 ${staff.isVerified ? 'text-blue-600 fill-blue-600' : 'text-slate-400'}`} />
                                <span className="text-[10px]">{staff.isVerified ? 'Verified' : 'Biasa'}</span>
                              </button>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                roleBadgeStyles[staff.role] || 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {staff.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Aktif
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  const text = `Akun TAMVESTA Tamansiswa Batam:\nNama: ${staff.name}\nJabatan: ${staff.jabatan || '-'}\nUsername: ${staff.username}\nPassword: ${displayPass}`;
                                  copyToClipboard(text, `full_${staff.id}`);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                title="Salin Kredensial Lengkap"
                              >
                                {copiedStaffKey === `full_${staff.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Tersalin</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Salin Akun</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => {
                                  setEditingTeacher(staff);
                                  setEditTeacherForm({
                                    name: staff.name,
                                    jabatan: staff.jabatan || '',
                                    email: staff.email || '',
                                    phone: staff.phone || '',
                                    role: staff.role,
                                    password: '',
                                    isActive: staff.isActive !== false,
                                  });
                                  setShowEditTeacherModal(true);
                                }}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg text-[11px] font-bold transition"
                                title="Edit Akun Guru & Staf"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {staff.username !== 'TAMANSISWA' && (
                                <>
                                  <button
                                    onClick={() => handleResetStaffToInitial(staff)}
                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition"
                                    title="Kembalikan password akun ini ke password awal resmi"
                                  >
                                    Reset ke Awal
                                  </button>

                                  <button
                                    onClick={() => handleDeleteTeacher(staff.id, staff.name)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-[11px] font-bold transition"
                                    title="Hapus Akun Guru"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Document Footer Recommendation */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3 text-xs text-slate-600">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-bold mb-0.5">
                  Rekomendasi Keamanan Distribusi Akun
                </strong>
                <span>
                  Jangan membagikan dokumen ini secara publik. Distribusikan kredensial secara pribadi kepada guru dan staf yang bersangkutan. Gunakan tombol &quot;Reset ke Awal&quot; jika pengguna lupa password.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MATA PELAJARAN MANAGEMENT */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Manajemen Mata Pelajaran</h2>
              <p className="text-xs text-slate-500">Tambah, edit, dan atur kurikulum mata pelajaran siswa</p>
            </div>
            <button
              onClick={() => {
                setEditingSubject(null);
                setSubjectForm({
                  name: '',
                  code: '',
                  teacherName: '',
                  description: '',
                  grade: 'Kelas XII',
                  schedule: '',
                  imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
                  room: 'Lab Sains',
                });
                setShowSubjectModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Mapel Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div
                    className="h-40 relative bg-slate-100 cursor-zoom-in group overflow-hidden"
                    onClick={() => setLightboxImage({ url: sub.imageUrl, title: `Foto Mapel • ${sub.name}` })}
                    title="Klik foto untuk memperbesar"
                  >
                    <img src={sub.imageUrl} alt={sub.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 text-white">
                      {sub.code}
                    </span>
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow">
                        <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Perbesar Foto</span>
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-base text-slate-900">{sub.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{sub.description}</p>
                    <p className="text-[11px] text-slate-600">
                      Guru: <strong>{sub.teacherName}</strong>
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setEditingSubject(sub);
                      setSubjectForm({
                        name: sub.name,
                        code: sub.code,
                        teacherName: sub.teacherName,
                        description: sub.description,
                        grade: sub.grade,
                        schedule: '',
                        imageUrl: sub.imageUrl,
                        room: sub.room || 'Ruang Kelas',
                      });
                      setShowSubjectModal(true);
                    }}
                    className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                    title="Edit Mapel"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(sub.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Hapus Mapel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PENGUMUMAN MANAGEMENT */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Manajemen Pengumuman Sekolah</h2>
              <p className="text-xs text-slate-500">Terbitkan berita dan informasi penting untuk seluruh civitas sekolah</p>
            </div>
            <button
              onClick={() => {
                setEditingAnn(null);
                setAnnForm({
                  title: '',
                  content: '',
                  category: 'Penting',
                });
                setShowAnnModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Pengumuman Baru</span>
            </button>
          </div>

          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {ann.category}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(ann.createdAt).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900">{ann.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{ann.content}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setEditingAnn(ann);
                      setAnnForm({
                        title: ann.title,
                        content: ann.content,
                        category: ann.category,
                      });
                      setShowAnnModal(true);
                    }}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAnn(ann.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: QUIZZES & HASIL */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Manajemen Quiz & Nilai Siswa</h2>
              <p className="text-xs text-slate-500">Kelola bank soal kuis dan pantau hasil evaluasi akademik siswa</p>
            </div>
            <button
              onClick={() => setShowQuizModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Quiz Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map((q) => (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                    {q.subjectName}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeleteQuiz(q)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded active:scale-95 transition"
                      title="Hapus Kuis Permanen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-base text-slate-900">{q.title}</h3>
                <p className="text-xs text-slate-600">{q.description}</p>
                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3 pt-2 border-t border-slate-100">
                  <span>{q.questions.length} Butir Soal</span>
                  <span>Durasi: {q.durationMinutes} mnt</span>
                  <span>KKM: {q.passingScore}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Student Submissions Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Riwayat Penilaian & Pengerjaan Quiz Seluruh Siswa ({quizAttempts.length})
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Nama Siswa</th>
                    <th className="p-3.5">Judul Quiz</th>
                    <th className="p-3.5 text-center">Jawaban Benar</th>
                    <th className="p-3.5 text-center">Nilai</th>
                    <th className="p-3.5 text-center">Status Kelulusan</th>
                    <th className="p-3.5">Waktu Submit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {quizAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                        Belum ada siswa yang mengerjakan quiz.
                      </td>
                    </tr>
                  ) : (
                    quizAttempts.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="p-3.5">
                          <strong>{att.studentName}</strong>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            @{att.username}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-800">{att.quizTitle}</td>
                        <td className="p-3.5 text-center font-mono">
                          {att.correctAnswersCount} / {att.totalQuestions}
                        </td>
                        <td className="p-3.5 text-center font-black text-emerald-700 text-sm">
                          {att.score}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              att.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {att.passed ? 'LULUS' : 'REMEDIAL'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {new Date(att.completedAt).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ABSENSI QR CODE & KEGIATAN */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Pengelolaan Kegiatan & Sesi Absensi QR
              </h2>
              <p className="text-xs text-slate-500">
                Atur event sekolah, kegiatan OSIS, buka/tutup sesi absensi, dan unduh laporan kehadiran
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEventModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Kegiatan Baru</span>
              </button>

              <button
                onClick={onOpenScanner}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <ScanLine className="w-4 h-4 text-emerald-400" />
                <span>Buka Scanner Laptop</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {ev.category}
                    </span>
                    <button
                      onClick={() => handleToggleEventSession(ev.id)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border transition ${
                        ev.isOpen
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border-rose-200'
                      }`}
                      title="Klik untuk membuka/menutup sesi absensi"
                    >
                      {ev.isOpen ? 'SESI DIBUKA' : 'SESI DITUTUP'}
                    </button>
                  </div>

                  <h3 className="font-black text-base text-slate-900">{ev.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{ev.description}</p>

                  <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                    <p>Lokasi: <strong>{ev.location}</strong></p>
                    <p>Tanggal: <strong>{ev.eventDate}</strong> ({ev.startTime} - {ev.endTime} WIB)</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-400">Total Hadir: </span>
                    <strong className="text-emerald-700 text-sm font-black">
                      {ev.totalAttendees || 0} Siswa
                    </strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={api.getExportUrl(ev.id)}
                      download
                      className="p-2 text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                      title="Unduh Laporan CSV"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus Kegiatan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: TIKET PENGAJUAN GANTI SANDI SISWA */}
      {activeTab === 'tickets' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Tiket Pengajuan Ganti Sandi Siswa</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                  {resetRequests.filter((r) => r.status === 'pending').length} Menunggu Persetujuan
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Persetujuan pergantian kata sandi resmi yang diajukan oleh siswa melalui aplikasi
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshTickets}
                disabled={isRefreshingTickets}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                title="Muat ulang tiket pengaduan masuk"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshingTickets ? 'animate-spin' : ''}`} />
                <span>{isRefreshingTickets ? 'Memperbarui...' : 'Segarkan Pengaduan'}</span>
              </button>

              <select
                value={ticketFilterStatus}
                onChange={(e) => setTicketFilterStatus(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-700"
              >
                <option value="all">Semua Status Tiket</option>
                <option value="pending">Menunggu Persetujuan</option>
                <option value="approved">Telah Disetujui</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-center w-12">No</th>
                    <th className="p-3">No. Tiket</th>
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3">Username</th>
                    <th className="p-3">Kelas</th>
                    <th className="p-3">Waktu Pengajuan</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Aksi / Keputusan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {resetRequests.filter((r) => ticketFilterStatus === 'all' || r.status === ticketFilterStatus).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                        Belum ada tiket pengajuan ganti sandi.
                      </td>
                    </tr>
                  ) : (
                    resetRequests
                      .filter((r) => ticketFilterStatus === 'all' || r.status === ticketFilterStatus)
                      .map((tkt, tIdx) => (
                        <tr key={tkt.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 text-center font-bold text-slate-400">
                            {tIdx + 1}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">
                            {tkt.ticketNumber || tkt.id}
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            {tkt.name}
                          </td>
                          <td className="p-3 font-mono text-emerald-800">
                            @{tkt.username}
                          </td>
                          <td className="p-3 text-slate-700">
                            {tkt.kelas || '-'}
                          </td>
                          <td className="p-3 text-slate-500 text-[11px]">
                            {new Date(tkt.createdAt).toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                              tkt.status === 'approved' || (tkt.status as string) === 'acc' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs' :
                              tkt.status === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                              'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                            }`}>
                              {tkt.status === 'approved' || (tkt.status as string) === 'acc' ? 'Telah Disetujui' : tkt.status === 'rejected' ? 'Ditolak' : 'Menunggu Persetujuan'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Detail button */}
                              <button
                                onClick={() => setTicketDetailModal(tkt)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold"
                              >
                                Detail
                              </button>

                              {tkt.status === 'pending' && (
                                <>
                                  {/* Setujui button */}
                                  <button
                                    onClick={() => handleApproveTicket(tkt)}
                                    disabled={ticketProcessing}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black shadow-xs transition active:scale-95 flex items-center gap-1"
                                    title="Setujui dan aktifkan kata sandi baru siswa otomatis"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Setujui</span>
                                  </button>

                                  {/* Tolak button */}
                                  <button
                                    onClick={() => {
                                      setRejectingTicket(tkt);
                                      setRejectReasonText('');
                                    }}
                                    disabled={ticketProcessing}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black shadow-xs transition active:scale-95"
                                  >
                                    Tolak
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: TIKET KENDALA SISTEM (SUPPORT TAMVESTA & ADMIN) */}
      {activeTab === 'support_tickets' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-3">
              <div>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                  HELPDESK & SUPPORT TAMVESTA
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  Tiket Kendala Sistem & Bug Aplikasi
                </h2>
                <p className="text-xs text-slate-500">
                  Laporan kendala teknis dari siswa dan warga sekolah (error/bug, kendala login, fitur bermasalah, dan usulan fitur). Ditangani langsung oleh tim Support TAMVESTA.
                </p>
              </div>

              <button
                type="button"
                onClick={loadAllData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Segarkan Tiket
              </button>
            </div>

            {/* List of Support Tickets */}
            <div className="space-y-4">
              {supportReports.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Belum ada tiket laporan kendala sistem.
                </div>
              ) : (
                supportReports.map((report) => {
                  const isResponding = respondingSupportId === report.id;
                  return (
                    <div
                      key={report.id}
                      className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                            {report.reportType === 'error_bug' ? 'Error / Bug Sistem' :
                             report.reportType === 'tidak_bisa_login' ? 'Tidak Bisa Login' :
                             report.reportType === 'akun_bermasalah' ? 'Akun Bermasalah' :
                             report.reportType === 'fitur_tidak_berfungsi' ? 'Fitur Tidak Berfungsi' :
                             report.reportType === 'pengumuman_notifikasi' ? 'Pengumuman / Notifikasi' :
                             report.reportType === 'kendala_penggunaan' ? 'Kendala Penggunaan' :
                             report.reportType === 'saran_fitur' ? 'Saran Fitur Baru' : 'Laporan Lainnya'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              report.status === 'selesai'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : report.status === 'sedang_ditangani'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : report.status === 'ditolak'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {report.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(report.createdAt).toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{report.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">
                          {report.description}
                        </p>
                      </div>

                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-4 pt-1 border-t border-slate-100">
                        <span>Pelapor: <strong className="text-slate-700">{report.reporterName}</strong> (@{report.reporterUsername}) {report.reporterKelas ? `• Kelas ${report.reporterKelas}` : ''}</span>
                        {report.incidentTime && <span>Waktu Kejadian: <strong className="text-slate-700">{report.incidentTime}</strong></span>}
                      </div>

                      {/* Screenshot if available */}
                      {report.screenshotUrl && (
                        <div className="pt-2">
                          <p className="text-[10px] font-bold text-slate-500 mb-1">Bukti Tangkapan Layar:</p>
                          <img
                            src={report.screenshotUrl}
                            alt="Bukti Laporan"
                            onClick={() => setLightboxImage({ url: report.screenshotUrl!, title: report.title })}
                            className="max-h-40 rounded-xl border border-slate-200 object-cover cursor-pointer hover:opacity-90 transition"
                          />
                        </div>
                      )}

                      {/* Admin TU Response info */}
                      {report.adminResponse && (
                        <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-xs space-y-1">
                          <div className="font-bold text-amber-800 flex items-center justify-between">
                            <span>Tanggapan Administrasi (TU):</span>
                            <span className="text-[10px] text-amber-600 font-normal">
                              {new Date(report.adminResponse.respondedAt).toLocaleString('id-ID')}
                            </span>
                          </div>
                          <p className="text-amber-900">{report.adminResponse.message}</p>
                          <p className="text-[10px] text-amber-700 italic">Oleh: {report.adminResponse.respondedBy}</p>
                        </div>
                      )}

                      {/* Support Technical Response info */}
                      {report.supportResponse && (
                        <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200/60 text-xs space-y-1">
                          <div className="font-bold text-indigo-800 flex items-center justify-between">
                            <span>Tanggapan Teknis Support TAMVESTA:</span>
                            <span className="text-[10px] text-indigo-600 font-normal">
                              {new Date(report.supportResponse.respondedAt).toLocaleString('id-ID')}
                            </span>
                          </div>
                          <p className="text-indigo-900 whitespace-pre-wrap">{report.supportResponse.technicalNotes}</p>
                          <p className="text-[10px] text-indigo-700 italic">Oleh: {report.supportResponse.respondedBy}</p>
                        </div>
                      )}

                      {/* Form Response Action */}
                      <div className="pt-2">
                        {isResponding ? (
                          <div className="p-4 bg-white rounded-2xl border-2 border-indigo-200 space-y-3">
                            <h5 className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                              <Wrench className="w-3.5 h-3.5" /> Berikan Tanggapan Teknis Support TAMVESTA
                            </h5>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Update Status Tiket:
                              </label>
                              <select
                                value={supportTicketStatus}
                                onChange={(e) => setSupportTicketStatus(e.target.value as AppReportStatus)}
                                className="w-full text-xs p-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="sedang_ditangani">Sedang Ditangani / Dalam Pengerjaan</option>
                                <option value="selesai">Selesai Diperbaiki / Teratasi</option>
                                <option value="menunggu_informasi">Menunggu Informasi Tambahan</option>
                                <option value="ditolak">Tolak / Bukan Bug Sistem</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Catatan Teknis / Penyelesaian Masalah:
                              </label>
                              <textarea
                                value={supportTechnicalNote}
                                onChange={(e) => setSupportTechnicalNote(e.target.value)}
                                rows={3}
                                placeholder="Jelaskan langkah perbaikan teknis atau instruksi bagi pengguna..."
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setRespondingSupportId(null);
                                  setSupportTechnicalNote('');
                                }}
                                disabled={supportProcessing}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRespondSupport(report.id)}
                                disabled={supportProcessing}
                                className="px-4 py-1.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
                              >
                                {supportProcessing ? 'Menyimpan...' : 'Kirim Tanggapan Support'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setRespondingSupportId(report.id);
                              setSupportTechnicalNote(report.supportResponse?.technicalNotes || '');
                              setSupportTicketStatus(report.status === 'laporan_diterima' ? 'sedang_ditangani' : report.status);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            {report.supportResponse ? 'Perbarui Tanggapan Teknis' : 'Tanggapi / Tangani Tiket'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: SIARAN NOTIFIKASI SEKOLAH */}
      {activeTab === 'notifications' && (
        <NotificationBroadcastPanel userRole="admin" userName="Administrator" />
      )}
        </div>
      </div>

      {/* MODAL: RESET PASSWORD SISWA */}
      {resettingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Reset Password: {resettingStudent.name}
            </h3>
            <p className="text-xs text-slate-500">
              Siswa akan diwajibkan mengganti password baru ini saat login kembali.
            </p>

            {resetSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold">
                {resetSuccess}
              </div>
            )}
            {resetError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Baru Siswa (Min. 3 Karakter)
                </label>
                <input
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  required
                  minLength={3}
                  placeholder="Masukkan password reset"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResettingStudent(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT DATA SISWA */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900">Edit Profil Siswa</h3>
              <p className="text-xs text-slate-500">Perbarui identitas akun siswa terdaftar</p>
            </div>

            <form onSubmit={handleSaveEditStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  value={editFormName}
                  onChange={(e) => setEditFormName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={editFormGender}
                    onChange={(e) => setEditFormGender(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas Siswa</label>
                  <select
                    value={editFormKelas}
                    onChange={(e) => setEditFormKelas(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    {Array.from(
                      new Set([
                        'Kelas 1',
                        'Kelas 2',
                        'Kelas 3',
                        'Kelas 4',
                        'Kelas 5',
                        'Kelas 6',
                        'Kelas 7',
                        'Kelas 8',
                        'Kelas 9',
                        ...schoolClasses.map((c) => c.name),
                        ...(editFormKelas ? [editFormKelas] : []),
                      ])
                    ).map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username Akun *</label>
                <input
                  type="text"
                  value={editFormUsername}
                  onChange={(e) => setEditFormUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password Baru (Opsional)</label>
                  <input
                    type="text"
                    value={editFormPassword}
                    onChange={(e) => setEditFormPassword(e.target.value)}
                    placeholder="Kosongkan jika tetap"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Login Akun</label>
                  <select
                    value={editFormActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditFormActive(e.target.value === 'active')}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="active">Aktif (Boleh Login)</option>
                    <option value="inactive">Nonaktif (Akses Dicabut)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editStudentLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs"
                >
                  {editStudentLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT KONTAK SISWA */}
      {editingContactStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>Edit Kontak Siswa</span>
                </h3>
                <p className="text-xs text-slate-500">Perbarui nomor WhatsApp dan email untuk {editingContactStudent.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingContactStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditContact} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-slate-200 shrink-0">
                  <img
                    src={editingContactStudent.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(editingContactStudent.name)}&backgroundColor=0284c7`}
                    alt={editingContactStudent.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 truncate">{editingContactStudent.name}</h4>
                  <p className="text-[11px] text-slate-500 font-mono">@{editingContactStudent.username} • {editingContactStudent.kelas || 'Belum ada kelas'}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor WhatsApp / HP
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={editContactPhone}
                    onChange={(e) => setEditContactPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Gunakan format 08... atau 62...</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alamat Gmail / Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={editContactEmail}
                    onChange={(e) => setEditContactEmail(e.target.value)}
                    placeholder="Contoh: siswa@gmail.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingContactStudent(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingContact}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition disabled:opacity-50"
                >
                  {savingContact ? 'Menyimpan...' : 'Simpan Kontak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS AKUN SISWA */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-black text-base text-slate-900">Konfirmasi Penghapusan Permanen</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus data ini secara permanen? Akun <strong>{deletingStudent.name}</strong> (@{deletingStudent.username}) akan dihapus dari database utama.
              </p>
              <p className="text-[11px] text-rose-600 font-semibold mt-1">
                Akun ini tidak dapat digunakan untuk login lagi setelah dihapus.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                disabled={deleteLoading}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition disabled:opacity-50"
              >
                {deleteLoading ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TOLAK TIKET DENGAN ALASAN */}
      {rejectingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-black text-base text-slate-900">Tolak Pengajuan Ganti Sandi</h3>
            <p className="text-xs text-slate-600">
              Siswa: <strong>{rejectingTicket.name}</strong> (@{rejectingTicket.username})
            </p>

            <form onSubmit={handleRejectTicket} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Penolakan Tiket *
                </label>
                <textarea
                  rows={3}
                  value={rejectReasonText}
                  onChange={(e) => setRejectReasonText(e.target.value)}
                  required
                  placeholder="Contoh: Identitas pengajuan tidak sesuai / Silakan hubungi bagian TU sekolah..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingTicket(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={ticketProcessing || !rejectReasonText.trim()}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {ticketProcessing ? 'Memproses...' : 'Konfirmasi Tolak Tiket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL TIKET */}
      {ticketDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">Rincian Tiket Sandi</h3>
                <p className="text-xs font-mono text-emerald-800">{ticketDetailModal.ticketNumber || ticketDetailModal.id}</p>
              </div>
              <button
                onClick={() => setTicketDetailModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p><strong>Nama Siswa:</strong> {ticketDetailModal.name}</p>
                <p><strong>Username:</strong> @{ticketDetailModal.username}</p>
                <p><strong>Kelas:</strong> {ticketDetailModal.kelas || '-'}</p>
                <p><strong>Waktu Diajukan:</strong> {new Date(ticketDetailModal.createdAt).toLocaleString('id-ID')}</p>
                <p><strong>Alasan Pengajuan:</strong> {ticketDetailModal.reason || '-'}</p>
                <p>
                  <strong>Status Tiket:</strong>{' '}
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                    ticketDetailModal.status === 'approved' || (ticketDetailModal.status as string) === 'acc'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : ticketDetailModal.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {ticketDetailModal.status === 'approved' || (ticketDetailModal.status as string) === 'acc'
                      ? 'Telah Disetujui'
                      : ticketDetailModal.status === 'rejected'
                      ? 'Ditolak'
                      : 'Menunggu Persetujuan'}
                  </span>
                </p>
                {ticketDetailModal.processedAt && (
                  <p><strong>Diproses Pada:</strong> {new Date(ticketDetailModal.processedAt).toLocaleString('id-ID')} oleh {ticketDetailModal.processedBy}</p>
                )}
                {ticketDetailModal.adminNote && (
                  <p><strong>Catatan Admin:</strong> {ticketDetailModal.adminNote}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setTicketDetailModal(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW STUDENT QR CODE */}
      {previewQrStudent && (
        <StudentProfileModal
          user={previewQrStudent}
          isOpen={true}
          onClose={() => setPreviewQrStudent(null)}
        />
      )}

      {/* MODAL: TAMBAH / EDIT MATA PELAJARAN */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
            </h3>
            <form onSubmit={handleSaveSubject} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  required
                  placeholder="Contoh: Fisika Terapan"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Mapel</label>
                  <input
                    type="text"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    required
                    placeholder="Contoh: FIS-01"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Guru Pengampu</label>
                  <input
                    type="text"
                    value={subjectForm.teacherName}
                    onChange={(e) => setSubjectForm({ ...subjectForm, teacherName: e.target.value })}
                    placeholder="Nama Guru"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Foto / Gambar Mapel</label>
                <div className="flex flex-col sm:flex-row items-center gap-2 mb-2">
                  <input
                    type="url"
                    value={subjectForm.imageUrl}
                    onChange={(e) => setSubjectForm({ ...subjectForm, imageUrl: e.target.value })}
                    placeholder="URL gambar (https://...)"
                    className="flex-1 w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 whitespace-nowrap transition">
                    <span>Unggah File</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFileUpload(e, (url) => setSubjectForm({ ...subjectForm, imageUrl: url }))}
                    />
                  </label>
                </div>
                {subjectForm.imageUrl && (
                  <div
                    className="h-28 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative mb-1 cursor-zoom-in group"
                    onClick={() =>
                      setLightboxImage({
                        url: subjectForm.imageUrl,
                        title: subjectForm.name || 'Pratinjau Foto Mapel',
                      })
                    }
                    title="Klik untuk memperbesar pratinjau"
                  >
                    <img src={subjectForm.imageUrl} alt="Pratinjau Mapel" className="w-full h-full object-cover group-hover:scale-105 transition" />
                    <span className="absolute bottom-1 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 shadow">
                      <Maximize2 className="w-3 h-3 text-emerald-400" />
                      <span>Klik untuk perbesar</span>
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Mapel</label>
                <textarea
                  rows={2}
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Mata Pelajaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT DIGITAL BOOK */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {editingBook ? 'Edit Buku Digital' : 'Tambah Buku Digital Baru'}
            </h3>
            <form onSubmit={handleSaveBook} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Buku</label>
                <input
                  type="text"
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  required
                  placeholder="Judul Buku"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Penulis</label>
                  <input
                    type="text"
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    required
                    placeholder="Nama Penulis"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                    placeholder="Sains, Sastra, dsb."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sampul Buku Digital</label>
                <div className="flex flex-col sm:flex-row items-center gap-2 mb-2">
                  <input
                    type="url"
                    value={bookForm.coverUrl}
                    onChange={(e) => setBookForm({ ...bookForm, coverUrl: e.target.value })}
                    placeholder="URL sampul (https://...)"
                    className="flex-1 w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 whitespace-nowrap transition">
                    <span>Unggah Sampul</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFileUpload(e, (url) => setBookForm({ ...bookForm, coverUrl: url }))}
                    />
                  </label>
                </div>
                {bookForm.coverUrl && (
                  <div className="h-28 w-24 mx-auto rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative mb-1">
                    <img src={bookForm.coverUrl} alt="Pratinjau Sampul" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Buku</label>
                <textarea
                  rows={2}
                  value={bookForm.description}
                  onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Buku
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT PENGUMUMAN */}
      {showAnnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {editingAnn ? 'Edit Pengumuman' : 'Buat Pengumuman Sekolah'}
            </h3>
            <form onSubmit={handleSaveAnn} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Pengumuman</label>
                <input
                  type="text"
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  required
                  placeholder="Judul Pengumuman"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                <select
                  value={annForm.category}
                  onChange={(e) => setAnnForm({ ...annForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="Penting">Penting</option>
                  <option value="Akademik">Akademik</option>
                  <option value="Kegiatan">Kegiatan</option>
                  <option value="Umum">Umum</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Isi Pengumuman</label>
                <textarea
                  rows={4}
                  value={annForm.content}
                  onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                  required
                  placeholder="Tuliskan isi pengumuman secara rinci..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAnnModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Terbitkan Pengumuman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH EVENT ABSENSI BARU */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Buat Kegiatan / Sesi Absensi Baru
            </h3>
            <form onSubmit={handleSaveEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kegiatan *</label>
                <input
                  type="text"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  required
                  placeholder="Contoh: Rapat OSIS Perdana 2026"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Event Sekolah">Event Sekolah</option>
                    <option value="Kegiatan OSIS">Kegiatan OSIS</option>
                    <option value="Rapat OSIS">Rapat OSIS</option>
                    <option value="Lomba Sekolah">Lomba Sekolah</option>
                    <option value="Kegiatan Khusus Siswa">Kegiatan Khusus Siswa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={eventForm.eventDate}
                    onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder="Lokasi kegiatan"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Uraian agenda kegiatan..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Buat Kegiatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH QUIZ BARU */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Buat Quiz Baru</h3>
            <form onSubmit={handleSaveQuiz} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Quiz</label>
                <input
                  type="text"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  required
                  placeholder="Judul Quiz"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  value={quizForm.subjectName}
                  onChange={(e) => setQuizForm({ ...quizForm, subjectName: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    value={quizForm.durationMinutes}
                    onChange={(e) => setQuizForm({ ...quizForm, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nilai KKM</label>
                  <input
                    type="number"
                    value={quizForm.passingScore}
                    onChange={(e) => setQuizForm({ ...quizForm, passingScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  value={quizForm.description}
                  onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Dynamic Questions Builder */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Daftar Butir Soal Quiz ({quizForm.questions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={addQuizQuestion}
                    className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Soal</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {quizForm.questions.map((q, qIndex) => (
                    <div key={q.id || qIndex} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">
                          Soal Nomor {qIndex + 1}
                        </span>
                        {quizForm.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuizQuestion(qIndex)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="Hapus butir soal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => {
                          const updated = [...quizForm.questions];
                          updated[qIndex].question = e.target.value;
                          setQuizForm({ ...quizForm, questions: updated });
                        }}
                        required
                        placeholder={`Ketik pertanyaan nomor ${qIndex + 1}...`}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                      />

                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] text-slate-500 font-bold">
                          Opsi Pilihan (Pilih tombol bulat di kiri untuk Kunci Jawaban Benar):
                        </p>
                        {q.options.map((opt, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct_${qIndex}`}
                              checked={q.correctOptionIndex === oIndex}
                              onChange={() => {
                                const updated = [...quizForm.questions];
                                updated[qIndex].correctOptionIndex = oIndex;
                                setQuizForm({ ...quizForm, questions: updated });
                              }}
                              className="text-emerald-600 focus:ring-emerald-500"
                              title="Tandai sebagai kunci jawaban benar"
                            />
                            <span className="font-bold text-slate-600 w-4">
                              {String.fromCharCode(65 + oIndex)}.
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const updated = [...quizForm.questions];
                                updated[qIndex].options[oIndex] = e.target.value;
                                setQuizForm({ ...quizForm, questions: updated });
                              }}
                              required
                              placeholder={`Pilihan ${String.fromCharCode(65 + oIndex)}`}
                              className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Pembahasan / Penjelasan Jawaban (Opsional)
                        </label>
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={(e) => {
                            const updated = [...quizForm.questions];
                            updated[qIndex].explanation = e.target.value;
                            setQuizForm({ ...quizForm, questions: updated });
                          }}
                          placeholder="Penjelasan pembahasan materi..."
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peran / Hak Akses</label>
                  <select
                    value={editTeacherForm.role}
                    onChange={(e) => setEditTeacherForm({ ...editTeacherForm, role: e.target.value as UserRole })}
                    disabled={editingTeacher?.username === 'TAMANSISWA'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold disabled:opacity-60"
                  >
                    <option value="guru">Guru</option>
                    <option value="admin">Administrator</option>
                    <option value="tata_usaha">Tata Usaha</option>
                    <option value="kepala_sekolah">Kepala Sekolah</option>
                    <option value="satpam">Satpam</option>
                    <option value="panitia">Panitia</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Akun</label>
                  <select
                    value={editTeacherForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditTeacherForm({ ...editTeacherForm, isActive: e.target.value === 'active' })}
                    disabled={editingTeacher?.username === 'TAMANSISWA'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold disabled:opacity-60"
                  >
                    <option value="active">Aktif (Boleh Login)</option>
                    <option value="inactive">Dinonaktifkan (Akses Dicabut)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password Baru (Opsional, Min. 3 Karakter)</label>
                <input
                  type="password"
                  value={editTeacherForm.password}
                  onChange={(e) => setEditTeacherForm({ ...editTeacherForm, password: e.target.value })}
                  placeholder="Kosongkan jika tidak ingin mengganti password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuizModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Quiz & Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ===================== MODAL: TAMBAH AKUN GURU ===================== */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Tambah Akun Guru Baru</h3>
                <p className="text-xs text-slate-500">
                  Buat akun pendidik resmi dengan generator username & sandi otomatis
                </p>
              </div>
              <button
                onClick={() => setShowAddTeacherModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Peran / Hak Akses Akun *</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => {
                    const r = e.target.value as any;
                    setNewStaffRole(r);
                    if (r === 'guru') setNewTeacherForm((prev) => ({ ...prev, jabatan: 'Guru Mata Pelajaran' }));
                    else if (r === 'admin') setNewTeacherForm((prev) => ({ ...prev, jabatan: 'Operator & Dapodik' }));
                    else if (r === 'tata_usaha') setNewTeacherForm((prev) => ({ ...prev, jabatan: 'Staf Tata Usaha' }));
                    else if (r === 'kepala_sekolah') setNewTeacherForm((prev) => ({ ...prev, jabatan: 'Kepala Sekolah' }));
                    else if (r === 'satpam') setNewTeacherForm((prev) => ({ ...prev, jabatan: 'Satpam Sekolah' }));
                    else if (r === 'panitia') setNewTeacherForm((prev) => ({ ...prev, jabatan: 'Panitia Kegiatan Sekolah' }));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="guru">Guru (Pendidik Resmi • Centang Hijau Otomatis)</option>
                  <option value="admin">Administrator / Operator Dapodik</option>
                  <option value="tata_usaha">Tata Usaha & Keuangan</option>
                  <option value="kepala_sekolah">Kepala Sekolah / Yayasan</option>
                  <option value="satpam">Satpam & Keamanan Sekolah</option>
                  <option value="panitia">Panitia Absensi & Event</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Guru / Staf *</label>
                <input
                  type="text"
                  required
                  value={newTeacherForm.name}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, name: e.target.value })}
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jabatan / Guru Mata Pelajaran *</label>
                <input
                  type="text"
                  required
                  value={newTeacherForm.jabatan}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, jabatan: e.target.value })}
                  placeholder="Contoh: Guru Matematika Wajib"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    Kredensial Login Sistem
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAutoGenerateTeacherCredentials(newTeacherForm.name, newTeacherForm.jabatan)}
                    className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Generate Otomatis</span>
                  </button>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username Guru *</label>
                  <input
                    type="text"
                    required
                    value={newTeacherForm.username}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, username: e.target.value.toLowerCase() })}
                    placeholder="guru.budi"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-emerald-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Password Awal (Min. 3 Karakter) *</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={newTeacherForm.password}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, password: e.target.value })}
                    placeholder="Password awal (boleh sama dgn username)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email / Gmail (Opsional)</label>
                  <input
                    type="email"
                    value={newTeacherForm.email}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, email: e.target.value })}
                    placeholder="guru@gmail.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. WhatsApp (Opsional)</label>
                  <input
                    type="tel"
                    value={newTeacherForm.phone}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, phone: e.target.value })}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peran / Hak Akses</label>
                  <select
                    value={editTeacherForm.role}
                    onChange={(e) => setEditTeacherForm({ ...editTeacherForm, role: e.target.value as UserRole })}
                    disabled={editingTeacher?.username === 'TAMANSISWA'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold disabled:opacity-60"
                  >
                    <option value="guru">Guru</option>
                    <option value="admin">Administrator</option>
                    <option value="tata_usaha">Tata Usaha</option>
                    <option value="kepala_sekolah">Kepala Sekolah</option>
                    <option value="satpam">Satpam</option>
                    <option value="panitia">Panitia</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Akun</label>
                  <select
                    value={editTeacherForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditTeacherForm({ ...editTeacherForm, isActive: e.target.value === 'active' })}
                    disabled={editingTeacher?.username === 'TAMANSISWA'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold disabled:opacity-60"
                  >
                    <option value="active">Aktif (Boleh Login)</option>
                    <option value="inactive">Dinonaktifkan (Akses Dicabut)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password Baru (Opsional, Min. 3 Karakter)</label>
                <input
                  type="password"
                  value={editTeacherForm.password}
                  onChange={(e) => setEditTeacherForm({ ...editTeacherForm, password: e.target.value })}
                  placeholder="Kosongkan jika tidak ingin mengganti password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingTeacherLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {creatingTeacherLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{creatingTeacherLoading ? 'Menyimpan...' : 'Simpan & Buat Akun'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: EDIT AKUN GURU ===================== */}
      {showEditTeacherModal && editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Edit Akun Guru</h3>
                <p className="text-xs text-slate-500">
                  Perbarui profil dan kontak guru: <strong>@{editingTeacher.username}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowEditTeacherModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTeacher} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Guru *</label>
                <input
                  type="text"
                  required
                  value={editTeacherForm.name}
                  onChange={(e) => setEditTeacherForm({ ...editTeacherForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jabatan / Guru Mata Pelajaran *</label>
                <input
                  type="text"
                  required
                  value={editTeacherForm.jabatan}
                  onChange={(e) => setEditTeacherForm({ ...editTeacherForm, jabatan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email / Gmail</label>
                  <input
                    type="email"
                    value={editTeacherForm.email}
                    onChange={(e) => setEditTeacherForm({ ...editTeacherForm, email: e.target.value })}
                    placeholder="guru@gmail.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. Telepon / WhatsApp</label>
                  <input
                    type="tel"
                    value={editTeacherForm.phone}
                    onChange={(e) => setEditTeacherForm({ ...editTeacherForm, phone: e.target.value })}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peran / Hak Akses</label>
                  <select
                    value={editTeacherForm.role}
                    onChange={(e) => setEditTeacherForm({ ...editTeacherForm, role: e.target.value as UserRole })}
                    disabled={editingTeacher?.username === 'TAMANSISWA'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold disabled:opacity-60"
                  >
                    <option value="guru">Guru</option>
                    <option value="admin">Administrator</option>
                    <option value="tata_usaha">Tata Usaha</option>
                    <option value="kepala_sekolah">Kepala Sekolah</option>
                    <option value="satpam">Satpam</option>
                    <option value="panitia">Panitia</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Akun</label>
                  <select
                    value={editTeacherForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditTeacherForm({ ...editTeacherForm, isActive: e.target.value === 'active' })}
                    disabled={editingTeacher?.username === 'TAMANSISWA'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold disabled:opacity-60"
                  >
                    <option value="active">Aktif (Boleh Login)</option>
                    <option value="inactive">Dinonaktifkan (Akses Dicabut)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password Baru (Opsional, Min. 3 Karakter)</label>
                <input
                  type="password"
                  value={editTeacherForm.password}
                  onChange={(e) => setEditTeacherForm({ ...editTeacherForm, password: e.target.value })}
                  placeholder="Kosongkan jika tidak ingin mengganti password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditTeacherModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: BACKUP ABSENSI EXCEL (.XLSX) ===================== */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                  <span>Backup Absensi Siswa (.xlsx)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Unduh data kehadiran siswa dalam format resmi spreadsheet Microsoft Excel
                </p>
              </div>
              <button
                onClick={() => setShowBackupModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Privacy Compliance Notice */}
            <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-[11px] text-teal-900 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Ketentuan Privasi Ekspor Data</strong>
                <span>
                  Sesuai ketentuan, kolom <strong>Username</strong> dan <strong>ID Siswa</strong> dihilangkan dari file Excel tanpa menghapus data tersebut dari database.
                </span>
              </div>
            </div>

            {backupSuccessMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{backupSuccessMessage}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dari Tanggal</label>
                  <input
                    type="date"
                    value={backupStartDate}
                    onChange={(e) => setBackupStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={backupEndDate}
                    onChange={(e) => setBackupEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Filter Kelas</label>
                  <select
                    value={backupKelas}
                    onChange={(e) => setBackupKelas(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="semua">Semua Kelas</option>
                    <option value="X TKJ 1">X TKJ 1</option>
                    <option value="X TKJ 2">X TKJ 2</option>
                    <option value="X RPL 1">X RPL 1</option>
                    <option value="X RPL 2">X RPL 2</option>
                    <option value="XI TKJ 1">XI TKJ 1</option>
                    <option value="XI TKJ 2">XI TKJ 2</option>
                    <option value="XI RPL 1">XI RPL 1</option>
                    <option value="XI RPL 2">XI RPL 2</option>
                    <option value="XII TKJ 1">XII TKJ 1</option>
                    <option value="XII TKJ 2">XII TKJ 2</option>
                    <option value="XII RPL 1">XII RPL 1</option>
                    <option value="XII RPL 2">XII RPL 2</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Kehadiran</label>
                  <select
                    value={backupStatusFilter}
                    onChange={(e) => setBackupStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="semua">Semua Status</option>
                    <option value="hadir">Hadir Saja</option>
                    <option value="izin">Izin Saja</option>
                    <option value="sakit">Sakit Saja</option>
                    <option value="alpa">Alpa Saja</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pencarian Nama Siswa (Opsional)</label>
                <input
                  type="text"
                  value={backupStudentSearch}
                  onChange={(e) => setBackupStudentSearch(e.target.value)}
                  placeholder="Ketik nama siswa tertentu atau kosongkan untuk semua"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peran / Hak Akses</label>
                  <select
                    value={editTeacherForm.role}
                    onChange={(e) => setEditTeacherForm({ ...editTeacherForm, role: e.target.value as UserRole })}
                    disabled={editingTeacher?.username === 'TAMANSISWA'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold disabled:opacity-60"
                  >
                    <option value="guru">Guru</option>
                    <option value="admin">Administrator</option>
                    <option value="tata_usaha">Tata Usaha</option>
                    <option value="kepala_sekolah">Kepala Sekolah</option>
                    <option value="satpam">Satpam</option>
                    <option value="panitia">Panitia</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Akun</label>
                  <select
                    value={editTeacherForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditTeacherForm({ ...editTeacherForm, isActive: e.target.value === 'active' })}
                    disabled={editingTeacher?.username === 'TAMANSISWA'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold disabled:opacity-60"
                  >
                    <option value="active">Aktif (Boleh Login)</option>
                    <option value="inactive">Dinonaktifkan (Akses Dicabut)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password Baru (Opsional, Min. 3 Karakter)</label>
                <input
                  type="password"
                  value={editTeacherForm.password}
                  onChange={(e) => setEditTeacherForm({ ...editTeacherForm, password: e.target.value })}
                  placeholder="Kosongkan jika tidak ingin mengganti password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBackupModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={backupExporting}
                  onClick={handleExportExcel}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>{backupExporting ? 'Mengekspor...' : 'Unduh File Excel (.xlsx)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS KUIS PERMANEN */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-inner">
              <Trash2 className="w-8 h-8 text-rose-600" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                Konfirmasi Penghapusan Permanen
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus data ini secara permanen? Kuis <strong className="text-slate-800">&quot;{quizToDelete.title}&quot;</strong> beserta riwayat nilainya akan hilang selamanya dari seluruh perangkat.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setQuizToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => confirmExecuteDeleteQuiz(quizToDelete.id)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/25 transition active:scale-95"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Penghapusan Permanen Umum */}
      <ConfirmDeleteModal
        isOpen={Boolean(pendingDeleteModal)}
        title={pendingDeleteModal?.title || 'Konfirmasi Penghapusan Permanen'}
        itemName={pendingDeleteModal?.itemName}
        message={pendingDeleteModal?.message || 'Apakah Anda yakin ingin menghapus data ini secara permanen?'}
        confirmLabel="Hapus Permanen"
        cancelLabel="Batal"
        loading={confirmDeleteLoading}
        onCancel={() => {
          if (!confirmDeleteLoading) setPendingDeleteModal(null);
        }}
        onConfirm={async () => {
          if (!pendingDeleteModal) return;
          setConfirmDeleteLoading(true);
          try {
            await pendingDeleteModal.onExecute();
            setPendingDeleteModal(null);
          } catch (err: any) {
            showError('Gagal Menghapus Data', err?.message || 'Penghapusan gagal diproses oleh server.');
          } finally {
            setConfirmDeleteLoading(false);
          }
        }}
      />

      {/* Drawer / Modal Notifikasi Khusus Admin Portal Dashboard */}
      {showAdminNotifDrawer && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setShowAdminNotifDrawer(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">Notifikasi Khusus Admin Dashboard</h3>
                  <p className="text-[11px] text-slate-300">
                    Aktivitas penambahan, perubahan & penghapusan akun oleh Admin lain secara real-time
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminNotifDrawer(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-600">
                Total: {adminNotifications.length} notifikasi ({adminNotifications.filter((n) => !n.isRead).length} belum dibaca)
              </span>
              {adminNotifications.some((n) => !n.isRead) && (
                <button
                  type="button"
                  onClick={handleMarkAllAdminNotifsRead}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Tandai Semua Dibaca</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
              {adminNotifications.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Bell className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Belum ada notifikasi aktivitas Admin</p>
                  <p className="text-[11px]">
                    Notifikasi akan muncul otomatis tanpa refresh saat Admin di perangkat lain menambahkan atau mengelola akun.
                  </p>
                </div>
              ) : (
                adminNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.isRead && handleMarkAdminNotifRead(notif.id)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                      !notif.isRead
                        ? 'bg-emerald-50/75 border-emerald-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900">{notif.title}</h4>
                        {!notif.isRead && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-600 text-white">
                            BARU
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 mt-1 leading-relaxed">{notif.message}</p>
                      <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                        {notif.statusLabel && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-lg">
                            {notif.statusLabel}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {new Date(notif.createdAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pembesar Foto (Image Lightbox Modal) */}
      <ImageLightboxModal
        imageUrl={lightboxImage ? lightboxImage.url : null}
        title={lightboxImage ? lightboxImage.title : undefined}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
};
