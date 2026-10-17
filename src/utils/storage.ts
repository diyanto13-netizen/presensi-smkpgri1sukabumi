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
  jam_pulang_per_kelas: { ...DEFAULT_JAM_PULANG_PER_KELAS },
  jam_pulang_harian_per_kelas: { ...DEFAULT_JAM_PULANG_HARIAN_PER_KELAS },
  fonnte_token: '',
  fonnte_test_mode: true,
  sound_enabled: true,
  voice_announcement_enabled: true,
};

export const INITIAL_STUDENTS: Siswa[] = [
  {
    id: 's-1',
    nis: '23241001',
    nisn: '0068123451',
    nama: 'Muhammad Rizky Pratama',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 1',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '081234567890',
    nama_ortu: 'Bambang Pratama',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80',
    alamat: 'Cisaat, Sukabumi',
  },
  {
    id: 's-2',
    nis: '23241002',
    nisn: '0068123452',
    nama: 'Siti Nurhaliza Putri',
    jenis_kelamin: 'P',
    kelas: 'XII AKL',
    jurusan: 'Akuntansi',
    no_wa_ortu: '081398765432',
    nama_ortu: 'Hj. Endang Rahayu',
    jam_pulang: '15:00',
    foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
    alamat: 'Baros, Kota Sukabumi',
  },
  {
    id: 's-3',
    nis: '23241003',
    nisn: '0068123453',
    nama: 'Dimas Aditya Nugraha',
    jenis_kelamin: 'L',
    kelas: 'XI TKJ 1',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '085712349988',
    nama_ortu: 'Iwan Nugraha',
    jam_pulang: '15:30',
    foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80',
    alamat: 'Lembursitu, Sukabumi',
  },
  {
    id: 's-4',
    nis: '23241004',
    nisn: '0068123454',
    nama: 'Annisa Fitriani Zahra',
    jenis_kelamin: 'P',
    kelas: 'X MPLB 1',
    jurusan: 'Manajemen Perkantoran',
    no_wa_ortu: '082198877665',
    nama_ortu: 'Drs. Aep Saepudin',
    jam_pulang: '14:30',
    foto_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&auto=format&fit=crop&q=80',
    alamat: 'Gunungpuyuh, Kota Sukabumi',
  },
  {
    id: 's-5',
    nis: '23241005',
    nisn: '0068123455',
    nama: 'Fajar Ramadhan Saputra',
    jenis_kelamin: 'L',
    kelas: 'XII BR 1',
    jurusan: 'Pemasaran',
    no_wa_ortu: '087811223344',
    nama_ortu: 'Dedi Saputra',
    jam_pulang: '15:00',
    foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80',
    alamat: 'Cikole, Kota Sukabumi',
  },
  {
    id: 's-6',
    nis: '23241006',
    nisn: '0068123456',
    nama: 'Nabila Syakirah Azzahra',
    jenis_kelamin: 'P',
    kelas: 'XI MP 1',
    jurusan: 'Manajemen Perkantoran',
    no_wa_ortu: '089677889900',
    nama_ortu: 'Dra. Rina Marlina',
    jam_pulang: '15:00',
    foto_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=240&auto=format&fit=crop&q=80',
    alamat: 'Warudoyong, Sukabumi',
  },
  {
    id: 's-7',
    nis: '23241007',
    nisn: '0068123457',
    nama: 'Bagus Tri Wicaksono',
    jenis_kelamin: 'L',
    kelas: 'X PM 1',
    jurusan: 'Pemasaran',
    no_wa_ortu: '081288994433',
    nama_ortu: 'Triyono',
    jam_pulang: '14:30',
    foto_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&auto=format&fit=crop&q=80',
    alamat: 'Cibadak, Sukabumi',
  },
  {
    id: 's-8',
    nis: '23241008',
    nisn: '0068123458',
    nama: 'Alika Putri Rahmadani',
    jenis_kelamin: 'P',
    kelas: 'X TKJT 1',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '085811223399',
    nama_ortu: 'Hendra Gunawan',
    jam_pulang: '15:00',
    foto_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80',
    alamat: 'Cikondang, Citamiang Kota Sukabumi',
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
        jam_pulang_per_kelas: {
          ...DEFAULT_JAM_PULANG_PER_KELAS,
          ...(parsed.jam_pulang_per_kelas || {}),
        },
      };
      saveSchoolConfig(updated);
      return updated;
    }

    const configWithSchedule: SchoolConfig = {
      ...INITIAL_SCHOOL_CONFIG,
      ...parsed,
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

