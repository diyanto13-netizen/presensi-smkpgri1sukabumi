import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// 1. Users Table (Linked to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('admin'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Students Table (Master Data Siswa)
export const students = pgTable(
  'students',
  {
    id: text('id').primaryKey(), // e.g. 's-1' or UUID
    nis: text('nis').notNull().unique(),
    nisn: text('nisn'),
    nama: text('nama').notNull(),
    jenisKelamin: text('jenis_kelamin').notNull(), // 'L' | 'P'
    kelas: text('kelas').notNull(), // e.g. 'XII TKJ 1'
    jurusan: text('jurusan').notNull(), // e.g. 'Teknik Komputer & Jaringan'
    noWaOrtu: text('no_wa_ortu').notNull(),
    namaOrtu: text('nama_ortu'),
    jamPulang: text('jam_pulang').default('15:00'),
    fotoUrl: text('foto_url'),
    alamat: text('alamat'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    uniqueIndex('nis_idx').on(table.nis),
  ]
);

// 3. Attendance Table (Log & Rekapitulasi Presensi Harian)
export const attendance = pgTable(
  'attendance',
  {
    id: text('id').primaryKey(), // e.g. UUID
    studentId: text('student_id').references(() => students.id),
    nis: text('nis').notNull(),
    nama: text('nama').notNull(),
    kelas: text('kelas').notNull(),
    tanggal: text('tanggal').notNull(), // YYYY-MM-DD
    jamMasuk: text('jam_masuk'), // HH:mm:ss
    statusMasuk: text('status_masuk'), // 'TEPAT_WAKTU' | 'TERLAMBAT'
    jamPulang: text('jam_pulang'), // HH:mm:ss
    statusPulang: text('status_pulang'), // 'PULANG'
    jamDzuhur: text('jam_dzuhur'), // HH:mm:ss
    statusDzuhur: text('status_dzuhur'), // 'TERLAKSANA' | 'TIDAK_TERLAKSANA' | 'BERHALANGAN'
    jamAshar: text('jam_ashar'), // HH:mm:ss
    statusAshar: text('status_ashar'), // 'TERLAKSANA' | 'TIDAK_TERLAKSANA' | 'BERHALANGAN'
    statusAkhir: text('status_akhir').notNull(), // 'TEPAT_WAKTU' | 'TERLAMBAT' | 'PULANG' | 'IZIN' | 'SAKIT' | 'ALPA'
    keterangan: text('keterangan'),
    notifikasiWaTerkirim: boolean('notifikasi_wa_terkirim').default(false),
    notifikasiWaDetail: text('notifikasi_wa_detail'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    uniqueIndex('nis_tanggal_idx').on(table.nis, table.tanggal),
  ]
);

// 4. School Configuration Table (Pengaturan Sekolah & Jam Pulang Kelas)
export const schoolConfigTable = pgTable('school_config', {
  id: serial('id').primaryKey(),
  namaSekolah: text('nama_sekolah').notNull(),
  yayasan: text('yayasan').notNull(),
  npsn: text('npsn').notNull(),
  akreditasi: text('akreditasi').notNull(),
  alamat: text('alamat').notNull(),
  telepon: text('telepon').notNull(),
  email: text('email').notNull(),
  kepalaSekolah: text('kepala_sekolah').notNull(),
  nipKepsek: text('nip_kepsek').notNull(),
  logoUrl: text('logo_url'),
  jamMasukBatas: text('jam_masuk_batas').notNull().default('07:00'),
  jamPulangPerKelas: text('jam_pulang_per_kelas'), // JSON Record<string, string>
  sholatAbsenEnabled: boolean('sholat_absen_enabled').default(true),
  sholatDzuhurMulai: text('sholat_dzuhur_mulai').default('11:45'),
  sholatDzuhurSelesai: text('sholat_dzuhur_selesai').default('13:00'),
  sholatAsharMulai: text('sholat_ashar_mulai').default('15:15'),
  sholatAsharSelesai: text('sholat_ashar_selesai').default('16:15'),
  fonnteToken: text('fonnte_token'),
  fonnteTestMode: boolean('fonnte_test_mode').default(true),
  soundEnabled: boolean('sound_enabled').default(true),
  voiceAnnouncementEnabled: boolean('voice_announcement_enabled').default(true),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relationships
export const studentsRelations = relations(students, ({ many }) => ({
  attendance: many(attendance),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  student: one(students, {
    fields: [attendance.studentId],
    references: [students.id],
  }),
}));
