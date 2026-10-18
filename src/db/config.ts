import { db } from './index.ts';
import { schoolConfigTable } from './schema.ts';
import { desc, eq } from 'drizzle-orm';
import { SchoolConfig, JamPulangHarian } from '../types';
import { DEFAULT_JAM_PULANG_PER_KELAS, DEFAULT_JAM_PULANG_HARIAN_PER_KELAS } from '../utils/classConfig.ts';

export async function getDbSchoolConfig(): Promise<SchoolConfig | null> {
  try {
    const rows = await db
      .select()
      .from(schoolConfigTable)
      .orderBy(desc(schoolConfigTable.id))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];

    let jamPulangMap: Record<string, string> = { ...DEFAULT_JAM_PULANG_PER_KELAS };
    let jamPulangHarianMap: Record<string, JamPulangHarian> = { ...DEFAULT_JAM_PULANG_HARIAN_PER_KELAS };
    let jamMasukHarian: any = undefined;
    let sabtuMingguLibur = true;

    if (r.jamPulangPerKelas) {
      try {
        const parsed = JSON.parse(r.jamPulangPerKelas);
        if (parsed.flat || parsed.daily) {
          jamPulangMap = parsed.flat || jamPulangMap;
          jamPulangHarianMap = parsed.daily || jamPulangHarianMap;
          if (parsed.jamMasukHarian) jamMasukHarian = parsed.jamMasukHarian;
          if (parsed.sabtuMingguLibur !== undefined) sabtuMingguLibur = parsed.sabtuMingguLibur;
        } else {
          jamPulangMap = parsed;
        }
      } catch (e) {
        // fallback
      }
    }

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
    const jamPulangJson = JSON.stringify({
      flat: cfg.jam_pulang_per_kelas || DEFAULT_JAM_PULANG_PER_KELAS,
      daily: cfg.jam_pulang_harian_per_kelas || DEFAULT_JAM_PULANG_HARIAN_PER_KELAS,
      jamMasukHarian: cfg.jam_masuk_harian,
      sabtuMingguLibur: cfg.sabtu_minggu_libur !== false,
    });
    
    // Check if row exists
    const existing = await db
      .select({ id: schoolConfigTable.id })
      .from(schoolConfigTable)
      .limit(1);

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
