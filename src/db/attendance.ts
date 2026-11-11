import { db } from './index.ts';
import { attendance } from './schema.ts';
import { eq, sql, desc } from 'drizzle-orm';
import { Absensi, StatusAbsensi, StatusSholat } from '../types';

interface PackedWaAndSholatMeta {
  waDetail?: string;
  jamDzuhur?: string | null;
  statusDzuhur?: StatusSholat | null;
}

function packWaAndSholatDetail(rec: Absensi): string | null {
  const hasSholat = Boolean(rec.jam_dzuhur || rec.status_dzuhur);
  if (!hasSholat) {
    return rec.notifikasi_wa_detail || null;
  }
  const meta: PackedWaAndSholatMeta = {
    waDetail: rec.notifikasi_wa_detail || undefined,
    jamDzuhur: rec.jam_dzuhur || null,
    statusDzuhur: rec.status_dzuhur || null,
  };
  return `__META_V2__:${JSON.stringify(meta)}`;
}

function unpackWaAndSholatDetail(raw: string | null | undefined): {
  notifikasi_wa_detail?: string;
  jam_dzuhur: string | null;
  status_dzuhur: StatusSholat | null;
} {
  if (!raw) {
    return { notifikasi_wa_detail: undefined, jam_dzuhur: null, status_dzuhur: null };
  }
  if (raw.startsWith('__META_V2__:')) {
    try {
      const parsed: PackedWaAndSholatMeta = JSON.parse(raw.slice('__META_V2__:'.length));
      return {
        notifikasi_wa_detail: parsed.waDetail || undefined,
        jam_dzuhur: parsed.jamDzuhur || null,
        status_dzuhur: parsed.statusDzuhur || null,
      };
    } catch {
      return { notifikasi_wa_detail: raw, jam_dzuhur: null, status_dzuhur: null };
    }
  }
  return { notifikasi_wa_detail: raw, jam_dzuhur: null, status_dzuhur: null };
}

