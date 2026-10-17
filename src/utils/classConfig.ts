/**
 * Konfigurasi Resmi Kelas & Jurusan SMKS PGRI 1 Kota Sukabumi
 * 
 * Jurusan:
 * 1. Teknik Komputer & Jaringan (XII TKJ 1, XII TKJ 2, XI TKJ 1, XI TKJ 2, X TKJT 1, X TKJT 2)
 * 2. Akuntansi (XII AKL, XI AKL, X AKL)
 * 3. Manajemen Perkantoran (XII MP 1, XII MP 2, XI MP 1, XI MP 2, X MPLB 1, X MPLB 2)
 * 4. Pemasaran (XII BR 1, XII BR 2, XI BR 1, XI BR 2, X PM 1, X PM 2)
 */

import { HariSekolah, JamPulangHarian, SchoolConfig } from '../types';

export interface ClassInfo {
  kelas: string;
  tingkat: 'X' | 'XI' | 'XII';
  jurusanKey: 'TKJ' | 'AKL' | 'MP' | 'PM';
  namaJurusan: string;
  defaultJamPulang: string;
}

export interface JurusanDefinition {
  key: 'TKJ' | 'AKL' | 'MP' | 'PM';
  nama: string;
  singkatan: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  kelasList: string[];
}

export const DAFTAR_JURUSAN: JurusanDefinition[] = [
  {
    key: 'TKJ',
    nama: 'Teknik Komputer & Jaringan',
    singkatan: 'TKJ / TJKT',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-900',
    badgeBorder: 'border-blue-300',
    kelasList: ['XII TKJ 1', 'XII TKJ 2', 'XI TKJ 1', 'XI TKJ 2', 'X TKJT 1', 'X TKJT 2'],
  },
  {
    key: 'AKL',
    nama: 'Akuntansi',
    singkatan: 'AKL',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
    badgeBorder: 'border-emerald-300',
    kelasList: ['XII AKL', 'XI AKL', 'X AKL'],
  },
  {
    key: 'MP',
    nama: 'Manajemen Perkantoran',
    singkatan: 'MP / MPLB',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-900',
    badgeBorder: 'border-purple-300',
    kelasList: ['XII MP 1', 'XII MP 2', 'XI MP 1', 'XI MP 2', 'X MPLB 1', 'X MPLB 2'],
  },
  {
    key: 'PM',
    nama: 'Pemasaran',
    singkatan: 'BR / PM',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-950',
    badgeBorder: 'border-amber-300',
    kelasList: ['XII BR 1', 'XII BR 2', 'XI BR 1', 'XI BR 2', 'X PM 1', 'X PM 2'],
  },
];

