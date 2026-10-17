import { db } from './index.ts';
import { students, attendance } from './schema.ts';
import { eq, inArray, sql } from 'drizzle-orm';
import { Siswa } from '../types';

export async function getAllStudents(): Promise<Siswa[]> {
  try {
    const rows = await db
      .select()
      .from(students)
      .orderBy(students.kelas, students.nama);

    return rows.map(r => ({
      id: r.id,
      nis: r.nis,
      nisn: r.nisn || undefined,
      nama: r.nama,
      jenis_kelamin: (r.jenisKelamin as 'L' | 'P') || 'L',
      kelas: r.kelas,
      jurusan: r.jurusan,
      no_wa_ortu: r.noWaOrtu,
      namaOrtu: r.namaOrtu || undefined,
      jam_pulang: r.jamPulang || '15:00',
      foto_url: r.fotoUrl || undefined,
      alamat: r.alamat || undefined,
    }));
  } catch (error) {
    console.error('Database getAllStudents failed:', error);
    throw new Error('Gagal mengambil data siswa dari database.', { cause: error });
  }
}

export async function upsertStudent(s: Siswa): Promise<Siswa> {
  try {
    const id = s.id || `s-${Date.now()}`;
    const result = await db
      .insert(students)
      .values({
        id,
        nis: String(s.nis).trim(),
        nisn: s.nisn ? String(s.nisn).trim() : null,
        nama: String(s.nama || 'Tanpa Nama').trim(),
        jenisKelamin: (s.jenis_kelamin === 'P' ? 'P' : 'L') as 'L' | 'P',
        kelas: String(s.kelas || 'X TKJT 1').trim(),
        jurusan: String(s.jurusan || 'Teknik Jaringan').trim(),
        noWaOrtu: String(s.no_wa_ortu || '-').trim(),
        namaOrtu: s.nama_ortu ? String(s.nama_ortu).trim() : null,
        jamPulang: String(s.jam_pulang || '15:00').trim(),
        fotoUrl: s.foto_url || null,
        alamat: s.alamat || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: students.nis,
        set: {
          nisn: s.nisn ? String(s.nisn).trim() : null,
          nama: String(s.nama || 'Tanpa Nama').trim(),
          jenisKelamin: (s.jenis_kelamin === 'P' ? 'P' : 'L') as 'L' | 'P',
          kelas: String(s.kelas || 'X TKJT 1').trim(),
          jurusan: String(s.jurusan || 'Teknik Jaringan').trim(),
          noWaOrtu: String(s.no_wa_ortu || '-').trim(),
          namaOrtu: s.nama_ortu ? String(s.nama_ortu).trim() : null,
          jamPulang: String(s.jam_pulang || '15:00').trim(),
          fotoUrl: s.foto_url || null,
          alamat: s.alamat || null,
          updatedAt: new Date(),
        },
      })
      .returning();

    const r = result[0];
    return {
      id: r.id,
      nis: r.nis,
      nisn: r.nisn || undefined,
      nama: r.nama,
      jenis_kelamin: (r.jenisKelamin as 'L' | 'P') || 'L',
      kelas: r.kelas,
      jurusan: r.jurusan,
      no_wa_ortu: r.noWaOrtu,
      nama_ortu: r.namaOrtu || undefined,
      jam_pulang: r.jamPulang || '15:00',
      foto_url: r.fotoUrl || undefined,
      alamat: r.alamat || undefined,
    };
  } catch (error) {
    console.error('Database upsertStudent failed:', error);
    throw new Error('Gagal menyimpan data siswa ke database.', { cause: error });
  }
}

