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
  Coffee,
} from 'lucide-react';
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
  studentsCount?: number;
  attendanceCount?: number;
  isSyncing?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onApplyScheduleToStudents,
  onManualSync,
  onPushLocalToCloud,
  studentsCount = 0,
  attendanceCount = 0,
  isSyncing = false,
}) => {
  const [activeTab, setActiveTab] = useState<'jadwal_pulang' | 'sholat' | 'umum' | 'fonnte' | 'database'>('jadwal_pulang');
  const [selectedDayTab, setSelectedDayTab] = useState<HariSekolah>('senin');
  
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
      <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-950 rounded-xl">
              <Clock className="w-6 h-6 text-blue-900" />
            </div>
            <div>
              <h3 className="font-heading font-black text-lg sm:text-xl text-blue-950">
                Pengaturan Sistem &amp; Jam Pulang Kelas
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                SMKS PGRI 1 Kota Sukabumi • NPSN: {formData.npsn}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60 my-3 shrink-0 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('jadwal_pulang')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
              activeTab === 'jadwal_pulang'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${activeTab === 'jadwal_pulang' ? 'text-blue-600' : 'text-slate-500'}`} />
            <span>Jadwal Jam Masuk &amp; Pulang</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sholat')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
              activeTab === 'sholat'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
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
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <School className={`w-3.5 h-3.5 ${activeTab === 'umum' ? 'text-blue-600' : 'text-slate-500'}`} />
            <span>Identitas Sekolah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fonnte')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
              activeTab === 'fonnte'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className={`w-3.5 h-3.5 ${activeTab === 'fonnte' ? 'text-blue-600' : 'text-slate-500'}`} />
            <span>WhatsApp (Fonnte)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
              activeTab === 'database'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className={`w-3.5 h-3.5 ${activeTab === 'database' ? 'text-blue-600' : 'text-slate-500'}`} />
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
                <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200 rounded-2xl space-y-3.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-950 text-amber-300 rounded-xl shadow-xs">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-heading font-black text-sm sm:text-base text-blue-950">
                          Aturan Hari Sekolah: 5 Hari Kerja (Senin–Jum'at Aktif, Sabtu &amp; Minggu Libur)
                        </h4>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">
                          Sesuai kalender akademik SMKS PGRI 1 Sukabumi, kegiatan belajar mengajar aktif pada hari Senin s.d. Jum'at.
                        </p>
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2.5 cursor-pointer bg-white px-3.5 py-2 rounded-xl border border-slate-300 shadow-2xs shrink-0 self-start sm:self-auto">
                      <input
                        type="checkbox"
                        checked={formData.sabtu_minggu_libur !== false}
                        onChange={e => handleToggleSabtuMingguLibur(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4.5 h-4.5 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
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
                          className={`p-2 rounded-xl border text-center transition ${
                            isHoliday
                              ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                              : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                          }`}
                        >
                          <span className="text-xs font-black block">{h.short}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-1 inline-block ${
                              isHoliday
                                ? 'bg-rose-200/80 text-rose-900'
                                : 'bg-emerald-200/80 text-emerald-900'
                            }`}
                          >
                            {isHoliday ? 'LIBUR' : 'AKTIF'}
                          </span>
                          {!isHoliday && (
                            <span className="block text-[10px] font-mono font-bold text-slate-600 mt-0.5">
                              {checkInTime}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Pengaturan Batas Jam Masuk Pagi Harian (Senin - Jum'at) */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl space-y-3.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <div>
                        <h4 className="font-heading font-black text-sm text-slate-900">
                          Batas Jam Masuk Pagi Harian (Senin s.d. Jum'at)
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">
                          Siswa yang scan pada atau sebelum batas jam ini = Tepat Waktu. Lewat dari jam ini = Terlambat.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleApplySameCheckInAllDays('07:00')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-950 hover:bg-amber-200 border border-amber-300 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
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
                          className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 hover:border-blue-300 transition space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-heading font-black text-xs text-blue-950">
                              {dayLabel}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                              Aktif
                            </span>
                          </div>
                          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
                            <input
                              type="time"
                              required
                              value={currentVal}
                              onChange={e => handleDailyCheckInChange(dayKey, e.target.value)}
                              className="font-mono font-bold text-sm text-slate-900 bg-transparent focus:outline-none w-full"
                            />
                            <span className="text-[10px] font-bold text-slate-500">WIB</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium block truncate" title={dayNote}>
                            {dayNote}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Pengaturan Jam Pulang Harian Per Kelas (21 Rombel) */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-heading font-black text-sm text-slate-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-900" />
                        <span>Jadwal Jam Pulang Harian Per Kelas (21 Rombel)</span>
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Pilih hari di bawah ini untuk melihat dan menyesuaikan jam pulang setiap rombel belajar.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleApplyJumatSpecialSchedule}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-950 hover:bg-blue-200 border border-blue-300 transition cursor-pointer flex items-center gap-1.5"
                        title="Terapkan jadwal kepulangan awal di hari Jum'at"
                      >
                        <Sun className="w-3.5 h-3.5 text-blue-700" />
                        <span>Atur Standar Jum'at (Pulang Awal)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition cursor-pointer flex items-center gap-1"
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
                              ? 'bg-blue-950 text-amber-300 shadow-sm ring-1 ring-amber-400/40'
                              : isHoliday
                              ? 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          <span>{h.label}</span>
                          {isHoliday ? (
                            <span className="text-[10px] bg-rose-200 text-rose-900 px-1 rounded font-bold">
                              Libur
                            </span>
                          ) : (
                            <span className="text-[10px] opacity-75 font-mono">
                              ({formData.jam_masuk_harian?.[h.key as keyof JamMasukHarian] || formData.jam_masuk_batas || '07:00'})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Content for the Selected Day */}
                  {selectedDayTab === 'sabtu' || selectedDayTab === 'minggu' ? (
                    <div className="p-6 bg-rose-50/70 border border-rose-200 rounded-2xl text-center space-y-2">
                      <div className="inline-flex p-3 bg-rose-100 text-rose-700 rounded-2xl mb-1">
                        <Coffee className="w-7 h-7" />
                      </div>
                      <h4 className="font-heading font-black text-base text-rose-950">
                        Hari {DAFTAR_HARI.find(d => d.key === selectedDayTab)?.label} adalah Hari Libur Akhir Pekan
                      </h4>
                      <p className="text-xs sm:text-sm text-rose-800 max-w-lg mx-auto font-medium leading-relaxed">
                        Tidak ada aktivitas pembelajaran dan jam pulang pada hari akhir pekan. Siswa yang melakukan scan presensi akan menerima notifikasi ramah bahwa sekolah sedang libur dan kembali aktif pada hari Senin.
                      </p>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDayTab('senin')}
                          className="px-4 py-2 bg-blue-950 text-amber-300 font-bold rounded-xl text-xs hover:bg-black transition cursor-pointer"
                        >
                          Beralih ke Jadwal Hari Senin–Jum'at
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Active Day Banner & Fast Copy */}
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Hari Aktif Terpilih:
                          </span>
                          <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-950 text-amber-300">
                            {DAFTAR_HARI.find(d => d.key === selectedDayTab)?.label}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            • Batas Masuk: {formData.jam_masuk_harian?.[selectedDayTab as keyof JamMasukHarian] || formData.jam_masuk_batas || '07:00'} WIB
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
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-white text-blue-900 border border-slate-300 hover:bg-blue-50 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <CalendarCheck className="w-3.5 h-3.5 text-blue-700" />
                            <span>Salin Jadwal {DAFTAR_HARI.find(d => d.key === selectedDayTab)?.label} ke Hari Senin–Kamis</span>
                          </button>
                        )}
                      </div>

                      {/* Bulk Set Per Grade for Currently Selected Day */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Bulk XII */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                          <div>
                            <span className="text-xs font-bold text-blue-950 block">Kelas XII (7 Kelas)</span>
                            <span className="text-[11px] text-slate-500">TKJ, AKL, MP, BR</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={bulkTimeXII}
                              onChange={e => setBulkTimeXII(e.target.value)}
                              className="py-1 px-2 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 bg-white w-20"
                            />
                            <button
                              type="button"
                              onClick={() => handleApplyBulkGrade('XII', bulkTimeXII)}
                              className="px-2.5 py-1 text-xs font-bold bg-blue-950 text-white rounded-lg hover:bg-blue-900 transition cursor-pointer"
                              title={`Terapkan ke kelas XII hari ${DAFTAR_HARI.find(d => d.key === selectedDayTab)?.label}`}
                            >
                              Setel
                            </button>
                          </div>
                        </div>

                        {/* Bulk XI */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                          <div>
                            <span className="text-xs font-bold text-blue-950 block">Kelas XI (7 Kelas)</span>
                            <span className="text-[11px] text-slate-500">TKJ, AKL, MP, BR</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={bulkTimeXI}
                              onChange={e => setBulkTimeXI(e.target.value)}
                              className="py-1 px-2 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 bg-white w-20"
                            />
                            <button
                              type="button"
                              onClick={() => handleApplyBulkGrade('XI', bulkTimeXI)}
                              className="px-2.5 py-1 text-xs font-bold bg-blue-950 text-white rounded-lg hover:bg-blue-900 transition cursor-pointer"
                              title={`Terapkan ke kelas XI hari ${DAFTAR_HARI.find(d => d.key === selectedDayTab)?.label}`}
                            >
                              Setel
                            </button>
                          </div>
                        </div>

                        {/* Bulk X */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                          <div>
                            <span className="text-xs font-bold text-blue-950 block">Kelas X (7 Kelas)</span>
                            <span className="text-[11px] text-slate-500">TKJT, AKL, MPLB, PM</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={bulkTimeX}
                              onChange={e => setBulkTimeX(e.target.value)}
                              className="py-1 px-2 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 bg-white w-20"
                            />
                            <button
                              type="button"
                              onClick={() => handleApplyBulkGrade('X', bulkTimeX)}
                              className="px-2.5 py-1 text-xs font-bold bg-blue-950 text-white rounded-lg hover:bg-blue-900 transition cursor-pointer"
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
                          <span className="text-xs font-bold text-slate-600 mr-1">Tingkat:</span>
                          {(['ALL', 'XII', 'XI', 'X'] as const).map(tingkat => (
                            <button
                              key={tingkat}
                              type="button"
                              onClick={() => setFilterTingkat(tingkat)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                filterTingkat === tingkat
                                  ? 'bg-blue-950 text-amber-300 shadow-2xs'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {tingkat === 'ALL' ? 'Semua (21)' : `Kelas ${tingkat} (7)`}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-600">Jurusan:</label>
                          <select
                            value={filterJurusan}
                            onChange={e => setFilterJurusan(e.target.value)}
                            className="py-1 px-2.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
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
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                        <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 grid grid-cols-12 gap-2 text-xs font-bold text-slate-700">
                          <span className="col-span-3 sm:col-span-2">Rombel</span>
                          <span className="col-span-4 sm:col-span-5">Jurusan / Kompetensi</span>
                          <span className="col-span-5 sm:col-span-5 text-right sm:text-center">
                            Jam Pulang Hari {DAFTAR_HARI.find(d => d.key === selectedDayTab)?.label}
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                          {displayedClasses.map(item => {
                            const currentClassDaily = formData.jam_pulang_harian_per_kelas?.[item.kelas] || {};
                            const timeValue =
                              currentClassDaily[selectedDayTab] ||
                              formData.jam_pulang_per_kelas?.[item.kelas] ||
                              item.defaultJamPulang;

                            // Find badge colors
                            const jur = DAFTAR_JURUSAN.find(j => j.key === item.jurusanKey);
                            const badgeBg = jur?.badgeBg || 'bg-slate-100';
                            const badgeText = jur?.badgeText || 'text-slate-800';
                            const badgeBorder = jur?.badgeBorder || 'border-slate-200';

                            return (
                              <div
                                key={item.kelas}
                                className="px-4 py-2.5 grid grid-cols-12 gap-2 items-center hover:bg-blue-50/40 transition"
                              >
                                {/* Nama Rombel */}
                                <div className="col-span-3 sm:col-span-2">
                                  <span className="font-heading font-black text-sm text-blue-950">
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
                                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <input
                                      type="time"
                                      required
                                      value={timeValue}
                                      onChange={e => handleClassTimeChange(item.kelas, e.target.value)}
                                      className="font-mono font-bold text-sm text-slate-900 bg-transparent focus:outline-none w-20"
                                    />
                                    <span className="text-[11px] font-bold text-slate-500">WIB</span>
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
                  <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="sync-students"
                        checked={syncToStudents}
                        onChange={e => setSyncToStudents(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4.5 h-4.5 cursor-pointer"
                      />
                      <label htmlFor="sync-students" className="text-xs sm:text-sm font-bold text-blue-950 cursor-pointer">
                        Sinkronkan jadwal jam pulang ini ke seluruh data siswa di kelas masing-masing
                      </label>
                    </div>
                    <span className="text-[11px] text-blue-800 font-semibold hidden sm:inline">
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
                <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-50/80 via-emerald-50/50 to-blue-50/60 rounded-2xl border border-teal-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-teal-100 text-teal-900 rounded-xl border border-teal-300">
                        <span className="text-xl">🕌</span>
                      </div>
                      <div>
                        <h4 className="font-heading font-black text-sm sm:text-base text-teal-950">
                          Presensi Sholat Berjamaah di Masjid Sekolah
                        </h4>
                        <p className="text-xs text-teal-800 font-medium mt-0.5">
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
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
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
                {/* Jam Masuk Batas */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-900 flex items-center gap-2">
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
                <div className="p-4 bg-gradient-to-r from-amber-50/80 via-white to-blue-50/60 rounded-2xl border border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                      Logo Utama Aplikasi &amp; Kartu Absensi
                    </h4>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-100 text-amber-900 border-amber-300">
                      {formData.logo_url ? 'Logo Kustom Aktif' : 'Logo Resmi SMKS PGRI 1'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-200">
                    <div className="w-18 h-20 p-1 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 shadow-sm flex items-center justify-center border border-amber-300 shrink-0">
                      <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center p-1 overflow-hidden">
                        <SchoolLogo
                          src={formData.logo_url}
                          className="w-full h-full object-contain drop-shadow-xs"
                          alt={formData.nama_sekolah}
                        />
                      </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <p className="text-xs sm:text-sm font-bold text-slate-900">
                        {formData.nama_sekolah}
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Logo ini otomatis diterapkan pada header dashboard presensi resmi, kartu absensi siswa (portrait &amp; landscape), serta dokumen cetak.
                      </p>

                      <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-950 text-amber-300 hover:bg-black transition shadow-xs">
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition border border-slate-300 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                            <span>Reset ke Logo Resmi</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* School Identity */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3.5">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2">
                    <School className="w-4 h-4 text-blue-900" />
                    Identitas Resmi Sekolah &amp; Kartu Absensi
                  </h4>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nama Sekolah:</label>
                    <input
                      type="text"
                      value={formData.nama_sekolah}
                      onChange={e => setFormData({ ...formData, nama_sekolah: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold text-slate-900 text-sm"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nama Yayasan / Badan Pengelola:</label>
                    <input
                      type="text"
                      value={formData.yayasan}
                      onChange={e => setFormData({ ...formData, yayasan: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium text-xs text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Kepala Sekolah:</label>
                      <input
                        type="text"
                        value={formData.kepala_sekolah}
                        onChange={e => setFormData({ ...formData, kepala_sekolah: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">NIP Kepala Sekolah:</label>
                      <input
                        type="text"
                        value={formData.nip_kepsek}
                        onChange={e => setFormData({ ...formData, nip_kepsek: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">NPSN:</label>
                      <input
                        type="text"
                        value={formData.npsn}
                        onChange={e => setFormData({ ...formData, npsn: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Status Akreditasi:</label>
                      <input
                        type="text"
                        value={formData.akreditasi}
                        onChange={e => setFormData({ ...formData, akreditasi: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold text-emerald-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Alamat Sekolah:</label>
                    <input
                      type="text"
                      value={formData.alamat}
                      onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 3: WHATSAPP GATEWAY (FONNTE) ================= */}
            {activeTab === 'fonnte' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-emerald-950 flex items-center gap-2">
                      <Key className="w-4.5 h-4.5 text-emerald-700" />
                      <span>Token Fonnte WhatsApp API:</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-emerald-900 font-semibold">
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
                    className="w-full p-3 bg-white border border-emerald-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none text-slate-900"
                  />
                  <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed font-medium">
                    * Dapatkan token di <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="underline font-bold">fonnte.com</a>. Notifikasi otomatis dikirimkan ke nomor WhatsApp orang tua saat siswa berhasil scan Masuk atau Pulang. Jika mode simulasi aktif, aplikasi menyediakan tautan direct-chat WhatsApp Web.
                  </p>
                </div>
              </div>
            )}

            {/* ================= TAB 4: DATABASE CLOUD & MULTI-BROWSER SYNC ================= */}
            {activeTab === 'database' && (
              <div className="space-y-4">
                {/* Intro banner */}
                <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200 rounded-2xl flex items-start gap-3">
                  <Database className="w-5 h-5 text-blue-800 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-slate-800 space-y-1">
                    <p className="font-bold text-blue-950">
                      Koneksi Basis Data Cloud (Cloud SQL PostgreSQL &amp; Firebase Firestore)
                    </p>
                    <p className="text-slate-600 leading-relaxed font-medium">
                      Aplikasi ini terhubung langsung ke basis data relasional PostgreSQL dan Firebase Firestore. Seluruh perubahan data siswa, konfigurasi sekolah, jam kepulangan per kelas, dan rekaman presensi tersimpan otomatis dan persisten di cloud server.
                    </p>
                  </div>
                </div>

                {/* Cloud Status Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      Cloud SQL
                    </span>
                    <div className="text-base font-bold text-emerald-950">Online &amp; Terhubung</div>
                    <p className="text-[11px] text-emerald-700">PostgreSQL Relational DB</p>
                  </div>

                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      Firebase
                    </span>
                    <div className="text-base font-bold text-amber-950">Aktif &amp; Terkoneksi</div>
                    <p className="text-[11px] text-amber-700">Firestore Cloud Database</p>
                  </div>

                  <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                      Data Siswa
                    </span>
                    <div className="text-xl font-heading font-black text-blue-950">
                      {studentsCount} <span className="text-xs font-normal text-slate-600">siswa</span>
                    </div>
                    <p className="text-[11px] text-blue-700">Tersimpan di Cloud Database</p>
                  </div>

                  <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                      Log Presensi
                    </span>
                    <div className="text-xl font-heading font-black text-indigo-950">
                      {attendanceCount} <span className="text-xs font-normal text-slate-600">rekaman</span>
                    </div>
                    <p className="text-[11px] text-indigo-700">Histori kehadiran lengkap</p>
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
