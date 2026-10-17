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
} from 'lucide-react';
import { SchoolConfig } from '../types';
import { SchoolLogo } from './SchoolLogo';
import {
  MASTER_KELAS_LIST,
  DAFTAR_JURUSAN,
  DEFAULT_JAM_PULANG_PER_KELAS,
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
  const [activeTab, setActiveTab] = useState<'jadwal_pulang' | 'umum' | 'fonnte' | 'database'>('jadwal_pulang');
  
  // Ensure jam_pulang_per_kelas exists
  const [formData, setFormData] = useState<SchoolConfig>(() => ({
    ...config,
    jam_pulang_per_kelas: {
      ...DEFAULT_JAM_PULANG_PER_KELAS,
      ...(config.jam_pulang_per_kelas || {}),
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

  const currentSchedule = formData.jam_pulang_per_kelas || DEFAULT_JAM_PULANG_PER_KELAS;

  const handleClassTimeChange = (kelasName: string, newTime: string) => {
    setFormData(prev => ({
      ...prev,
      jam_pulang_per_kelas: {
        ...(prev.jam_pulang_per_kelas || {}),
        [kelasName]: newTime,
      },
    }));
  };

  const handleApplyBulkGrade = (grade: 'XII' | 'XI' | 'X', timeToSet: string) => {
    setFormData(prev => {
      const updatedSchedule = { ...(prev.jam_pulang_per_kelas || {}) };
      MASTER_KELAS_LIST.filter(k => k.tingkat === grade).forEach(k => {
        updatedSchedule[k.kelas] = timeToSet;
      });
      return {
        ...prev,
        jam_pulang_per_kelas: updatedSchedule,
      };
    });
    setActionNotice(`Jam pulang semua kelas ${grade} berhasil diubah ke ${timeToSet} WIB.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Kembalikan semua jam pulang per kelas ke pengaturan default sekolah?')) {
      setFormData(prev => ({
        ...prev,
        jam_pulang_per_kelas: { ...DEFAULT_JAM_PULANG_PER_KELAS },
      }));
      setActionNotice('Jadwal jam pulang per kelas dikembalikan ke default awal.');
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
        <div className="flex items-center gap-2 pt-4 pb-2 border-b border-slate-100 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('jadwal_pulang')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shrink-0 cursor-pointer ${
              activeTab === 'jadwal_pulang'
                ? 'bg-blue-950 text-amber-300 shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Jam Pulang Per Kelas (21 Rombel)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('umum')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shrink-0 cursor-pointer ${
              activeTab === 'umum'
                ? 'bg-blue-950 text-amber-300 shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <School className="w-4 h-4 text-amber-400" />
            <span>Jam Masuk &amp; Identitas Sekolah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fonnte')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shrink-0 cursor-pointer ${
              activeTab === 'fonnte'
                ? 'bg-blue-950 text-amber-300 shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Key className="w-4 h-4 text-amber-400" />
            <span>WhatsApp Gateway (Fonnte)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shrink-0 cursor-pointer ${
              activeTab === 'database'
                ? 'bg-blue-950 text-amber-300 shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Database className="w-4 h-4 text-amber-400" />
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
            {/* ================= TAB 1: JADWAL PULANG PER KELAS ================= */}
            {activeTab === 'jadwal_pulang' && (
              <div className="space-y-4">
                {/* Intro banner */}
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/70 border border-amber-200 rounded-2xl flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-slate-800 space-y-1">
                    <p className="font-bold text-amber-950">
                      Pengaturan Waktu Pulang Khusus Per Kelas (Jadwal Berbeda)
                    </p>
                    <p className="text-slate-600 leading-relaxed font-medium">
                      Karena setiap kelas memiliki waktu kepulangan yang berbeda (misalnya Kelas XII pulang pukul 15:30, Kelas XI pukul 15:00, Kelas X pukul 14:30), siswa hanya diizinkan scan pulang ketika jam pulang kelasnya telah tercapai.
                    </p>
                  </div>
                </div>

                {/* Batch Set Shortcuts */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-900" />
                      Setel Massal Cepat Per Tingkat
                    </span>
                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      className="text-xs text-slate-500 hover:text-rose-700 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reset ke Default
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Bulk XII */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                      <div>
                        <span className="text-xs font-bold text-blue-950 block">Kelas XII (7 Kelas)</span>
                        <span className="text-[11px] text-slate-500">TKJ, AKL, MP, BR</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          value={bulkTimeXII}
                          onChange={e => setBulkTimeXII(e.target.value)}
                          className="py-1 px-2 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 bg-slate-50 w-20"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyBulkGrade('XII', bulkTimeXII)}
                          className="px-2.5 py-1 text-xs font-bold bg-blue-950 text-white rounded-lg hover:bg-blue-900 transition cursor-pointer"
                          title="Terapkan ke semua kelas XII"
                        >
                          Terapkan
                        </button>
                      </div>
                    </div>

                    {/* Bulk XI */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                      <div>
                        <span className="text-xs font-bold text-blue-950 block">Kelas XI (7 Kelas)</span>
                        <span className="text-[11px] text-slate-500">TKJ, AKL, MP, BR</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          value={bulkTimeXI}
                          onChange={e => setBulkTimeXI(e.target.value)}
                          className="py-1 px-2 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 bg-slate-50 w-20"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyBulkGrade('XI', bulkTimeXI)}
                          className="px-2.5 py-1 text-xs font-bold bg-blue-950 text-white rounded-lg hover:bg-blue-900 transition cursor-pointer"
                          title="Terapkan ke semua kelas XI"
                        >
                          Terapkan
                        </button>
                      </div>
                    </div>

                    {/* Bulk X */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                      <div>
                        <span className="text-xs font-bold text-blue-950 block">Kelas X (7 Kelas)</span>
                        <span className="text-[11px] text-slate-500">TKJT, AKL, MPLB, PM</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          value={bulkTimeX}
                          onChange={e => setBulkTimeX(e.target.value)}
                          className="py-1 px-2 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 bg-slate-50 w-20"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyBulkGrade('X', bulkTimeX)}
                          className="px-2.5 py-1 text-xs font-bold bg-blue-950 text-white rounded-lg hover:bg-blue-900 transition cursor-pointer"
                          title="Terapkan ke semua kelas X"
                        >
                          Terapkan
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
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

                {/* Class List Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 grid grid-cols-12 gap-2 text-xs font-bold text-slate-700">
                    <span className="col-span-3 sm:col-span-2">Rombel</span>
                    <span className="col-span-4 sm:col-span-5">Jurusan / Kompetensi</span>
                    <span className="col-span-5 sm:col-span-5 text-right sm:text-center">Jam Pulang Resmi</span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                    {displayedClasses.map(item => {
                      const timeValue = currentSchedule[item.kelas] || item.defaultJamPulang;
                      
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