export const MASTER_KELAS_LIST: ClassInfo[] = [
  // ==================== KELAS XII (7 Kelas) ====================
  {
    kelas: 'XII TKJ 1',
    tingkat: 'XII',
    jurusanKey: 'TKJ',
    namaJurusan: 'Teknik Komputer & Jaringan',
    defaultJamPulang: '15:30',
  },
  {
    kelas: 'XII TKJ 2',
    tingkat: 'XII',
    jurusanKey: 'TKJ',
    namaJurusan: 'Teknik Komputer & Jaringan',
    defaultJamPulang: '15:30',
  },
  {
    kelas: 'XII AKL',
    tingkat: 'XII',
    jurusanKey: 'AKL',
    namaJurusan: 'Akuntansi',
    defaultJamPulang: '15:00',
  },
  {
    kelas: 'XII MP 1',
    tingkat: 'XII',
    jurusanKey: 'MP',
    namaJurusan: 'Manajemen Perkantoran',
    defaultJamPulang: '15:00',
  },
  {
    kelas: 'XII MP 2',
    tingkat: 'XII',
    jurusanKey: 'MP',
    namaJurusan: 'Manajemen Perkantoran',
    defaultJamPulang: '15:00',
  },
  {
    kelas: 'XII BR 1',
    tingkat: 'XII',
    jurusanKey: 'PM',
    namaJurusan: 'Pemasaran',
    defaultJamPulang: '15:00',
  },
  {
    kelas: 'XII BR 2',
    tingkat: 'XII',
    jurusanKey: 'PM',
    namaJurusan: 'Pemasaran',
    defaultJamPulang: '15:00',
  },

  // ==================== KELAS XI (7 Kelas) ====================
  {
    kelas: 'XI TKJ 1',
    tingkat: 'XI',
    jurusanKey: 'TKJ',
    namaJurusan: 'Teknik Komputer & Jaringan',
    defaultJamPulang: '15:30',
  },
  {
    kelas: 'XI TKJ 2',
    tingkat: 'XI',
    jurusanKey: 'TKJ',
    namaJurusan: 'Teknik Komputer & Jaringan',
    defaultJamPulang: '15:30',
  },
  {
    kelas: 'XI AKL',
    tingkat: 'XI',
    jurusanKey: 'AKL',
    namaJurusan: 'Akuntansi',
    defaultJamPulang: '15:00',
  },
  {
    kelas: 'XI MP 1',
    tingkat: 'XI',
    jurusanKey: 'MP',
    namaJurusan: 'Manajemen Perkantoran',
    defaultJamPulang: '15:00',
  },
  {
    kelas: 'XI MP 2',
    tingkat: 'XI',
    jurusanKey: 'MP',
    namaJurusan: 'Manajemen Perkantoran',
    defaultJamPulang: '15:00',
  },
  {
    kelas: 'XI BR 1',
    tingkat: 'XI',
    jurusanKey: 'PM',
    namaJurusan: 'Pemasaran',
    defaultJamPulang: '15:00',
  },
  {
    kelas: 'XI BR 2',
    tingkat: 'XI',
    jurusanKey: 'PM',
    namaJurusan: 'Pemasaran',
    defaultJamPulang: '15:00',
  },

  // ==================== KELAS X (7 Kelas) ====================
  {
    kelas: 'X TKJT 1',
    tingkat: 'X',
    jurusanKey: 'TKJ',
    namaJurusan: 'Teknik Komputer & Jaringan',
    defaultJamPulang: '15:00',
  },
  {
    kelas: 'X TKJT 2',
    tingkat: 'X',
    jurusanKey: 'TKJ',
    namaJurusan: 'Teknik Komputer & Jaringan',
    defaultJamPulang: '15:00',
  },
  {
    kelas: 'X AKL',
    tingkat: 'X',
    jurusanKey: 'AKL',
    namaJurusan: 'Akuntansi',
    defaultJamPulang: '14:30',
  },
  {
    kelas: 'X MPLB 1',
    tingkat: 'X',
    jurusanKey: 'MP',
    namaJurusan: 'Manajemen Perkantoran',
    defaultJamPulang: '14:30',
  },
  {
    kelas: 'X MPLB 2',
    tingkat: 'X',
    jurusanKey: 'MP',
    namaJurusan: 'Manajemen Perkantoran',
    defaultJamPulang: '14:30',
  },
  {
    kelas: 'X PM 1',
    tingkat: 'X',
    jurusanKey: 'PM',
    namaJurusan: 'Pemasaran',
    defaultJamPulang: '14:30',
  },
  {
    kelas: 'X PM 2',
    tingkat: 'X',
    jurusanKey: 'PM',
    namaJurusan: 'Pemasaran',
    defaultJamPulang: '14:30',
  },
];

export const ALL_CLASS_NAMES: string[] = MASTER_KELAS_LIST.map(k => k.kelas);

export const DAFTAR_HARI: { key: HariSekolah; label: string; short: string; dayIndex: number }[] = [
  { key: 'senin', label: 'Senin', short: 'Sen', dayIndex: 1 },
  { key: 'selasa', label: 'Selasa', short: 'Sel', dayIndex: 2 },
  { key: 'rabu', label: 'Rabu', short: 'Rab', dayIndex: 3 },
  { key: 'kamis', label: 'Kamis', short: 'Kam', dayIndex: 4 },
  { key: 'jumat', label: "Jum'at", short: 'Jum', dayIndex: 5 },
  { key: 'sabtu', label: 'Sabtu', short: 'Sab', dayIndex: 6 },
];

export const DEFAULT_JAM_PULANG_PER_KELAS: Record<string, string> = MASTER_KELAS_LIST.reduce(
  (acc, curr) => {
    acc[curr.kelas] = curr.defaultJamPulang;
    return acc;
  },
  {} as Record<string, string>
);

