import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  AlertCircle,
  Clock,
  BookOpen,
  School,
  Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import type { ClassSchedule } from '../types/index.ts';

interface StudentScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentScheduleModal: React.FC<StudentScheduleModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string>('7');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Auto-detect student's grade (7, 8, or 9) from user.kelas
  useEffect(() => {
    if (user?.kelas) {
      const k = user.kelas.toUpperCase();
      if (k.includes('9') || k.includes('IX')) setSelectedGrade('9');
      else if (k.includes('8') || k.includes('VIII')) setSelectedGrade('8');
      else if (k.includes('7') || k.includes('VII')) setSelectedGrade('7');
    }
  }, [user?.kelas]);

  useEffect(() => {
    const fetchSchedules = () => {
      api.getSchedules()
        .then((res) => {
          if (Array.isArray(res)) setSchedules(res.filter((s) => s.isPublished));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    if (isOpen) {
      setLoading(true);
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
      fetchSchedules();
      const onSync = (e: any) => {
        const entity = e?.detail?.entity;
        if (!entity || entity === 'schedules' || entity === 'system') {
          fetchSchedules();
        }
      };
      window.addEventListener('tamvesta_realtime_sync', onSync);
      return () => window.removeEventListener('tamvesta_realtime_sync', onSync);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSchedule = schedules.find((s) => {
    const sGrade = (s.grade || '').toString().toLowerCase();
    const targetGrade = selectedGrade.toLowerCase();
    const userClass = (user?.kelas || '').toLowerCase();
    return sGrade === targetGrade || sGrade === userClass || userClass.includes(sGrade);
  }) || schedules.find((s) => (s.grade || '').toString().includes(selectedGrade)) || schedules[0];

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.35, 4));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.35, 0.7);
      if (next <= 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Mouse / Touch Dragging for Panning Image when zoomed in
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPanPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 ${isFullscreen ? 'p-0' : ''}`}>
      <div className={`bg-slate-900 text-white w-full rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col ${
        isFullscreen ? 'h-full max-w-none rounded-none border-none' : 'max-w-4xl max-h-[92vh]'
      }`}>
        {/* Header Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base leading-tight truncate">
                  Jadwal Mata Pelajaran
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  Resmi Sekolah
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {user?.kelas ? `Kelas ${user.kelas}` : 'Tahun Ajaran 2026/2027'} • SMP Tamansiswa Batam
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5 text-amber-300" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Kontrol: Pilihan Tingkat Kelas & Kontrol Zoom */}
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs">
          {/* Pilihan Tingkat Kelas 7, 8, 9 */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-bold mr-1">Tingkat:</span>
            {['7', '8', '9'].map((gr) => (
              <button
                key={gr}
                type="button"
                onClick={() => {
                  setSelectedGrade(gr);
                  handleResetZoom();
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  selectedGrade === gr
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                Kelas {gr}
              </button>
            ))}
          </div>

          {/* Kontrol Zoom & Ukuran */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Zoom Out (Perkecil)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-[11px] font-mono font-bold text-emerald-400 select-none">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Zoom In (Perbesar)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer ml-1"
              title="Kembali ke Ukuran Asli"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Schedule Image Display Area */}
        <div
          className={`relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center p-2 sm:p-4 select-none ${
            zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-16 text-slate-400">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold animate-pulse">Memuat foto jadwal pelajaran resmi...</p>
            </div>
          ) : currentSchedule ? (
            <div
              className="transition-transform duration-75 ease-out max-w-full max-h-full flex items-center justify-center"
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                transformOrigin: 'center center',
              }}
            >
              <img
                src={currentSchedule.imageUrl}
                alt={currentSchedule.title || `Jadwal Pelajaran Kelas ${selectedGrade}`}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl pointer-events-none"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          ) : (
            <div className="py-16 px-4 text-center space-y-3 max-w-md mx-auto">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-300 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-white">Jadwal Kelas {selectedGrade} Belum Dipublikasikan</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Administrasi sekolah belum mempublikasikan foto jadwal untuk Kelas {selectedGrade}. Silakan periksa kembali berkala atau tanyakan pada wali kelas.
              </p>
            </div>
          )}
        </div>

        {/* Footer Info & Instructions */}
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span>Keterangan:</span>
            <span className="text-slate-200 font-semibold">{currentSchedule?.description || 'Jadwal Reguler Semester Aktif'}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">Gunakan Zoom In/Out untuk memperbesar tulisan jadwal</span>
          </div>
        </div>
      </div>
    </div>
  );
};
