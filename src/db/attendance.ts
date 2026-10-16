import { db } from './index.ts';
import { attendance } from './schema.ts';
import { eq, and, sql } from 'drizzle-orm';
import { Absensi, StatusAbsensi } from '../types';

export async function getAttendanceByDate(tanggal: string): Promise<Absensi[]> {
  try {
    const rows = await db
      .select()
      .from(attendance)
      .where(eq(attendance.tanggal, tanggal));

    return rows.map(r => ({
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
      status_akhir: r.statusAkhir as StatusAbsensi,
      keterangan: r.keterangan || undefined,
      notifikasi_wa_terkirim: !!r.notifikasiWaTerkirim,
      notifikasi_wa_detail: r.notifikasiWaDetail || undefined,
      created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Database getAttendanceByDate failed:', error);
    throw new Error('Gagal mengambil data absensi dari database.', { cause: error });
  }
}

export async function recordAttendanceLog(rec: Absensi): Promise<Absensi> {
  try {
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
        notifikasiWaDetail: rec.notifikasi_wa_detail || null,
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
          notifikasiWaDetail: rec.notifikasi_wa_detail || null,
        },
      })
      .returning();

    const r = result[0];
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
      status_akhir: r.statusAkhir as StatusAbsensi,
      keterangan: r.keterangan || undefined,
      notifikasi_wa_terkirim: !!r.notifikasiWaTerkirim,
      notifikasi_wa_detail: r.notifikasiWaDetail || undefined,
      created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Database recordAttendanceLog failed:', error);
    throw new Error('Gagal mencatat log absensi ke database.', { cause: error });
  }
}

export async function bulkUpdateAttendanceLogs(records: Absensi[]): Promise<number> {
  try {
    let count = 0;
    for (const r of records) {
      await recordAttendanceLog(r);
      count++;
    }
    return count;
  } catch (error) {
    console.error('Database bulkUpdateAttendanceLogs failed:', error);
    throw new Error('Gagal memperbarui absensi massal di database.', { cause: error });
  }
}

// Instant SQL Aggregation for 700 Students
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
