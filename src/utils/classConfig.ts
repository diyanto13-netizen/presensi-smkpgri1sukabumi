/**
 * Konfigurasi Resmi Kelas & Jurusan SMKS PGRI 1 Kota Sukabumi
 * 
 * Jurusan:
 * 1. Teknik Komputer & Jaringan (XII TKJ 1, XII TKJ 2, XI TKJ 1, XI TKJ 2, X TKJT 1, X TKJT 2)
 * 2. Akuntansi (XII AKL, XI AKL, X AKL)
 * 3. Manajemen Perkantoran (XII MP 1, XII MP 2, XI MP 1, XI MP 2, X MPLB 1, X MPLB 2)
 * 4. Pemasaran (XII BR 1, XII BR 2, XI BR 1, XI BR 2, X PM 1, X PM 2)
 */

import { HariSekolah, JamPulangHarian, JamMasukHarian, SchoolConfig } from '../types/index.ts';

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

export interface HariSekolahInfo {
  key: HariSekolah;
  label: string;
  short: string;
  dayIndex: number; // 1=Senin ... 5=Jum'at, 6=Sabtu, 0=Minggu
  isSchoolDay: boolean; // true = Senin-Jum'at (hari aktif sekolah), false = Sabtu & Minggu (libur)
  statusLabel: 'AKTIF' | 'LIBUR';
  catatan: string;
}

export const DAFTAR_HARI: HariSekolahInfo[] = [
  {
    key: 'senin',
    label: 'Senin',
    short: 'Sen',
    dayIndex: 1,
    isSchoolDay: true,
    statusLabel: 'AKTIF',
    catatan: 'Upacara Bendera & KBM Penuh',
  },
  {
    key: 'selasa',
    label: 'Selasa',
    short: 'Sel',
    dayIndex: 2,
    isSchoolDay: true,
    statusLabel: 'AKTIF',
    catatan: 'KBM Normal',
  },
  {
    key: 'rabu',
    label: 'Rabu',
    short: 'Rab',
    dayIndex: 3,
    isSchoolDay: true,
    statusLabel: 'AKTIF',
    catatan: 'KBM Normal',
  },
  {
    key: 'kamis',
    label: 'Kamis',
    short: 'Kam',
    dayIndex: 4,
    isSchoolDay: true,
    statusLabel: 'AKTIF',
    catatan: 'KBM Normal',
  },
  {
    key: 'jumat',
    label: "Jum'at",
    short: 'Jum',
    dayIndex: 5,
    isSchoolDay: true,
    statusLabel: 'AKTIF',
    catatan: "Pembiasaan / Sholat Jum'at (Pulang Awal)",
  },
  {
    key: 'sabtu',
    label: 'Sabtu',
    short: 'Sab',
    dayIndex: 6,
    isSchoolDay: false,
    statusLabel: 'LIBUR',
    catatan: 'Libur Akhir Pekan (5 Hari Sekolah)',
  },
  {
    key: 'minggu',
    label: 'Minggu',
    short: 'Min',
    dayIndex: 0,
    isSchoolDay: false,
    statusLabel: 'LIBUR',
    catatan: 'Libur Akhir Pekan (5 Hari Sekolah)',
  },
];

export const DEFAULT_JAM_MASUK_HARIAN: JamMasukHarian = {
  senin: '07:00',
  selasa: '07:00',
  rabu: '07:00',
  kamis: '07:00',
  jumat: '07:00',
};

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
      sabtu: 'LIBUR',
      minggu: 'LIBUR',
    };
    return acc;
  },
  {} as Record<string, JamPulangHarian>
);

/**
 * Returns the day key (senin, selasa, ..., sabtu, minggu) from a date, day name, or day index
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
    if (lower.startsWith('min') || lower.startsWith('sun')) return 'minggu';

    // Check if it's YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOrDay)) {
      const d = new Date(dateOrDay + 'T12:00:00');
      return getHariKey(d.getDay());
    }
  }

  const dayNum =
    dateOrDay instanceof Date
      ? dateOrDay.getDay()
      : typeof dateOrDay === 'number'
      ? dateOrDay
      : new Date().getDay();

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
    case 0:
      return 'minggu';
    default:
      return 'senin';
  }
}

/**
 * Checks whether a given date or day is Saturday or Sunday (Weekend Holiday)
 */
export function isWeekendHoliday(
  dateOrDay?: Date | string | number,
  config?: SchoolConfig
): boolean {
  if (config && config.sabtu_minggu_libur === false) {
    return false;
  }
  const dayKey = getHariKey(dateOrDay);
  return dayKey === 'sabtu' || dayKey === 'minggu';
}

/**
 * Returns user-facing Indonesian display name for a day (e.g. "Senin", "Jum'at", "Sabtu")
 */
export function getHariDisplayName(dateOrDay?: Date | string | number): string {
  const dayKey = getHariKey(dateOrDay);
  const found = DAFTAR_HARI.find(d => d.key === dayKey);
  return found ? found.label : 'Senin';
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
 * Calculates effective morning check-in cutoff time for a given day
 * (e.g. 07:00 for Senin-Jum'at, or "-" for Sabtu/Minggu)
 */
export function getEffectiveJamMasuk(
  dateOrDay?: Date | string | number,
  config?: SchoolConfig
): string {
  if (isWeekendHoliday(dateOrDay, config)) {
    return '-';
  }
  const dayKey = getHariKey(dateOrDay);
  if (config?.jam_masuk_harian?.[dayKey as keyof JamMasukHarian]) {
    return config.jam_masuk_harian[dayKey as keyof JamMasukHarian]!;
  }
  return config?.jam_masuk_batas || '07:00';
}

/**
 * Calculates effective dismissal time considering the day of week (Senin-Jum'at, Sabtu/Minggu Libur)
 * and the specific class schedule.
 */
export function getEffectiveJamPulang(
  className: string,
  dateOrDay?: Date | string | number,
  config?: SchoolConfig
): string {
  // If weekend (Sabtu/Minggu) and weekend holiday rule is active
  if (isWeekendHoliday(dateOrDay, config)) {
    return 'LIBUR';
  }

  const dayKey = getHariKey(dateOrDay);

  // 1. Check daily schedule per class in config (highest priority)
  if (config?.jam_pulang_harian_per_kelas?.[className]?.[dayKey]) {
    const val = config.jam_pulang_harian_per_kelas[className][dayKey]!;
    if (val) return val;
  }

  // 2. Check default daily schedule in classConfig
  if (DEFAULT_JAM_PULANG_HARIAN_PER_KELAS[className]?.[dayKey]) {
    const val = DEFAULT_JAM_PULANG_HARIAN_PER_KELAS[className][dayKey]!;
    if (val) return val;
  }

  // 3. Check simple per-class schedule map in config
  if (config?.jam_pulang_per_kelas?.[className]) {
    return config.jam_pulang_per_kelas[className];
  }

  // 4. Fallback to default class departure
  return getDefaultDepartureForClass(className);
}
