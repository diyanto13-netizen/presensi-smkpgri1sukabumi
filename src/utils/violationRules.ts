import {
  JenisPelanggaranItem,
  PelanggaranSiswa,
  Absensi,
  Siswa,
  SchoolConfig,
} from '../types';
import { getTodayDateString } from './storage';

/**
 * Daftar Resmi 45 Jenis Pelanggaran & Poin Siswa SMKS PGRI 1 Kota Sukabumi
 * Sesuai Dokumen Pedoman Tata Tertib & Poin Pelanggaran Siswa
 */
export const MASTER_JENIS_PELANGGARAN: JenisPelanggaranItem[] = [
  // ================= A. PELANGGARAN RINGAN (1 - 18) =================
  {
    kode: 'R-01',
    nomor: 1,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Terlambat datang ke sekolah',
    poin: 5,
    otomatis_sistem: 'TERLAMBAT',
  },
  {
    kode: 'R-02',
    nomor: 2,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Tidak memakai atribut sekolah lengkap',
    poin: 5,
  },
  {
    kode: 'R-03',
    nomor: 3,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Seragam tidak sesuai ketentuan',
    poin: 5,
  },
  {
    kode: 'R-04',
    nomor: 4,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Tidak memasukkan baju sesuai ketentuan',
    poin: 5,
  },
  {
    kode: 'R-05',
    nomor: 5,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Tidak memakai ikat pinggang',
    poin: 5,
  },
  {
    kode: 'R-06',
    nomor: 6,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Tidak memakai kaus kaki sesuai ketentuan',
    poin: 5,
  },
  {
    kode: 'R-07',
    nomor: 7,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Tidak membawa kartu pelajar',
    poin: 5,
  },
  {
    kode: 'R-08',
    nomor: 8,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Rambut tidak sesuai ketentuan sekolah',
    poin: 5,
  },
  {
    kode: 'R-09',
    nomor: 9,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Memakai MakeUp berlebihan',
    poin: 5,
  },
  {
    kode: 'R-10',
    nomor: 10,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Membuang sampah sembarangan',
    poin: 5,
  },
  {
    kode: 'R-11',
    nomor: 11,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Tidak melaksanakan tugas piket',
    poin: 5,
  },
  {
    kode: 'R-12',
    nomor: 12,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Tidak membawa perlengkapan belajar',
    poin: 5,
  },
  {
    kode: 'R-13',
    nomor: 13,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Membuat kegaduhan saat pembelajaran',
    poin: 5,
  },
  {
    kode: 'R-14',
    nomor: 14,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Tidak mengikuti kegiatan literasi',
    poin: 5,
  },
  {
    kode: 'R-15',
    nomor: 15,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Menggunakan HP saat pembelajaran tanpa izin',
    poin: 5,
  },
  {
    kode: 'R-16',
    nomor: 16,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Tidak menjaga kebersihan lingkungan sekolah',
    poin: 5,
  },
  {
    kode: 'R-17',
    nomor: 17,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Tidak mengikuti solat duha tanpa alasan',
    poin: 5,
  },
  {
    kode: 'R-18',
    nomor: 18,
    kategori: 'RINGAN',
    jenis_pelanggaran: 'Tidak mengikuti solat duhur berjamaah tanpa alasan',
    poin: 5,
    otomatis_sistem: 'TIDAK_SHOLAT_DZUHUR',
  },

  // ================= B. PELANGGARAN SEDANG (1 - 15) =================
  {
    kode: 'S-01',
    nomor: 1,
    kategori: 'SEDANG',
    jenis_pelanggaran: 'Tidak masuk sekolah tanpa keterangan',
    poin: 15,
  },
  {
    kode: 'S-02',
    nomor: 2,
    kategori: 'SEDANG',
    jenis_pelanggaran: 'Membolos jam pelajaran',
    poin: 15,
  },
  {
    kode: 'S-03',
    nomor: 3,
    kategori: 'SEDANG',
    jenis_pelanggaran: 'Keluar kelas tanpa izin',
    poin: 10,
  },
  {
    kode: 'S-04',
    nomor: 4,
    kategori: 'SEDANG',
    jenis_pelanggaran: 'Keluar lingkungan sekolah tanpa izin',
    poin: 20,
  },
  {
    kode: 'S-05',
    nomor: 5,
    kategori: 'SEDANG',
    jenis_pelanggaran: 'Tidak mengikuti upacara tanpa alasan',
    poin: 10,
  },
  {
    kode: 'S-06',
    nomor: 6,
    kategori: 'SEDANG',
    jenis_pelanggaran: 'Tidak mengikuti kegiatan sekolah tanpa izin',
    poin: 15,
  },
  {
    kode: 'S-07',
    nomor: 7,
    kategori: 'SEDANG',
    jenis_pelanggaran: 'Berkata kasar kepada teman',
    poin: 15,
  },
  {
    kode: 'S-08',
    nomor: 8,
    kategori: 'SEDANG',
    jenis_pelanggaran: 'Tidak menghormati guru atau tenaga kependidikan',
    poin: 20,
  },
  {
    kode: 'S-09',
    nomor: 9,
    kategori: 'SEDANG',
    jenis_pelanggaran: 'Merokok di lingkungan sekolah',
    poin: 25,
  },
  {
    kode: 'S-10',
    nomor: 10,
    kategori: 'SEDANG',
    jenis_pelanggaran: 'Membawa barang yang mengganggu pembelajaran',
    poin: 15,
  },
  {
    kode: 'S-11',
    nomor: 11,
    kategori: 'SEDANG',
    jenis_pelanggaran: 'Mencoret meja, kursi, atau dinding sekolah',
    poin: 15,
  },
  {
    kode: 'S-12',
    nomor: 12,
    kategori: 'SEDANG',
    jenis_pelanggaran: 'Mengganggu kegiatan belajar kelas lain',
    poin: 15,
  },
  {
    kode: 'S-13',
    nomor: 13,
    kategori: 'SEDANG',
    jenis_pelanggaran: 'Mengulangi pelanggaran ringan',
    poin: 10,
  },
  {
    kode: 'S-14',
    nomor: 14,
    kategori: 'SEDANG',
    jenis_pelanggaran: 'Tidak mematuhi prosedur K3 saat praktik',
    poin: 20,
  },
  {
    kode: 'S-15',
    nomor: 15,
    kategori: 'SEDANG',
    jenis_pelanggaran: 'Tidak mengikuti kegiatan PKL tanpa keterangan',
    poin: 15,
  },

  // ================= C. PELANGGARAN BERAT (1 - 12) =================
  {
    kode: 'B-01',
    nomor: 1,
    kategori: 'BERAT',
    jenis_pelanggaran: 'Berkelahi di lingkungan sekolah',
    poin: 50,
  },
  {
    kode: 'B-02',
    nomor: 2,
    kategori: 'BERAT',
    jenis_pelanggaran: 'Melakukan intimidasi terhadap teman',
    poin: 50,
  },
  {
    kode: 'B-03',
    nomor: 3,
    kategori: 'BERAT',
    jenis_pelanggaran: 'Melakukan perundungan (bullying)',
    poin: 50,
  },
  {
    kode: 'B-04',
    nomor: 4,
    kategori: 'BERAT',
    jenis_pelanggaran: 'Melakukan kekerasan fisik',
    poin: 50,
  },
  {
    kode: 'B-05',
    nomor: 5,
    kategori: 'BERAT',
    jenis_pelanggaran: 'Melakukan pencurian',
    poin: 50,
  },
  {
    kode: 'B-06',
    nomor: 6,
    kategori: 'BERAT',
    jenis_pelanggaran: 'Merusak fasilitas sekolah dengan sengaja',
    poin: 40,
  },
  {
    kode: 'B-07',
    nomor: 7,
    kategori: 'BERAT',
    jenis_pelanggaran: 'Memalsukan tanda tangan atau dokumen sekolah',
    poin: 40,
  },
  {
    kode: 'B-08',
    nomor: 8,
    kategori: 'BERAT',
    jenis_pelanggaran: 'Mengancam guru atau warga sekolah',
    poin: 50,
  },
  {
    kode: 'B-09',
    nomor: 9,
    kategori: 'BERAT',
    jenis_pelanggaran: 'Melakukan pelecehan seksual',
    poin: 100,
    penanganan_khusus: true,
  },
  {
    kode: 'B-10',
    nomor: 10,
    kategori: 'BERAT',
    jenis_pelanggaran: 'Membawa atau mengedarkan narkotika',
    poin: 100,
    penanganan_khusus: true,
  },
  {
    kode: 'B-11',
    nomor: 11,
    kategori: 'BERAT',
    jenis_pelanggaran: 'Membawa senjata atau benda berbahaya',
    poin: 100,
    penanganan_khusus: true,
  },
  {
    kode: 'B-12',
    nomor: 12,
    kategori: 'BERAT',
    jenis_pelanggaran: 'Menyebarkan konten yang merugikan atau mengancam keselamatan warga sekolah',
    poin: 100,
    penanganan_khusus: true,
  },
];