export const DEFAULT_JAM_PULANG_HARIAN_PER_KELAS: Record<string, JamPulangHarian> = MASTER_KELAS_LIST.reduce(
  (acc, curr) => {
    // Jum'at pulang lebih awal karena Sholat Jum'at di SMKS PGRI 1 Sukabumi
    const jumatTime = curr.tingkat === 'X' ? '11:30' : '11:45';
    acc[curr.kelas] = {
      senin: curr.defaultJamPulang,
      selasa: curr.defaultJamPulang,
      rabu: curr.defaultJamPulang,
      kamis: curr.defaultJamPulang,
      jumat: jumatTime,
      sabtu: '12:00',
    };
    return acc;
  },
  {} as Record<string, JamPulangHarian>
);

/**
 * Returns the day key (senin, selasa, etc.) from a date or day name
 */
export function getHariKey(dateOrDay?: Date | string | number): HariSekolah {
  if (typeof dateOrDay === 'string') {
    const lower = dateOrDay.trim().toLowerCase();
    if (lower.startsWith('sen')) return 'senin';
    if (lower.startsWith('sel')) return 'selasa';
    if (lower.startsWith('rab')) return 'rabu';
    if (lower.startsWith('kam')) return 'kamis';
    if (lower.startsWith('jum')) return 'jumat';
    if (lower.startsWith('sab')) return 'sabtu';

    // Check if it's YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOrDay)) {
      const d = new Date(dateOrDay + 'T12:00:00');
      return getHariKey(d.getDay());
    }
  }

  const dayNum = dateOrDay instanceof Date ? dateOrDay.getDay() : typeof dateOrDay === 'number' ? dateOrDay : new Date().getDay();

  switch (dayNum) {
    case 1:
      return 'senin';
    case 2:
      return 'selasa';
    case 3:
      return 'rabu';
    case 4:
      return 'kamis';
    case 5:
      return 'jumat';
    case 6:
      return 'sabtu';
    case 0: // Sunday / Minggu -> fallback to Senin
    default:
      return 'senin';
  }
}

export function getJurusanByClassName(className: string): string {
  if (!className) return 'Teknik Komputer & Jaringan';
  const found = MASTER_KELAS_LIST.find(
    k => k.kelas.trim().toLowerCase() === className.trim().toLowerCase()
  );
  if (found) return found.namaJurusan;

  // Fuzzy check
  const upper = className.toUpperCase();
  if (upper.includes('TKJ') || upper.includes('TJKT')) return 'Teknik Komputer & Jaringan';
  if (upper.includes('AKL') || upper.includes('AKUNTANSI')) return 'Akuntansi';
  if (upper.includes('MP') || upper.includes('MPLB') || upper.includes('PERKANTORAN')) return 'Manajemen Perkantoran';
  if (upper.includes('BR') || upper.includes('PM') || upper.includes('PEMASARAN') || upper.includes('BISNIS')) return 'Pemasaran';

  return 'Teknik Komputer & Jaringan';
}

export function getDefaultDepartureForClass(className: string, scheduleMap?: Record<string, string>): string {
  if (scheduleMap && scheduleMap[className]) {
    return scheduleMap[className];
  }
  const found = MASTER_KELAS_LIST.find(
    k => k.kelas.trim().toLowerCase() === className.trim().toLowerCase()
  );
  return found ? found.defaultJamPulang : '15:00';
}

/**
 * Calculates effective dismissal time considering the day of week (Senin-Jum'at/Sabtu)
 * and the specific class schedule.
 */
export function getEffectiveJamPulang(
  className: string,
  dateOrDay?: Date | string | number,
  config?: SchoolConfig
): string {
  const dayKey = getHariKey(dateOrDay);

  // 1. Check daily schedule per class in config (highest priority)
  if (config?.jam_pulang_harian_per_kelas?.[className]?.[dayKey]) {
    return config.jam_pulang_harian_per_kelas[className][dayKey]!;
  }

  // 2. Check default daily schedule in classConfig
  if (DEFAULT_JAM_PULANG_HARIAN_PER_KELAS[className]?.[dayKey]) {
    return DEFAULT_JAM_PULANG_HARIAN_PER_KELAS[className][dayKey]!;
  }

  // 3. Check simple per-class schedule map in config
  if (config?.jam_pulang_per_kelas?.[className]) {
    return config.jam_pulang_per_kelas[className];
  }

  // 4. Fallback to default
  return getDefaultDepartureForClass(className);
}
