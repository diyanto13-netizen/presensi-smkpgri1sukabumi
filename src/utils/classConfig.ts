/**
 * Konfigurasi Resmi Kelas & Jurusan SMKS PGRI 1 Kota Sukabumi
 * 
 * Jurusan:
 * 1. Teknik Komputer & Jaringan (XII TKJ 1, XII TKJ 2, XI TKJ 1, XI TKJ 2, X TKJT 1, X TKJT 2)
 * 2. Akuntansi (XII AKL, XI AKL, X AKL)
 * 3. Manajemen Perkantoran (XII MP 1, XII MP 2, XI MP 1, XI MP 2, X MPLB 1, X MPLB 2)
 * 4. Pemasaran (XII BR 1, XII BR 2, XI BR 1, XI BR 2, X PM 1, X PM 2)
 */

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

export const DEFAULT_JAM_PULANG_PER_KELAS: Record<string, string> = MASTER_KELAS_LIST.reduce(
  (acc, curr) => {
    acc[curr.kelas] = curr.defaultJamPulang;
    return acc;
  },
  {} as Record<string, string>
);

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
