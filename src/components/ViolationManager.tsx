import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Printer,
  Trash2,
  CheckCircle2,
  Clock,
  Sun,
  UserCheck,
  Users,
  BookOpen,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  X,
  MessageSquare,
  Award,
  AlertOctagon,
} from 'lucide-react';
import {
  Siswa,
  Absensi,
  PelanggaranSiswa,
  SchoolConfig,
  KategoriPelanggaran,
} from '../types';
import { MASTER_KELAS_LIST } from '../utils/classConfig';
import {
  MASTER_JENIS_PELANGGARAN,
  getStatusPembinaan,
  ITEM_TERLAMBAT,
  ITEM_TIDAK_SHOLAT_DZUHUR,
} from '../utils/violationRules';
import { exportViolationReportToExcel } from '../utils/excelExport';

interface ViolationManagerProps {
  students: Siswa[];
  attendanceRecords: Absensi[];
  violations: PelanggaranSiswa[];
  config: SchoolConfig;
  onUpdateViolations: (updated: PelanggaranSiswa[]) => void;
  onSyncAutoViolations: () => void;
}

export const ViolationManager: React.FC<ViolationManagerProps> = ({
  students,
  violations,
  config,
  onUpdateViolations,
  onSyncAutoViolations,
}) => {
  const [subTab, setSubTab] = useState<'input_log' | 'rekap_siswa' | 'rekap_kelas' | 'pedoman'>('input_log');

  // Filter States
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('SEMUA');
  const [selectedSource, setSelectedSource] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Form Input Manual States
  const [showAddModal, setShowAddModal] = useState(false);
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [selectedStudentNis, setSelectedStudentNis] = useState('');
  const [formCategory, setFormCategory] = useState<KategoriPelanggaran>('RINGAN');
  const [formKodePelanggaran, setFormKodePelanggaran] = useState('R-02');
  const [formTanggal, setFormTanggal] = useState(() => new Date().toISOString().split('T')[0]);
  const [formWaktu, setFormWaktu] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [formPelapor, setFormPelapor] = useState('Guru Piket / BK');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formTindakLanjut, setFormTindakLanjut] = useState('Tercatat');

  // Detail Modal States
  const [detailStudentNis, setDetailStudentNis] = useState<string | null>(null);

  // Filtered violation options for form
  const formViolationOptions = useMemo(
    () => MASTER_JENIS_PELANGGARAN.filter((item) => item.kategori === formCategory),
    [formCategory]
  );

  const selectedMasterItem = useMemo(
    () =>
      MASTER_JENIS_PELANGGARAN.find((item) => item.kode === formKodePelanggaran) ||
      formViolationOptions[0],
    [formKodePelanggaran, formViolationOptions]
  );

  // Filtered students for quick picker in modal
  const matchingStudentsForInput = useMemo(() => {
    const q = studentSearchInput.trim().toLowerCase();
    if (!q) return students.slice(0, 15);
    return students
      .filter(
        (s) =>
          s.nama.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.kelas.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [students, studentSearchInput]);

  const selectedStudentObj = useMemo(
    () => students.find((s) => s.nis === selectedStudentNis) || null,
    [students, selectedStudentNis]
  );

  // KPI Summary
  const kpiStats = useMemo(() => {
    const totalKasus = violations.length;
    const autoLateCount = violations.filter(
      (v) => v.sumber === 'OTOMATIS_PRESENSI' || v.kode_pelanggaran === ITEM_TERLAMBAT.kode
    ).length;
    const autoDzuhurCount = violations.filter(
      (v) => v.sumber === 'OTOMATIS_SHOLAT' || v.kode_pelanggaran === ITEM_TIDAK_SHOLAT_DZUHUR.kode
    ).length;
    const manualCount = violations.filter((v) => v.sumber === 'MANUAL_GURU').length;

    const studentMap = new Map<string, { poin: number; khusus: boolean }>();
    violations.forEach((v) => {
      const curr = studentMap.get(v.nis) || { poin: 0, khusus: false };
      curr.poin += Number(v.poin) || 0;
      if (v.penanganan_khusus) curr.khusus = true;
      studentMap.set(v.nis, curr);
    });

    let perluPembinaanCount = 0;
    studentMap.forEach((val) => {
      if (val.poin >= 15 || val.khusus) perluPembinaanCount++;
    });

    return {
      totalKasus,
      autoLateCount,
      autoDzuhurCount,
      manualCount,
      perluPembinaanCount,
    };
  }, [violations]);

  // Filtered logs for Tab 1
  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
      if (selectedClass !== 'ALL' && v.kelas !== selectedClass) return false;
      if (selectedCategory !== 'SEMUA' && v.kategori !== selectedCategory) return false;
      if (selectedSource !== 'SEMUA' && v.sumber !== selectedSource) return false;
      if (dateFilter && v.tanggal !== dateFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          v.nama.toLowerCase().includes(q) ||
          v.nis.toLowerCase().includes(q) ||
          v.kelas.toLowerCase().includes(q) ||
          v.jenis_pelanggaran.toLowerCase().includes(q) ||
          v.kode_pelanggaran.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [violations, selectedClass, selectedCategory, selectedSource, dateFilter, searchQuery]);

  // Per-student aggregation for Tab 2
  const studentRecapList = useMemo(() => {
    return students
      .filter((s) => {
        if (selectedClass !== 'ALL' && s.kelas !== selectedClass) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            s.nama.toLowerCase().includes(q) ||
            s.nis.toLowerCase().includes(q) ||
            s.kelas.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .map((s) => {
        const logs = violations.filter((v) => v.nis === s.nis);
        const ringan = logs.filter((v) => v.kategori === 'RINGAN').length;
        const sedang = logs.filter((v) => v.kategori === 'SEDANG').length;
        const berat = logs.filter((v) => v.kategori === 'BERAT').length;
        const terlambat = logs.filter(
          (v) => v.sumber === 'OTOMATIS_PRESENSI' || v.kode_pelanggaran === ITEM_TERLAMBAT.kode
        ).length;
        const alphaDzuhur = logs.filter(
          (v) => v.sumber === 'OTOMATIS_SHOLAT' || v.kode_pelanggaran === ITEM_TIDAK_SHOLAT_DZUHUR.kode
        ).length;
        const totalPoin = logs.reduce((acc, cur) => acc + (Number(cur.poin) || 0), 0);
        const hasKhusus = logs.some((v) => v.penanganan_khusus);
        const pembinaan = getStatusPembinaan(totalPoin, hasKhusus);

        return {
          siswa: s,
          logs,
          ringan,
          sedang,
          berat,
          terlambat,
          alphaDzuhur,
          totalPoin,
          hasKhusus,
          pembinaan,
        };
      })
      .sort((a, b) => {
        if (b.hasKhusus !== a.hasKhusus) return b.hasKhusus ? 1 : -1;
        if (b.totalPoin !== a.totalPoin) return b.totalPoin - a.totalPoin;
        return a.siswa.nama.localeCompare(b.siswa.nama);
      });
  }, [students, violations, selectedClass, searchQuery]);

  // Per-class aggregation for Tab 3
  const classRecapList = useMemo(() => {
    return MASTER_KELAS_LIST.map((klsItem) => {
      const kls = klsItem.kelas;
      const classStudents = students.filter((s) => s.kelas === kls);
      const classLogs = violations.filter((v) => v.kelas === kls);
      const uniqueViolators = new Set(classLogs.map((v) => v.nis)).size;
      const lateCount = classLogs.filter(
        (v) => v.sumber === 'OTOMATIS_PRESENSI' || v.kode_pelanggaran === ITEM_TERLAMBAT.kode
      ).length;
      const dzuhurCount = classLogs.filter(
        (v) => v.sumber === 'OTOMATIS_SHOLAT' || v.kode_pelanggaran === ITEM_TIDAK_SHOLAT_DZUHUR.kode
      ).length;
      const manualCount = classLogs.filter((v) => v.sumber === 'MANUAL_GURU').length;
      const totalPoin = classLogs.reduce((acc, cur) => acc + (Number(cur.poin) || 0), 0);

      return {
        kelas: kls,
        namaJurusan: klsItem.namaJurusan,
        jumlahSiswa: classStudents.length,
        siswaMelanggar: uniqueViolators,
        totalKasus: classLogs.length,
        lateCount,
        dzuhurCount,
        manualCount,
        totalPoin,
      };
    });
  }, [students, violations]);

  // Detail modal student object
  const detailStudentData = useMemo(() => {
    if (!detailStudentNis) return null;
    return studentRecapList.find((item) => item.siswa.nis === detailStudentNis) || null;
  }, [detailStudentNis, studentRecapList]);

  const handleAddManualViolation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentObj || !selectedMasterItem) return;

    const newRecord: PelanggaranSiswa = {
      id: `manual-${selectedStudentObj.nis}-${Date.now()}`,
      siswa_id: selectedStudentObj.id,
      nis: selectedStudentObj.nis,
      nama: selectedStudentObj.nama,
      kelas: selectedStudentObj.kelas,
      jurusan: selectedStudentObj.jurusan,
      tanggal: formTanggal,
      waktu: `${formWaktu}:00`,
      kode_pelanggaran: selectedMasterItem.kode,
      kategori: selectedMasterItem.kategori,
      jenis_pelanggaran: selectedMasterItem.jenis_pelanggaran,
      poin: selectedMasterItem.poin,
      penanganan_khusus: selectedMasterItem.penanganan_khusus,
      sumber: 'MANUAL_GURU',
      keterangan:
        formKeterangan.trim() ||
        `Dicatat oleh ${formPelapor || 'Guru Piket / BK'} (${selectedMasterItem.jenis_pelanggaran})`,
      pelapor: formPelapor.trim() || 'Guru Piket / BK',
      tindak_lanjut: formTindakLanjut,
      created_at: new Date().toISOString(),
    };

    onUpdateViolations([newRecord, ...violations]);
    setShowAddModal(false);
    setFormKeterangan('');
  };

  const handleDeleteViolation = (id: string) => {
    const updated = violations.filter((v) => v.id !== id);
    onUpdateViolations(updated);
  };

  const handleUpdateTindakLanjut = (id: string, status: string) => {
    const updated = violations.map((v) =>
      v.id === id ? { ...v, tindak_lanjut: status } : v
    );
    onUpdateViolations(updated);
  };

  const buildWhatsAppParentLink = (
    siswa: Siswa,
    totalPoin: number,
    latestViolation?: PelanggaranSiswa
  ) => {
    const rawPhone = (siswa.no_wa_ortu || '').replace(/[^0-9]/g, '');
    const normalizedPhone = rawPhone.startsWith('0')
      ? `62${rawPhone.slice(1)}`
      : rawPhone.startsWith('62')
      ? rawPhone
      : `62${rawPhone}`;

    const message = [
      `Assalamu'alaikum Wr. Wb.`,
      `Yth. Orang Tua/Wali dari *${siswa.nama}* (NIS: ${siswa.nis} / Kelas: ${siswa.kelas})`,
      `${config.nama_sekolah}`,
      ``,
      `Menginformasikan catatan kedisiplinan siswa:`,
      latestViolation
        ? `- Pelanggaran: *${latestViolation.jenis_pelanggaran}* (${
            latestViolation.penanganan_khusus ? 'Penanganan Khusus' : `+${latestViolation.poin} Poin`
          })`
        : `- Akumulasi Poin Kedisiplinan`,
      `- Total Akumulasi Poin Saat Ini: *${totalPoin} Poin*`,
      ``,
      `Mohon kerja sama Bapak/Ibu untuk bersama-sama membina kedisiplinan putra/putrinya. Terima kasih.`,
    ].join('\n');

    return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner & Action Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Buku Poin &amp; Pelanggaran Siswa Terintegrasi
                </h2>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  45 Pasal Resmi Sekolah
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                Otomatis mencatat poin{' '}
                <strong>Terlambat (&gt; {config.jam_masuk_batas || '07:00'} WIB = +5 Poin)</strong> &amp;{' '}
                <strong>Tidak Sholat Dzuhur Berjamaah Tanpa Alasan (+5 Poin)</strong> tanpa duplikasi data.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 no-print">
            <button
              onClick={onSyncAutoViolations}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              title="Sinkronkan ulang poin otomatis dari data absensi Masuk & Sholat Dzuhur"
            >
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Sinkron Otomatis Absensi
            </button>

            <button
              onClick={() =>
                exportViolationReportToExcel({
                  students,
                  violations,
                  selectedClass,
                  config,
                })
              }
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Unduh Excel (3 Sheet)
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak PDF
            </button>

            <button
              onClick={() => {
                if (!selectedStudentNis && students.length > 0) {
                  setSelectedStudentNis(students[0].nis);
                }
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Catat Pelanggaran Siswa
            </button>
          </div>
        </div>

        {/* Alur Integrasi Otomatis Banner */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-slate-900 dark:text-white">
                1. Otomatis Scan Masuk (&gt; {config.jam_masuk_batas || '07:00'} WIB)
              </div>
              <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                Saat siswa scan QR Masuk lewat jam 07:00 pagi, sistem otomatis menambah{' '}
                <span className="font-mono font-bold text-amber-800 dark:text-amber-300">
                  +5 Poin (R-01)
                </span>
                . ID terkunci per NIS &amp; Tanggal (anti ganda).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70">
            <Sun className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-slate-900 dark:text-white">
                2. Otomatis Tidak Sholat Dzuhur (+5 Poin)
              </div>
              <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                Siswa yang hadir sekolah namun tidak scan Sholat Dzuhur dan tidak berhalangan otomatis tercatat{' '}
                <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                  +5 Poin (R-18)
                </span>
                . Batal otomatis jika ditandai Berhalangan/Terlaksana.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/70">
            <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-slate-900 dark:text-white">
                3. Input Guru/BK &amp; Eskalasi SP Otomatis
              </div>
              <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                Pelanggaran atribut, membolos, merokok, hingga pelanggaran berat dicatat oleh Guru/BK dan otomatis diakumulasi ke status Pembinaan, SP-1, SP-2, hingga Penanganan Khusus.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Kasus Tercatat
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900 dark:text-white">
              {kpiStats.totalKasus}
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Kasus</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-sm">
          <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            Otomatis Terlambat (R-01)
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-amber-700 dark:text-amber-400">
              {kpiStats.autoLateCount}
            </span>
            <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">
              +{kpiStats.autoLateCount * 5} Poin
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-sm">
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            Alpha Sholat Dzuhur (R-18)
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
              {kpiStats.autoDzuhurCount}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
              +{kpiStats.autoDzuhurCount * 5} Poin
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 shadow-sm">
          <div className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
            Catatan Manual Guru/BK
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-blue-700 dark:text-blue-400">
              {kpiStats.manualCount}
            </span>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Kasus</span>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-sm">
          <div className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
            Perlu Pembinaan / SP
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-rose-700 dark:text-rose-400">
              {kpiStats.perluPembinaanCount}
            </span>
            <span className="text-xs font-semibold text-rose-700 dark:text-slate-300">Siswa</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 shadow-sm flex flex-wrap gap-1.5 no-print">
        <button
          onClick={() => setSubTab('input_log')}
          className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            subTab === 'input_log'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Log Riwayat Pelanggaran ({violations.length})
        </button>

        <button
          onClick={() => setSubTab('rekap_siswa')}
          className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            subTab === 'rekap_siswa'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Laporan Poin Per Siswa ({students.length})
        </button>

        <button
          onClick={() => setSubTab('rekap_kelas')}
          className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            subTab === 'rekap_kelas'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          Laporan Poin Per Kelas (21 Kelas)
        </button>

        <button
          onClick={() => setSubTab('pedoman')}
          className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            subTab === 'pedoman'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Tabel 45 Poin Pelanggaran Resmi
        </button>
      </div>

      {/* Shared Filter Bar for Log & Student Recap */}
      {(subTab === 'input_log' || subTab === 'rekap_siswa') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama siswa, NIS, kelas, atau jenis pelanggaran..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Class Filter */}
            <div>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="ALL">Semua Kelas (21 Kelas)</option>
                {MASTER_KELAS_LIST.map((item) => (
                  <option key={item.kelas} value={item.kelas}>
                    Kelas {item.kelas}
                  </option>
                ))}
              </select>
            </div>

            {subTab === 'input_log' ? (
              <>
                {/* Category Filter */}
                <div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="SEMUA">Semua Kategori</option>
                    <option value="RINGAN">A. Pelanggaran Ringan (5 Poin)</option>
                    <option value="SEDANG">B. Pelanggaran Sedang (10–25 Poin)</option>
                    <option value="BERAT">C. Pelanggaran Berat (40–50 / Khusus)</option>
                  </select>
                </div>

                {/* Source / Date Filter */}
                <div className="flex gap-2">
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="SEMUA">Semua Sumber</option>
                    <option value="OTOMATIS_PRESENSI">Otomatis Terlambat (+5)</option>
                    <option value="OTOMATIS_SHOLAT">Otomatis Sholat Dzuhur (+5)</option>
                    <option value="MANUAL_GURU">Input Guru / BK</option>
                  </select>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                    title="Filter Tanggal"
                  />
                </div>
              </>
            ) : (
              <div className="lg:col-span-2 flex items-center justify-end gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Menampilkan <strong className="font-mono">{studentRecapList.length}</strong> siswa
                  {selectedClass !== 'ALL' ? ` di kelas ${selectedClass}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: LOG RIWAYAT PELANGGARAN */}
      {subTab === 'input_log' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Daftar Log Riwayat Pelanggaran Siswa
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Menampilkan {filteredViolations.length} catatan pelanggaran (otomatis &amp; manual)
              </p>
            </div>
            {(selectedClass !== 'ALL' ||
              selectedCategory !== 'SEMUA' ||
              selectedSource !== 'SEMUA' ||
              dateFilter ||
              searchQuery) && (
              <button
                onClick={() => {
                  setSelectedClass('ALL');
                  setSelectedCategory('SEMUA');
                  setSelectedSource('SEMUA');
                  setDateFilter('');
                  setSearchQuery('');
                }}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          {filteredViolations.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Belum Ada Catatan Pelanggaran
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1">
                Siswa yang datang terlambat (&gt; {config.jam_masuk_batas || '07:00'} WIB) atau tidak mengikuti Sholat Dzuhur berjamaah tanpa alasan akan otomatis tercatat di sini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3.5 px-4">Tanggal &amp; Jam</th>
                    <th className="py-3.5 px-4">Siswa &amp; Kelas</th>
                    <th className="py-3.5 px-4">Kode &amp; Jenis Pelanggaran</th>
                    <th className="py-3.5 px-4 text-center">Poin</th>
                    <th className="py-3.5 px-4">Sumber Integrasi</th>
                    <th className="py-3.5 px-4">Tindak Lanjut</th>
                    <th className="py-3.5 px-4 text-right no-print">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
                  {filteredViolations.map((v) => {
                    const isAutoLate = v.sumber === 'OTOMATIS_PRESENSI';
                    const isAutoDzuhur = v.sumber === 'OTOMATIS_SHOLAT';
                    return (
                      <tr
                        key={v.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {v.tanggal}
                          </div>
                          <div className="font-mono text-xs text-slate-600 dark:text-slate-400">
                            {v.waktu} WIB
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{v.nama}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                              NIS: {v.nis}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                              {v.kelas}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 max-w-md">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold ${
                                v.kategori === 'RINGAN'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                  : v.kategori === 'SEDANG'
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-300 dark:border-orange-800'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              }`}
                            >
                              {v.kode_pelanggaran} • {v.kategori}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900 dark:text-white mt-1">
                            {v.jenis_pelanggaran}
                          </div>
                          {v.keterangan && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                              {v.keterangan}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {v.penanganan_khusus ? (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-rose-600 text-white">
                              PENANGANAN KHUSUS
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 rounded-lg font-mono font-extrabold text-sm bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              +{v.poin}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isAutoLate ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <Clock className="w-3.5 h-3.5" />
                              Otomatis Scan Masuk
                            </span>
                          ) : isAutoDzuhur ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <Sun className="w-3.5 h-3.5" />
                              Otomatis Sholat Dzuhur
                            </span>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                Input Guru / BK
                              </span>
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                                Oleh: {v.pelapor || 'Guru Piket'}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <select
                            value={v.tindak_lanjut || 'Tercatat'}
                            onChange={(e) => handleUpdateTindakLanjut(v.id, e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          >
                            <option value="Tercatat">Tercatat</option>
                            <option value="Pembinaan Wali Kelas">Pembinaan Wali Kelas</option>
                            <option value="Panggilan Guru BK">Panggilan Guru BK</option>
                            <option value="Panggilan Orang Tua">Panggilan Orang Tua</option>
                            <option value="Selesai Dibina">Selesai Dibina</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap no-print">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setDetailStudentNis(v.nis)}
                              className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Lihat Kartu Poin Siswa"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteViolation(v.id)}
                              className="p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                              title="Hapus Catatan Pelanggaran"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LAPORAN PER SISWA */}
      {subTab === 'rekap_siswa' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Laporan Akumulasi Poin Pelanggaran Per Siswa
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Klik tombol Rincian pada siswa untuk melihat daftar pasal pelanggaran dan cetak Kartu Pembinaan Siswa
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3.5 px-4">No</th>
                  <th className="py-3.5 px-4">Nama Siswa &amp; NIS</th>
                  <th className="py-3.5 px-4">Kelas</th>
                  <th className="py-3.5 px-3 text-center">Terlambat (+5)</th>
                  <th className="py-3.5 px-3 text-center">Alpha Dzuhur (+5)</th>
                  <th className="py-3.5 px-3 text-center">Ringan / Sedang / Berat</th>
                  <th className="py-3.5 px-4 text-center">Total Poin</th>
                  <th className="py-3.5 px-4">Status Pembinaan &amp; Tindak Lanjut</th>
                  <th className="py-3.5 px-4 text-right no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
                {studentRecapList.map((item, idx) => (
                  <tr
                    key={item.siswa.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {item.siswa.nama}
                      </div>
                      <div className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        NIS: {item.siswa.nis}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        {item.siswa.kelas}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-amber-700 dark:text-amber-400">
                      {item.terlambat}x
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {item.alphaDzuhur}x
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono">
                      <span className="text-slate-800 dark:text-slate-200 font-bold">
                        {item.ringan}
                      </span>{' '}
                      /{' '}
                      <span className="text-orange-700 dark:text-orange-400 font-bold">
                        {item.sedang}
                      </span>{' '}
                      /{' '}
                      <span className="text-rose-700 dark:text-rose-400 font-bold">
                        {item.berat}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-xl font-mono font-black text-sm ${
                          item.totalPoin === 0 && !item.hasKhusus
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : item.totalPoin < 25 && !item.hasKhusus
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {item.totalPoin} Poin
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-extrabold ${
                          item.pembinaan.level === 'AMAN'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : item.pembinaan.level === 'PEMBINAAN_WALAS'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                            : item.pembinaan.level === 'SP1_ORTU'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                        }`}
                      >
                        {item.pembinaan.label}
                      </span>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {item.pembinaan.tindakan}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap no-print">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDetailStudentNis(item.siswa.nis)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Rincian ({item.logs.length})
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudentNis(item.siswa.nis);
                            setShowAddModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/70 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 cursor-pointer"
                          title="Tambah Pelanggaran Siswa Ini"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Catat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LAPORAN PER KELAS */}
      {subTab === 'rekap_kelas' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Laporan Rekapitulasi Poin Pelanggaran Per Kelas (21 Rombongan Belajar)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Ringkasan kedisiplinan setiap kelas untuk evaluasi Wali Kelas, Guru BK, dan Wakil Kepala Sekolah Kesiswaan
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3.5 px-4">No</th>
                  <th className="py-3.5 px-4">Kelas &amp; Jurusan</th>
                  <th className="py-3.5 px-4 text-center">Jumlah Siswa</th>
                  <th className="py-3.5 px-4 text-center">Siswa Melanggar</th>
                  <th className="py-3.5 px-4 text-center">Kasus Terlambat (R-01)</th>
                  <th className="py-3.5 px-4 text-center">Alpha Sholat Dzuhur (R-18)</th>
                  <th className="py-3.5 px-4 text-center">Pelanggaran Lainnya</th>
                  <th className="py-3.5 px-4 text-center">Total Poin Kelas</th>
                  <th className="py-3.5 px-4 text-right no-print">Detail Kelas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
                {classRecapList.map((row, index) => (
                  <tr
                    key={row.kelas}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {row.kelas}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {row.namaJurusan}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                      {row.jumlahSiswa}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-700 dark:text-rose-400">
                      {row.siswaMelanggar} Siswa
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-700 dark:text-amber-400">
                      {row.lateCount}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {row.dzuhurCount}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-700 dark:text-blue-400">
                      {row.manualCount}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-3 py-1 rounded-xl font-mono font-black text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700">
                        {row.totalPoin} Poin
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right no-print">
                      <button
                        onClick={() => {
                          setSelectedClass(row.kelas);
                          setSubTab('rekap_siswa');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/70 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 cursor-pointer"
                      >
                        <Filter className="w-3.5 h-3.5" />
                        Buka Rekap Kelas
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TABEL PEDOMAN 45 POIN PELANGGARAN RESMI */}
      {subTab === 'pedoman' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {(['RINGAN', 'SEDANG', 'BERAT'] as KategoriPelanggaran[]).map((kat) => {
            const list = MASTER_JENIS_PELANGGARAN.filter((i) => i.kategori === kat);
            const title =
              kat === 'RINGAN'
                ? 'A. Pelanggaran Ringan (18 Pasal)'
                : kat === 'SEDANG'
                ? 'B. Pelanggaran Sedang (15 Pasal)'
                : 'C. Pelanggaran Berat (12 Pasal)';
            const badgeColor =
              kat === 'RINGAN'
                ? 'bg-amber-600 text-white'
                : kat === 'SEDANG'
                ? 'bg-orange-600 text-white'
                : 'bg-rose-600 text-white';

            return (
              <div
                key={kat}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col"
              >
                <div className={`px-4 py-3.5 ${badgeColor} flex items-center justify-between`}>
                  <h4 className="font-extrabold text-sm tracking-tight">{title}</h4>
                  <span className="text-xs font-mono font-bold opacity-90">
                    {kat === 'RINGAN'
                      ? '5 Poin'
                      : kat === 'SEDANG'
                      ? '10 - 25 Poin'
                      : '40 - 50 / Khusus'}
                  </span>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-800 flex-1">
                  {list.map((item) => (
                    <div
                      key={item.kode}
                      className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="font-mono text-xs font-extrabold text-slate-500 dark:text-slate-400 w-6 shrink-0">
                          {item.nomor}.
                        </span>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {item.jenis_pelanggaran}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              Kode: {item.kode}
                            </span>
                            {item.otomatis_sistem === 'TERLAMBAT' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Otomatis Scan Masuk &gt; 07:00
                              </span>
                            )}
                            {item.otomatis_sistem === 'TIDAK_SHOLAT_DZUHUR' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Otomatis Alpha Sholat Dzuhur
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {item.penanganan_khusus ? (
                          <span className="inline-block px-2 py-1 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            Penanganan khusus
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-lg font-mono font-black text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700">
                            {item.poin} Poin
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL INPUT PELANGGARAN MANUAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto no-print">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertOctagon className="w-5 h-5" />
                <h3 className="font-extrabold text-base">Catat Pelanggaran Siswa</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddManualViolation} className="p-6 space-y-4">
              {/* Cari & Pilih Siswa */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">
                  1. Cari &amp; Pilih Siswa
                </label>
                <input
                  type="text"
                  value={studentSearchInput}
                  onChange={(e) => setStudentSearchInput(e.target.value)}
                  placeholder="Ketik nama siswa, NIS, atau kelas..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm mb-2"
                />
                <select
                  value={selectedStudentNis}
                  onChange={(e) => setSelectedStudentNis(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-bold"
                >
                  <option value="" disabled>
                    -- Pilih Siswa --
                  </option>
                  {matchingStudentsForInput.map((s) => (
                    <option key={s.id} value={s.nis}>
                      {s.nama} — NIS: {s.nis} ({s.kelas})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pilih Kategori */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">
                  2. Kategori Pelanggaran
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['RINGAN', 'SEDANG', 'BERAT'] as KategoriPelanggaran[]).map((kat) => (
                    <button
                      type="button"
                      key={kat}
                      onClick={() => {
                        setFormCategory(kat);
                        const first = MASTER_JENIS_PELANGGARAN.find((i) => i.kategori === kat);
                        if (first) setFormKodePelanggaran(first.kode);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                        formCategory === kat
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {kat === 'RINGAN'
                        ? 'A. Ringan (5 Poin)'
                        : kat === 'SEDANG'
                        ? 'B. Sedang (10-25)'
                        : 'C. Berat (40-50)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilih Jenis Pelanggaran */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1.5">
                  3. Pasal / Jenis Pelanggaran Resmi
                </label>
                <select
                  value={formKodePelanggaran}
                  onChange={(e) => setFormKodePelanggaran(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-bold"
                >
                  {formViolationOptions.map((item) => (
                    <option key={item.kode} value={item.kode}>
                      [{item.kode}] {item.nomor}. {item.jenis_pelanggaran} (
                      {item.penanganan_khusus ? 'Penanganan Khusus' : `${item.poin} Poin`})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal, Waktu, Pelapor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Waktu (WIB)
                  </label>
                  <input
                    type="time"
                    value={formWaktu}
                    onChange={(e) => setFormWaktu(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Dicatat Oleh
                  </label>
                  <input
                    type="text"
                    value={formPelapor}
                    onChange={(e) => setFormPelapor(e.target.value)}
                    placeholder="Guru Piket / BK"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Status Tindak Lanjut & Keterangan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Tindak Lanjut
                  </label>
                  <select
                    value={formTindakLanjut}
                    onChange={(e) => setFormTindakLanjut(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                  >
                    <option value="Tercatat">Tercatat</option>
                    <option value="Pembinaan Wali Kelas">Pembinaan Wali Kelas</option>
                    <option value="Panggilan Guru BK">Panggilan Guru BK</option>
                    <option value="Panggilan Orang Tua">Panggilan Orang Tua</option>
                    <option value="Selesai Dibina">Selesai Dibina</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Catatan Tambahan / Kronologi
                  </label>
                  <input
                    type="text"
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    placeholder="Opsional: keterangan tambahan..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer"
                >
                  Simpan Catatan Pelanggaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAIL KARTU POIN SISWA */}
      {detailStudentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">
                  Kartu Poin Kedisiplinan &amp; Pembinaan Siswa
                </h3>
                <p className="text-xs text-slate-300">
                  {detailStudentData.siswa.nama} • NIS: {detailStudentData.siswa.nis} • Kelas:{' '}
                  {detailStudentData.siswa.kelas}
                </p>
              </div>
              <button
                onClick={() => setDetailStudentNis(null)}
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Ringkasan Status Siswa */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Total Akumulasi Poin
                  </div>
                  <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
                    {detailStudentData.totalPoin} Poin
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Otomatis Terlambat
                  </div>
                  <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                    {detailStudentData.terlambat}x
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Alpha Sholat Dzuhur
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {detailStudentData.alphaDzuhur}x
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Status Pembinaan
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                    {detailStudentData.pembinaan.label}
                  </div>
                </div>
              </div>

              {/* Rekomendasi Tindak Lanjut */}
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                    Rekomendasi Tindak Lanjut Sekolah:
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {detailStudentData.pembinaan.tindakan}
                  </div>
                </div>
                {detailStudentData.siswa.no_wa_ortu && (
                  <a
                    href={buildWhatsAppParentLink(
                      detailStudentData.siswa,
                      detailStudentData.totalPoin,
                      detailStudentData.logs[0]
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Kirim Laporan WA ke Ortu
                  </a>
                )}
              </div>

              {/* Tabel Rincian Pelanggaran Siswa */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Riwayat Pelanggaran ({detailStudentData.logs.length} Catatan)
                </h4>
                {detailStudentData.logs.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-400">
                    Siswa ini belum memiliki catatan pelanggaran (0 Poin — Disiplin Baik).
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold uppercase">
                          <th className="py-2.5 px-3">Tanggal</th>
                          <th className="py-2.5 px-3">Kode</th>
                          <th className="py-2.5 px-3">Jenis Pelanggaran</th>
                          <th className="py-2.5 px-3 text-center">Poin</th>
                          <th className="py-2.5 px-3">Sumber</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {detailStudentData.logs.map((log) => (
                          <tr key={log.id}>
                            <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-slate-200">
                              {log.tanggal} ({log.waktu})
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                              {log.kode_pelanggaran}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                              {log.jenis_pelanggaran}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                              {log.penanganan_khusus ? 'Khusus' : `+${log.poin}`}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                              {log.sumber === 'OTOMATIS_PRESENSI'
                                ? 'Otomatis Scan Masuk'
                                : log.sumber === 'OTOMATIS_SHOLAT'
                                ? 'Otomatis Sholat Dzuhur'
                                : `Manual (${log.pelapor || 'Guru'})`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