export const ITEM_TERLAMBAT = MASTER_JENIS_PELANGGARAN[0]; // R-01 (5 Poin)
export const ITEM_TIDAK_SHOLAT_DZUHUR = MASTER_JENIS_PELANGGARAN[17]; // R-18 (5 Poin)

export function getAutoLateViolationId(nis: string, tanggal: string): string {
  return `auto-late-${String(nis).trim()}-${String(tanggal).trim()}`;
}

export function getAutoDzuhurViolationId(nis: string, tanggal: string): string {
  return `auto-dzuhur-${String(nis).trim()}-${String(tanggal).trim()}`;
}

/**
 * Menentukan status pembinaan siswa berdasarkan total akumulasi poin pelanggaran
 */
export function getStatusPembinaan(totalPoin: number, hasPenangananKhusus?: boolean): {
  level: 'AMAN' | 'PEMBINAAN_WALAS' | 'SP1_ORTU' | 'SP2_BK' | 'PENANGANAN_KHUSUS';
  label: string;
  tindakan: string;
} {
  if (hasPenangananKhusus || totalPoin >= 100) {
    return {
      level: 'PENANGANAN_KHUSUS',
      label: 'Penanganan Khusus / Konferensi Kasus',
      tindakan: 'Panggilan Orang Tua, Tim Ketertiban, BK & Kepala Sekolah',
    };
  }
  if (totalPoin >= 50) {
    return {
      level: 'SP2_BK',
      label: 'SP 2 / Pembinaan BK',
      tindakan: 'Surat Peringatan 2 & Konseling Intensif Guru BK + Wali Murid',
    };
  }
  if (totalPoin >= 25) {
    return {
      level: 'SP1_ORTU',
      label: 'SP 1 / Panggilan Orang Tua',
      tindakan: 'Surat Peringatan 1 & Pemanggilan Wali Murid oleh Wali Kelas/BK',
    };
  }
  if (totalPoin > 0) {
    return {
      level: 'PEMBINAAN_WALAS',
      label: 'Pembinaan Wali Kelas',
      tindakan: 'Teguran Lisan & Pembinaan Disiplin oleh Wali Kelas / Guru Piket',
    };
  }
  return {
    level: 'AMAN',
    label: 'Disiplin Baik (0 Poin)',
    tindakan: 'Pertahankan kedisiplinan & keteladanan siswa',
  };
}

