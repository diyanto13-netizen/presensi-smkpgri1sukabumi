import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Sun,
  Moon,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { Absensi, Siswa } from '../types';

interface AttendanceTrendChartProps {
  attendanceRecords: Absensi[];
  students: Siswa[];
  selectedClass?: string;
}

export const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({
  attendanceRecords,
  students,
  selectedClass = 'ALL',
}) => {
  const [mainTab, setMainTab] = useState<'kbm' | 'sholat'>('sholat');
  const [rangeMode, setRangeMode] = useState<'weekly' | 'monthly'>('weekly');
  const [sholatSessionFilter, setSholatSessionFilter] = useState<'split' | 'dzuhur' | 'ashar' | 'compare'>('split');

  // Filter scope by selectedClass
  const filteredStudents = useMemo(() => {
    return students.filter(s => selectedClass === 'ALL' || s.kelas === selectedClass);
  }, [students, selectedClass]);

  const targetStudentNisSet = useMemo(() => {
    return new Set(filteredStudents.map(s => s.nis));
  }, [filteredStudents]);

  const totalSiswaScope = filteredStudents.length || 1;

  // Generate date list for last 7 or 30 days
  const chartData = useMemo(() => {
    const days = rangeMode === 'weekly' ? 7 : 30;
    const result = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Indonesian short day & date label
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
      const dayDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const label = rangeMode === 'weekly' ? `${dayName}, ${dayDate}` : dayDate;

      // Filter records for this date and within class scope
      const dayRecords = attendanceRecords.filter(r => {
        if (r.tanggal !== dateStr) return false;
        if (selectedClass !== 'ALL' && !targetStudentNisSet.has(r.nis)) return false;
        return true;
      });

      // KBM metrics
      let tepatWaktu = 0;
      let terlambat = 0;
      let pulang = 0;

      // Shalat Dzuhur metrics
      let dzuhurTerlaksana = 0;
      let dzuhurBerhalangan = 0;

      // Shalat Ashar metrics
      let asharTerlaksana = 0;
      let asharBerhalangan = 0;

      dayRecords.forEach(r => {
        if (r.status_masuk === 'TEPAT_WAKTU') tepatWaktu++;
        if (r.status_masuk === 'TERLAMBAT') terlambat++;
        if (r.status_pulang === 'PULANG') pulang++;

        if (r.status_dzuhur === 'TERLAKSANA') dzuhurTerlaksana++;
        if (r.status_dzuhur === 'BERHALANGAN') dzuhurBerhalangan++;

        if (r.status_ashar === 'TERLAKSANA') asharTerlaksana++;
        if (r.status_ashar === 'BERHALANGAN') asharBerhalangan++;
      });

      const totalHadir = tepatWaktu + terlambat;
      const persentase = Math.min(100, Math.round((totalHadir / totalSiswaScope) * 100));

      const dzuhurBelum = Math.max(0, totalSiswaScope - (dzuhurTerlaksana + dzuhurBerhalangan));
      const dzuhurPersen = Math.min(100, Math.round((dzuhurTerlaksana / totalSiswaScope) * 100));

      const asharBelum = Math.max(0, totalSiswaScope - (asharTerlaksana + asharBerhalangan));
      const asharPersen = Math.min(100, Math.round((asharTerlaksana / totalSiswaScope) * 100));

      result.push({
        dateStr,
        label,
        tepatWaktu,
        terlambat,
        pulang,
        totalHadir,
        persentase,
        // Prayer data
        dzuhurTerlaksana,
        dzuhurBerhalangan,
        dzuhurBelum,
        dzuhurPersen,
        asharTerlaksana,
        asharBerhalangan,
        asharBelum,
        asharPersen,
        totalSholat: dzuhurTerlaksana + asharTerlaksana,
      });
    }

    return result;
  }, [rangeMode, attendanceRecords, selectedClass, targetStudentNisSet, totalSiswaScope]);

  // Overall statistics for KBM
  const kbmPeriodStats = useMemo(() => {
    let totalHadirSum = 0;
    let totalTepatWaktu = 0;
    let totalTerlambat = 0;
    let highestAttendance = { label: '-', count: 0 };

    chartData.forEach(item => {
      totalHadirSum += item.totalHadir;
      totalTepatWaktu += item.tepatWaktu;
      totalTerlambat += item.terlambat;
      if (item.totalHadir > highestAttendance.count) {
        highestAttendance = { label: item.label, count: item.totalHadir };
      }
    });

    const activeDaysCount = chartData.filter(d => d.totalHadir > 0).length || 1;
    const avgHadir = Math.round(totalHadirSum / activeDaysCount);

    return {
      totalHadirSum,
      totalTepatWaktu,
      totalTerlambat,
      avgHadir,
      highestAttendance,
    };
  }, [chartData]);

  // Overall statistics for Sholat Dzuhur & Ashar
  const sholatPeriodStats = useMemo(() => {
    let sumDzuhur = 0;
    let sumAshar = 0;
    let sumUdzurDzuhur = 0;
    let sumUdzurAshar = 0;
    let peakDzuhur = { label: '-', count: 0 };
    let peakAshar = { label: '-', count: 0 };

    chartData.forEach(item => {
      sumDzuhur += item.dzuhurTerlaksana;
      sumAshar += item.asharTerlaksana;
      sumUdzurDzuhur += item.dzuhurBerhalangan;
      sumUdzurAshar += item.asharBerhalangan;

      if (item.dzuhurTerlaksana > peakDzuhur.count) {
        peakDzuhur = { label: item.label, count: item.dzuhurTerlaksana };
      }
      if (item.asharTerlaksana > peakAshar.count) {
        peakAshar = { label: item.label, count: item.asharTerlaksana };
      }
    });

    const activeDzuhurDays = chartData.filter(d => d.dzuhurTerlaksana > 0).length || 1;
    const activeAsharDays = chartData.filter(d => d.asharTerlaksana > 0).length || 1;

    const avgDzuhur = Math.round(sumDzuhur / activeDzuhurDays);
    const avgAshar = Math.round(sumAshar / activeAsharDays);

    const avgDzuhurPercent = Math.min(100, Math.round((avgDzuhur / totalSiswaScope) * 100));
    const avgAsharPercent = Math.min(100, Math.round((avgAshar / totalSiswaScope) * 100));

    return {
      sumDzuhur,
      sumAshar,
      sumUdzurDzuhur,
      sumUdzurAshar,
      avgDzuhur,
      avgAshar,
      avgDzuhurPercent,
      avgAsharPercent,
      peakDzuhur,
      peakAshar,
    };
  }, [chartData, totalSiswaScope]);

  // Custom KBM Chart Tooltip
  const CustomKbmTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xl border border-slate-700 text-xs space-y-2 min-w-[210px]">
          <div className="font-bold text-sm text-blue-200 border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span>{data.label}</span>
            <span className="text-slate-400 font-mono text-[11px]">{data.dateStr}</span>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Tepat Waktu:
              </span>
              <span className="font-bold font-mono text-emerald-300">{data.tepatWaktu} siswa</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Terlambat:
              </span>
              <span className="font-bold font-mono text-amber-300">{data.terlambat} siswa</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                Sudah Pulang:
              </span>
              <span className="font-bold font-mono text-blue-300">{data.pulang} siswa</span>
            </div>
            <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between font-bold text-slate-100">
              <span>Total Hadir KBM:</span>
              <span className="font-mono text-white">{data.totalHadir} siswa ({data.persentase}%)</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Dzuhur Chart Tooltip
  const CustomDzuhurTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xl border border-teal-800 text-xs space-y-2 min-w-[220px]">
          <div className="font-bold text-sm text-teal-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>🕌</span> Sesi Shalat Dzuhur
            </span>
            <span className="text-slate-400 font-mono text-[11px]">{data.dateStr}</span>
          </div>
          <div className="text-xs text-slate-300 font-semibold">{data.label}</div>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-teal-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                Hadir Sholat (Terlaksana):
              </span>
              <span className="font-bold font-mono text-teal-200">{data.dzuhurTerlaksana} siswa</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-purple-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                Berhalangan / Udzur:
              </span>
              <span className="font-bold font-mono text-purple-200">{data.dzuhurBerhalangan} siswa</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />
                Belum Presensi / Nihil:
              </span>
              <span className="font-bold font-mono text-slate-300">{data.dzuhurBelum} siswa</span>
            </div>
            <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between font-bold text-teal-100">
              <span>Partisipasi Dzuhur:</span>
              <span className="font-mono text-teal-300">{data.dzuhurPersen}% siswa</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Ashar Chart Tooltip
  const CustomAsharTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xl border border-sky-800 text-xs space-y-2 min-w-[220px]">
          <div className="font-bold text-sm text-sky-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>🕌</span> Sesi Shalat Ashar
            </span>
            <span className="text-slate-400 font-mono text-[11px]">{data.dateStr}</span>
          </div>
          <div className="text-xs text-slate-300 font-semibold">{data.label}</div>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sky-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                Hadir Sholat (Terlaksana):
              </span>
              <span className="font-bold font-mono text-sky-200">{data.asharTerlaksana} siswa</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-purple-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                Berhalangan / Udzur:
              </span>
              <span className="font-bold font-mono text-purple-200">{data.asharBerhalangan} siswa</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />
                Belum Presensi / Nihil:
              </span>
              <span className="font-bold font-mono text-slate-300">{data.asharBelum} siswa</span>
            </div>
            <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between font-bold text-sky-100">
              <span>Partisipasi Ashar:</span>
              <span className="font-mono text-sky-300">{data.asharPersen}% siswa</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
      {/* Primary Navigation & Switcher Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span
              className={`p-2.5 rounded-xl border shrink-0 ${
                mainTab === 'sholat'
                  ? 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : 'bg-blue-100 dark:bg-blue-950/90 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-700'
              }`}
            >
              {mainTab === 'sholat' ? <span className="text-xl">🕌</span> : <TrendingUp className="w-5 h-5" />}
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-heading font-black text-slate-900 dark:text-white">
                {mainTab === 'sholat'
                  ? 'Visualisasi Tren Kehadiran Sholat Dzuhur & Ashar'
                  : 'Visualisasi Tren Presensi KBM Siswa'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                {mainTab === 'sholat'
                  ? `Monitoring kepatuhan ibadah sholat berjamaah ${rangeMode === 'weekly' ? '7 hari terakhir' : '30 hari terakhir'}`
                  : `Grafik kehadiran jam masuk & pulang ${rangeMode === 'weekly' ? '7 hari terakhir' : '30 hari terakhir'}`}{' '}
                {selectedClass !== 'ALL' ? `(Kelas ${selectedClass})` : '(Semua Kelas)'}
              </p>
            </div>
          </div>
        </div>

        {/* Top Controls: Mode Switcher & Time Range */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Main Mode: Shalat vs KBM */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setMainTab('sholat')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                mainTab === 'sholat'
                  ? 'bg-emerald-700 dark:bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <span>🕌</span>
              <span>Tren Shalat (Dzuhur &amp; Ashar)</span>
            </button>
            <button
              type="button"
              onClick={() => setMainTab('kbm')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                mainTab === 'kbm'
                  ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Presensi KBM</span>
            </button>
          </div>

          {/* Time Range Switcher (7 Days vs 30 Days) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setRangeMode('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                rangeMode === 'weekly'
                  ? 'bg-blue-950 dark:bg-amber-400 text-amber-300 dark:text-slate-950 shadow-xs'
                  : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Mingguan (7 Hari)
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                rangeMode === 'monthly'
                  ? 'bg-blue-950 dark:bg-amber-400 text-amber-300 dark:text-slate-950 shadow-xs'
                  : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Bulanan (30 Hari)
            </button>
          </div>
        </div>
      </div>

      {/* VIEW: TREN SHALAT DZUHUR & ASHAR */}
      {mainTab === 'sholat' ? (
        <div className="space-y-6">
          {/* Sholat Sub-selector: Terpisah (Split) vs Dzuhur vs Ashar vs Compare */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800/95 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                Pilihan Tampilan Grafik Sesi:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSholatSessionFilter('split')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  sholatSessionFilter === 'split'
                    ? 'bg-emerald-700 dark:bg-emerald-600 text-white shadow-xs border border-emerald-800 dark:border-emerald-500'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700'
                }`}
              >
                <span>📊</span>
                <span>Terpisah (Dzuhur &amp; Ashar)</span>
              </button>
              <button
                type="button"
                onClick={() => setSholatSessionFilter('dzuhur')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  sholatSessionFilter === 'dzuhur'
                    ? 'bg-teal-700 dark:bg-teal-600 text-white shadow-xs border border-teal-800 dark:border-teal-500'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-teal-50 dark:hover:bg-slate-700'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Khusus Sesi Dzuhur</span>
              </button>
              <button
                type="button"
                onClick={() => setSholatSessionFilter('ashar')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  sholatSessionFilter === 'ashar'
                    ? 'bg-sky-700 dark:bg-sky-600 text-white shadow-xs border border-sky-800 dark:border-sky-500'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-700'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Khusus Sesi Ashar</span>
              </button>
              <button
                type="button"
                onClick={() => setSholatSessionFilter('compare')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  sholatSessionFilter === 'compare'
                    ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-xs border border-blue-950 dark:border-blue-500'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700'
                }`}
              >
                <span>⚖️</span>
                <span>Perbandingan Dzuhur vs Ashar</span>
              </button>
            </div>
          </div>

          {/* KPI Highlights for Shalat — High Contrast Solid Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Rata-rata Dzuhur */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/95 border-2 border-teal-200 dark:border-teal-700/80 shadow-2xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-amber-300 border border-teal-300 dark:border-teal-700 shrink-0">
                <Sun className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-teal-900 dark:text-teal-300 uppercase tracking-wide">
                  Rata-rata Dzuhur
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 dark:text-white mt-0.5">
                  {sholatPeriodStats.avgDzuhur}{' '}
                  <span className="text-xs font-sans font-bold text-slate-600 dark:text-slate-300">
                    siswa/hari
                  </span>
                </div>
                <div className="text-xs text-teal-800 dark:text-teal-300 font-bold mt-0.5">
                  Partisipasi: ~{sholatPeriodStats.avgDzuhurPercent}%
                </div>
              </div>
            </div>

            {/* Card 2: Rata-rata Ashar */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/95 border-2 border-sky-200 dark:border-sky-700/80 shadow-2xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700 shrink-0">
                <Moon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wide">
                  Rata-rata Ashar
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 dark:text-white mt-0.5">
                  {sholatPeriodStats.avgAshar}{' '}
                  <span className="text-xs font-sans font-bold text-slate-600 dark:text-slate-300">
                    siswa/hari
                  </span>
                </div>
                <div className="text-xs text-sky-800 dark:text-sky-300 font-bold mt-0.5">
                  Partisipasi: ~{sholatPeriodStats.avgAsharPercent}%
                </div>
              </div>
            </div>

            {/* Card 3: Udzur Syar'i / Izin */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/95 border-2 border-purple-200 dark:border-purple-700/80 shadow-2xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wide">
                  Udzur Syar&apos;i / Izin
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 dark:text-white mt-0.5">
                  {sholatPeriodStats.sumUdzurDzuhur + sholatPeriodStats.sumUdzurAshar}{' '}
                  <span className="text-xs font-sans font-bold text-slate-600 dark:text-slate-300">
                    catatan
                  </span>
                </div>
                <div className="text-xs text-purple-800 dark:text-purple-300 font-bold mt-0.5">
                  Dzuhur: {sholatPeriodStats.sumUdzurDzuhur} • Ashar: {sholatPeriodStats.sumUdzurAshar}
                </div>
              </div>
            </div>

            {/* Card 4: Total Presensi Shalat */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/95 border-2 border-emerald-200 dark:border-emerald-700/80 shadow-2xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide">
                  Total Presensi Shalat
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 dark:text-white mt-0.5">
                  {sholatPeriodStats.sumDzuhur + sholatPeriodStats.sumAshar}{' '}
                  <span className="text-xs font-sans font-bold text-slate-600 dark:text-slate-300">
                    presensi
                  </span>
                </div>
                <div className="text-xs text-emerald-800 dark:text-emerald-300 font-bold mt-0.5 truncate">
                  Puncak: {sholatPeriodStats.peakDzuhur.label}
                </div>
              </div>
            </div>
          </div>

          {/* RENDER CHARTS ACCORDING TO USER FILTER */}

          {/* 1. OPTION 'SPLIT': Menampilkan Sesi Sholat Dzuhur dan Ashar SECARA TERPISAH (2 Grafik Berdampingan) */}
          {sholatSessionFilter === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CHART 1: SESI SHALAT DZUHUR */}
              <div className="bg-slate-50 dark:bg-slate-800/90 p-5 rounded-2xl border border-teal-200 dark:border-teal-800/80 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700 rounded-xl text-sm">
                      🕌
                    </span>
                    <div>
                      <h4 className="font-heading font-black text-slate-900 dark:text-white text-sm sm:text-base">
                        Tren Sesi Sholat Dzuhur
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Kehadiran sholat Dzuhur berjamaah di musholla
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-300 border border-teal-300 dark:border-teal-700">
                    Sesi Dzuhur
                  </span>
                </div>

                <div className="w-full h-64 sm:h-72 pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" strokeOpacity={0.35} />
                      <XAxis
                        dataKey="label"
                        stroke="#64748B"
                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                        tickLine={false}
                        axisLine={{ stroke: '#94A3B8', strokeOpacity: 0.5 }}
                        interval={rangeMode === 'monthly' ? 4 : 0}
                      />
                      <YAxis
                        stroke="#64748B"
                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }}
                        tickLine={false}
                        axisLine={{ stroke: '#94A3B8', strokeOpacity: 0.5 }}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomDzuhurTooltip />} />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                        formatter={(val) => {
                          if (val === 'dzuhurTerlaksana') return <span className="text-teal-800 dark:text-teal-300 font-bold">Terlaksana (Hadir)</span>;
                          if (val === 'dzuhurBerhalangan') return <span className="text-purple-800 dark:text-purple-300 font-bold">Berhalangan (Udzur)</span>;
                          return val;
                        }}
                      />
                      <Bar
                        dataKey="dzuhurTerlaksana"
                        name="dzuhurTerlaksana"
                        fill="#0D9488"
                        stackId="dz"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="dzuhurBerhalangan"
                        name="dzuhurBerhalangan"
                        fill="#A855F7"
                        stackId="dz"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 2: SESI SHALAT ASHAR */}
              <div className="bg-slate-50 dark:bg-slate-800/90 p-5 rounded-2xl border border-sky-200 dark:border-sky-800/80 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700 rounded-xl text-sm">
                      🕌
                    </span>
                    <div>
                      <h4 className="font-heading font-black text-slate-900 dark:text-white text-sm sm:text-base">
                        Tren Sesi Sholat Ashar
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Kehadiran sholat Ashar berjamaah sebelum kepulangan
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-300 border border-sky-300 dark:border-sky-700">
                    Sesi Ashar
                  </span>
                </div>

                <div className="w-full h-64 sm:h-72 pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" strokeOpacity={0.35} />
                      <XAxis
                        dataKey="label"
                        stroke="#64748B"
                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                        tickLine={false}
                        axisLine={{ stroke: '#94A3B8', strokeOpacity: 0.5 }}
                        interval={rangeMode === 'monthly' ? 4 : 0}
                      />
                      <YAxis
                        stroke="#64748B"
                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }}
                        tickLine={false}
                        axisLine={{ stroke: '#94A3B8', strokeOpacity: 0.5 }}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomAsharTooltip />} />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                        formatter={(val) => {
                          if (val === 'asharTerlaksana') return <span className="text-sky-800 dark:text-sky-300 font-bold">Terlaksana (Hadir)</span>;
                          if (val === 'asharBerhalangan') return <span className="text-purple-800 dark:text-purple-300 font-bold">Berhalangan (Udzur)</span>;
                          return val;
                        }}
                      />
                      <Bar
                        dataKey="asharTerlaksana"
                        name="asharTerlaksana"
                        fill="#0284C7"
                        stackId="as"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="asharBerhalangan"
                        name="asharBerhalangan"
                        fill="#A855F7"
                        stackId="as"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* 2. OPTION 'DZUHUR': Fokus Tampilan Penuh Sesi Sholat Dzuhur */}
          {sholatSessionFilter === 'dzuhur' && (
            <div className="bg-slate-50 dark:bg-slate-800/90 p-6 rounded-2xl border border-teal-200 dark:border-teal-800/80 space-y-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="font-heading font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                    <span>🕌</span> Grafik Detail Tren Sesi Shalat Dzuhur
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Analisis kehadiran shalat Dzuhur berjamaah vs berhalangan vs nihil presensi
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-300 bg-teal-100 dark:bg-teal-950 border border-teal-300 dark:border-teal-700 px-3 py-1 rounded-full">
                    Rata-rata: {sholatPeriodStats.avgDzuhur} siswa ({sholatPeriodStats.avgDzuhurPercent}%)
                  </span>
                </div>
              </div>

              <div className="w-full h-72 sm:h-80 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" strokeOpacity={0.35} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748B"
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={{ stroke: '#94A3B8', strokeOpacity: 0.5 }}
                      interval={rangeMode === 'monthly' ? 4 : 0}
                    />
                    <YAxis
                      stroke="#64748B"
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }}
                      tickLine={false}
                      axisLine={{ stroke: '#94A3B8', strokeOpacity: 0.5 }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomDzuhurTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                      formatter={(val) => {
                        if (val === 'dzuhurTerlaksana') return <span className="text-teal-800 dark:text-teal-300 font-bold">Terlaksana (Hadir)</span>;
                        if (val === 'dzuhurBerhalangan') return <span className="text-purple-800 dark:text-purple-300 font-bold">Berhalangan (Udzur Syar&apos;i)</span>;
                        return val;
                      }}
                    />
                    <Bar
                      dataKey="dzuhurTerlaksana"
                      name="dzuhurTerlaksana"
                      fill="#0D9488"
                      stackId="dzFull"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="dzuhurBerhalangan"
                      name="dzuhurBerhalangan"
                      fill="#A855F7"
                      stackId="dzFull"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 3. OPTION 'ASHAR': Fokus Tampilan Penuh Sesi Sholat Ashar */}
          {sholatSessionFilter === 'ashar' && (
            <div className="bg-slate-50 dark:bg-slate-800/90 p-6 rounded-2xl border border-sky-200 dark:border-sky-800/80 space-y-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="font-heading font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                    <span>🕌</span> Grafik Detail Tren Sesi Shalat Ashar
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Analisis kehadiran shalat Ashar berjamaah sebelum pulang sekolah
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-sky-900 dark:text-sky-300 bg-sky-100 dark:bg-sky-950 border border-sky-300 dark:border-sky-700 px-3 py-1 rounded-full">
                    Rata-rata: {sholatPeriodStats.avgAshar} siswa ({sholatPeriodStats.avgAsharPercent}%)
                  </span>
                </div>
              </div>

              <div className="w-full h-72 sm:h-80 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" strokeOpacity={0.35} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748B"
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={{ stroke: '#94A3B8', strokeOpacity: 0.5 }}
                      interval={rangeMode === 'monthly' ? 4 : 0}
                    />
                    <YAxis
                      stroke="#64748B"
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }}
                      tickLine={false}
                      axisLine={{ stroke: '#94A3B8', strokeOpacity: 0.5 }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomAsharTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                      formatter={(val) => {
                        if (val === 'asharTerlaksana') return <span className="text-sky-800 dark:text-sky-300 font-bold">Terlaksana (Hadir)</span>;
                        if (val === 'asharBerhalangan') return <span className="text-purple-800 dark:text-purple-300 font-bold">Berhalangan (Udzur Syar&apos;i)</span>;
                        return val;
                      }}
                    />
                    <Bar
                      dataKey="asharTerlaksana"
                      name="asharTerlaksana"
                      fill="#0284C7"
                      stackId="asFull"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="asharBerhalangan"
                      name="asharBerhalangan"
                      fill="#A855F7"
                      stackId="asFull"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 4. OPTION 'COMPARE': Perbandingan Langsung Dzuhur vs Ashar */}
          {sholatSessionFilter === 'compare' && (
            <div className="bg-slate-50 dark:bg-slate-800/90 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 space-y-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="font-heading font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                    <span>⚖️</span> Komparasi Kehadiran Sesi Dzuhur vs Sesi Ashar
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Perbandingan langsung jumlah siswa yang shalat di sesi Dzuhur vs sesi Ashar
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-300 bg-teal-100 dark:bg-teal-950 border border-teal-300 dark:border-teal-700 px-2.5 py-1 rounded-full">
                    Dzuhur: ~{sholatPeriodStats.avgDzuhurPercent}%
                  </span>
                  <span className="text-xs font-bold text-sky-900 dark:text-sky-300 bg-sky-100 dark:bg-sky-950 border border-sky-300 dark:border-sky-700 px-2.5 py-1 rounded-full">
                    Ashar: ~{sholatPeriodStats.avgAsharPercent}%
                  </span>
                </div>
              </div>

              <div className="w-full h-72 sm:h-80 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" strokeOpacity={0.35} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748B"
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={{ stroke: '#94A3B8', strokeOpacity: 0.5 }}
                      interval={rangeMode === 'monthly' ? 4 : 0}
                    />
                    <YAxis
                      stroke="#64748B"
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }}
                      tickLine={false}
                      axisLine={{ stroke: '#94A3B8', strokeOpacity: 0.5 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={(props) => {
                        if (props.active && props.payload && props.payload.length) {
                          const data = props.payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xl border border-slate-700 text-xs space-y-2 min-w-[210px]">
                              <div className="font-bold text-sm text-indigo-200 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                                <span>{data.label}</span>
                                <span className="text-slate-400 font-mono text-[11px]">{data.dateStr}</span>
                              </div>
                              <div className="space-y-1.5 pt-1">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-teal-400 font-medium">
                                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                                    Sholat Dzuhur:
                                  </span>
                                  <span className="font-bold font-mono text-teal-300">
                                    {data.dzuhurTerlaksana} siswa ({data.dzuhurPersen}%)
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-sky-400 font-medium">
                                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                                    Sholat Ashar:
                                  </span>
                                  <span className="font-bold font-mono text-sky-300">
                                    {data.asharTerlaksana} siswa ({data.asharPersen}%)
                                  </span>
                                </div>
                                <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between font-bold text-slate-100">
                                  <span>Total Ibadah Hari Ini:</span>
                                  <span className="font-mono text-white">{data.totalSholat} presensi</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                      formatter={(val) => {
                        if (val === 'dzuhurTerlaksana') return <span className="text-teal-800 dark:text-teal-300 font-bold">Dzuhur (Terlaksana)</span>;
                        if (val === 'asharTerlaksana') return <span className="text-sky-800 dark:text-sky-300 font-bold">Ashar (Terlaksana)</span>;
                        return val;
                      }}
                    />
                    <Bar
                      dataKey="dzuhurTerlaksana"
                      name="dzuhurTerlaksana"
                      fill="#0D9488"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="asharTerlaksana"
                      name="asharTerlaksana"
                      fill="#0284C7"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW: TREN PRESENSI KBM (MASUK & PULANG) */
        <div className="space-y-6">
          {/* Mini KPI Highlights for KBM — High Contrast Solid Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/95 border-2 border-blue-200 dark:border-blue-700/80 shadow-2xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-700 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wide">
                  Rata-rata Hadir
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 dark:text-white mt-0.5">
                  {kbmPeriodStats.avgHadir}{' '}
                  <span className="text-xs font-sans font-bold text-slate-600 dark:text-slate-300">
                    siswa/hari
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/95 border-2 border-emerald-200 dark:border-emerald-700/80 shadow-2xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide">
                  Tepat Waktu
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 dark:text-white mt-0.5">
                  {kbmPeriodStats.totalTepatWaktu}{' '}
                  <span className="text-xs font-sans font-bold text-slate-600 dark:text-slate-300">
                    presensi
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/95 border-2 border-amber-200 dark:border-amber-700/80 shadow-2xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide">
                  Terlambat
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 dark:text-white mt-0.5">
                  {kbmPeriodStats.totalTerlambat}{' '}
                  <span className="text-xs font-sans font-bold text-slate-600 dark:text-slate-300">
                    presensi
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/95 border-2 border-purple-200 dark:border-purple-700/80 shadow-2xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-700 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wide">
                  Puncak Hadir
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 dark:text-white mt-0.5 truncate">
                  {kbmPeriodStats.highestAttendance.label}
                </div>
              </div>
            </div>
          </div>

          {/* Main Recharts Graphic Container for KBM */}
          <div className="bg-slate-50 dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="w-full h-72 sm:h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" strokeOpacity={0.35} />
                  <XAxis
                    dataKey="label"
                    stroke="#64748B"
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: '#94A3B8', strokeOpacity: 0.5 }}
                    interval={rangeMode === 'monthly' ? 4 : 0}
                  />
                  <YAxis
                    stroke="#64748B"
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={{ stroke: '#94A3B8', strokeOpacity: 0.5 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomKbmTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                    iconType="circle"
                    formatter={(value) => {
                      if (value === 'tepatWaktu') return <span className="text-emerald-800 dark:text-emerald-300 font-bold">Tepat Waktu</span>;
                      if (value === 'terlambat') return <span className="text-amber-800 dark:text-amber-300 font-bold">Terlambat</span>;
                      if (value === 'pulang') return <span className="text-blue-800 dark:text-blue-300 font-bold">Sudah Pulang</span>;
                      return value;
                    }}
                  />
                  <Bar
                    dataKey="tepatWaktu"
                    name="tepatWaktu"
                    fill="#10B981"
                    stackId="a"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="terlambat"
                    name="terlambat"
                    fill="#F59E0B"
                    stackId="a"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="pulang"
                    name="pulang"
                    fill="#2563EB"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
