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
  ShieldCheck,
  Award,
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

      dayRecords.forEach(r => {
        if (r.status_masuk === 'TEPAT_WAKTU') tepatWaktu++;
        if (r.status_masuk === 'TERLAMBAT') terlambat++;
        if (r.status_pulang === 'PULANG') pulang++;

        if (r.status_dzuhur === 'TERLAKSANA') dzuhurTerlaksana++;
        if (r.status_dzuhur === 'BERHALANGAN') dzuhurBerhalangan++;
      });

      const totalHadir = tepatWaktu + terlambat;
      const persentase = Math.min(100, Math.round((totalHadir / totalSiswaScope) * 100));

      const dzuhurBelum = Math.max(0, totalSiswaScope - (dzuhurTerlaksana + dzuhurBerhalangan));
      const dzuhurPersen = Math.min(100, Math.round((dzuhurTerlaksana / totalSiswaScope) * 100));

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

  // Overall statistics for Sholat Dzuhur
  const sholatPeriodStats = useMemo(() => {
    let sumDzuhur = 0;
    let sumUdzurDzuhur = 0;
    let peakDzuhur = { label: '-', count: 0 };

    chartData.forEach(item => {
      sumDzuhur += item.dzuhurTerlaksana;
      sumUdzurDzuhur += item.dzuhurBerhalangan;

      if (item.dzuhurTerlaksana > peakDzuhur.count) {
        peakDzuhur = { label: item.label, count: item.dzuhurTerlaksana };
      }
    });

    const activeDzuhurDays = chartData.filter(d => d.dzuhurTerlaksana > 0).length || 1;
    const avgDzuhur = Math.round(sumDzuhur / activeDzuhurDays);
    const avgDzuhurPercent = Math.min(100, Math.round((avgDzuhur / totalSiswaScope) * 100));

    return {
      sumDzuhur,
      sumUdzurDzuhur,
      avgDzuhur,
      avgDzuhurPercent,
      peakDzuhur,
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
              <span>🕌</span> Sesi Sholat Dzuhur
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
                  ? 'Visualisasi Tren Kehadiran Sholat Dzuhur Berjamaah'
                  : 'Visualisasi Tren Presensi KBM Siswa'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                {mainTab === 'sholat'
                  ? `Monitoring kepatuhan ibadah sholat Dzuhur berjamaah ${rangeMode === 'weekly' ? '7 hari terakhir' : '30 hari terakhir'}`
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
              <span>Tren Sholat Dzuhur</span>
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

      {/* VIEW: TREN SHALAT DZUHUR */}
      {mainTab === 'sholat' ? (
        <div className="space-y-6">
          {/* KPI Highlights for Shalat Dzuhur — High Contrast Solid Cards */}
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

            {/* Card 2: Total Hadir Dzuhur */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/95 border-2 border-emerald-200 dark:border-emerald-700/80 shadow-2xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide">
                  Total Hadir Dzuhur
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 dark:text-white mt-0.5">
                  {sholatPeriodStats.sumDzuhur}{' '}
                  <span className="text-xs font-sans font-bold text-slate-600 dark:text-slate-300">
                    presensi
                  </span>
                </div>
                <div className="text-xs text-emerald-800 dark:text-emerald-300 font-bold mt-0.5">
                  Terlaksana di musholla
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
                  {sholatPeriodStats.sumUdzurDzuhur}{' '}
                  <span className="text-xs font-sans font-bold text-slate-600 dark:text-slate-300">
                    catatan
                  </span>
                </div>
                <div className="text-xs text-purple-800 dark:text-purple-300 font-bold mt-0.5">
                  Siswi berhalangan
                </div>
              </div>
            </div>

            {/* Card 4: Puncak Jamaah Dzuhur */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/95 border-2 border-amber-200 dark:border-amber-700/80 shadow-2xs flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide">
                  Puncak Jamaah
                </div>
                <div className="text-lg sm:text-xl font-mono font-black text-slate-900 dark:text-white mt-0.5 truncate">
                  {sholatPeriodStats.peakDzuhur.label}
                </div>
                <div className="text-xs text-amber-800 dark:text-amber-300 font-bold mt-0.5 truncate">
                  {sholatPeriodStats.peakDzuhur.count} siswa hadir
                </div>
              </div>
            </div>
          </div>

          {/* Grafik Detail Tren Sesi Sholat Dzuhur */}
          <div className="bg-slate-50 dark:bg-slate-800/90 p-6 rounded-2xl border border-teal-200 dark:border-teal-800/80 space-y-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h4 className="font-heading font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                  <span>🕌</span> Grafik Tren Kehadiran Sholat Dzuhur Berjamaah
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Analisis kehadiran sholat Dzuhur berjamaah vs berhalangan syar&apos;i
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
