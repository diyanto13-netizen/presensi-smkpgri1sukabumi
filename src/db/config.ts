import { db } from './index.ts';
import { schoolConfigTable } from './schema.ts';
import { desc, eq } from 'drizzle-orm';
import { SchoolConfig, JamPulangHarian, PelanggaranSiswa } from '../types';
import { DEFAULT_JAM_PULANG_PER_KELAS, DEFAULT_JAM_PULANG_HARIAN_PER_KELAS } from '../utils/classConfig.ts';

interface StoredConfigPayload {
  flat?: Record<string, string>;
  daily?: Record<string, JamPulangHarian>;
  jamMasukHarian?: any;
  sabtuMingguLibur?: boolean;
  sholatAbsenEnabled?: boolean;
  sholatDzuhurMulai?: string;
  sholatDzuhurSelesai?: string;
  autoViolationTerlambat?: boolean;
  autoViolationDzuhur?: boolean;
  violations?: PelanggaranSiswa[];
}

function parseStoredPayload(raw: string | null | undefined): StoredConfigPayload {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.flat || parsed.daily || parsed.violations)) {
      return parsed as StoredConfigPayload;
    }
    return { flat: parsed };
  } catch {
    return {};
  }
}

export async function getDbSchoolConfig(): Promise<SchoolConfig | null> {
  try {
    const rows = await db
      .select()
      .from(schoolConfigTable)
      .orderBy(desc(schoolConfigTable.id))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];

    const parsed = parseStoredPayload(r.jamPulangPerKelas);
    const jamPulangMap: Record<string, string> = parsed.flat || { ...DEFAULT_JAM_PULANG_PER_KELAS };
    const jamPulangHarianMap: Record<string, JamPulangHarian> = parsed.daily || { ...DEFAULT_JAM_PULANG_HARIAN_PER_KELAS };
    const jamMasukHarian = parsed.jamMasukHarian;
    const sabtuMingguLibur = parsed.sabtuMingguLibur !== undefined ? parsed.sabtuMingguLibur : true;
    const sholatAbsenEnabled = parsed.sholatAbsenEnabled !== undefined ? parsed.sholatAbsenEnabled : true;
    const sholatDzuhurMulai = parsed.sholatDzuhurMulai || '11:45';
    const sholatDzuhurSelesai = parsed.sholatDzuhurSelesai || '13:00';
    const autoViolationTerlambat = parsed.autoViolationTerlambat !== undefined ? parsed.autoViolationTerlambat : true;
    const autoViolationDzuhur = parsed.autoViolationDzuhur !== undefined ? parsed.autoViolationDzuhur : true;

    return {
      nama_sekolah: r.namaSekolah,
      yayasan: r.yayasan,
      npsn: r.npsn,
      akreditasi: r.akreditasi,
      alamat: r.alamat,
      telepon: r.telepon,
      email: r.email,
      kepala_sekolah: r.kepalaSekolah,
      nip_kepsek: r.nipKepsek,
      logo_url: r.logoUrl || undefined,
      jam_masuk_batas: r.jamMasukBatas || '07:00',
      jam_masuk_harian: jamMasukHarian,
      sabtu_minggu_libur: sabtuMingguLibur,
      jam_pulang_per_kelas: jamPulangMap,
      jam_pulang_harian_per_kelas: jamPulangHarianMap,
      sholat_absen_enabled: sholatAbsenEnabled,
      sholat_dzuhur_mulai: sholatDzuhurMulai,
      sholat_dzuhur_selesai: sholatDzuhurSelesai,
      auto_violation_terlambat: autoViolationTerlambat,
      auto_violation_dzuhur: autoViolationDzuhur,
      fonnte_token: r.fonnteToken || '',
      fonnte_test_mode: r.fonnteTestMode ?? true,
      sound_enabled: r.soundEnabled ?? true,
      voice_announcement_enabled: r.voiceAnnouncementEnabled ?? true,
    };
  } catch (error) {
    console.error('Database getDbSchoolConfig failed:', error);
    throw new Error('Gagal mengambil konfigurasi sekolah dari database.', { cause: error });
  }
}

