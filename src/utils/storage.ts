import { Siswa, Absensi, SchoolConfig } from '../types';
import {
  DEFAULT_JAM_PULANG_PER_KELAS,
  DEFAULT_JAM_PULANG_HARIAN_PER_KELAS,
  getJurusanByClassName,
  getDefaultDepartureForClass,
  getEffectiveJamPulang,
} from './classConfig.ts';

export const INITIAL_SCHOOL_CONFIG: SchoolConfig = {
  nama_sekolah: 'SMKS PGRI 1 KOTA SUKABUMI',
  yayasan: 'YAYASAN PEMBINA LEMBAGA PENDIDIKAN DASAR DAN MENENGAH PERSATUAN GURU REPUBLIK INDONESIA (YPLP DIKDASMEN PGRI)',
  npsn: '20221574',
  akreditasi: 'TERAKREDITASI "A"',
  alamat: 'Jl. Pelabuhan II Perum Cipoho Indah, Cikondang-Citamiang Kota Sukabumi',
  telepon: '(0266) 221845',
  email: 'info@smkspgri1sukabumi.sch.id',
  kepala_sekolah: 'Drs. H. Mulyadi, M.M.Pd.',
  nip_kepsek: '19680512 199303 1 004',
  jam_masuk_batas: '07:00',
  sabtu_minggu_libur: true,
  jam_masuk_harian: {
    senin: '07:00',
    selasa: '07:00',
    rabu: '07:00',
    kamis: '07:00',
    jumat: '07:00',
  },
  jam_pulang_per_kelas: { ...DEFAULT_JAM_PULANG_PER_KELAS },
  jam_pulang_harian_per_kelas: { ...DEFAULT_JAM_PULANG_HARIAN_PER_KELAS },
  fonnte_token: '',
  fonnte_test_mode: true,
  sound_enabled: true,
  voice_announcement_enabled: true,
};

