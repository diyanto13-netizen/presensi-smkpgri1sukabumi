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
  Calendar,
  BarChart3,
  Users,
  CheckCircle2,
  Sparkles,
  Sun,
  CloudSun,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { Absensi, Siswa } from '../types';

interface PrayerTrendChartProps {
  attendanceRecords: Absensi[];
  students: Siswa[];
  selectedClass?: string;
}

export type PrayerSessionTab = 'COMPARE' | 'DZUHUR' | 'ASHAR';

export const PrayerTrendChart: React.FC<PrayerTrendChartProps> = ({
  attendanceRecords,
  students,
  selectedClass = 'ALL',
}) => {
  const [rangeMode, setRangeMode] = useState<'weekly' | 'monthly'>('weekly');
  const [sessionTab, setSessionTab] = useState<PrayerSessionTab>('COMPARE');

  // Filter scope by selectedClass
  const filteredStudents = useMemo(() => {
    return students.filter(s => selectedClass === 'ALL' || s.kelas === selectedClass);
  }, [students, selectedClass]);

  const targetStudentNisSet = useMemo(() => {
    return new Set(filteredStudents.map(s => s.nis));
  }, [filteredStudents]);

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

      let dzuhurHadir = 0;
      let dzuhurUzur = 0;
      let asharHadir = 0;
      let asharUzur = 0;

      dayRecords.forEach(r => {
        if (r.status_dzuhur === 'TERLAKSANA') dzuhurHadir++;
        if (r.status_dzuhur === 'BERHALANGAN') dzuhurUzur++;
        if (r.status_ashar === 'TERLAKSANA') asharHadir++;
        if (r.status_ashar === 'BERHALANGAN') asharUzur++;
      });

      const totalSiswaScope = filteredStudents.length || 1;
      const dzuhurPercent = Math.min(100, Math.round((dzuhurHadir / totalSiswaScope) * 100));
      const asharPercent = Math.min(100, Math.round((asharHadir / totalSiswaScope) * 100));
      const dzuhurBelum = Math.max(0, totalSiswaScope - dzuhurHadir - dzuhurUzur);
      const asharBelum = Math.max(0, totalSiswaScope - asharHadir - asharUzur);

      result.push({
        dateStr,
        label,
        dzuhurHadir,
        dzuhurUzur,
        dzuhurBelum,
        dzuhurPercent,
        asharHadir,
        asharUzur,
        asharBelum,
        asharPercent,
        totalSholat: dzuhurHadir + asharHadir,
      });
    }

    return result;
  }, [rangeMode, attendanceRecords, selectedClass, targetStudentNisSet, filteredStudents.length]);

  // Overall statistics for the selected period
  const periodStats = useMemo(() => {
    let dzuhurSum = 0;
    let asharSum = 0;
    let uzurSum = 0;
    let highestDzuhur = { label: '-', count: 0 };
    let highestAshar = { label: '-', count: 0 };

    chartData.forEach(item => {
      dzuhurSum += item.dzuhurHadir;
      asharSum += item.asharHadir;
      uzurSum += item.dzuhurUzur + item.asharUzur;

      if (item.dzuhurHadir > highestDzuhur.count) {
        highestDzuhur = { label: item.label, count: item.dzuhurHadir };
      }
      if (item.asharHadir > highestAshar.count) {
        highestAshar = { label: item.label, count: item.asharHadir };
      }
    });

    const activeDaysCount = chartData.filter(d => d.totalSholat > 0).length || 1;
    const avgDzuhur = Math.round(dzuhurSum / activeDaysCount);
    const avgAshar = Math.round(asharSum / activeDaysCount);

    return {
      dzuhurSum,
      asharSum,
      uzurSum,
      avgDzuhur,
      avgAshar,
      highestDzuhur,
      highestAshar,
    };
  }, [chartData]);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-2.5 min-w-[220px]">
          <div className="font-bold text-sm text-teal-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>🕌</span>
              <span>{data.label}</span>
            </span>
            <span className="text-slate-400 font-mono text-[11px]">{data.dateStr}</span>
          </div>

          {sessionTab === 'COMPARE' && (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-teal-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                  Sholat Dzuhur:
                </span>
                <span className="font-bold font-mono text-teal-200">
                  {data.dzuhurHadir} siswa ({data.dzuhurPercent}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sky-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                  Sholat Ashar:
                </span>
                <span className="font-bold font-mono text-sky-200">
                  {data.asharHadir} siswa ({data.asharPercent}%)
                </span>
              </div>

              {(data.dzuhurUzur > 0 || data.asharUzur > 0) && (
                <div className="flex items-center justify-between text-purple-300 pt-1 border-t border-slate-800">
                  <span>Berhalangan (Uzur):</span>
                  <span className="font-mono font-bold">
                    Dz: {data.dzuhurUzur} • As: {data.asharUzur}
                  </span>
                </div>
              )}
            </div>
          )}

          {sessionTab === 'DZUHUR' && (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-teal-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                  Hadir Dzuhur:
                </span>
                <span className="font-bold font-mono text-teal-200">
                  {data.dzuhurHadir} siswa ({data.dzuhurPercent}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-purple-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                  Berhalangan Syar'i:
                </span>
                <span className="font-bold font-mono text-purple-200">{data.dzuhurUzur} siswa</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Belum / Tidak Hadir:</span>
                <span className="font-mono">{data.dzuhurBelum} siswa</span>
              </div>
            </div>
          )}

          {sessionTab === 'ASHAR' && (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sky-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                  Hadir Ashar:
                </span>
                <span className="font-bold font-mono text-sky-200">
                  {data.asharHadir} siswa ({data.asharPercent}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-purple-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                  Berhalangan Syar'i:
                </span>
                <span className="font-bold font-mono text-purple-200">{data.asharUzur} siswa</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Belum / Tidak Hadir:</span>
                <span className="font-mono">{data.asharBelum} siswa</span>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
      {/* Header with Session Switcher & Time Range */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 text-white shadow-xs">
            <span className="text-xl">🕌</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-heading font-black text-slate-900">
                Visualisasi Tren Presensi Sholat Berjamaah
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-900 border border-teal-300">
                Masjid Al-Ikhlas
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Monitoring partisipasi Sholat Dzuhur dan Sholat Ashar {rangeMode === 'weekly' ? '7 hari terakhir' : '30 hari terakhir'} {selectedClass !== 'ALL' ? `(Kelas ${selectedClass})` : '(Semua Kelas)'}
            </p>
          </div>
        </div>

        {/* Action Controls: Session Tabs & Time Range */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Session Tab Switcher (Dzuhur vs Ashar vs Compare) */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setSessionTab('COMPARE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                sessionTab === 'COMPARE'
                  ? 'bg-blue-950 text-amber-300 shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Perbandingan</span>
            </button>
            <button
              type="button"
              onClick={() => setSessionTab('DZUHUR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                sessionTab === 'DZUHUR'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Sesi Dzuhur</span>
            </button>
            <button
              type="button"
              onClick={() => setSessionTab('ASHAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                sessionTab === 'ASHAR'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <CloudSun className="w-3.5 h-3.5 text-amber-300" />
              <span>Sesi Ashar</span>
            </button>
          </div>

          {/* Time Range Switcher */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setRangeMode('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                rangeMode === 'weekly'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>7 Hari</span>
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                rangeMode === 'monthly'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>30 Hari</span>
            </button>
          </div>
        </div>
      </div>

      {/* Islamic KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-xl bg-teal-50/80 border border-teal-200 flex items-center gap-3 shadow-2xs">
          <div className="p-2.5 rounded-lg bg-teal-100 text-teal-900 shrink-0">
            <Sun className="w-4 h-4 text-teal-700" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-teal-800 uppercase tracking-wide truncate">
              Rata-rata Dzuhur
            </div>
            <div className="text-lg sm:text-xl font-heading font-black text-teal-950 mt-0.5">
              {periodStats.avgDzuhur} <span className="text-xs font-medium text-slate-500">siswa/hari</span>
            </div>
            <div className="text-[11px] text-teal-700 font-medium">Total: {periodStats.dzuhurSum} presensi</div>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-sky-50/80 border border-sky-200 flex items-center gap-3 shadow-2xs">
          <div className="p-2.5 rounded-lg bg-sky-100 text-sky-900 shrink-0">
            <CloudSun className="w-4 h-4 text-sky-700" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-sky-800 uppercase tracking-wide truncate">
              Rata-rata Ashar
            </div>
            <div className="text-lg sm:text-xl font-heading font-black text-sky-950 mt-0.5">
              {periodStats.avgAshar} <span className="text-xs font-medium text-slate-500">siswa/hari</span>
            </div>
            <div className="text-[11px] text-sky-700 font-medium">Total: {periodStats.asharSum} presensi</div>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-purple-50/80 border border-purple-200 flex items-center gap-3 shadow-2xs">
          <div className="p-2.5 rounded-lg bg-purple-100 text-purple-900 shrink-0">
            <ShieldCheck className="w-4 h-4 text-purple-700" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-purple-800 uppercase tracking-wide truncate">
              Uzur Syar'i (Siswi)
            </div>
            <div className="text-lg sm:text-xl font-heading font-black text-purple-950 mt-0.5">
              {periodStats.uzurSum} <span className="text-xs font-medium text-purple-700">catatan</span>
            </div>
            <div className="text-[11px] text-purple-700 font-medium">Berhalangan ibadah</div>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center gap-3 shadow-2xs">
          <div className="p-2.5 rounded-lg bg-amber-100 text-amber-900 shrink-0">
            <Award className="w-4 h-4 text-amber-700" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide truncate">
              Puncak Jamaah
            </div>
            <div className="text-base sm:text-lg font-heading font-black text-amber-950 mt-0.5 truncate">
              {periodStats.highestDzuhur.label}
            </div>
            <div className="text-[11px] text-amber-800 font-bold">
              {periodStats.highestDzuhur.count} siswa hadir
            </div>
          </div>
        </div>
      </div>

      {/* Main Recharts Graphic Container */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {sessionTab === 'COMPARE' ? (
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="label"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                interval={rangeMode === 'monthly' ? 4 : 0}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                iconType="circle"
                formatter={(value) => {
                  if (value === 'dzuhurHadir') return <span className="text-teal-900 font-bold">Sholat Dzuhur ☀️</span>;
                  if (value === 'asharHadir') return <span className="text-sky-900 font-bold">Sholat Ashar 🌤️</span>;
                  return value;
                }}
              />
              <Bar
                dataKey="dzuhurHadir"
                name="dzuhurHadir"
                fill="#0D9488"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="asharHadir"
                name="asharHadir"
                fill="#0284C7"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : sessionTab === 'DZUHUR' ? (
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="label"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                interval={rangeMode === 'monthly' ? 4 : 0}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                iconType="circle"
                formatter={(value) => {
                  if (value === 'dzuhurHadir') return <span className="text-teal-900 font-bold">Hadir Dzuhur ☀️</span>;
                  if (value === 'dzuhurUzur') return <span className="text-purple-900 font-bold">Berhalangan Syar'i</span>;
                  if (value === 'dzuhurBelum') return <span className="text-slate-500 font-medium">Belum Hadir</span>;
                  return value;
                }}
              />
              <Bar
                dataKey="dzuhurHadir"
                name="dzuhurHadir"
                fill="#0D9488"
                stackId="dzuhur"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="dzuhurUzur"
                name="dzuhurUzur"
                fill="#A855F7"
                stackId="dzuhur"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="dzuhurBelum"
                name="dzuhurBelum"
                fill="#E2E8F0"
                stackId="dzuhur"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="label"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                interval={rangeMode === 'monthly' ? 4 : 0}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                iconType="circle"
                formatter={(value) => {
                  if (value === 'asharHadir') return <span className="text-sky-900 font-bold">Hadir Ashar 🌤️</span>;
                  if (value === 'asharUzur') return <span className="text-purple-900 font-bold">Berhalangan Syar'i</span>;
                  if (value === 'asharBelum') return <span className="text-slate-500 font-medium">Belum Hadir</span>;
                  return value;
                }}
              />
              <Bar
                dataKey="asharHadir"
                name="asharHadir"
                fill="#0284C7"
                stackId="ashar"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="asharUzur"
                name="asharUzur"
                fill="#A855F7"
                stackId="ashar"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="asharBelum"
                name="asharBelum"
                fill="#E2E8F0"
                stackId="ashar"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
