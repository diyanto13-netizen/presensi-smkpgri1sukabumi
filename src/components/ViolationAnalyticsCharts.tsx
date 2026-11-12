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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Award,
  AlertTriangle,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PelanggaranSiswa, Siswa } from '../types';
import { MASTER_KELAS_LIST } from '../utils/classConfig';
import { ITEM_TERLAMBAT, ITEM_TIDAK_SHOLAT_DZUHUR } from '../utils/violationRules';

interface ViolationAnalyticsChartsProps {
  students: Siswa[];
  violations: PelanggaranSiswa[];
  selectedClass: string;
  onSelectClass?: (kelas: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  RINGAN: '#f59e0b', // Amber 500
  SEDANG: '#f97316', // Orange 500
  BERAT: '#e11d48',  // Rose 600
};

const SOURCE_COLORS = ['#f59e0b', '#10b981', '#2563eb'];

export const ViolationAnalyticsCharts: React.FC<ViolationAnalyticsChartsProps> = ({
  students,
  violations,
  selectedClass,
  onSelectClass,
}) => {
  const [gradeFilter, setGradeFilter] = useState<'ALL' | 'X' | 'XI' | 'XII'>('ALL');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [distributionView, setDistributionView] = useState<'kategori' | 'sumber'>('kategori');

  // 1. Data Tren & Akumulasi Poin Per Kelas (21 Rombel)
  const classChartData = useMemo(() => {
    return MASTER_KELAS_LIST.filter((item) => {
      if (gradeFilter === 'ALL') return true;
      if (gradeFilter === 'XII') return item.kelas.startsWith('XII ');
      if (gradeFilter === 'XI') return item.kelas.startsWith('XI ');
      if (gradeFilter === 'X') return item.kelas.startsWith('X ');
      return true;
    }).map((klsItem) => {
      const kls = klsItem.kelas;
      const classLogs = violations.filter((v) => v.kelas === kls);
      const classStudentCount = students.filter((s) => s.kelas === kls).length;
      const uniqueViolators = new Set(classLogs.map((v) => v.nis)).size;

      const poinTerlambat = classLogs
        .filter((v) => v.sumber === 'OTOMATIS_PRESENSI' || v.kode_pelanggaran === ITEM_TERLAMBAT.kode)
        .reduce((sum, v) => sum + (Number(v.poin) || 0), 0);

      const poinDzuhur = classLogs
        .filter(
          (v) =>
            v.sumber === 'OTOMATIS_SHOLAT' || v.kode_pelanggaran === ITEM_TIDAK_SHOLAT_DZUHUR.kode
        )
        .reduce((sum, v) => sum + (Number(v.poin) || 0), 0);

      const poinManual = classLogs
        .filter(
          (v) =>
            v.sumber === 'MANUAL_GURU' &&
            v.kode_pelanggaran !== ITEM_TERLAMBAT.kode &&
            v.kode_pelanggaran !== ITEM_TIDAK_SHOLAT_DZUHUR.kode
        )
        .reduce((sum, v) => sum + (Number(v.poin) || 0), 0);

      const totalPoin = poinTerlambat + poinDzuhur + poinManual;

      return {
        kelas: kls,
        namaJurusan: klsItem.namaJurusan,
        poinTerlambat,
        poinDzuhur,
        poinManual,
        totalPoin,
        totalKasus: classLogs.length,
        siswaMelanggar: uniqueViolators,
        jumlahSiswa: classStudentCount,
      };
    });
  }, [violations, students, gradeFilter]);

  // 2. Data Distribusi Jenis Pelanggaran Terbanyak di Sekolah (Top 8)
  const topViolationTypesData = useMemo(() => {
    const filtered =
      selectedClass === 'ALL'
        ? violations
        : violations.filter((v) => v.kelas === selectedClass);

    const map = new Map<
      string,
      {
        kode: string;
        jenis: string;
        shortLabel: string;
        kategori: string;
        jumlahKasus: number;
        totalPoin: number;
      }
    >();

    filtered.forEach((v) => {
      const key = v.kode_pelanggaran || v.jenis_pelanggaran;
      const existing = map.get(key);
      if (existing) {
        existing.jumlahKasus += 1;
        existing.totalPoin += Number(v.poin) || 0;
      } else {
        const cleanName = v.jenis_pelanggaran;
        const shortLabel =
          cleanName.length > 34 ? `${v.kode_pelanggaran} • ${cleanName.slice(0, 32)}...` : `${v.kode_pelanggaran} • ${cleanName}`;
        map.set(key, {
          kode: v.kode_pelanggaran,
          jenis: cleanName,
          shortLabel,
          kategori: v.kategori,
          jumlahKasus: 1,
          totalPoin: Number(v.poin) || 0,
        });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => {
        if (b.jumlahKasus !== a.jumlahKasus) return b.jumlahKasus - a.jumlahKasus;
        return b.totalPoin - a.totalPoin;
      })
      .slice(0, 8);
  }, [violations, selectedClass]);

  // 3. Data Pie / Donut: Distribusi Kategori & Sumber Pelanggaran
  const pieCategoryData = useMemo(() => {
    const filtered =
      selectedClass === 'ALL'
        ? violations
        : violations.filter((v) => v.kelas === selectedClass);

    const ringan = filtered.filter((v) => v.kategori === 'RINGAN');
    const sedang = filtered.filter((v) => v.kategori === 'SEDANG');
    const berat = filtered.filter((v) => v.kategori === 'BERAT');

    return [
      {
        name: 'A. Pelanggaran Ringan',
        value: ringan.length,
        poin: ringan.reduce((s, v) => s + (Number(v.poin) || 0), 0),
        color: CATEGORY_COLORS.RINGAN,
      },
      {
        name: 'B. Pelanggaran Sedang',
        value: sedang.length,
        poin: sedang.reduce((s, v) => s + (Number(v.poin) || 0), 0),
        color: CATEGORY_COLORS.SEDANG,
      },
      {
        name: 'C. Pelanggaran Berat',
        value: berat.length,
        poin: berat.reduce((s, v) => s + (Number(v.poin) || 0), 0),
        color: CATEGORY_COLORS.BERAT,
      },
    ].filter((d) => d.value > 0);
  }, [violations, selectedClass]);

  const pieSourceData = useMemo(() => {
    const filtered =
      selectedClass === 'ALL'
        ? violations
        : violations.filter((v) => v.kelas === selectedClass);

    const late = filtered.filter(
      (v) => v.sumber === 'OTOMATIS_PRESENSI' || v.kode_pelanggaran === ITEM_TERLAMBAT.kode
    );
    const dzuhur = filtered.filter(
      (v) => v.sumber === 'OTOMATIS_SHOLAT' || v.kode_pelanggaran === ITEM_TIDAK_SHOLAT_DZUHUR.kode
    );
    const manual = filtered.filter(
      (v) =>
        v.sumber === 'MANUAL_GURU' &&
        v.kode_pelanggaran !== ITEM_TERLAMBAT.kode &&
        v.kode_pelanggaran !== ITEM_TIDAK_SHOLAT_DZUHUR.kode
    );

    return [
      {
        name: 'Otomatis Terlambat (R-01)',
        value: late.length,
        poin: late.reduce((s, v) => s + (Number(v.poin) || 0), 0),
        color: SOURCE_COLORS[0],
      },
      {
        name: 'Otomatis Alpha Dzuhur (R-18)',
        value: dzuhur.length,
        poin: dzuhur.reduce((s, v) => s + (Number(v.poin) || 0), 0),
        color: SOURCE_COLORS[1],
      },
      {
        name: 'Input Manual Guru / BK',
        value: manual.length,
        poin: manual.reduce((s, v) => s + (Number(v.poin) || 0), 0),
        color: SOURCE_COLORS[2],
      },
    ].filter((d) => d.value > 0);
  }, [violations, selectedClass]);

  // 4. Tren Harian Akumulasi Poin Pelanggaran (AreaChart)
  const dailyTrendData = useMemo(() => {
    const filtered =
      selectedClass === 'ALL'
        ? violations
        : violations.filter((v) => v.kelas === selectedClass);

    const dateMap = new Map<
      string,
      {
        tanggal: string;
        labelTanggal: string;
        poinTerlambat: number;
        poinDzuhur: number;
        poinManual: number;
        totalPoin: number;
        totalKasus: number;
      }
    >();

    filtered.forEach((v) => {
      const tgl = v.tanggal || 'Tidak Diketahui';
      const curr = dateMap.get(tgl) || {
        tanggal: tgl,
        labelTanggal: tgl.slice(5), // MM-DD
        poinTerlambat: 0,
        poinDzuhur: 0,
        poinManual: 0,
        totalPoin: 0,
        totalKasus: 0,
      };

      const p = Number(v.poin) || 0;
      if (v.sumber === 'OTOMATIS_PRESENSI' || v.kode_pelanggaran === ITEM_TERLAMBAT.kode) {
        curr.poinTerlambat += p;
      } else if (
        v.sumber === 'OTOMATIS_SHOLAT' ||
        v.kode_pelanggaran === ITEM_TIDAK_SHOLAT_DZUHUR.kode
      ) {
        curr.poinDzuhur += p;
      } else {
        curr.poinManual += p;
      }
      curr.totalPoin += p;
      curr.totalKasus += 1;
      dateMap.set(tgl, curr);
    });

    return Array.from(dateMap.values())
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
      .slice(-14);
  }, [violations, selectedClass]);

  // Highlighted top class & top violation
  const highestPointClass = useMemo(() => {
    const sorted = [...classChartData].sort((a, b) => b.totalPoin - a.totalPoin);
    return sorted[0] && sorted[0].totalPoin > 0 ? sorted[0] : null;
  }, [classChartData]);

  const topViolationItem = topViolationTypesData[0] || null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header Panel Visualisasi */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-800 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Analitik &amp; Visualisasi Tren Pelanggaran Sekolah
              </h3>
              {selectedClass !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Filter Aktif: Kelas {selectedClass}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Grafik perbandingan akumulasi poin per kelas, distribusi jenis pelanggaran terbanyak, dan tren harian kedisiplinan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 no-print">
          {selectedClass !== 'ALL' && onSelectClass && (
            <button
              onClick={() => onSelectClass('ALL')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 cursor-pointer"
            >
              Tampilkan Semua Kelas
            </button>
          )}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Sembunyikan Grafik</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Tampilkan Grafik</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 space-y-6">
          {/* Quick Insight Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Akumulasi Poin Kelas Tertinggi
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {highestPointClass
                      ? `Kelas ${highestPointClass.kelas} (${highestPointClass.totalPoin} Poin dari ${highestPointClass.totalKasus} Kasus)`
                      : 'Belum ada akumulasi poin kelas (0 Poin)'}
                  </div>
                </div>
              </div>
              {highestPointClass && onSelectClass && (
                <button
                  onClick={() => onSelectClass(highestPointClass.kelas)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
                >
                  Filter Kelas
                </button>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Jenis Pelanggaran Paling Dominan
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {topViolationItem
                      ? `[${topViolationItem.kode}] ${topViolationItem.jenis} (${topViolationItem.jumlahKasus}x • ${topViolationItem.totalPoin} Poin)`
                      : 'Belum ada catatan pelanggaran'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CHART 1: Tren Akumulasi Poin Per Kelas (Stacked Bar Chart) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Tren Akumulasi Poin Pelanggaran Per Kelas</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Perbandingan poin keterlambatan (R-01), alpha Sholat Dzuhur (R-18), dan pelanggaran manual antar kelas. Klik batang grafik untuk memfilter kelas.
                </p>
              </div>

              {/* Filter Tingkat Kelas */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-700 self-start sm:self-auto">
                {(['ALL', 'X', 'XI', 'XII'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setGradeFilter(lvl)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      gradeFilter === lvl
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {lvl === 'ALL' ? 'Semua (21)' : `Kelas ${lvl}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={classChartData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 45 }}
                  onClick={(state) => {
                    if (state && state.activeLabel && onSelectClass) {
                      onSelectClass(String(state.activeLabel));
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                  <XAxis
                    dataKey="kelas"
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    height={60}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                    allowDecimals={false}
                    label={{
                      value: 'Total Poin',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: '#64748b', fontSize: 11, fontWeight: 700 },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                    itemStyle={{ color: '#f8fafc' }}
                    labelStyle={{ color: '#fbbf24', fontWeight: 800, marginBottom: '4px' }}
                    formatter={(value: any, name: any) => [`${value} Poin`, name]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', fontWeight: 700, paddingTop: '8px' }}
                  />
                  <Bar
                    dataKey="poinTerlambat"
                    name="Terlambat Masuk (R-01)"
                    stackId="poin"
                    fill="#f59e0b"
                    radius={[0, 0, 0, 0]}
                    cursor="pointer"
                  />
                  <Bar
                    dataKey="poinDzuhur"
                    name="Alpha Sholat Dzuhur (R-18)"
                    stackId="poin"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                    cursor="pointer"
                  />
                  <Bar
                    dataKey="poinManual"
                    name="Pelanggaran Lainnya (Guru/BK)"
                    stackId="poin"
                    fill="#e11d48"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CHART 2 & 3: Distribusi Jenis Pelanggaran Terbanyak & Proporsi Kategori/Sumber */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Horizontal Bar Chart: Top Jenis Pelanggaran Terbanyak */}
            <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col">
              <div className="mb-3">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Distribusi Jenis Pelanggaran Terbanyak di Sekolah</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Peringkat pasal pelanggaran dengan frekuensi kasus tertinggi beserta kontribusi poinnya
                </p>
              </div>

              {topViolationTypesData.length === 0 ? (
                <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center text-center p-6">
                  <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">
                    Belum ada data pelanggaran untuk divisualisasikan.
                  </p>
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topViolationTypesData}
                      layout="vertical"
                      margin={{ top: 5, right: 24, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="shortLabel"
                        width={195}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          color: '#f8fafc',
                          fontSize: '12px',
                        }}
                        formatter={(value: any, name: any, props: any) => {
                          if (name === 'Jumlah Kasus') {
                            return [
                              `${value} Kasus (Total ${props.payload.totalPoin} Poin)`,
                              props.payload.jenis,
                            ];
                          }
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="jumlahKasus" name="Jumlah Kasus" radius={[0, 6, 6, 0]}>
                        {topViolationTypesData.map((entry, idx) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={CATEGORY_COLORS[entry.kategori] || '#e11d48'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
                  Ringan (5 Poin)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-orange-500" />
                  Sedang (10–25 Poin)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-600" />
                  Berat (40–50 / Khusus)
                </span>
              </div>
            </div>

            {/* Donut Chart: Proporsi Kategori vs Sumber Integrasi */}
            <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Proporsi Pelanggaran</span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Berdasarkan {distributionView === 'kategori' ? 'kategori pasal' : 'sumber pencatatan'}
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-700">
                  <button
                    onClick={() => setDistributionView('kategori')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                      distributionView === 'kategori'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Kategori
                  </button>
                  <button
                    onClick={() => setDistributionView('sumber')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                      distributionView === 'sumber'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Sumber
                  </button>
                </div>
              </div>

              {(distributionView === 'kategori' ? pieCategoryData : pieSourceData).length === 0 ? (
                <div className="flex-1 min-h-[260px] flex items-center justify-center text-center p-6">
                  <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">
                    Belum ada data proporsi pelanggaran.
                  </p>
                </div>
              ) : (
                <>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distributionView === 'kategori' ? pieCategoryData : pieSourceData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={82}
                          paddingAngle={4}
                        >
                          {(distributionView === 'kategori' ? pieCategoryData : pieSourceData).map(
                            (entry, index) => (
                              <Cell key={`pie-${index}`} fill={entry.color} />
                            )
                          )}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '12px',
                            color: '#f8fafc',
                            fontSize: '12px',
                          }}
                          formatter={(value: any, name: any, props: any) => [
                            `${value} Kasus (${props.payload.poin} Poin)`,
                            name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 mt-2">
                    {(distributionView === 'kategori' ? pieCategoryData : pieSourceData).map(
                      (item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                        >
                          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                            <span
                              className="w-3 h-3 rounded-sm shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span>{item.name}</span>
                          </div>
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {item.value} Kasus • <span className="text-rose-600 dark:text-rose-400">{item.poin} Poin</span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* CHART 4: Tren Harian Akumulasi Poin (Area Chart) */}
          {dailyTrendData.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="mb-3">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Tren Harian Poin Pelanggaran Siswa (14 Hari Terakhir)</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Memantau perkembangan harian kedisiplinan siswa dari waktu ke waktu
                </p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dailyTrendData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                    <XAxis
                      dataKey="tanggal"
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                      formatter={(value: any, name: any) => [`${value} Poin`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                    <Area
                      type="monotone"
                      dataKey="totalPoin"
                      name="Total Poin Harian"
                      stroke="#e11d48"
                      fill="#e11d48"
                      fillOpacity={0.2}
                      strokeWidth={2.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="poinTerlambat"
                      name="Poin Terlambat (R-01)"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="poinDzuhur"
                      name="Poin Alpha Dzuhur (R-18)"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
