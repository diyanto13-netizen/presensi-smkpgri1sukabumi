import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  UserX,
  FileSpreadsheet,
  Printer,
  Sparkles,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { Siswa, Absensi, StatusAbsensi, SchoolConfig } from '../types';
import { getTodayDateString, formatIndonesianDate } from '../utils/storage';
import { exportAttendanceToExcel } from '../utils/excelExport';
import { MASTER_KELAS_LIST } from '../utils/classConfig';
import { SchoolLogo } from './SchoolLogo';
import { AttendanceTrendChart } from './AttendanceTrendChart';

interface AttendanceRecapProps {
  students: Siswa[];
  attendanceRecords: Absensi[];
  config: SchoolConfig;
  onUpdateAttendance: (records: Absensi[]) => void;
}

export const AttendanceRecap: React.FC<AttendanceRecapProps> = ({
  students,
  attendanceRecords,
  config,
  onUpdateAttendance,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Unique classes list
  const classes = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => set.add(s.kelas));
    return Array.from(set).sort();
  }, [students]);

  // Merge student list with attendance logs for the selected date
  const consolidatedList = useMemo(() => {
    const studentsInScope = students.filter(
      s => selectedClass === 'ALL' || s.kelas === selectedClass
    );

    return studentsInScope.map(student => {
      const record = attendanceRecords.find(
        r => r.nis === student.nis && r.tanggal === selectedDate
      );
      return {
        student,
        record: record || null,
      };
    });
  }, [students, attendanceRecords, selectedDate, selectedClass]);

  // Statistics
  const stats = useMemo(() => {
    let tepatWaktu = 0;
    let terlambat = 0;
    let sudahPulang = 0;
    let belumAbsen = 0;

    consolidatedList.forEach(item => {
      if (!item.record || !item.record.jam_masuk) {
        belumAbsen++;
      } else {
        if (item.record.status_masuk === 'TEPAT_WAKTU') tepatWaktu++;
        if (item.record.status_masuk === 'TERLAMBAT') terlambat++;
        if (item.record.status_pulang === 'PULANG') sudahPulang++;
      }
    });

    const total = consolidatedList.length;
    const persentase = total > 0 ? Math.round(((tepatWaktu + terlambat) / total) * 100) : 0;

    return {
      total,
      tepatWaktu,
      terlambat,
      sudahPulang,
      belumAbsen,
      persentase,
    };
  }, [consolidatedList]);

  // 1. Export Native Excel (.xlsx) Siap Cetak
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    setExportNotice('Menyiapkan file Excel rapi dengan Kop YPLP PGRI, tabel bergaris, dan lembar tanda tangan...');
    try {
      await exportAttendanceToExcel({
        students,
        attendanceRecords,
        date: selectedDate,
        selectedClass,
        config,
      });
      setExportNotice('Berhasil! File Excel siap cetak (.xlsx) telah diunduh.');
      setTimeout(() => setExportNotice(null), 5000);
    } catch (error) {
      console.error('Failed to export Excel:', error);
      alert('Gagal mengekspor file Excel: ' + (error as Error).message);
      setExportNotice(null);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // 2. Direct Print / PDF Print
  const handlePrintReport = () => {
    window.print();
  };

  // 3. Export to CSV Fallback
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Tanggal',
      'NIS',
      'NISN',
      'Nama Siswa',
      'Jenis Kelamin',
      'Kelas',
      'Jurusan',
      'Jam Masuk',
      'Status Masuk',
      'Jam Pulang',
      'Status Akhir',
      'Notifikasi WA',
      'Keterangan',
    ];

    const rows = consolidatedList.map((item, idx) => {
      const r = item.record;
      return [
        idx + 1,
        selectedDate,
        item.student.nis,
        item.student.nisn || '-',
        `"${item.student.nama}"`,
        item.student.jenis_kelamin,
        item.student.kelas,
        `"${item.student.jurusan}"`,
        r?.jam_masuk || '-',
        r?.status_masuk || 'BELUM HADIR',
        r?.jam_pulang || '-',
        r?.status_akhir || 'BELUM_ABSEN',
        r?.notifikasi_wa_terkirim ? 'Terkirim' : 'Belum/Gagal',
        `"${r?.keterangan || '-'}"`,
      ].join(',');
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Presensi_SMKS_PGRI_1_Sukabumi_${selectedDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Manual Status Override (e.g. Izin, Sakit, Alpa)
  const handleManualStatusChange = (student: Siswa, newStatus: StatusAbsensi) => {
    const existingIndex = attendanceRecords.findIndex(
      r => r.nis === student.nis && r.tanggal === selectedDate
    );

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour12: false });

    if (existingIndex >= 0) {
      const updated = [...attendanceRecords];
      updated[existingIndex] = {
        ...updated[existingIndex],
        status_akhir: newStatus,
        keterangan: `Diset manual oleh Guru Piket (${newStatus})`,
      };
      onUpdateAttendance(updated);
    } else {
      const newRec: Absensi = {
        id: 'att-' + Date.now(),
        siswa_id: student.id,
        nis: student.nis,
        nama: student.nama,
        kelas: student.kelas,
        tanggal: selectedDate,
        jam_masuk: nowTime,
        status_masuk: newStatus === 'TERLAMBAT' ? 'TERLAMBAT' : 'TEPAT_WAKTU',
        jam_pulang: null,
        status_pulang: null,
        status_akhir: newStatus,
        keterangan: `Dicatat manual sebagai ${newStatus}`,
        notifikasi_wa_terkirim: false,
        created_at: new Date().toISOString(),
      };
      onUpdateAttendance([...attendanceRecords, newRec]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner (Hidden when printing) */}
      <div className="no-print bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200">
              REKAPITULASI PRESENSI HARIAN
            </span>
            <span className="text-xs sm:text-sm text-slate-500 font-semibold">
              {formatIndonesianDate(selectedDate)}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-blue-950 mt-1.5">
            Rekap Kehadiran Harian Siswa
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 leading-relaxed font-medium">
            Laporan lengkap presensi jam masuk, keterlambatan, jam pulang, dan status notifikasi WhatsApp orang tua siswa SMKS PGRI 1 Sukabumi.
          </p>
        </div>

        {/* Export & Print Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Excel Export Button */}
          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel || consolidatedList.length === 0}
            className="px-5 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-700 hover:to-teal-900 text-white shadow-md flex items-center gap-2.5 transition disabled:opacity-50 cursor-pointer"
            title="Download file Excel (.xlsx) dengan Kop Surat, layout A4 Landscape, garis pembatas, dan lembar tanda tangan siap cetak"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            <span>
              {isExportingExcel ? 'Menyiapkan Excel...' : 'Ekspor Excel Siap Cetak (.xlsx)'}
            </span>
          </button>

          {/* Direct Print to PDF */}
          <button
            onClick={handlePrintReport}
            className="px-4.5 py-3 rounded-xl font-bold text-sm bg-blue-950 hover:bg-black text-amber-300 shadow-md flex items-center gap-2 transition print-include cursor-pointer"
            title="Cetak langsung lembar laporan presensi hari ini"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </button>

          {/* Raw CSV Fallback */}
          <button
            onClick={handleExportCSV}
            className="px-4 py-3 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-2 transition cursor-pointer"
            title="Download format raw CSV sederhana"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Export Feedback Alert */}
      {exportNotice && (
        <div className="no-print p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-sm flex items-center gap-2.5 animate-fadeIn shadow-xs">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{exportNotice}</span>
        </div>
      )}

      {/* Metric Cards Summary */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Siswa</span>
          <div className="text-3xl sm:text-4xl font-heading font-black text-blue-950 mt-1.5">{stats.total}</div>
          <span className="text-xs text-slate-500 font-medium mt-1">Dalam filter rombel</span>
        </div>

        <div className="bg-emerald-50/80 p-5 rounded-2xl border border-emerald-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Tepat Waktu
          </span>
          <div className="text-3xl sm:text-4xl font-heading font-black text-emerald-800 mt-1.5">
            {stats.tepatWaktu}
          </div>
          <span className="text-xs text-emerald-700 font-bold mt-1">&le; {config.jam_masuk_batas} WIB</span>
        </div>

        <div className="bg-amber-50/80 p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Terlambat
          </span>
          <div className="text-3xl sm:text-4xl font-heading font-black text-amber-900 mt-1.5">
            {stats.terlambat}
          </div>
          <span className="text-xs text-amber-800 font-bold mt-1">&gt; {config.jam_masuk_batas} WIB</span>
        </div>

        <div className="bg-blue-50/80 p-5 rounded-2xl border border-blue-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" />
            Sudah Pulang
          </span>
          <div className="text-3xl sm:text-4xl font-heading font-black text-blue-900 mt-1.5">
            {stats.sudahPulang}
          </div>
          <span className="text-xs text-blue-700 font-medium mt-1">Scan pulang tercatat</span>
        </div>

        <div className="bg-rose-50/80 p-5 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
            <UserX className="w-4 h-4 text-rose-600" />
            Belum Hadir
          </span>
          <div className="text-3xl sm:text-4xl font-heading font-black text-rose-900 mt-1.5">
            {stats.belumAbsen}
          </div>
          <span className="text-xs text-rose-700 font-medium mt-1">Belum ada scan</span>
        </div>

        <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Kehadiran</span>
          <div className="text-3xl sm:text-4xl font-heading font-black text-blue-950 mt-1.5">
            {stats.persentase}%
          </div>
          <span className="text-xs text-slate-600 font-medium mt-1">Rasio siswa hadir</span>
        </div>
      </div>

      {/* Recharts Visual Trend Chart Component */}
      <div className="no-print">
        <AttendanceTrendChart
          attendanceRecords={attendanceRecords}
          students={students}
          selectedClass={selectedClass}
        />
      </div>

      {/* Date & Class Filter Bar */}
      <div className="no-print bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-blue-900" />
            <label className="font-bold text-slate-800">Pilih Tanggal:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="py-2 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <Filter className="w-5 h-5 text-blue-900" />
            <label className="font-bold text-slate-800">Filter Rombel / Kelas:</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="py-2 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-900"
            >
              <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
              <optgroup label="Kelas XII (7 Rombel)">
                {MASTER_KELAS_LIST.filter(k => k.tingkat === 'XII').map(k => (
                  <option key={k.kelas} value={k.kelas}>
                    Kelas {k.kelas} - {k.namaJurusan}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Kelas XI (7 Rombel)">
                {MASTER_KELAS_LIST.filter(k => k.tingkat === 'XI').map(k => (
                  <option key={k.kelas} value={k.kelas}>
                    Kelas {k.kelas} - {k.namaJurusan}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Kelas X (7 Rombel)">
                {MASTER_KELAS_LIST.filter(k => k.tingkat === 'X').map(k => (
                  <option key={k.kelas} value={k.kelas}>
                    Kelas {k.kelas} - {k.namaJurusan}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-600 text-xs sm:text-sm font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Format file Excel: <strong>.xlsx asli bergaris rapi</strong> (Font Arial, Kop Yayasan, Lembar Tanda Tangan).</span>
        </div>
      </div>

      {/* Printable Sheet View Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-5 sm:p-7">
        {/* Printable Formal School Header */}
        <div className="border-b-2 border-amber-500 pb-4 mb-5 select-none">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
            <div className="w-16 h-18 p-0.5 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 shadow-sm flex items-center justify-center border border-amber-300 shrink-0">
              <div className="w-full h-full rounded-xl bg-white/95 flex items-center justify-center p-1 overflow-hidden">
                <SchoolLogo
                  src={config.logo_url}
                  className="w-full h-full object-contain drop-shadow-xs"
                  alt={config.nama_sekolah}
                />
              </div>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs uppercase tracking-wider text-slate-600 font-bold">
                {config.yayasan}
              </p>
              <h2 className="text-xl sm:text-2xl font-heading font-black text-blue-950 uppercase tracking-tight mt-0.5">
                {config.nama_sekolah}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 italic mt-1 font-medium">
                NPSN: {config.npsn} • {config.akreditasi} • {config.alamat} • Telp: {config.telepon}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200 text-center">
            <h3 className="text-sm sm:text-base font-heading font-black text-slate-900 uppercase">
              LAPORAN REKAPITULASI PRESENSI HARIAN SISWA
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Hari / Tanggal: <strong className="text-slate-900">{formatIndonesianDate(selectedDate)}</strong> | Filter: <strong className="text-slate-900">{selectedClass === 'ALL' ? 'Semua Kelas' : `Kelas ${selectedClass}`}</strong> | Batas Masuk: <strong className="text-slate-900">{config.jam_masuk_batas} WIB</strong>
            </p>
          </div>
        </div>

        {/* Recap Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-950 border border-slate-900 text-amber-300 uppercase font-heading text-xs font-bold">
                <th className="py-3 px-3 text-center w-12">No</th>
                <th className="py-3 px-3.5 text-center">NIS</th>
                <th className="py-3 px-3.5">Nama Lengkap Siswa</th>
                <th className="py-3 px-2 text-center w-12">L/P</th>
                <th className="py-3 px-3.5 text-center">Kelas</th>
                <th className="py-3 px-3.5">Jurusan</th>
                <th className="py-3 px-3 text-center">Jam Masuk</th>
                <th className="py-3 px-3.5 text-center">Status Masuk</th>
                <th className="py-3 px-3 text-center">Jam Pulang</th>
                <th className="py-3 px-3.5 text-center">Status Akhir</th>
                <th className="py-3 px-3.5 text-center no-print">Notif WA</th>
                <th className="py-3 px-3.5 text-center no-print">Tindakan Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 border border-slate-200">
              {consolidatedList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-400 text-base">
                    Tidak ada siswa ditemukan pada filter ini.
                  </td>
                </tr>
              ) : (
                consolidatedList.map(({ student, record }, idx) => {
                  const status = record?.status_akhir || 'BELUM_ABSEN';
                  const isEven = idx % 2 === 1;

                  return (
                    <tr
                      key={student.id}
                      className={`${isEven ? 'bg-slate-50/70' : 'bg-white'} hover:bg-blue-50/40 transition`}
                    >
                      <td className="py-3 px-3 text-center font-mono text-slate-500 border-r border-slate-200 font-semibold">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono font-bold text-blue-950 border-r border-slate-200">
                        {student.nis}
                      </td>

                      <td className="py-3 px-3.5 font-bold text-slate-900 border-r border-slate-200 text-sm sm:text-base">
                        {student.nama}
                      </td>

                      <td className="py-3 px-2 text-center text-slate-700 font-bold border-r border-slate-200">
                        {student.jenis_kelamin}
                      </td>

                      <td className="py-3 px-3.5 text-center font-bold text-slate-800 border-r border-slate-200">
                        {student.kelas}
                      </td>

                      <td className="py-3 px-3.5 text-slate-600 text-xs sm:text-sm border-r border-slate-200 font-medium">
                        {student.jurusan}
                      </td>

                      <td className="py-3 px-3 text-center font-mono border-r border-slate-200 font-semibold">
                        {record?.jam_masuk ? (
                          <span className="font-bold text-slate-900">
                            {record.jam_masuk}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center border-r border-slate-200">
                        {record?.status_masuk === 'TEPAT_WAKTU' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            Tepat Waktu
                          </span>
                        )}
                        {record?.status_masuk === 'TERLAMBAT' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300">
                            Terlambat
                          </span>
                        )}
                        {!record?.status_masuk && (
                          <span className="text-slate-400 text-xs italic font-medium">Belum Hadir</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center font-mono border-r border-slate-200">
                        {record?.jam_pulang ? (
                          <span className="font-bold text-slate-900">{record.jam_pulang}</span>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium" title="Jadwal kepulangan resmi kelas">
                            {config.jam_pulang_per_kelas?.[student.kelas] || student.jam_pulang}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center border-r border-slate-200">
                        {status === 'TEPAT_WAKTU' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900">
                            Hadir (Tepat)
                          </span>
                        )}
                        {status === 'TERLAMBAT' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950">
                            Hadir (Telat)
                          </span>
                        )}
                        {status === 'PULANG' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900">
                            Sudah Pulang
                          </span>
                        )}
                        {status === 'IZIN' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900">
                            Izin
                          </span>
                        )}
                        {status === 'SAKIT' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900">
                            Sakit
                          </span>
                        )}
                        {status === 'BELUM_ABSEN' && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                            Nihil
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center border-r border-slate-200 no-print">
                        {record?.notifikasi_wa_terkirim ? (
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                            Terkirim
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center no-print">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleManualStatusChange(student, 'TEPAT_WAKTU')}
                            className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold cursor-pointer"
                            title="Set Hadir Tepat Waktu"
                          >
                            Hadir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleManualStatusChange(student, 'TERLAMBAT')}
                            className="px-2 py-1 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-bold cursor-pointer"
                            title="Set Terlambat"
                          >
                            Telat
                          </button>
                          <button
                            type="button"
                            onClick={() => handleManualStatusChange(student, 'IZIN')}
                            className="px-2 py-1 rounded-lg bg-purple-50 text-purple-900 hover:bg-purple-100 text-xs font-bold cursor-pointer"
                            title="Set Izin"
                          >
                            Izin
                          </button>
                          <button
                            type="button"
                            onClick={() => handleManualStatusChange(student, 'SAKIT')}
                            className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-900 hover:bg-indigo-100 text-xs font-bold cursor-pointer"
                            title="Set Sakit"
                          >
                            Sakit
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

        {/* Printable Formal Sign-off Section (Tanda Tangan Pengesahan) */}
        <div className="mt-10 pt-6 grid grid-cols-2 gap-8 text-sm text-slate-800 border-t border-slate-200">
          <div className="text-center">
            <p className="font-semibold text-slate-600">Mengetahui,</p>
            <p className="font-bold text-blue-950 text-base">Kepala SMKS PGRI 1 Kota Sukabumi</p>
            <div className="h-20 flex items-center justify-center">
              <span className="font-serif italic text-slate-300 text-xs">[Tanda Tangan &amp; Stempel]</span>
            </div>
            <p className="font-bold underline text-blue-950 text-base">
              {config.kepala_sekolah}
            </p>
            <p className="text-xs font-mono text-slate-500 mt-0.5">NIP. {config.nip_kepsek}</p>
          </div>

          <div className="text-center">
            <p className="text-slate-600 italic">Sukabumi, {formatIndonesianDate(selectedDate)}</p>
            <p className="font-bold text-blue-950 text-base">Petugas Piket / Kesiswaan</p>
            <div className="h-20 flex items-center justify-center">
              <span className="font-serif italic text-slate-300 text-xs">[Tanda Tangan]</span>
            </div>
            <p className="font-bold underline text-slate-900 text-base">
              ( .................................................... )
            </p>
            <p className="text-xs font-mono text-slate-500 mt-0.5">NIP / NUPTK. -</p>
          </div>
        </div>
      </div>
    </div>
  );
};
