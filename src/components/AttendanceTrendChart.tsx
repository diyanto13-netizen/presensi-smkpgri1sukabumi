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
import { TrendingUp, Calendar, BarChart3, Clock, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
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
  const [rangeMode, setRangeMode] = useState<'weekly' | 'monthly'>('weekly');

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

      let tepatWaktu = 0;
      let terlambat = 0;
      let pulang = 0;

      dayRecords.forEach(r => {
        if (r.status_masuk === 'TEPAT_WAKTU') tepatWaktu++;
        if (r.status_masuk === 'TERLAMBAT') terlambat++;
        if (r.status_pulang === 'PULANG') pulang++;
      });

      const totalHadir = tepatWaktu + terlambat;
      const totalSiswaScope = filteredStudents.length || 1;
      const persentase = Math.min(100, Math.round((totalHadir / totalSiswaScope) * 100));

      result.push({
        dateStr,
        label,
        tepatWaktu,
        terlambat,
        pulang,
        totalHadir,
        persentase,
      });
    }

    return result;
  }, [rangeMode, attendanceRecords, selectedClass, targetStudentNisSet, filteredStudents.length]);

  // Overall statistics for the selected period
  const periodStats = useMemo(() => {
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

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xl border border-slate-700 text-xs space-y-2 min-w-[200px]">
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
              <span>Total Kehadiran:</span>
              <span className="font-mono text-white">{data.totalHadir} siswa ({data.persentase}%)</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
      {/* Header with Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 text-blue-900 border border-blue-200">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-heading font-black text-blue-950">
                Visualisasi Tren Kehadiran Siswa
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Grafik tren kehadiran {rangeMode === 'weekly' ? '7 hari terakhir' : '30 hari terakhir'} {selectedClass !== 'ALL' ? `(Kelas ${selectedClass})` : '(Semua Kelas)'}
              </p>
            </div>
          </div>
        </div>

        {/* Time Range Switcher Buttons */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setRangeMode('weekly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              rangeMode === 'weekly'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Mingguan (7 Hari)
          </button>
          <button
            type="button"
            onClick={() => setRangeMode('monthly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              rangeMode === 'monthly'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Bulanan (30 Hari)
          </button>
        </div>
      </div>

      {/* Mini KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-200/80 text-blue-900 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Rata-rata Hadir</div>
            <div className="text-lg sm:text-xl font-heading font-black text-blue-950 mt-0.5">
              {periodStats.avgHadir} <span className="text-xs font-medium text-slate-500">siswa/hari</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-200/80 text-emerald-800 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Tepat Waktu</div>
            <div className="text-lg sm:text-xl font-heading font-black text-emerald-900 mt-0.5">
              {periodStats.totalTepatWaktu} <span className="text-xs font-medium text-emerald-700">presensi</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-200/80 text-amber-900 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Terlambat</div>
            <div className="text-lg sm:text-xl font-heading font-black text-amber-900 mt-0.5">
              {periodStats.totalTerlambat} <span className="text-xs font-medium text-amber-700">presensi</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-purple-50/70 border border-purple-200/80 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-200/80 text-purple-900 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Puncak Hadir</div>
            <div className="text-lg sm:text-xl font-heading font-black text-purple-950 mt-0.5 truncate">
              {periodStats.highestAttendance.label}
            </div>
          </div>
        </div>
      </div>

      {/* Main Recharts Graphic Container */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
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
                if (value === 'tepatWaktu') return <span className="text-slate-700 font-bold">Tepat Waktu</span>;
                if (value === 'terlambat') return <span className="text-slate-700 font-bold">Terlambat</span>;
                if (value === 'pulang') return <span className="text-slate-700 font-bold">Sudah Pulang</span>;
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
  );
};
