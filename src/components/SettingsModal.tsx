import React, { useState } from 'react';
import {
  X,
  Save,
  Key,
  Clock,
  School,
  CheckCircle2,
  Sliders,
  CalendarCheck,
  RefreshCw,
  Info,
  BookOpen,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Database,
  CloudCheck,
  Calendar,
  Sun,
  Moon,
  Palette,
  Sparkles,
  Coffee,
  Trash2,
  AlertTriangle,
  Presentation,
} from 'lucide-react';
import {
  applyThemeToDocument,
  getInitialTheme,
  getInitialPalette,
  Theme,
  ThemePalette,
  THEME_PALETTES,
  PGRI_LOGO_PHILOSOPHY,
} from '../utils/theme';
import { SchoolConfig, HariSekolah, JamMasukHarian, JamPulangHarian } from '../types/index.ts';
import { SchoolLogo } from './SchoolLogo';
import {
  MASTER_KELAS_LIST,
  DAFTAR_JURUSAN,
  DAFTAR_HARI,
  DEFAULT_JAM_MASUK_HARIAN,
  DEFAULT_JAM_PULANG_PER_KELAS,
  DEFAULT_JAM_PULANG_HARIAN_PER_KELAS,
} from '../utils/classConfig';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SchoolConfig;
  onSaveConfig: (newConfig: SchoolConfig) => void;
  onApplyScheduleToStudents?: (scheduleMap: Record<string, string>) => void;
  onManualSync?: () => Promise<void>;
  onPushLocalToCloud?: () => Promise<void>;
  onResetAttendance?: (tanggal?: string) => Promise<void>;
  studentsCount?: number;
  attendanceCount?: number;
  isSyncing?: boolean;
  currentTheme?: Theme;
  currentPalette?: ThemePalette;
  onThemeChange?: (theme: Theme) => void;
  onPaletteChange?: (palette: ThemePalette) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onApplyScheduleToStudents,
  onManualSync,
  onPushLocalToCloud,
  onResetAttendance,
  studentsCount = 0,
  attendanceCount = 0,
  isSyncing = false,
  currentTheme: propTheme,
  currentPalette: propPalette,
  onThemeChange,
  onPaletteChange,
}) => {
  const [activeTab, setActiveTab] = useState<'jadwal_pulang' | 'sholat' | 'umum' | 'fonnte' | 'database'>('jadwal_pulang');
  const [selectedDayTab, setSelectedDayTab] = useState<HariSekolah>('senin');
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => propTheme || getInitialTheme());
  const [currentPalette, setCurrentPalette] = useState<ThemePalette>(() => propPalette || getInitialPalette());
  const [confirmResetDbLog, setConfirmResetDbLog] = useState<boolean>(false);

  React.useEffect(() => {
    if (propTheme) setCurrentTheme(propTheme);
  }, [propTheme]);

  React.useEffect(() => {
    if (propPalette) setCurrentPalette(propPalette);
  }, [propPalette]);

  const handleSelectTheme = (t: Theme) => {
    setCurrentTheme(t);
    applyThemeToDocument(t, currentPalette);
    onThemeChange?.(t);
  };

  const handleSelectPalette = (p: ThemePalette) => {
    setCurrentPalette(p);
    applyThemeToDocument(currentTheme, p);
    onPaletteChange?.(p);
  };
  
  // Ensure jam_pulang_per_kelas, jam_masuk_harian, and jam_pulang_harian_per_kelas exist
  const [formData, setFormData] = useState<SchoolConfig>(() => ({
    ...config,
    sabtu_minggu_libur: config.sabtu_minggu_libur !== false,
    jam_masuk_batas: config.jam_masuk_batas || '07:00',
    jam_masuk_harian: {
      ...DEFAULT_JAM_MASUK_HARIAN,
      ...(config.jam_masuk_harian || {}),
    },
    jam_pulang_per_kelas: {
      ...DEFAULT_JAM_PULANG_PER_KELAS,
      ...(config.jam_pulang_per_kelas || {}),
    },
    jam_pulang_harian_per_kelas: {
      ...DEFAULT_JAM_PULANG_HARIAN_PER_KELAS,
      ...(config.jam_pulang_harian_per_kelas || {}),
    },
  }));

  const [filterTingkat, setFilterTingkat] = useState<'ALL' | 'XII' | 'XI' | 'X'>('ALL');
  const [filterJurusan, setFilterJurusan] = useState<string>('ALL');

  // Bulk input times for quick set
  const [bulkTimeXII, setBulkTimeXII] = useState<string>('15:30');
  const [bulkTimeXI, setBulkTimeXI] = useState<string>('15:00');
  const [bulkTimeX, setBulkTimeX] = useState<string>('14:30');

  const [syncToStudents, setSyncToStudents] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setFormData(prev => ({ ...prev, logo_url: dataUrl }));
        setActionNotice('Logo kustom berhasil dimuat! Klik "Simpan Perubahan" untuk menerapkan.');
        setTimeout(() => setActionNotice(null), 4000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setFormData(prev => ({ ...prev, logo_url: '' }));
    setActionNotice('Kembali ke Logo Vektor Resmi SMKS PGRI 1 Sukabumi.');
    setTimeout(() => setActionNotice(null), 4000);
  };

  if (!isOpen) return null;

  // Handler for class dismissal time change for the currently selected day
  const handleClassTimeChange = (kelasName: string, newTime: string) => {
    setFormData(prev => {
      const updatedHarian = { ...(prev.jam_pulang_harian_per_kelas || {}) };
      const currentClassDaily = { ...(updatedHarian[kelasName] || {}) };
      currentClassDaily[selectedDayTab] = newTime;
      updatedHarian[kelasName] = currentClassDaily;

      const updatedSimple = { ...(prev.jam_pulang_per_kelas || {}) };
      if (selectedDayTab === 'senin' || !updatedSimple[kelasName]) {
        updatedSimple[kelasName] = newTime;
      }

      return {
        ...prev,
        jam_pulang_per_kelas: updatedSimple,
        jam_pulang_harian_per_kelas: updatedHarian,
      };
    });
  };

  // Bulk apply to grade for currently selected day
  const handleApplyBulkGrade = (grade: 'XII' | 'XI' | 'X', timeToSet: string) => {
    setFormData(prev => {
      const updatedHarian = { ...(prev.jam_pulang_harian_per_kelas || {}) };
      const updatedSimple = { ...(prev.jam_pulang_per_kelas || {}) };

      MASTER_KELAS_LIST.filter(k => k.tingkat === grade).forEach(k => {
        const currentClassDaily = { ...(updatedHarian[k.kelas] || {}) };
        currentClassDaily[selectedDayTab] = timeToSet;
        updatedHarian[k.kelas] = currentClassDaily;
        if (selectedDayTab === 'senin') {
          updatedSimple[k.kelas] = timeToSet;
        }
      });

      return {
        ...prev,
        jam_pulang_per_kelas: updatedSimple,
        jam_pulang_harian_per_kelas: updatedHarian,
      };
    });
    const dayName = DAFTAR_HARI.find(d => d.key === selectedDayTab)?.label || 'Senin';
    setActionNotice(`Jam pulang hari ${dayName} untuk semua kelas ${grade} berhasil diubah ke ${timeToSet} WIB.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Handle daily morning check-in cutoff change for Monday - Friday
  const handleDailyCheckInChange = (dayKey: 'senin' | 'selasa' | 'rabu' | 'kamis' | 'jumat', newTime: string) => {
    setFormData(prev => ({
      ...prev,
      jam_masuk_batas: dayKey === 'senin' ? newTime : prev.jam_masuk_batas,
      jam_masuk_harian: {
        ...(prev.jam_masuk_harian || DEFAULT_JAM_MASUK_HARIAN),
        [dayKey]: newTime,
      },
    }));
  };

  // Quick apply same check-in time across all 5 school days
  const handleApplySameCheckInAllDays = (time: string) => {
    setFormData(prev => ({
      ...prev,
      jam_masuk_batas: time,
      jam_masuk_harian: {
        senin: time,
        selasa: time,
        rabu: time,
        kamis: time,
        jumat: time,
      },
    }));
    setActionNotice(`Batas jam masuk seluruh hari (Senin s.d. Jum'at) disetel ke ${time} WIB.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Copy schedule from one day to multiple target days
  const handleCopyScheduleToDays = (fromDay: HariSekolah, targetDays: HariSekolah[]) => {
    setFormData(prev => {
      const updatedHarian = { ...(prev.jam_pulang_harian_per_kelas || {}) };
      MASTER_KELAS_LIST.forEach(k => {
        const classDaily = { ...(updatedHarian[k.kelas] || {}) };
        const sourceTime = classDaily[fromDay] || k.defaultJamPulang;
        targetDays.forEach(tgt => {
          classDaily[tgt] = sourceTime;
        });
        updatedHarian[k.kelas] = classDaily;
      });
      return {
        ...prev,
        jam_pulang_harian_per_kelas: updatedHarian,
      };
    });
    const fromLabel = DAFTAR_HARI.find(d => d.key === fromDay)?.label || fromDay;
    const targetLabels = targetDays.map(t => DAFTAR_HARI.find(d => d.key === t)?.label || t).join(', ');
    setActionNotice(`Jadwal kepulangan hari ${fromLabel} berhasil disalin ke hari: ${targetLabels}.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Quick set Friday schedule (pulang lebih awal untuk sholat Jum'at)
  const handleApplyJumatSpecialSchedule = () => {
    setFormData(prev => {
      const updatedHarian = { ...(prev.jam_pulang_harian_per_kelas || {}) };
      MASTER_KELAS_LIST.forEach(k => {
        const classDaily = { ...(updatedHarian[k.kelas] || {}) };
        classDaily.jumat = k.tingkat === 'X' ? '11:30' : '11:45';
        updatedHarian[k.kelas] = classDaily;
      });
      return {
        ...prev,
        jam_pulang_harian_per_kelas: updatedHarian,
      };
    });
    setActionNotice("Jadwal khusus Jum'at (Sholat Jum'at) diterapkan: Kelas X pukul 11:30 WIB, Kelas XI & XII pukul 11:45 WIB.");
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Toggle weekend holiday (Sabtu & Minggu libur)
  const handleToggleSabtuMingguLibur = (enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      sabtu_minggu_libur: enabled,
    }));
    setActionNotice(
      enabled
        ? 'Aturan 5 Hari Sekolah diaktifkan: Sabtu & Minggu ditetapkan sebagai HARI LIBUR AKHIR PEKAN.'
        : 'Aturan 6 Hari Sekolah diaktifkan (Sabtu aktif).'
    );
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Kembalikan semua jadwal jam masuk, jam pulang harian (Senin–Jum\'at), dan libur Sabtu–Minggu ke default sekolah?')) {
      setFormData(prev => ({
        ...prev,
        jam_masuk_batas: '07:00',
        sabtu_minggu_libur: true,
        jam_masuk_harian: { ...DEFAULT_JAM_MASUK_HARIAN },
        jam_pulang_per_kelas: { ...DEFAULT_JAM_PULANG_PER_KELAS },
        jam_pulang_harian_per_kelas: { ...DEFAULT_JAM_PULANG_HARIAN_PER_KELAS },
      }));
      setActionNotice('Jadwal jam masuk & pulang harian dikembalikan ke default resmi.');
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);

    if (syncToStudents && onApplyScheduleToStudents && formData.jam_pulang_per_kelas) {
      onApplyScheduleToStudents(formData.jam_pulang_per_kelas);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  // Filtered class list for display
  const displayedClasses = MASTER_KELAS_LIST.filter(item => {
    const matchTingkat = filterTingkat === 'ALL' || item.tingkat === filterTingkat;
    const matchJurusan = filterJurusan === 'ALL' || item.namaJurusan === filterJurusan;
    return matchTingkat && matchJurusan;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/60 text-blue-950 dark:text-blue-300 rounded-xl">
              <Clock className="w-6 h-6 text-blue-900 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-heading font-black text-lg sm:text-xl text-blue-950 dark:text-blue-300">
                Pengaturan Sistem &amp; Jam Pulang Kelas
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                SMKS PGRI 1 Kota Sukabumi • NPSN: {formData.npsn}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel Akses Cepat: Tema Warna, Mode Terang/Gelap, Cloud Sync & Slide Penawaran */}
        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Left: Mode Terang/Gelap & Tema Warna PGRI */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Terang / Gelap Switcher */}
            <button
              type="button"
              onClick={() => handleSelectTheme(currentTheme === 'dark' ? 'light' : 'dark')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                currentTheme === 'dark'
                  ? 'bg-slate-900 text-amber-300 border-slate-700 hover:bg-slate-800'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
              title="Ganti Mode Terang / Mode Gelap"
            >
              {currentTheme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Mode Terang</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span>Mode Gelap</span>
                </>
              )}
            </button>

            {/* Tema Warna Filosofi Logo PGRI Selector */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-300 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 px-1.5 flex items-center gap-1 whitespace-nowrap">
                <Palette className="w-3.5 h-3.5 text-blue-700 dark:text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Tema:</span>
              </span>
              {THEME_PALETTES.map(p => {
                const active = currentPalette === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPalette(p.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-blue-950 dark:bg-amber-400 text-amber-300 dark:text-slate-950 shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={p.name}
                  >
                    {p.shortName.replace(' PGRI', '')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Cloud Sync & Slide Penawaran */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Cloud Sync Button */}
            {onManualSync && (
              <button
                type="button"
                onClick={onManualSync}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60 whitespace-nowrap"
                title="Sinkronisasi Cloud Database (PostgreSQL & Firebase Firestore)"
              >
                <Database className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                <span>{isSyncing ? 'Sinkron...' : 'Cloud Sync'}</span>
                <RefreshCw className={`w-3 h-3 text-slate-500 ${isSyncing ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
              </button>
            )}

            {/* Slide Penawaran Button */}
            <a
              href="/presentation.html"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-amber-950 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 hover:bg-amber-200 dark:hover:bg-amber-900/70 border border-amber-300 dark:border-amber-700 rounded-lg transition flex items-center gap-1.5 text-xs font-bold shadow-2xs cursor-pointer whitespace-nowrap"
              title="Buka Slide Presentasi Penawaran untuk Pihak Sekolah (10 Slide Fullscreen / Cetak PDF)"
            >
              <Presentation className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>Slide Penawaran</span>
            </a>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700 my-3 shrink-0 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('jadwal_pulang')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
              activeTab === 'jadwal_pulang'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${activeTab === 'jadwal_pulang' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
            <span>Jadwal Jam Masuk &amp; Pulang</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sholat')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
              activeTab === 'sholat'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🕌</span>
            <span>Sholat Berjamaah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('umum')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
              activeTab === 'umum'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <School className={`w-3.5 h-3.5 ${activeTab === 'umum' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
            <span>Identitas Sekolah &amp; Tema</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fonnte')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
              activeTab === 'fonnte'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Key className={`w-3.5 h-3.5 ${activeTab === 'fonnte' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
            <span>WhatsApp (Fonnte)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
              activeTab === 'database'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className={`w-3.5 h-3.5 ${activeTab === 'database' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
            <span>Database Cloud</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {savedSuccess && (
          <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-sm flex items-center gap-2.5 shadow-xs animate-fadeIn shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">Seluruh pengaturan berhasil disimpan ke sistem!</span>
          </div>
        )}

        {actionNotice && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-300 text-blue-950 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-xs shrink-0">
            <Info className="w-4.5 h-4.5 text-blue-700 shrink-0" />
            <span className="font-medium">{actionNotice}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 py-3 text-sm flex flex-col justify-between">
          <div>
            {/* ================= TAB 1: JADWAL JAM MASUK & PULANG HARIAN ================= */}
            {activeTab === 'jadwal_pulang' && (
              <div className="space-y-5">
                {/* 1. Aturan 5 Hari Sekolah & Libur Akhir Pekan */}
                <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/95 border border-blue-200 dark:border-slate-700 rounded-2xl space-y-3.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-950 text-amber-300 rounded-xl shadow-xs border border-amber-400/30">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-heading font-black text-sm sm:text-base text-slate-900 dark:text-white">
                          Aturan Hari Sekolah: 5 Hari Kerja (Senin–Jum'at Aktif, Sabtu &amp; Minggu Libur)
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                          Sesuai kalender akademik SMKS PGRI 1 Sukabumi, kegiatan belajar mengajar aktif pada hari Senin s.d. Jum'at.
                        </p>
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2.5 cursor-pointer bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 shadow-2xs shrink-0 self-start sm:self-auto">
                      <input
                        type="checkbox"
                        checked={formData.sabtu_minggu_libur !== false}
                        onChange={e => handleToggleSabtuMingguLibur(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4.5 h-4.5 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {formData.sabtu_minggu_libur !== false ? 'Sabtu & Minggu LIBUR ✅' : 'Sabtu Masuk Sekolah'}
                      </span>
                    </label>
                  </div>

                  {/* 7-Days Strip Indicator */}
                  <div className="grid grid-cols-7 gap-1.5 pt-1">
                    {DAFTAR_HARI.map(h => {
                      const isWeekend = h.key === 'sabtu' || h.key === 'minggu';
                      const isHoliday = isWeekend && formData.sabtu_minggu_libur !== false;
                      const checkInTime = formData.jam_masuk_harian?.[h.key as keyof JamMasukHarian] || formData.jam_masuk_batas || '07:00';

                      return (
                        <div
                          key={h.key}
                          className={`p-2.5 rounded-xl border text-center transition shadow-2xs ${
                            isHoliday
                              ? 'bg-rose-50 dark:bg-slate-900 border-rose-300 dark:border-rose-700/80 text-slate-900 dark:text-white'
                              : 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700/80 text-slate-900 dark:text-white'
                          }`}
                        >
                          <span className="text-xs font-black text-slate-900 dark:text-white block">{h.short}</span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md mt-1 inline-block tracking-wide ${
                              isHoliday
                                ? 'bg-rose-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {isHoliday ? 'LIBUR' : 'AKTIF'}
                          </span>
                          {!isHoliday ? (
                            <span className="block text-[11px] font-mono font-black text-slate-800 dark:text-amber-300 mt-1">
                              {checkInTime}
                            </span>
                          ) : (
                            <span className="block text-[10px] font-semibold text-rose-700 dark:text-rose-300 mt-1">
                              Akhir Pekan
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Pengaturan Batas Jam Masuk Pagi Harian (Senin - Jum'at) */}
                <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <h4 className="font-heading font-black text-sm text-slate-900 dark:text-white">
                          Batas Jam Masuk Pagi Harian (Senin s.d. Jum'at)
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          Siswa yang scan pada atau sebelum batas jam ini = Tepat Waktu. Lewat dari jam ini = Terlambat.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleApplySameCheckInAllDays('07:00')}
                        className="px-3.5 py-2 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-500 text-slate-950 border border-amber-500 shadow-xs transition cursor-pointer flex items-center gap-1.5 preserve-theme"
                      >
                        <Clock className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                        <span>Setel Seragam Semua Hari (07:00 WIB)</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {(['senin', 'selasa', 'rabu', 'kamis', 'jumat'] as const).map(dayKey => {
                      const dayLabel = DAFTAR_HARI.find(d => d.key === dayKey)?.label || dayKey;
                      const dayNote = dayKey === 'senin' ? 'Upacara Bendera' : dayKey === 'jumat' ? 'Pembiasaan & Sholat' : 'KBM Penuh';
                      const currentVal = formData.jam_masuk_harian?.[dayKey] || formData.jam_masuk_batas || '07:00';

                      return (
                        <div
                          key={dayKey}
                          className="p-3 bg-slate-50 dark:bg-slate-800/95 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-amber-400/60 transition space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-heading font-black text-xs text-slate-900 dark:text-white">
                              {dayLabel}
                            </span>
                            <span className="text-[10px] font-extrabold text-white bg-emerald-600 px-2 py-0.5 rounded-md">
                              Aktif
                            </span>
                          </div>
                          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 shadow-2xs">
                            <input
                              type="time"
                              required
                              value={currentVal}
                              onChange={e => handleDailyCheckInChange(dayKey, e.target.value)}
                              className="font-mono font-bold text-sm text-slate-900 dark:text-white bg-transparent focus:outline-none w-full"
                            />
                            <span className="text-[10px] font-bold text-slate-600 dark:text-amber-300">WIB</span>
                          </div>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold block truncate" title={dayNote}>
                            {dayNote}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Pengaturan Jam Pulang Harian Per Kelas (21 Rombel) */}
                <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h4 className="font-heading font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-700 dark:text-amber-400" />
                        <span>Jadwal Jam Pulang Harian Per Kelas (21 Rombel)</span>
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                        Pilih hari di bawah ini untuk melihat dan menyesuaikan jam pulang setiap rombel belajar.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleApplyJumatSpecialSchedule}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white border border-blue-600 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        title="Terapkan jadwal kepulangan awal di hari Jum'at"
                      >
                        <Sun className="w-3.5 h-3.5 text-amber-300" />
                        <span>Atur Standar Jum'at (Pulang Awal)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 border border-slate-300 dark:border-slate-600 transition cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reset Default</span>
                      </button>
                    </div>
                  </div>

                  {/* Day Tabs Selector */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {DAFTAR_HARI.map(h => {
                      const isSelected = selectedDayTab === h.key;
                      const isWeekend = h.key === 'sabtu' || h.key === 'minggu';
                      const isHoliday = isWeekend && formData.sabtu_minggu_libur !== false;

                      return (
                        <button
                          key={h.key}
                          type="button"
                          onClick={() => setSelectedDayTab(h.key)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-950 dark:bg-amber-400 text-amber-300 dark:text-slate-950 shadow-sm ring-1 ring-amber-400/50 font-black preserve-theme'
                              : isHoliday
                              ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/80 border border-rose-200 dark:border-rose-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <span>{h.label}</span>
                          {isHoliday ? (
                            <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-extrabold">
                              Libur
                            </span>
                          ) : (
                            <span className="text-[10px] opacity-90 font-mono font-bold">
                              ({formData.jam_masuk_harian?.[h.key as keyof JamMasukHarian] || formData.jam_masuk_batas || '07:00'})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Content for the Selected Day */}
                  {selectedDayTab === 'sabtu' || selectedDayTab === 'minggu' ? (
                    <div className="p-6 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-2xl text-center space-y-2">
                      <div className="inline-flex p-3 bg-rose-600 text-white rounded-2xl mb-1 shadow-xs">
                        <Coffee className="w-7 h-7" />
                      </div>
                      <h4 className="font-heading font-black text-base text-rose-950 dark:text-rose-200">
                        Hari {DAFTAR_HARI.find(d => d.key === selectedDayTab)?.label} adalah Hari Libur Akhir Pekan
                      </h4>
                      <p className="text-xs sm:text-sm text-rose-800 dark:text-rose-200/90 max-w-lg mx-auto font-medium leading-relaxed">
                        Tidak ada aktivitas pembelajaran dan jam pulang pada hari akhir pekan. Siswa yang melakukan scan presensi akan menerima notifikasi ramah bahwa sekolah sedang libur dan kembali aktif pada hari Senin.
                      </p>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDayTab('senin')}
                          className="px-4 py-2 bg-blue-950 dark:bg-amber-400 text-amber-300 dark:text-slate-950 font-black rounded-xl text-xs hover:opacity-95 transition cursor-pointer preserve-theme"
                        >
                          Beralih ke Jadwal Hari Senin–Jum'at
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Active Day Banner & Fast Copy */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                            Hari Aktif Terpilih:
                          </span>
                          <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-950 dark:bg-amber-400 text-amber-300 dark:text-slate-950 preserve-theme">
                            {DAFTAR_HARI.find(d => d.key === selectedDayTab)?.label}
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                            • Batas Masuk: <strong className="font-mono text-slate-900 dark:text-amber-300">{formData.jam_masuk_harian?.[selectedDayTab as keyof JamMasukHarian] || formData.jam_masuk_batas || '07:00'} WIB</strong>
                          </span>
                        </div>

                        {/* Quick Copy to Other School Days */}
                        {selectedDayTab !== 'jumat' && (
                          <button
                            type="button"
                            onClick={() => {
                              const targets: HariSekolah[] = ['senin', 'selasa', 'rabu', 'kamis'].filter(
                                d => d !== selectedDayTab
                              ) as HariSekolah[];
                              handleCopyScheduleToDays(selectedDayTab, targets);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <CalendarCheck className="w-3.5 h-3.5 text-blue-700 dark:text-amber-400" />
                            <span>Salin Jadwal {DAFTAR_HARI.find(d => d.key === selectedDayTab)?.label} ke Hari Senin–Kamis</span>
                          </button>
                        )}
                      </div>

                      {/* Bulk Set Per Grade for Currently Selected Day */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Bulk XII */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-2xs">
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-white block">Kelas XII (7 Kelas)</span>
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">TKJ, AKL, MP, BR</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={bulkTimeXII}
                              onChange={e => setBulkTimeXII(e.target.value)}
                              className="py-1 px-2 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 w-20"
                            />
                            <button
                              type="button"
                              onClick={() => handleApplyBulkGrade('XII', bulkTimeXII)}
                              className="px-2.5 py-1 text-xs font-black bg-blue-950 dark:bg-amber-400 text-amber-300 dark:text-slate-950 rounded-lg hover:opacity-90 transition cursor-pointer preserve-theme"
                              title={`Terapkan ke kelas XII hari ${DAFTAR_HARI.find(d => d.key === selectedDayTab)?.label}`}
                            >
                              Setel
                            </button>
                          </div>
                        </div>

                        {/* Bulk XI */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-2xs">
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-white block">Kelas XI (7 Kelas)</span>
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">TKJ, AKL, MP, BR</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={bulkTimeXI}
                              onChange={e => setBulkTimeXI(e.target.value)}
                              className="py-1 px-2 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 w-20"
                            />
                            <button
                              type="button"
                              onClick={() => handleApplyBulkGrade('XI', bulkTimeXI)}
                              className="px-2.5 py-1 text-xs font-black bg-blue-950 dark:bg-amber-400 text-amber-300 dark:text-slate-950 rounded-lg hover:opacity-90 transition cursor-pointer preserve-theme"
                              title={`Terapkan ke kelas XI hari ${DAFTAR_HARI.find(d => d.key === selectedDayTab)?.label}`}
                            >
                              Setel
                            </button>
                          </div>
                        </div>

                        {/* Bulk X */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-2xs">
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-white block">Kelas X (7 Kelas)</span>
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">TKJT, AKL, MPLB, PM</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={bulkTimeX}
                              onChange={e => setBulkTimeX(e.target.value)}
                              className="py-1 px-2 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 w-20"
                            />
                            <button
                              type="button"
                              onClick={() => handleApplyBulkGrade('X', bulkTimeX)}
                              className="px-2.5 py-1 text-xs font-black bg-blue-950 dark:bg-amber-400 text-amber-300 dark:text-slate-950 rounded-lg hover:opacity-90 transition cursor-pointer preserve-theme"
                              title={`Terapkan ke kelas X hari ${DAFTAR_HARI.find(d => d.key === selectedDayTab)?.label}`}
                            >
                              Setel
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Filters */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mr-1">Tingkat:</span>
                          {(['ALL', 'XII', 'XI', 'X'] as const).map(tingkat => (
                            <button
                              key={tingkat}
                              type="button"
                              onClick={() => setFilterTingkat(tingkat)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                filterTingkat === tingkat
                                  ? 'bg-blue-950 dark:bg-amber-400 text-amber-300 dark:text-slate-950 font-black shadow-2xs preserve-theme'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {tingkat === 'ALL' ? 'Semua (21)' : `Kelas ${tingkat} (7)`}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Jurusan:</label>
                          <select
                            value={filterJurusan}
                            onChange={e => setFilterJurusan(e.target.value)}
                            className="py-1.5 px-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                          >
                            <option value="ALL">Semua Jurusan (4)</option>
                            {DAFTAR_JURUSAN.map(j => (
                              <option key={j.key} value={j.nama}>
                                {j.nama}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Class List Table for Selected Day */}
                      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
                        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 grid grid-cols-12 gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                          <span className="col-span-3 sm:col-span-2">Rombel</span>
                          <span className="col-span-4 sm:col-span-5">Jurusan / Kompetensi</span>
                          <span className="col-span-5 sm:col-span-5 text-right sm:text-center">
                            Jam Pulang Hari {DAFTAR_HARI.find(d => d.key === selectedDayTab)?.label}
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[300px] overflow-y-auto bg-white dark:bg-slate-900">
                          {displayedClasses.map(item => {
                            const currentClassDaily = formData.jam_pulang_harian_per_kelas?.[item.kelas] || {};
                            const timeValue =
                              currentClassDaily[selectedDayTab] ||
                              formData.jam_pulang_per_kelas?.[item.kelas] ||
                              item.defaultJamPulang;

                            // Find badge colors
                            const jur = DAFTAR_JURUSAN.find(j => j.key === item.jurusanKey);
                            const badgeBg = jur?.badgeBg || 'bg-slate-100 dark:bg-slate-800';
                            const badgeText = jur?.badgeText || 'text-slate-800 dark:text-slate-200';
                            const badgeBorder = jur?.badgeBorder || 'border-slate-200 dark:border-slate-700';

                            return (
                              <div
                                key={item.kelas}
                                className="px-4 py-2.5 grid grid-cols-12 gap-2 items-center hover:bg-blue-50/40 dark:hover:bg-slate-800/70 transition"
                              >
                                {/* Nama Rombel */}
                                <div className="col-span-3 sm:col-span-2">
                                  <span className="font-heading font-black text-sm text-slate-900 dark:text-white">
                                    {item.kelas}
                                  </span>
                                </div>

                                {/* Jurusan Badge */}
                                <div className="col-span-4 sm:col-span-5">
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${badgeBg} ${badgeText} ${badgeBorder}`}
                                  >
                                    {item.namaJurusan}
                                  </span>
                                </div>

                                {/* Jam Pulang Input */}
                                <div className="col-span-5 sm:col-span-5 flex items-center justify-end sm:justify-center gap-2">
                                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-2.5 py-1">
                                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <input
                                      type="time"
                                      required
                                      value={timeValue}
                                      onChange={e => handleClassTimeChange(item.kelas, e.target.value)}
                                      className="font-mono font-bold text-sm text-slate-900 dark:text-white bg-transparent focus:outline-none w-20"
                                    />
                                    <span className="text-[11px] font-bold text-slate-600 dark:text-amber-300">WIB</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Option to sync to students */}
                  <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="sync-students"
                        checked={syncToStudents}
                        onChange={e => setSyncToStudents(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4.5 h-4.5 cursor-pointer"
                      />
                      <label htmlFor="sync-students" className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white cursor-pointer">
                        Sinkronkan jadwal jam pulang ini ke seluruh data siswa di kelas masing-masing
                      </label>
                    </div>
                    <span className="text-[11px] text-blue-800 dark:text-amber-300 font-bold hidden sm:inline">
                      Disarankan
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB: SHOLAT BERJAMAAH (DZUHUR & ASHAR) ================= */}
            {activeTab === 'sholat' && (
              <div className="space-y-4">
                {/* Master Toggle */}
                <div className="p-4 sm:p-5 bg-teal-50/70 dark:bg-slate-800/95 rounded-2xl border border-teal-200 dark:border-teal-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-teal-600 text-white rounded-xl border border-teal-500 shadow-xs">
                        <span className="text-xl">🕌</span>
                      </div>
                      <div>
                        <h4 className="font-heading font-black text-sm sm:text-base text-slate-900 dark:text-white">
                          Presensi Sholat Berjamaah di Masjid Sekolah
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                          Mencatat kedisiplinan ibadah Sholat Dzuhur dan Sholat Ashar berjamaah siswa SMKS PGRI 1 Sukabumi
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sholat_absen_enabled !== false}
                        onChange={e =>
                          setFormData({ ...formData, sholat_absen_enabled: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>
                </div>

                {/* Sholat Dzuhur Settings */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                    <span className="text-lg">☀️</span>
                    <div>
                      <h4 className="font-heading font-black text-sm text-slate-900">
                        Jadwal Rentang Waktu Sholat Dzuhur Berjamaah
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Siswa yang scan pada rentang jam ini otomatis tercatat melaksanakan Sholat Dzuhur
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <label className="text-xs sm:text-sm font-bold text-slate-700">Jam Mulai Dzuhur:</label>
                      <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1">
                        <input
                          type="time"
                          value={formData.sholat_dzuhur_mulai || '11:45'}
                          onChange={e => setFormData({ ...formData, sholat_dzuhur_mulai: e.target.value })}
                          className="font-mono font-bold text-sm text-slate-900 bg-transparent focus:outline-none w-20"
                        />
                        <span className="text-xs font-bold text-slate-500">WIB</span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <label className="text-xs sm:text-sm font-bold text-slate-700">Jam Selesai Dzuhur:</label>
                      <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1">
                        <input
                          type="time"
                          value={formData.sholat_dzuhur_selesai || '13:00'}
                          onChange={e => setFormData({ ...formData, sholat_dzuhur_selesai: e.target.value })}
                          className="font-mono font-bold text-sm text-slate-900 bg-transparent focus:outline-none w-20"
                        />
                        <span className="text-xs font-bold text-slate-500">WIB</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sholat Ashar Settings */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                    <span className="text-lg">🌤️</span>
                    <div>
                      <h4 className="font-heading font-black text-sm text-slate-900">
                        Jadwal Rentang Waktu Sholat Ashar Berjamaah
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Siswa yang scan pada rentang jam ini otomatis tercatat melaksanakan Sholat Ashar sebelum kepulangan
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <label className="text-xs sm:text-sm font-bold text-slate-700">Jam Mulai Ashar:</label>
                      <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1">
                        <input
                          type="time"
                          value={formData.sholat_ashar_mulai || '15:15'}
                          onChange={e => setFormData({ ...formData, sholat_ashar_mulai: e.target.value })}
                          className="font-mono font-bold text-sm text-slate-900 bg-transparent focus:outline-none w-20"
                        />
                        <span className="text-xs font-bold text-slate-500">WIB</span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <label className="text-xs sm:text-sm font-bold text-slate-700">Jam Selesai Ashar:</label>
                      <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1">
                        <input
                          type="time"
                          value={formData.sholat_ashar_selesai || '16:15'}
                          onChange={e => setFormData({ ...formData, sholat_ashar_selesai: e.target.value })}
                          className="font-mono font-bold text-sm text-slate-900 bg-transparent focus:outline-none w-20"
                        />
                        <span className="text-xs font-bold text-slate-500">WIB</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cloud Storage & Stability Assurance Notice */}
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3">
                  <span className="text-2xl shrink-0 mt-0.5">💾</span>
                  <div className="text-xs sm:text-sm text-emerald-950 space-y-1">
                    <p className="font-bold">
                      Efisiensi Penyimpanan Cloud (Firestore &amp; Cloud SQL PostgreSQL):
                    </p>
                    <p className="text-emerald-900 leading-relaxed font-medium">
                      Penambahan absensi Sholat Dzuhur dan Ashar <strong>TIDAK membebani kapasitas cloud</strong> karena tersimpan dalam satu rekaman harian yang sama (hanya bertambah ~50 bytes per siswa/hari). Sistem tetap berjalan sangat stabil, cepat, dan hemat kuota.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 2: PENGATURAN UMUM & IDENTITAS ================= */}
            {activeTab === 'umum' && (
              <div className="space-y-4">
                {/* Mode Tema Tampilan: Terang / Gelap */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                      <Sun className="w-4.5 h-4.5 text-amber-500" />
                      <span>Mode Tampilan Aplikasi (Terang / Gelap):</span>
                    </label>
                    <div className="flex items-center gap-1.5 p-1 bg-slate-200 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-700 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleSelectTheme('light')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          currentTheme === 'light'
                            ? 'bg-white text-slate-900 shadow-2xs font-black'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>Mode Terang</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectTheme('dark')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          currentTheme === 'dark'
                            ? 'bg-slate-800 text-amber-300 shadow-2xs font-black'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Mode Gelap</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    Pilih antara <strong>Mode Terang (Light Mode)</strong> dan <strong>Mode Gelap (Dark Mode)</strong>. Pada Mode Gelap, seluruh teks, tabel data siswa, dan angka kehadiran tetap memiliki kontras tinggi sehingga tidak melelahkan mata dan terbaca jelas secara maksimal.
                  </p>
                </div>

                {/* Filosofi Warna Dasar Aplikasi Berdasarkan Logo SMKS PGRI 1 Kota Sukabumi */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50/60 via-white to-amber-50/50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-2xl border border-blue-200/90 dark:border-blue-900/60 space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-950 text-amber-300 flex items-center justify-center shrink-0 shadow-xs border border-amber-400/40">
                        <Palette className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="font-heading font-black text-sm text-slate-900 dark:text-white">
                          Tema Filosofi Warna Logo SMKS PGRI 1 Kota Sukabumi
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          Warna dasar elegan &amp; modern dengan jaminan kontras huruf serta angka yang tajam di setiap perubahan tema
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-amber-300 border border-blue-300 dark:border-blue-800 self-start sm:self-auto">
                      Filosofi Resmi PGRI
                    </span>
                  </div>

                  {/* 5 Elemen Warna Logo SMKS PGRI 1 Sukabumi */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {PGRI_LOGO_PHILOSOPHY.map(item => (
                      <div
                        key={item.colorName}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 flex flex-col gap-1.5 shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-md shrink-0 border border-black/15 shadow-2xs"
                            style={{ backgroundColor: item.hex }}
                          />
                          <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">
                            {item.colorName}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-800 dark:text-amber-300">
                          {item.element}
                        </span>
                        <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug">
                          {item.meaning}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* 3 Pilihan Tema Filosofi Aplikasi */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {THEME_PALETTES.map(p => {
                      const isSelected = currentPalette === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectPalette(p.id)}
                          className={`relative p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            isSelected
                              ? 'border-blue-700 dark:border-amber-400 bg-white dark:bg-slate-800 shadow-md ring-2 ring-blue-500/20'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white/80 dark:bg-slate-850/70'
                          }`}
                        >
                          {/* Top Tag & Active Check */}
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                p.id === 'aurora'
                                  ? 'bg-blue-100 text-blue-950 dark:bg-blue-950 dark:text-amber-300'
                                  : p.id === 'sunrise'
                                  ? 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                            >
                              {p.sourceLabel}
                            </span>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-blue-900 dark:bg-amber-400 text-white dark:text-slate-950 flex items-center justify-center text-[11px] font-bold">
                                ✓
                              </span>
                            )}
                          </div>

                          {/* Gradient Swatch Preview + Heraldic Color Dots */}
                          <div
                            className="w-full h-14 rounded-lg shadow-inner border border-white/20 flex flex-col items-center justify-center gap-1 overflow-hidden px-2"
                            style={{ background: p.previewBg }}
                          >
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-black/55 text-white backdrop-blur-xs text-center truncate max-w-full">
                              {p.name}
                            </span>
                            <div className="flex items-center gap-1">
                              {p.swatches.map(hex => (
                                <span
                                  key={hex}
                                  className="w-2.5 h-2.5 rounded-full border border-white/70 shadow-2xs"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Description & Philosophy */}
                          <div className="space-y-1.5">
                            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-semibold">
                              {p.description}
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug italic">
                              &ldquo;{p.philosophy}&rdquo;
                            </p>
                          </div>

                          {/* Action Button */}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleSelectPalette(p.id);
                            }}
                            className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                              isSelected
                                ? 'bg-blue-950 dark:bg-amber-400 text-amber-300 dark:text-slate-950 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected ? '✓ Tema Aktif Diterapkan' : 'Terapkan Tema Ini'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Kejelasan Huruf &amp; Angka Terjamin (WCAG AAA):</strong> Seluruh tema di atas dirancang dengan proporsi arsitektur modern 60-30-10 sehingga huruf, nama siswa, NIS, dan angka statistik tetap terlihat tajam, bersih, dan profesional baik pada <strong>Mode Terang</strong> maupun <strong>Mode Gelap</strong>.
                    </p>
                  </div>
                </div>

                {/* Jam Masuk Batas */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Clock className="w-4.5 h-4.5 text-amber-600" />
                      <span>Batas Jam Masuk Pagi (Tepat Waktu):</span>
                    </label>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5">
                      <input
                        type="time"
                        required
                        value={formData.jam_masuk_batas}
                        onChange={e => setFormData({ ...formData, jam_masuk_batas: e.target.value })}
                        className="font-mono font-bold text-base text-slate-900 bg-transparent focus:outline-none w-24"
                      />
                      <span className="text-xs font-bold text-slate-600">WIB</span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                    Siswa yang scan pada atau sebelum jam ini berstatus &quot;Hadir Tepat Waktu&quot;. Jika melebihi batas ini, otomatis berstatus &quot;Terlambat&quot;.
                  </p>
                </div>

                {/* Logo Utama SMKS PGRI 1 Sukabumi */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/95 rounded-2xl border border-amber-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-amber-500" />
                      Logo Utama Aplikasi &amp; Kartu Absensi
                    </h4>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-400 text-slate-950 border-amber-500 preserve-theme">
                      {formData.logo_url ? 'Logo Kustom Aktif' : 'Logo Resmi SMKS PGRI 1'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="w-18 h-20 p-1 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 shadow-sm flex items-center justify-center border border-amber-300 shrink-0">
                      <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center p-1 overflow-hidden" data-preserve-bg="true">
                        <SchoolLogo
                          src={formData.logo_url}
                          className="w-full h-full object-contain drop-shadow-xs"
                          alt={formData.nama_sekolah}
                        />
                      </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {formData.nama_sekolah}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Logo ini otomatis diterapkan pada header dashboard presensi resmi, kartu absensi siswa (portrait &amp; landscape), serta dokumen cetak.
                      </p>

                      <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-950 dark:bg-amber-400 text-amber-300 dark:text-slate-950 hover:opacity-90 transition shadow-xs preserve-theme">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Ganti / Unggah Logo</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>

                        {formData.logo_url && (
                          <button
                            type="button"
                            onClick={handleResetLogo}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-300 dark:border-slate-600 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                            <span>Reset ke Logo Resmi</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* School Identity */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3.5">
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
                    <School className="w-4 h-4 text-blue-700 dark:text-amber-400" />
                    Identitas Resmi Sekolah &amp; Kartu Absensi
                  </h4>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Nama Sekolah:</label>
                    <input
                      type="text"
                      value={formData.nama_sekolah}
                      onChange={e => setFormData({ ...formData, nama_sekolah: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold text-slate-900 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Nama Yayasan / Badan Pengelola:</label>
                    <input
                      type="text"
                      value={formData.yayasan}
                      onChange={e => setFormData({ ...formData, yayasan: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium text-xs text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Kepala Sekolah:</label>
                      <input
                        type="text"
                        value={formData.kepala_sekolah}
                        onChange={e => setFormData({ ...formData, kepala_sekolah: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">NIP Kepala Sekolah:</label>
                      <input
                        type="text"
                        value={formData.nip_kepsek}
                        onChange={e => setFormData({ ...formData, nip_kepsek: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">NPSN:</label>
                      <input
                        type="text"
                        value={formData.npsn}
                        onChange={e => setFormData({ ...formData, npsn: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Status Akreditasi:</label>
                      <input
                        type="text"
                        value={formData.akreditasi}
                        onChange={e => setFormData({ ...formData, akreditasi: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold text-emerald-800 dark:text-emerald-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Alamat Sekolah:</label>
                    <input
                      type="text"
                      value={formData.alamat}
                      onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 3: WHATSAPP GATEWAY (FONNTE) ================= */}
            {activeTab === 'fonnte' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/70 dark:bg-slate-800/95 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Key className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Token Fonnte WhatsApp API:</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-emerald-900 dark:text-emerald-300 font-semibold">
                      <input
                        type="checkbox"
                        checked={formData.fonnte_test_mode}
                        onChange={e =>
                          setFormData({ ...formData, fonnte_test_mode: e.target.checked })
                        }
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span>Mode Simulasi (Hemat Kuota)</span>
                    </label>
                  </div>

                  <input
                    type="text"
                    value={formData.fonnte_token}
                    onChange={e => setFormData({ ...formData, fonnte_token: e.target.value })}
                    placeholder="Masukkan Token Fonnte (e.g. 9abK1...)"
                    className="w-full p-3 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-600 rounded-xl font-mono text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none text-slate-900 dark:text-white"
                  />
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    * Dapatkan token di <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="underline font-bold text-emerald-700 dark:text-emerald-400">fonnte.com</a>. Notifikasi otomatis dikirimkan ke nomor WhatsApp orang tua saat siswa berhasil scan Masuk atau Pulang. Jika mode simulasi aktif, aplikasi menyediakan tautan direct-chat WhatsApp Web.
                  </p>
                </div>
              </div>
            )}

            {/* ================= TAB 4: DATABASE CLOUD & MULTI-BROWSER SYNC ================= */}
            {activeTab === 'database' && (
              <div className="space-y-4">
                {/* Intro banner */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/95 border border-blue-200 dark:border-slate-700 rounded-2xl flex items-start gap-3">
                  <Database className="w-5 h-5 text-blue-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white">
                      Koneksi Basis Data Cloud (Cloud SQL PostgreSQL &amp; Firebase Firestore)
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      Aplikasi ini terhubung langsung ke basis data relasional PostgreSQL dan Firebase Firestore. Seluruh perubahan data siswa, konfigurasi sekolah, jam kepulangan per kelas, dan rekaman presensi tersimpan otomatis dan persisten di cloud server.
                    </p>
                  </div>
                </div>

                {/* Cloud Status Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-4 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 rounded-xl space-y-1 shadow-2xs">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      Cloud SQL
                    </span>
                    <div className="text-base font-black text-slate-900 dark:text-white">Online &amp; Terhubung</div>
                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">PostgreSQL Relational DB</p>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-1 shadow-2xs">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      Firebase
                    </span>
                    <div className="text-base font-black text-slate-900 dark:text-white">Aktif &amp; Terkoneksi</div>
                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Firestore Cloud Database</p>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/80 rounded-xl space-y-1 shadow-2xs">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                      Data Siswa
                    </span>
                    <div className="text-xl font-heading font-black text-slate-900 dark:text-white">
                      {studentsCount} <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">siswa</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Tersimpan di Cloud Database</p>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 rounded-xl space-y-1 shadow-2xs">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                      Log Presensi
                    </span>
                    <div className="text-xl font-heading font-black text-slate-900 dark:text-white">
                      {attendanceCount} <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">rekaman</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Histori kehadiran lengkap</p>
                  </div>
                </div>

                {/* Manual Sync Actions */}
                <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Pembaruan &amp; Sinkronisasi Cloud</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gunakan tombol di bawah untuk menyegarkan data langsung dari server cloud atau mengunggah pembaruan ke database server.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {onManualSync && (
                      <button
                        type="button"
                        onClick={onManualSync}
                        disabled={isSyncing}
                        className="px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-blue-900 hover:bg-blue-950 text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 text-blue-300 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Menyinkronkan...' : 'Unduh & Perbarui Data dari Cloud'}</span>
                      </button>
                    )}

                    {onPushLocalToCloud && (
                      <button
                        type="button"
                        onClick={onPushLocalToCloud}
                        disabled={isSyncing}
                        className="px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4 text-emerald-200" />
                        <span>Upload Data Browser Ini ke Cloud</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Reset Data Log Presensi (Kembalikan 0 di Database) */}
                {onResetAttendance && (
                  <div className="p-5 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                          <RotateCcw className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-rose-950 text-sm">
                            Reset Data Log Presensi (Kembali 0 pada Database)
                          </h4>
                          <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                            Gunakan fitur ini setelah selesai melakukan uji coba / absen percobaan. Seluruh rekaman log presensi ({attendanceCount} rekaman) akan dikosongkan menjadi 0 di PostgreSQL, Firebase Firestore, dan penyimpanan lokal tanpa menghapus data siswa.
                          </p>
                        </div>
                      </div>

                      {!confirmResetDbLog && (
                        <button
                          type="button"
                          disabled={isSyncing || attendanceCount === 0}
                          onClick={() => setConfirmResetDbLog(true)}
                          className="px-4 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-40 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Reset Log Presensi ({attendanceCount})</span>
                        </button>
                      )}
                    </div>

                    {confirmResetDbLog && (
                      <div className="p-4 bg-white rounded-xl border border-rose-300 space-y-3 animate-in fade-in duration-150">
                        <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>
                            Konfirmasi: Yakin ingin mengosongkan seluruh {attendanceCount} log presensi agar kembali 0 di database?
                          </span>
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmResetDbLog(false)}
                            className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            disabled={isSyncing}
                            onClick={async () => {
                              await onResetAttendance('all');
                              setConfirmResetDbLog(false);
                              setActionNotice('Berhasil! Seluruh log presensi telah direset kembali menjadi 0 pada Database Cloud.');
                              setTimeout(() => setActionNotice(null), 5000);
                            }}
                            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isSyncing ? 'Mereset...' : 'Ya, Kosongkan Log ke 0'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              * Perubahan jadwal jam pulang kelas akan langsung berlaku di Terminal Scanner.
            </span>
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 font-bold cursor-pointer transition text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl font-bold bg-blue-950 hover:bg-black text-amber-300 flex items-center gap-2 shadow-md cursor-pointer transition text-sm"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