export async function bulkUpsertStudents(list: Siswa[]): Promise<number> {
  if (!list || list.length === 0) return 0;
  try {
    let count = 0;
    const CHUNK_SIZE = 50;
    for (let i = 0; i < list.length; i += CHUNK_SIZE) {
      const chunk = list.slice(i, i + CHUNK_SIZE);
      const values = chunk.map(s => ({
        id: s.id || `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        nis: String(s.nis).trim(),
        nisn: s.nisn ? String(s.nisn).trim() : null,
        nama: String(s.nama || 'Tanpa Nama').trim(),
        jenisKelamin: (s.jenis_kelamin === 'P' ? 'P' : 'L') as 'L' | 'P',
        kelas: String(s.kelas || 'X TKJT 1').trim(),
        jurusan: String(s.jurusan || 'Teknik Jaringan').trim(),
        noWaOrtu: String(s.no_wa_ortu || '-').trim(),
        namaOrtu: s.nama_ortu ? String(s.nama_ortu).trim() : null,
        jamPulang: String(s.jam_pulang || '15:00').trim(),
        fotoUrl: s.foto_url || null,
        alamat: s.alamat || null,
        updatedAt: new Date(),
      }));

      await db
        .insert(students)
        .values(values)
        .onConflictDoUpdate({
          target: students.nis,
          set: {
            nisn: sql`excluded.nisn`,
            nama: sql`excluded.nama`,
            jenisKelamin: sql`excluded.jenis_kelamin`,
            kelas: sql`excluded.kelas`,
            jurusan: sql`excluded.jurusan`,
            noWaOrtu: sql`excluded.no_wa_ortu`,
            namaOrtu: sql`excluded.nama_ortu`,
            jamPulang: sql`excluded.jam_pulang`,
            fotoUrl: sql`excluded.foto_url`,
            alamat: sql`excluded.alamat`,
            updatedAt: new Date(),
          },
        });
      count += chunk.length;
    }
    return count;
  } catch (error) {
    console.error('Database bulkUpsertStudents failed:', error);
    throw new Error('Gagal menyimpan daftar siswa ke database.', { cause: error });
  }
}

export async function deleteStudentById(id: string): Promise<boolean> {
  try {
    // Unlink attendance records referencing this student before deletion
    await db.update(attendance).set({ studentId: null }).where(eq(attendance.studentId, id));
    const result = await db.delete(students).where(eq(students.id, id)).returning();
    return result.length > 0;
  } catch (error) {
    console.error('Database deleteStudentById failed:', error);
    throw new Error('Gagal menghapus data siswa dari database.', { cause: error });
  }
}

export async function bulkDeleteStudentsByIds(ids: string[]): Promise<number> {
  try {
    if (!ids || ids.length === 0) return 0;
    // Unlink attendance records referencing these students
    await db.update(attendance).set({ studentId: null }).where(inArray(attendance.studentId, ids));
    const result = await db.delete(students).where(inArray(students.id, ids)).returning();
    return result.length;
  } catch (error) {
    console.error('Database bulkDeleteStudentsByIds failed:', error);
    throw new Error('Gagal menghapus data siswa massal dari database.', { cause: error });
  }
}

export async function syncAllStudents(list: Siswa[]): Promise<{ count: number; deleted: number }> {
  try {
    if (!list || list.length === 0) {
      return { count: 0, deleted: 0 };
    }
    // 1. Batch upsert all active students
    const count = await bulkUpsertStudents(list);

    // 2. Identify students in DB whose NIS is not in list and remove them
    const activeNis = list.map(s => String(s.nis).trim()).filter(Boolean);
    let deleted = 0;
    if (activeNis.length > 0) {
      const existing = await db.select({ id: students.id, nis: students.nis }).from(students);
      const toDeleteIds = existing
        .filter(r => !activeNis.includes(r.nis))
        .map(r => r.id);

      if (toDeleteIds.length > 0) {
        deleted = await bulkDeleteStudentsByIds(toDeleteIds);
      }
    }

    return { count, deleted };
  } catch (error) {
    console.error('Database syncAllStudents failed:', error);
    throw new Error('Gagal menyinkronkan seluruh data siswa dengan database.', { cause: error });
  }
}

