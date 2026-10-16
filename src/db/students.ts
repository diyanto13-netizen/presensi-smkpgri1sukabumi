import { db } from './index.ts';
import { students } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
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
      nama_ortu: r.namaOrtu || undefined,
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
        nis: s.nis,
        nisn: s.nisn || null,
        nama: s.nama,
        jenisKelamin: s.jenis_kelamin,
        kelas: s.kelas,
        jurusan: s.jurusan,
        noWaOrtu: s.no_wa_ortu,
        namaOrtu: s.nama_ortu || null,
        jamPulang: s.jam_pulang || '15:00',
        fotoUrl: s.foto_url || null,
        alamat: s.alamat || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: students.nis,
        set: {
          nisn: s.nisn || null,
          nama: s.nama,
          jenisKelamin: s.jenis_kelamin,
          kelas: s.kelas,
          jurusan: s.jurusan,
          noWaOrtu: s.no_wa_ortu,
          namaOrtu: s.nama_ortu || null,
          jamPulang: s.jam_pulang || '15:00',
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
  try {
    let count = 0;
    for (const s of list) {
      await upsertStudent(s);
      count++;
    }
    return count;
  } catch (error) {
    console.error('Database bulkUpsertStudents failed:', error);
    throw new Error('Gagal menyimpan daftar siswa ke database.', { cause: error });
  }
}

export async function deleteStudentById(id: string): Promise<boolean> {
  try {
    const result = await db.delete(students).where(eq(students.id, id)).returning();
    return result.length > 0;
  } catch (error) {
    console.error('Database deleteStudentById failed:', error);
    throw new Error('Gagal menghapus data siswa dari database.', { cause: error });
  }
}
