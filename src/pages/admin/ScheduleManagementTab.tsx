import React, { useState, useRef } from 'react';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react';
import type { ClassSchedule } from '../../types/index.ts';

interface ScheduleManagementTabProps {
  schedules: ClassSchedule[];
  onSaveSchedule: (data: Partial<ClassSchedule> & { grade: string; academicYear: string; imageUrl: string; title?: string; description?: string; isPublished?: boolean }) => Promise<void>;
  onDeleteSchedule: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export const ScheduleManagementTab: React.FC<ScheduleManagementTabProps> = ({
  schedules,
  onSaveSchedule,
  onDeleteSchedule,
  onRefresh,
}) => {
  const [gradeFilter, setGradeFilter] = useState<'all' | '7' | '8' | '9'>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [form, setForm] = useState<{
    title: string;
    grade: '7' | '8' | '9';
    academicYear: string;
    imageUrl: string;
    description: string;
    isPublished: boolean;
  }>({
    title: '',
    grade: '7',
    academicYear: '2026/2027',
    imageUrl: '',
    description: '',
    isPublished: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<ClassSchedule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Lightbox Zoom Modal
  const [viewingSchedule, setViewingSchedule] = useState<ClassSchedule | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered schedules
  const filteredSchedules = schedules.filter(
    (s) => gradeFilter === 'all' || s.grade === gradeFilter
  );

  const handleOpenAdd = () => {
    setEditingSchedule(null);
    setForm({
      title: 'Jadwal Mata Pelajaran Kelas 7 - Semester Genap',
      grade: '7',
      academicYear: '2026/2027',
      imageUrl: '',
      description: 'Jadwal tatap muka resmi SMP Tamansiswa Batam Tahun Pelajaran 2026/2027.',
      isPublished: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (sch: ClassSchedule) => {
    setEditingSchedule(sch);
    const validGrade = sch.grade === '7' || sch.grade === '8' || sch.grade === '9' ? sch.grade : '7';
    setForm({
      title: sch.title || `Jadwal Pelajaran Kelas ${sch.grade}`,
      grade: validGrade,
      academicYear: sch.academicYear,
      imageUrl: sch.imageUrl,
      description: sch.description || '',
      isPublished: sch.isPublished,
    });
    setShowModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      alert('Format foto harus PNG, JPG, atau JPEG.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('Ukuran foto maksimal 8 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setForm((prev) => ({ ...prev, imageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.imageUrl) {
      alert('Foto jadwal mata pelajaran wajib diunggah.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveSchedule({
        ...(editingSchedule ? { id: editingSchedule.id } : {}),
        title: form.title.trim(),
        grade: form.grade,
        academicYear: form.academicYear.trim() || '2026/2027',
        imageUrl: form.imageUrl,
        description: form.description.trim(),
        isPublished: form.isPublished,
      });
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan jadwal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!scheduleToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteSchedule(scheduleToDelete.id);
      setScheduleToDelete(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus jadwal');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-xs font-bold text-emerald-700 border border-emerald-200 mb-2">
            <Calendar className="w-4 h-4" />
            <span>PORTAL ADMINISTRASI • JADWAL MATA PELAJARAN</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Jadwal Pelajaran Kelas 7, 8, dan 9
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Unggah dan publikasikan foto resolusi tinggi jadwal mata pelajaran. Siswa secara otomatis akan menerima foto jadwal sesuai kelasnya dan dapat memperbesar foto dengan fitur Zoom.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
        >
          <Upload className="w-4 h-4" />
          <span>Unggah Jadwal Baru</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setGradeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              gradeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Tingkat ({schedules.length})
          </button>
          <button
            onClick={() => setGradeFilter('7')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              gradeFilter === '7'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            Kelas 7 ({schedules.filter((s) => s.grade === '7').length})
          </button>
          <button
            onClick={() => setGradeFilter('8')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              gradeFilter === '8'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
            }`}
          >
            Kelas 8 ({schedules.filter((s) => s.grade === '8').length})
          </button>
          <button
            onClick={() => setGradeFilter('9')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              gradeFilter === '9'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
            }`}
          >
            Kelas 9 ({schedules.filter((s) => s.grade === '9').length})
          </button>
        </div>

        <div className="text-xs text-slate-500 font-bold hidden sm:block">
          Format: PNG, JPG, JPEG • Real-Time Sync
        </div>
      </div>

      {/* Schedules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSchedules.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
            <Calendar className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">Belum ada foto jadwal yang diunggah.</p>
            <p className="text-xs text-slate-400">Klik &quot;Unggah Jadwal Baru&quot; untuk membagikan foto jadwal pelajaran kepada siswa.</p>
          </div>
        ) : (
          filteredSchedules.map((sch) => (
            <div
              key={sch.id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* Photo Preview Thumbnail */}
                <div
                  onClick={() => {
                    setViewingSchedule(sch);
                    setZoomLevel(1);
                  }}
                  className="relative h-48 bg-slate-100 overflow-hidden group cursor-pointer"
                >
                  <img
                    src={sch.imageUrl}
                    alt={sch.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 text-white">
                    <ZoomIn className="w-6 h-6" />
                    <span className="text-xs font-bold">Klik untuk Memperbesar Foto</span>
                  </div>

                  {/* Badges on top of image */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-white/90 backdrop-blur-xs text-slate-800 shadow-sm">
                      Kelas {sch.grade}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-900/80 backdrop-blur-xs text-white">
                      {sch.academicYear}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    {sch.isPublished ? (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-500 text-white shadow-sm flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Dipublikasikan
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-slate-600 text-white shadow-sm flex items-center gap-1">
                        Draft
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-5 space-y-2">
                  <h3 className="font-black text-slate-900 text-sm leading-snug">{sch.title}</h3>
                  {sch.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{sch.description}</p>
                  )}
                  <span className="text-[10px] text-slate-400 block pt-1">
                    Diperbarui: {new Date(sch.updatedAt).toLocaleDateString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-5 pb-5 pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  onClick={() => {
                    setViewingSchedule(sch);
                    setZoomLevel(1);
                  }}
                  className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Full</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(sch)}
                    className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                    title="Edit & Ganti Foto"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setScheduleToDelete(sch)}
                    className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="Hapus Jadwal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: UNGGAH / EDIT JADWAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span>{editingSchedule ? 'Edit Jadwal Pelajaran' : 'Unggah Foto Jadwal Pelajaran'}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Jadwal *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Contoh: Jadwal Pelajaran Kelas 7 Semester Genap"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pilihan Tingkat Kelas *</label>
                  <select
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="7">Kelas 7</option>
                    <option value="8">Kelas 8</option>
                    <option value="9">Kelas 9</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tahun Ajaran *</label>
                  <input
                    type="text"
                    required
                    value={form.academicYear}
                    onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                    placeholder="2026/2027"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Photo Upload Area */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Foto Jadwal (Format: PNG, JPG, JPEG) *
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/jpg"
                  className="hidden"
                />

                {form.imageUrl ? (
                  <div className="space-y-2">
                    <div className="relative h-44 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                      <img src={form.imageUrl} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Ganti Foto Jadwal</span>
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50 hover:bg-emerald-50/40 space-y-2"
                  >
                    <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-700">Pilih Foto Jadwal dari Perangkat</p>
                    <p className="text-[11px] text-slate-400">Mendukung format PNG, JPG, JPEG hingga 8 MB</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Contoh: Berlaku mulai 5 Januari 2026"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Status Publikasi</span>
                  <span className="text-[10px] text-slate-500">
                    {form.isPublished ? 'Siswa dapat langsung melihat jadwal ini' : 'Disimpan sebagai draf internal'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan & Publikasikan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX: ZOOM IN / ZOOM OUT PREVIEW */}
      {viewingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="relative w-full h-full max-w-5xl flex flex-col justify-between">
            {/* Header Controls */}
            <div className="flex items-center justify-between text-white pb-3 border-b border-white/20">
              <div>
                <h3 className="font-black text-base">{viewingSchedule.title}</h3>
                <span className="text-xs text-white/70">
                  Kelas {viewingSchedule.grade} • {viewingSchedule.academicYear}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition cursor-pointer"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition cursor-pointer"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition cursor-pointer"
                  title="Reset Zoom (100%)"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewingSchedule(null)}
                  className="p-2 bg-rose-600 hover:bg-rose-700 rounded-xl text-white transition cursor-pointer ml-2"
                  title="Tutup Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo Viewport */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
              <img
                src={viewingSchedule.imageUrl}
                alt={viewingSchedule.title}
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-full max-w-full object-contain transition-transform duration-200 select-none shadow-2xl rounded-xl"
              />
            </div>

            {/* Footer indicator */}
            <div className="text-center text-xs text-white/60 pt-2 border-t border-white/20">
              Perbesaran: {Math.round(zoomLevel * 100)}% • Gunakan tombol kontrol di atas untuk Zoom In / Out
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS JADWAL */}
      {scheduleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-900 text-base">Hapus Jadwal Pelajaran?</h3>
            <p className="text-xs text-slate-500">
              Apakah Anda yakin ingin menghapus jadwal <strong>{scheduleToDelete.title}</strong>? Siswa tidak akan lagi dapat melihat foto jadwal ini.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setScheduleToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