export const INITIAL_STUDENTS: Siswa[] = [
  {
    id: 's-124015112',
    nis: '124015112',
    nisn: '006815112',
    nama: 'M. Pahri Paturahman',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua M. Pahri',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015113',
    nis: '124015113',
    nisn: '006815113',
    nama: 'M. Sahrul Almubarok',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua M. Sahrul',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015114',
    nis: '124015114',
    nisn: '006815114',
    nama: 'Muhamad Asopian',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Muhamad Asopian',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015117',
    nis: '124015117',
    nisn: '006815117',
    nama: 'Muhammad Apris Zikrilah',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Muhammad Apris',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015119',
    nis: '124015119',
    nisn: '006815119',
    nama: 'Muhammad Ridwan Supendi',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Muhammad Ridwan',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015120',
    nis: '124015120',
    nisn: '006815120',
    nama: 'Mulgi',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Mulgi',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015121',
    nis: '124015121',
    nisn: '006815121',
    nama: 'Nabil Ramadansyah',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Nabil',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015122',
    nis: '124015122',
    nisn: '006815122',
    nama: 'Neng Siti Alinda Azahra',
    jenis_kelamin: 'P',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Neng Siti',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015123',
    nis: '124015123',
    nisn: '006815123',
    nama: 'Nicky Syah',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Nicky Syah',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015124',
    nis: '124015124',
    nisn: '006815124',
    nama: 'Rafi Anugrah Ramadhan',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Rafi',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015125',
    nis: '124015125',
    nisn: '006815125',
    nama: 'Reihan Alfauzan',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Reihan',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015126',
    nis: '124015126',
    nisn: '006815126',
    nama: 'Revan Arfin Zakiansyah',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Revan',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015128',
    nis: '124015128',
    nisn: '006815128',
    nama: 'Ridho Auliya Ramadhan',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Ridho',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015130',
    nis: '124015130',
    nisn: '006815130',
    nama: 'Sandi Alfayanda',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Sandi',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015131',
    nis: '124015131',
    nisn: '006815131',
    nama: 'Sanny faridhatul Hayati',
    jenis_kelamin: 'P',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Sanny',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015132',
    nis: '124015132',
    nisn: '006815132',
    nama: 'Tiara Erina Putri',
    jenis_kelamin: 'P',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Tiara',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015133',
    nis: '124015133',
    nisn: '006815133',
    nama: 'Wahziana Rahayu Putri',
    jenis_kelamin: 'P',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Wahziana',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015101',
    nis: '124015101',
    nisn: '006815101',
    nama: 'Al-Farisi Suparman',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Al-Farisi',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015103',
    nis: '124015103',
    nisn: '006815103',
    nama: 'Ardi Rievaldi',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Ardi',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015104',
    nis: '124015104',
    nisn: '006815104',
    nama: 'Aurel Aura Aprillita',
    jenis_kelamin: 'P',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Aurel',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015105',
    nis: '124015105',
    nisn: '006815105',
    nama: 'Bayu Fhirdaus',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Bayu',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015308',
    nis: '124015308',
    nisn: '006815308',
    nama: 'Fikry Ramadhan',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Fikry',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
  {
    id: 's-124015109',
    nis: '124015109',
    nisn: '006815109',
    nama: 'LL Muhammad Arghi Aditya',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 2',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081563634318',
    nama_ortu: 'Orang Tua Arghi',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=240&auto=format&fit=crop&q=80',
    alamat: 'Kota Sukabumi',
  },
];

const STORAGE_KEYS = {
  SISWA: 'pgri_sukabumi_siswa_v1',
  ABSENSI: 'pgri_sukabumi_absensi_v1',
  CONFIG: 'pgri_sukabumi_config_v1',
};

export function getStoredStudents(): Siswa[] {
  if (typeof window === 'undefined') return INITIAL_STUDENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SISWA);
    if (!raw) {
      saveStudents(INITIAL_STUDENTS);
      return INITIAL_STUDENTS;
    }
    const parsed: Siswa[] = JSON.parse(raw);
    
    // Auto-migrate any old dummy classes (e.g., RPL/TKRO) to official classes
    let hasChanges = false;
    const migrated = parsed.map(s => {
      let changed = false;
      let newKelas = s.kelas;
      let newJurusan = s.jurusan;
      
      if (s.kelas.includes('RPL') || s.kelas.includes('TKRO')) {
        changed = true;
        if (s.kelas.startsWith('XII')) {
          newKelas = s.kelas.includes('TKRO') ? 'XII BR 1' : 'XII TKJ 1';
        } else if (s.kelas.startsWith('XI')) {
          newKelas = s.kelas.includes('TKRO') ? 'XI BR 1' : 'XI TKJ 1';
        } else {
          newKelas = 'X TKJT 1';
        }
        newJurusan = getJurusanByClassName(newKelas);
      }
      
      if (changed) {
        hasChanges = true;
        return {
          ...s,
          kelas: newKelas,
          jurusan: newJurusan,
          jam_pulang: getDefaultDepartureForClass(newKelas),
        };
      }
      return s;
    });

    if (hasChanges) {
      saveStudents(migrated);
      return migrated;
    }

    return parsed;
  } catch (err) {
    console.error('Failed to parse students from localStorage:', err);
    return INITIAL_STUDENTS;
  }
}

export function saveStudents(students: Siswa[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SISWA, JSON.stringify(students));
  } catch (err) {
    console.error('Failed to save students to localStorage:', err);
  }
}

export function getStoredAttendance(): Absensi[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ABSENSI);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse attendance from localStorage:', err);
    return [];
  }
}

export function saveAttendance(records: Absensi[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save attendance to localStorage:', err);
  }
}