export async function saveDbSchoolConfig(cfg: SchoolConfig): Promise<SchoolConfig> {
  try {
    const existing = await db
      .select({ id: schoolConfigTable.id, jamPulangPerKelas: schoolConfigTable.jamPulangPerKelas })
      .from(schoolConfigTable)
      .orderBy(desc(schoolConfigTable.id))
      .limit(1);

    const prevPayload = existing.length > 0 ? parseStoredPayload(existing[0].jamPulangPerKelas) : {};

    const jamPulangJson = JSON.stringify({
      ...prevPayload,
      flat: cfg.jam_pulang_per_kelas || DEFAULT_JAM_PULANG_PER_KELAS,
      daily: cfg.jam_pulang_harian_per_kelas || DEFAULT_JAM_PULANG_HARIAN_PER_KELAS,
      jamMasukHarian: cfg.jam_masuk_harian,
      sabtuMingguLibur: cfg.sabtu_minggu_libur !== false,
      sholatAbsenEnabled: cfg.sholat_absen_enabled !== false,
      sholatDzuhurMulai: cfg.sholat_dzuhur_mulai || '11:45',
      sholatDzuhurSelesai: cfg.sholat_dzuhur_selesai || '13:00',
      autoViolationTerlambat: cfg.auto_violation_terlambat !== false,
      autoViolationDzuhur: cfg.auto_violation_dzuhur !== false,
    });

    if (existing.length > 0) {
      await db
        .update(schoolConfigTable)
        .set({
          namaSekolah: cfg.nama_sekolah,
          yayasan: cfg.yayasan,
          npsn: cfg.npsn,
          akreditasi: cfg.akreditasi,
          alamat: cfg.alamat,
          telepon: cfg.telepon,
          email: cfg.email,
          kepalaSekolah: cfg.kepala_sekolah,
          nipKepsek: cfg.nip_kepsek,
          logoUrl: cfg.logo_url || null,
          jamMasukBatas: cfg.jam_masuk_batas,
          jamPulangPerKelas: jamPulangJson,
          fonnteToken: cfg.fonnte_token || null,
          fonnteTestMode: cfg.fonnte_test_mode,
          soundEnabled: cfg.sound_enabled,
          voiceAnnouncementEnabled: cfg.voice_announcement_enabled,
          updatedAt: new Date(),
        })
        .where(eq(schoolConfigTable.id, existing[0].id));
    } else {
      await db.insert(schoolConfigTable).values({
        namaSekolah: cfg.nama_sekolah,
        yayasan: cfg.yayasan,
        npsn: cfg.npsn,
        akreditasi: cfg.akreditasi,
        alamat: cfg.alamat,
        telepon: cfg.telepon,
        email: cfg.email,
        kepalaSekolah: cfg.kepala_sekolah,
        nipKepsek: cfg.nip_kepsek,
        logoUrl: cfg.logo_url || null,
        jamMasukBatas: cfg.jam_masuk_batas,
        jamPulangPerKelas: jamPulangJson,
        fonnteToken: cfg.fonnte_token || null,
        fonnteTestMode: cfg.fonnte_test_mode,
        soundEnabled: cfg.sound_enabled,
        voiceAnnouncementEnabled: cfg.voice_announcement_enabled,
      });
    }

    return cfg;
  } catch (error) {
    console.error('Database saveDbSchoolConfig failed:', error);
    throw new Error('Gagal menyimpan konfigurasi sekolah ke database.', { cause: error });
  }
}

export async function getDbViolations(): Promise<PelanggaranSiswa[]> {
  try {
    const rows = await db
      .select({ jamPulangPerKelas: schoolConfigTable.jamPulangPerKelas })
      .from(schoolConfigTable)
      .orderBy(desc(schoolConfigTable.id))
      .limit(1);

    if (rows.length === 0) return [];
    const parsed = parseStoredPayload(rows[0].jamPulangPerKelas);
    return Array.isArray(parsed.violations) ? parsed.violations : [];
  } catch (error) {
    console.error('Database getDbViolations failed:', error);
    return [];
  }
}

export async function saveDbViolations(violations: PelanggaranSiswa[]): Promise<boolean> {
  try {
    const existing = await db
      .select({ id: schoolConfigTable.id, jamPulangPerKelas: schoolConfigTable.jamPulangPerKelas })
      .from(schoolConfigTable)
      .orderBy(desc(schoolConfigTable.id))
      .limit(1);

    if (existing.length === 0) return false;
    const prevPayload = parseStoredPayload(existing[0].jamPulangPerKelas);
    const updatedJson = JSON.stringify({
      ...prevPayload,
      violations: violations || [],
    });

    await db
      .update(schoolConfigTable)
      .set({
        jamPulangPerKelas: updatedJson,
        updatedAt: new Date(),
      })
      .where(eq(schoolConfigTable.id, existing[0].id));

    return true;
  } catch (error) {
    console.error('Database saveDbViolations failed:', error);
    return false;
  }
}
