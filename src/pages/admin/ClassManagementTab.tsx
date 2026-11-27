import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import type { SchoolClass, User } from '../../types/index.ts';

interface ClassManagementTabProps {
  classes: SchoolClass[];
  teachers: User[];
  students: User[];
  onSaveClass: (data: Partial<SchoolClass> & { name: string; grade: string }) => Promise<void>;
  onDeleteClass: (classId: string) => Promise<void>;
  onRefresh: () => void;
}

export const ClassManagementTab: React.FC<ClassManagementTabProps> = ({
  classes,
  teachers,
  students,
  onSaveClass,
  onDeleteClass,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'all' | '7' | '8' | '9'>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [form, setForm] = useState<{
    name: string;
    grade: '7' | '8' | '9';
    academicYear: string;
    homeroomTeacher: string;
    description: string;
  }>({
    name: '',
    grade: '7',
    academicYear: '2026/2027',
    homeroomTeacher: '',
    description: '',
  });

  // View Class Students State
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<SchoolClass | null>(null);

  // Delete Confirmation State
  const [classToDelete, setClassToDelete] = useState<SchoolClass | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered Classes
  const filteredClasses = classes.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.homeroomTeacherName && c.homeroomTeacherName.toLowerCase().includes(search.toLowerCase()));
    const matchesGrade = gradeFilter === 'all' || c.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  const handleOpenAdd = () => {
    setEditingClass(null);
    setForm({
      name: '',
      grade: '7',
      academicYear: '2026/2027',
      homeroomTeacher: '',
      description: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (cls: SchoolClass) => {
    setEditingClass(cls);
    const validGrade = cls.grade === '7' || cls.grade === '8' || cls.grade === '9' ? cls.grade : '7';
    setForm({
      name: cls.name,
      grade: validGrade,
      academicYear: cls.academicYear || '2026/2027',
      homeroomTeacher: cls.homeroomTeacherName || '',
      description: cls.description || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Nama kelas wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const matchedTeacher = teachers.find((t) => t.name === form.homeroomTeacher.trim());
      await onSaveClass({
        ...(editingClass ? { id: editingClass.id } : {}),
        name: form.name.trim(),
        grade: form.grade,
        academicYear: form.academicYear.trim() || '2026/2027',
        homeroomTeacherId: matchedTeacher?.id,
        homeroomTeacherName: form.homeroomTeacher.trim(),
        description: form.description.trim(),
      });
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan kelas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!classToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteClass(classToDelete.id);
      setClassToDelete(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus kelas');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-xs font-bold text-purple-700 border border-purple-200 mb-2">
            <Layers className="w-4 h-4" />
            <span>MANAJEMEN KELAS & ROMBEL SEKOLAH</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Daftar Kelas & Rombongan Belajar
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Kelola kelas tingkat 7, 8, dan 9, tetapkan wali kelas resmi, serta pantau siswa yang terdaftar pada masing-masing rombel.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kelas Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setGradeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              gradeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({classes.length})
          </button>
          <button
            onClick={() => setGradeFilter('7')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              gradeFilter === '7'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            Kelas 7 ({classes.filter((c) => c.grade === '7').length})
          </button>
          <button
            onClick={() => setGradeFilter('8')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              gradeFilter === '8'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
            }`}
          >
            Kelas 8 ({classes.filter((c) => c.grade === '8').length})
          </button>
          <button
            onClick={() => setGradeFilter('9')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              gradeFilter === '9'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
            }`}
          >
            Kelas 9 ({classes.filter((c) => c.grade === '9').length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kelas, wali kelas..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
            <Layers className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">Tidak ada kelas yang ditemukan.</p>
            <p className="text-xs text-slate-400">Tambahkan kelas baru atau sesuaikan filter pencarian.</p>
          </div>
        ) : (
          filteredClasses.map((cls) => {
            const classStudents = students.filter(
              (s) => s.kelas === cls.name || s.kelas?.toLowerCase() === cls.name.toLowerCase()
            );

            return (
              <div
                key={cls.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-sm">
                        {cls.grade}
                      </span>
                      <div>
                        <h3 className="font-black text-slate-900 text-base">{cls.name}</h3>
                        <span className="text-[10px] text-slate-400 font-medium">Tingkat {cls.grade} • {cls.academicYear || '2026/2027'}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      Aktif
                    </span>
                  </div>

                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-medium">Wali Kelas:</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                        {cls.homeroomTeacherName || 'Belum Ditentukan'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-medium">Jumlah Siswa:</span>
                      <button
                        onClick={() => setSelectedClassForStudents(cls)}
                        className="font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{classStudents.length} Siswa (Lihat)</span>
                      </button>
                    </div>

                    {cls.description && (
                      <p className="text-[11px] text-slate-500 italic mt-1">{cls.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEdit(cls)}
                    className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                    title="Edit Kelas"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setClassToDelete(cls)}
                    className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="Hapus Kelas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: TAMBAH / EDIT KELAS */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                <span>{editingClass ? 'Edit Data Kelas' : 'Tambah Rombel Kelas Baru'}</span>
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
                <label className="block font-bold text-slate-700 mb-1">Nama Kelas / Rombel *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: VII A, VIII B, IX C"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tingkat Kelas *</label>
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">Wali Kelas</label>
                <select
                  value={form.homeroomTeacher}
                  onChange={(e) => setForm({ ...form, homeroomTeacher: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                >
                  <option value="">Pilih Wali Kelas (Guru Resmi)</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan / Ruangan (Opsional)</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Contoh: Gedung Timur Lantai 2"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
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
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DAFTAR SISWA KELAS */}
      {selectedClassForStudents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span>Daftar Siswa {selectedClassForStudents.name}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Wali Kelas: {selectedClassForStudents.homeroomTeacherName || '-'}
                </p>
              </div>
              <button
                onClick={() => setSelectedClassForStudents(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {students.filter(
                (s) =>
                  s.kelas === selectedClassForStudents.name ||
                  s.kelas?.toLowerCase() === selectedClassForStudents.name.toLowerCase()
              ).length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">
                  Belum ada siswa yang terdaftar di kelas ini.
                </p>
              ) : (
                students
                  .filter(
                    (s) =>
                      s.kelas === selectedClassForStudents.name ||
                      s.kelas?.toLowerCase() === selectedClassForStudents.name.toLowerCase()
                  )
                  .map((stu, i) => (
                    <div
                      key={stu.id}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                          {i + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 block">{stu.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">@{stu.username} • {stu.gender || 'Laki-laki'}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-600 border border-slate-200">
                        {stu.nisn ? `NISN: ${stu.nisn}` : 'Aktif'}
                      </span>
                    </div>
                  ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedClassForStudents(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS KELAS */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-900 text-base">Hapus Kelas Ini?</h3>
            <p className="text-xs text-slate-500">
              Apakah Anda yakin ingin menghapus kelas <strong>{classToDelete.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setClassToDelete(null)}
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
