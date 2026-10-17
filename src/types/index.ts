/**
 * Types for Absensi & Generator Kartu Pelajar QR SMKS PGRI 1 Sukabumi
 */

export type Kelas = 
  // Kelas XII (7 Kelas)
  | 'XII TKJ 1' | 'XII TKJ 2' | 'XII AKL' | 'XII MP 1' | 'XII MP 2' | 'XII BR 1' | 'XII BR 2'
  // Kelas XI (7 Kelas)
  | 'XI TKJ 1' | 'XI TKJ 2' | 'XI AKL' | 'XI MP 1' | 'XI MP 2' | 'XI BR 1' | 'XI BR 2'
  // Kelas X (7 Kelas)
  | 'X TKJT 1' | 'X TKJT 2' | 'X AKL' | 'X MPLB 1' | 'X MPLB 2' | 'X PM 1' | 'X PM 2'
  | string;

export interface Siswa {
  id: string;
  nis: string;
  nisn?: string;
  nama: string;
  jenis_kelamin: 'L' | 'P';
  kelas: string;
  jurusan: string;
  no_wa_ortu: string;
  nama_ortu?: string;
  jam_pulang: string; // Format "HH:mm" e.g., "15:00" or "15:30"
  foto_url?: string;
  alamat?: string;
}

export type StatusAbsensi = 'TEPAT_WAKTU' | 'TERLAMBAT' | 'PULANG' | 'IZIN' | 'SAKIT' | 'ALPA';

export interface Absensi {
  id: string;
  siswa_id: string;
  nis: string;
  nama: string;
  kelas: string;
  tanggal: string; // YYYY-MM-DD
  jam_masuk: string | null; // HH:mm:ss
  status_masuk: 'TEPAT_WAKTU' | 'TERLAMBAT' | null;
  jam_pulang: string | null; // HH:mm:ss
  status_pulang: 'PULANG' | null;
  status_akhir: StatusAbsensi;
  keterangan?: string;
  notifikasi_wa_terkirim: boolean;
  notifikasi_wa_detail?: string;
  created_at: string;
}

export interface ScanResult {
  success: boolean;
  type: 'MASUK' | 'PULANG' | 'REJECTED' | 'ALREADY_COMPLETED';
  siswa?: Siswa;
  absensi?: Absensi;
  message: string;
  timestamp: string;
  statusDetail?: 'TEPAT_WAKTU' | 'TERLAMBAT' | 'PULANG';
  waNotificationStatus?: 'SENT' | 'FAILED' | 'SIMULATED';
}

export type HariSekolah = 'senin' | 'selasa' | 'rabu' | 'kamis' | 'jumat' | 'sabtu';

export type JamPulangHarian = {
  senin?: string;
  selasa?: string;
  rabu?: string;
  kamis?: string;
  jumat?: string;
  sabtu?: string;
};

export interface SchoolConfig {
  nama_sekolah: string;
  yayasan: string;
  npsn: string;
  akreditasi: string;
  alamat: string;
  telepon: string;
  email: string;
  kepala_sekolah: string;
  nip_kepsek: string;
  logo_url?: string; // Optional custom logo image URL / base64
  jam_masuk_batas: string; // "07:00"
  jam_pulang_per_kelas?: Record<string, string>; // Jadwal jam pulang default per kelas
  jam_pulang_harian_per_kelas?: Record<string, JamPulangHarian>; // Jadwal pulang per kelas per hari (Senin-Jum'at/Sabtu)
  fonnte_token: string;
  fonnte_test_mode: boolean;
  sound_enabled: boolean;
  voice_announcement_enabled: boolean;
}