export async function getAttendanceByDate(tanggal: string): Promise<Absensi[]> {
  try {
    const rows = await db
      .select()
      .from(attendance)
      .where(eq(attendance.tanggal, tanggal));

    return rows.map(r => {
      const unpacked = unpackWaAndSholatDetail(r.notifikasiWaDetail);
      return {
        id: r.id,
        siswa_id: r.studentId || '',
        nis: r.nis,
        nama: r.nama,
        kelas: r.kelas,
        tanggal: r.tanggal,
        jam_masuk: r.jamMasuk || null,
        status_masuk: (r.statusMasuk as 'TEPAT_WAKTU' | 'TERLAMBAT') || null,
        jam_pulang: r.jamPulang || null,
        status_pulang: (r.statusPulang as 'PULANG') || null,
        jam_dzuhur: unpacked.jam_dzuhur,
        status_dzuhur: unpacked.status_dzuhur,
        status_akhir: r.statusAkhir as StatusAbsensi,
        keterangan: r.keterangan || undefined,
        notifikasi_wa_terkirim: !!r.notifikasiWaTerkirim,
        notifikasi_wa_detail: unpacked.notifikasi_wa_detail,
        created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error('Database getAttendanceByDate failed:', error);
    throw new Error('Gagal mengambil data absensi dari database.', { cause: error });
  }
}

export async function getAllAttendanceLogs(limit = 1000): Promise<Absensi[]> {
  try {
    const rows = await db
      .select()
      .from(attendance)
      .orderBy(desc(attendance.tanggal), desc(attendance.createdAt))
      .limit(limit);

    return rows.map(r => {
      const unpacked = unpackWaAndSholatDetail(r.notifikasiWaDetail);
      return {
        id: r.id,
        siswa_id: r.studentId || '',
        nis: r.nis,
        nama: r.nama,
        kelas: r.kelas,
        tanggal: r.tanggal,
        jam_masuk: r.jamMasuk || null,
        status_masuk: (r.statusMasuk as 'TEPAT_WAKTU' | 'TERLAMBAT') || null,
        jam_pulang: r.jamPulang || null,
        status_pulang: (r.statusPulang as 'PULANG') || null,
        jam_dzuhur: unpacked.jam_dzuhur,
        status_dzuhur: unpacked.status_dzuhur,
        status_akhir: r.statusAkhir as StatusAbsensi,
        keterangan: r.keterangan || undefined,
        notifikasi_wa_terkirim: !!r.notifikasiWaTerkirim,
        notifikasi_wa_detail: unpacked.notifikasi_wa_detail,
        created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error('Database getAllAttendanceLogs failed:', error);
    throw new Error('Gagal mengambil seluruh data absensi dari database.', { cause: error });
  }
}

export async function recordAttendanceLog(rec: Absensi): Promise<Absensi> {
  try {
    const packedDetail = packWaAndSholatDetail(rec);
    const result = await db
      .insert(attendance)
      .values({
        id: rec.id || `${rec.nis}-${rec.tanggal}-${Date.now()}`,
        studentId: rec.siswa_id || null,
        nis: rec.nis,
        nama: rec.nama,
        kelas: rec.kelas,
        tanggal: rec.tanggal,
        jamMasuk: rec.jam_masuk || null,
        statusMasuk: rec.status_masuk || null,
        jamPulang: rec.jam_pulang || null,
        statusPulang: rec.status_pulang || null,
        statusAkhir: rec.status_akhir,
        keterangan: rec.keterangan || null,
        notifikasiWaTerkirim: !!rec.notifikasi_wa_terkirim,
        notifikasiWaDetail: packedDetail,
      })
      .onConflictDoUpdate({
        target: [attendance.nis, attendance.tanggal],
        set: {
          jamMasuk: rec.jam_masuk || sql`COALESCE(${attendance.jamMasuk}, ${rec.jam_masuk})`,
          statusMasuk: rec.status_masuk || sql`COALESCE(${attendance.statusMasuk}, ${rec.status_masuk})`,
          jamPulang: rec.jam_pulang || sql`${attendance.jamPulang}`,
          statusPulang: rec.status_pulang || sql`${attendance.statusPulang}`,
          statusAkhir: rec.status_akhir,
          keterangan: rec.keterangan || null,
          notifikasiWaTerkirim: !!rec.notifikasi_wa_terkirim,
          notifikasiWaDetail: packedDetail,
        },
      })
      .returning();

    const r = result[0];
    const unpacked = unpackWaAndSholatDetail(r.notifikasiWaDetail);
    return {
      id: r.id,
      siswa_id: r.studentId || '',
      nis: r.nis,
      nama: r.nama,
      kelas: r.kelas,
      tanggal: r.tanggal,
      jam_masuk: r.jamMasuk || null,
      status_masuk: (r.statusMasuk as 'TEPAT_WAKTU' | 'TERLAMBAT') || null,
      jam_pulang: r.jamPulang || null,
      status_pulang: (r.statusPulang as 'PULANG') || null,
      jam_dzuhur: unpacked.jam_dzuhur,
      status_dzuhur: unpacked.status_dzuhur,
      status_akhir: r.statusAkhir as StatusAbsensi,
      keterangan: r.keterangan || undefined,
      notifikasi_wa_terkirim: !!r.notifikasiWaTerkirim,
      notifikasi_wa_detail: unpacked.notifikasi_wa_detail,
      created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Database recordAttendanceLog failed:', error);
    throw new Error('Gagal mencatat log absensi ke database.', { cause: error });
  }
}

export async function bulkUpdateAttendanceLogs(records: Absensi[]): Promise<number> {
  if (!records || records.length === 0) return 0;
  try {
    let count = 0;
    const CHUNK_SIZE = 50;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      const values = chunk.map(rec => ({
        id: rec.id || `${rec.nis}-${rec.tanggal}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        studentId: rec.siswa_id || null,
        nis: String(rec.nis).trim(),
        nama: String(rec.nama || '').trim(),
        kelas: String(rec.kelas || '').trim(),
        tanggal: String(rec.tanggal).trim(),
        jamMasuk: rec.jam_masuk || null,
        statusMasuk: rec.status_masuk || null,
        jamPulang: rec.jam_pulang || null,
        statusPulang: rec.status_pulang || null,
        statusAkhir: rec.status_akhir,
        keterangan: rec.keterangan || null,
        notifikasiWaTerkirim: !!rec.notifikasi_wa_terkirim,
        notifikasiWaDetail: packWaAndSholatDetail(rec),
      }));

      await db
        .insert(attendance)
        .values(values)
        .onConflictDoUpdate({
          target: [attendance.nis, attendance.tanggal],
          set: {
            jamMasuk: sql`COALESCE(excluded.jam_masuk, attendance.jam_masuk)`,
            statusMasuk: sql`COALESCE(excluded.status_masuk, attendance.status_masuk)`,
            jamPulang: sql`COALESCE(excluded.jam_pulang, attendance.jam_pulang)`,
            statusPulang: sql`COALESCE(excluded.status_pulang, attendance.status_pulang)`,
            statusAkhir: sql`excluded.status_akhir`,
            keterangan: sql`excluded.keterangan`,
            notifikasiWaTerkirim: sql`excluded.notifikasi_wa_terkirim`,
            notifikasiWaDetail: sql`excluded.notifikasi_wa_detail`,
          },
        });
      count += chunk.length;
    }
    return count;
  } catch (error) {
    console.error('Database bulkUpdateAttendanceLogs failed:', error);
    throw new Error('Gagal memperbarui absensi massal di database.', { cause: error });
  }
}

export async function getAttendanceRecapStats(tanggal: string) {
  try {
    const stats = await db
      .select({
        statusAkhir: attendance.statusAkhir,
        count: sql<number>`count(*)::int`,
      })
      .from(attendance)
      .where(eq(attendance.tanggal, tanggal))
      .groupBy(attendance.statusAkhir);

    return stats;
  } catch (error) {
    console.error('Database getAttendanceRecapStats failed:', error);
    throw new Error('Gagal mengagregasi data absensi.', { cause: error });
  }
}

export async function clearAttendanceLogs(tanggal?: string): Promise<number> {
  try {
    if (tanggal && tanggal !== 'all') {
      const deleted = await db
        .delete(attendance)
        .where(eq(attendance.tanggal, tanggal))
        .returning({ id: attendance.id });
      return deleted.length;
    } else {
      const deleted = await db
        .delete(attendance)
        .returning({ id: attendance.id });
      return deleted.length;
    }
  } catch (error) {
    console.error('Database clearAttendanceLogs failed:', error);
    throw new Error('Gagal mereset data log presensi di database.', { cause: error });
  }
}