export function getSchoolConfig(): SchoolConfig {
  if (typeof window === 'undefined') return INITIAL_SCHOOL_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) {
      saveSchoolConfig(INITIAL_SCHOOL_CONFIG);
      return INITIAL_SCHOOL_CONFIG;
    }
    const parsed = JSON.parse(raw);
    if (parsed.npsn === '20252994' || !parsed.alamat || parsed.alamat.includes('KM. 6')) {
      const updated: SchoolConfig = {
        ...INITIAL_SCHOOL_CONFIG,
        ...parsed,
        npsn: '20221574',
        alamat: 'Jl. Pelabuhan II Perum Cipoho Indah, Cikondang-Citamiang Kota Sukabumi',
        sabtu_minggu_libur: parsed.sabtu_minggu_libur !== false,
        jam_masuk_harian: {
          ...INITIAL_SCHOOL_CONFIG.jam_masuk_harian,
          ...(parsed.jam_masuk_harian || {}),
        },
        jam_pulang_per_kelas: {
          ...DEFAULT_JAM_PULANG_PER_KELAS,
          ...(parsed.jam_pulang_per_kelas || {}),
        },
        jam_pulang_harian_per_kelas: {
          ...DEFAULT_JAM_PULANG_HARIAN_PER_KELAS,
          ...(parsed.jam_pulang_harian_per_kelas || {}),
        },
      };
      saveSchoolConfig(updated);
      return updated;
    }

    const configWithSchedule: SchoolConfig = {
      ...INITIAL_SCHOOL_CONFIG,
      ...parsed,
      sabtu_minggu_libur: parsed.sabtu_minggu_libur !== false,
      jam_masuk_harian: {
        ...INITIAL_SCHOOL_CONFIG.jam_masuk_harian,
        ...(parsed.jam_masuk_harian || {}),
      },
      jam_pulang_per_kelas: {
        ...DEFAULT_JAM_PULANG_PER_KELAS,
        ...(parsed.jam_pulang_per_kelas || {}),
      },
      jam_pulang_harian_per_kelas: {
        ...DEFAULT_JAM_PULANG_HARIAN_PER_KELAS,
        ...(parsed.jam_pulang_harian_per_kelas || {}),
      },
    };
    return configWithSchedule;
  } catch {
    return INITIAL_SCHOOL_CONFIG;
  }
}

/**
 * Propagate class departure schedule to students
 */
export function applyClassScheduleToStudents(
  students: Siswa[],
  scheduleOrConfig: Record<string, string> | SchoolConfig,
  activeDate?: Date | string
): Siswa[] {
  return students.map(s => {
    let effectiveTime: string;
    if (typeof scheduleOrConfig === 'object' && 'nama_sekolah' in scheduleOrConfig) {
      effectiveTime = getEffectiveJamPulang(s.kelas, activeDate, scheduleOrConfig as SchoolConfig);
    } else if (typeof scheduleOrConfig === 'object' && scheduleOrConfig[s.kelas]) {
      effectiveTime = scheduleOrConfig[s.kelas];
    } else {
      effectiveTime = s.jam_pulang || '15:00';
    }
    return { ...s, jam_pulang: effectiveTime };
  });
}

export function saveSchoolConfig(config: SchoolConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save school config:', err);
  }
}

/**
 * Format current date string as YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date in Indonesian locale (e.g. "Kamis, 15 Oktober 2026")
 */
export function formatIndonesianDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export interface AppBackupData {
  version: string;
  exportedAt: string;
  schoolName: string;
  config: SchoolConfig;
  students: Siswa[];
  attendanceRecords: Absensi[];
}

export function exportAppDataToJson(
  students: Siswa[],
  config: SchoolConfig,
  attendanceRecords: Absensi[]
): void {
  const data: AppBackupData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    schoolName: config.nama_sekolah || 'SMKS PGRI 1 KOTA SUKABUMI',
    config,
    students,
    attendanceRecords,
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = getTodayDateString();
  a.download = `backup_data_siswa_pgri1_${dateStr}_${students.length}siswa.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseAppDataFromJson(jsonString: string): AppBackupData {
  try {
    const data = JSON.parse(jsonString);
    if (!data.students || !Array.isArray(data.students)) {
      throw new Error('Format cadangan tidak valid (tidak ditemukan array data siswa).');
    }
    return data;
  } catch (err: any) {
    throw new Error('Gagal membaca file cadangan JSON: ' + err.message);
  }
}

