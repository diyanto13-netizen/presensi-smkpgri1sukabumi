import { db } from './index.ts';
import { attendance } from './schema.ts';
import { eq, and, sql, desc } from 'drizzle-orm';
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
      jam_dzuhur: r.jamDzuhur || null,
      status_dzuhur: (r.statusDzuhur as any) || null,
      jam_ashar: r.jamAshar || null,
      status_ashar: (r.statusAshar as any) || null,
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

export async function getAllAttendanceLogs(limit = 1000): Promise<Absensi[]> {
  try {
    const rows = await db
      .select()
      .from(attendance)
      .orderBy(desc(attendance.tanggal), desc(attendance.createdAt))
      .limit(limit);

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
      jam_dzuhur: r.jamDzuhur || null,
      status_dzuhur: (r.statusDzuhur as any) || null,
      jam_ashar: r.jamAshar || null,
      status_ashar: (r.statusAshar as any) || null,
      status_akhir: r.statusAkhir as StatusAbsensi,
      keterangan: r.keterangan || undefined,
      notifikasi_wa_terkirim: !!r.notifikasiWaTerkirim,
      notifikasi_wa_detail: r.notifikasiWaDetail || undefined,
      created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Database getAllAttendanceLogs failed:', error);
    throw new Error('Gagal mengambil seluruh data absensi dari database.', { cause: error });
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
        jamDzuhur: rec.jam_dzuhur || null,
        statusDzuhur: rec.status_dzuhur || null,
        jamAshar: rec.jam_ashar || null,
        statusAshar: rec.status_ashar || null,
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
          jamDzuhur: rec.jam_dzuhur || sql`COALESCE(${attendance.jamDzuhur}, ${rec.jam_dzuhur})`,
          statusDzuhur: rec.status_dzuhur || sql`COALESCE(${attendance.statusDzuhur}, ${rec.status_dzuhur})`,
          jamAshar: rec.jam_ashar || sql`COALESCE(${attendance.jamAshar}, ${rec.jam_ashar})`,
          statusAshar: rec.status_ashar || sql`COALESCE(${attendance.statusAshar}, ${rec.status_ashar})`,
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
      jam_dzuhur: r.jamDzuhur || null,
      status_dzuhur: (r.statusDzuhur as any) || null,
      jam_ashar: r.jamAshar || null,
      status_ashar: (r.statusAshar as any) || null,
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
        jamDzuhur: rec.jam_dzuhur || null,
        statusDzuhur: rec.status_dzuhur || null,
        jamAshar: rec.jam_ashar || null,
        statusAshar: rec.status_ashar || null,
        statusAkhir: rec.status_akhir,
        keterangan: rec.keterangan || null,
        notifikasiWaTerkirim: !!rec.notifikasi_wa_terkirim,
        notifikasiWaDetail: rec.notifikasi_wa_detail || null,
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
            jamDzuhur: sql`COALESCE(excluded.jam_dzuhur, attendance.jam_dzuhur)`,
            statusDzuhur: sql`COALESCE(excluded.status_dzuhur, attendance.status_dzuhur)`,
            jamAshar: sql`COALESCE(excluded.jam_ashar, attendance.jam_ashar)`,
            statusAshar: sql`COALESCE(excluded.status_ashar, attendance.status_ashar)`,
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