/**
 * Sinkronisasi otomatis yang bebas bentrok (idempotent) antara seluruh rekaman presensi
 * dengan catatan poin pelanggaran otomatis:
 * 1. R-01: Terlambat datang ke sekolah (+5 Poin) -> otomatis tercatat jika status_masuk === 'TERLAMBAT'
 *    dan otomatis dibatalkan jika diubah menjadi TEPAT_WAKTU / IZIN / SAKIT.
 * 2. R-18: Tidak mengikuti solat duhur berjamaah tanpa alasan (+5 Poin) -> otomatis tercatat jika siswa
 *    hadir KBM di sekolah namun tidak melaksanakan Sholat Dzuhur tanpa alasan (status_dzuhur === 'TIDAK_TERLAKSANA',
 *    atau sudah scan Pulang tanpa scan Dzuhur & tidak Berhalangan, atau hari sudah lewat / lewat jam selesai Dzuhur).
 *    Jika kemudian siswa tercatat TERLAKSANA atau BERHALANGAN, poin otomatis dibatalkan.
 */
export function syncViolationsWithAttendance(
  attendanceRecords: Absensi[],
  students: Siswa[],
  currentViolations: PelanggaranSiswa[],
  config: SchoolConfig,
  overrideCurrentTimeHHmm?: string
): {
  updatedViolations: PelanggaranSiswa[];
  addedCount: number;
  removedCount: number;
} {
  const studentMap = new Map<string, Siswa>();
  students.forEach(s => studentMap.set(String(s.nis).trim(), s));

  const now = new Date();
  const todayStr = getTodayDateString();
  const currentHHmm =
    overrideCurrentTimeHHmm ||
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dzuhurEndHHmm = config.sholat_dzuhur_selesai || '13:00';

  const autoLateEnabled = config.auto_violation_terlambat !== false;
  const autoDzuhurEnabled = config.auto_violation_dzuhur !== false && config.sholat_absen_enabled !== false;

  // Keep all manual violations intact
  const manualViolations = currentViolations.filter(v => v.sumber === 'MANUAL_GURU');
  const existingAutoMap = new Map<string, PelanggaranSiswa>();
  currentViolations
    .filter(v => v.sumber !== 'MANUAL_GURU')
    .forEach(v => existingAutoMap.set(v.id, v));

  const nextAutoMap = new Map<string, PelanggaranSiswa>();

  for (const rec of attendanceRecords) {
    if (!rec || !rec.nis || !rec.tanggal) continue;
    const nis = String(rec.nis).trim();
    const student = studentMap.get(nis);
    const nama = rec.nama || student?.nama || nis;
    const kelas = rec.kelas || student?.kelas || '-';
    const jurusan = student?.jurusan || '';
    const siswaId = rec.siswa_id || student?.id || `s-${nis}`;

    const isExcused = rec.status_akhir === 'IZIN' || rec.status_akhir === 'SAKIT';

    // 1. Evaluasi Pelanggaran Otomatis R-01: Terlambat datang ke sekolah (+5 Poin)
    if (autoLateEnabled && !isExcused && (rec.status_masuk === 'TERLAMBAT' || rec.status_akhir === 'TERLAMBAT')) {
      const lateId = getAutoLateViolationId(nis, rec.tanggal);
      const existingLate = existingAutoMap.get(lateId);
      nextAutoMap.set(
        lateId,
        existingLate || {
          id: lateId,
          siswa_id: siswaId,
          nis,
          nama,
          kelas,
          jurusan,
          tanggal: rec.tanggal,
          waktu: rec.jam_masuk || '07:05:00',
          kode_pelanggaran: ITEM_TERLAMBAT.kode,
          kategori: ITEM_TERLAMBAT.kategori,
          jenis_pelanggaran: ITEM_TERLAMBAT.jenis_pelanggaran,
          poin: ITEM_TERLAMBAT.poin,
          sumber: 'OTOMATIS_PRESENSI',
          pelapor: 'Sistem Presensi QR (Otomatis)',
          keterangan: `Scan masuk pukul ${rec.jam_masuk || '-'} WIB (Melewati batas jam masuk ${config.jam_masuk_batas || '07:00'} WIB)`,
          created_at: rec.created_at || new Date().toISOString(),
        }
      );
    }

    // 2. Evaluasi Pelanggaran Otomatis R-18: Tidak mengikuti solat duhur berjamaah tanpa alasan (+5 Poin)
    // Syarat: Siswa hadir di sekolah pada hari tsb (bukan Izin/Sakit/Alpa), dan bukan hari Jum'at untuk sholat Dzuhur jika Jum'at pulang sebelum Dzuhur
    const attendedSchool =
      !isExcused &&
      (rec.status_masuk === 'TEPAT_WAKTU' ||
        rec.status_masuk === 'TERLAMBAT' ||
        rec.status_akhir === 'TEPAT_WAKTU' ||
        rec.status_akhir === 'TERLAMBAT' ||
        rec.status_akhir === 'PULANG');

    if (autoDzuhurEnabled && attendedSchool) {
      const dzuhurStatus = rec.status_dzuhur;
      const isPastDate = rec.tanggal < todayStr;
      const isTodayAfterDzuhur = rec.tanggal === todayStr && currentHHmm > dzuhurEndHHmm;
      const hasAlreadyLeftSchool = rec.status_pulang === 'PULANG' || rec.status_akhir === 'PULANG';

      const missedDzuhurWithoutExcuse =
        dzuhurStatus === 'TIDAK_TERLAKSANA' ||
        (!dzuhurStatus && (hasAlreadyLeftSchool || isPastDate || isTodayAfterDzuhur));

      if (missedDzuhurWithoutExcuse) {
        const dzuhurId = getAutoDzuhurViolationId(nis, rec.tanggal);
        const existingDzuhur = existingAutoMap.get(dzuhurId);
        nextAutoMap.set(
          dzuhurId,
          existingDzuhur || {
            id: dzuhurId,
            siswa_id: siswaId,
            nis,
            nama,
            kelas,
            jurusan,
            tanggal: rec.tanggal,
            waktu: rec.jam_pulang || `${dzuhurEndHHmm}:00`,
            kode_pelanggaran: ITEM_TIDAK_SHOLAT_DZUHUR.kode,
            kategori: ITEM_TIDAK_SHOLAT_DZUHUR.kategori,
            jenis_pelanggaran: ITEM_TIDAK_SHOLAT_DZUHUR.jenis_pelanggaran,
            poin: ITEM_TIDAK_SHOLAT_DZUHUR.poin,
            sumber: 'OTOMATIS_SHOLAT',
            pelapor: 'Sistem Presensi Sholat (Otomatis)',
            keterangan: `Hadir KBM di sekolah (${rec.jam_masuk || '-'}), namun tidak tercatat presensi Sholat Dzuhur berjamaah tanpa keterangan udzur/izin`,
            created_at: new Date().toISOString(),
          }
        );
      }
    }
  }

  let addedCount = 0;
  let removedCount = 0;

  nextAutoMap.forEach((_, id) => {
    if (!existingAutoMap.has(id)) addedCount++;
  });
  existingAutoMap.forEach((_, id) => {
    if (!nextAutoMap.has(id)) removedCount++;
  });

  const combined = [...manualViolations, ...Array.from(nextAutoMap.values())].sort((a, b) => {
    if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
    return (b.waktu || '').localeCompare(a.waktu || '');
  });

  return {
    updatedViolations: combined,
    addedCount,
    removedCount,
  };
}
