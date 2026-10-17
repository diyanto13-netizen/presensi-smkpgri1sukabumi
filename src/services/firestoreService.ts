import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors.ts';
import { Siswa, Absensi, SchoolConfig } from '../types';

const STUDENTS_COLLECTION = 'students';
const ATTENDANCE_COLLECTION = 'attendance';
const CONFIG_COLLECTION = 'school_config';
const MAIN_CONFIG_DOC = 'main';

/**
 * Fetch all students from Firestore
 */
export async function getStudentsFromFirestore(): Promise<Siswa[]> {
  try {
    const colRef = collection(db, STUDENTS_COLLECTION);
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        nis: data.nis || '',
        nama: data.nama || '',
        jenis_kelamin: data.jenis_kelamin || 'L',
        kelas: data.kelas || '',
        jurusan: data.jurusan || '',
        no_wa_ortu: data.no_wa_ortu || '',
        jam_pulang: data.jam_pulang,
        nisn: data.nisn,
        nama_ortu: data.nama_ortu,
        alamat: data.alamat,
        foto_url: data.foto_url,
      } as Siswa;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, STUDENTS_COLLECTION);
  }
}

/**
 * Sync batch of students to Firestore
 */
export async function syncStudentsToFirestore(studentsList: Siswa[]): Promise<boolean> {
  if (!studentsList || studentsList.length === 0) return true;
  try {
    // Firestore batches allow up to 500 operations
    const BATCH_SIZE = 450;
    for (let i = 0; i < studentsList.length; i += BATCH_SIZE) {
      const chunk = studentsList.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const s of chunk) {
        const studentId = s.id || `std_${s.nis.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        const docRef = doc(db, STUDENTS_COLLECTION, studentId);
        const payload: Record<string, any> = {
          id: studentId,
          nis: String(s.nis || '').trim(),
          nama: String(s.nama || '').trim(),
          kelas: String(s.kelas || '').trim(),
          no_wa_ortu: String(s.no_wa_ortu || '').trim(),
          updatedAt: new Date().toISOString(),
        };

        if (s.jenis_kelamin) payload.jenis_kelamin = s.jenis_kelamin;
        if (s.jurusan) payload.jurusan = s.jurusan;
        if (s.jam_pulang) payload.jam_pulang = s.jam_pulang;
        if (s.nisn) payload.nisn = s.nisn;
        if (s.nama_ortu) payload.nama_ortu = s.nama_ortu;
        if (s.foto_url) payload.foto_url = s.foto_url;
        if (s.alamat) payload.alamat = s.alamat;

        batch.set(docRef, payload, { merge: true });
      }

      await batch.commit();
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, STUDENTS_COLLECTION);
  }
}

/**
 * Save single student to Firestore
 */
export async function saveStudentToFirestore(s: Siswa): Promise<boolean> {
  const studentId = s.id || `std_${s.nis.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const docRef = doc(db, STUDENTS_COLLECTION, studentId);
  try {
    const payload: Record<string, any> = {
      id: studentId,
      nis: String(s.nis || '').trim(),
      nama: String(s.nama || '').trim(),
      kelas: String(s.kelas || '').trim(),
      no_wa_ortu: String(s.no_wa_ortu || '').trim(),
      updatedAt: new Date().toISOString(),
    };

    if (s.jenis_kelamin) payload.jenis_kelamin = s.jenis_kelamin;
    if (s.jurusan) payload.jurusan = s.jurusan;
    if (s.jam_pulang) payload.jam_pulang = s.jam_pulang;
    if (s.nisn) payload.nisn = s.nisn;
    if (s.nama_ortu) payload.nama_ortu = s.nama_ortu;
    if (s.foto_url) payload.foto_url = s.foto_url;
    if (s.alamat) payload.alamat = s.alamat;

    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${STUDENTS_COLLECTION}/${studentId}`);
  }
}

/**
 * Delete student from Firestore
 */
export async function deleteStudentFromFirestore(studentId: string): Promise<boolean> {
  const docRef = doc(db, STUDENTS_COLLECTION, studentId);
  try {
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${STUDENTS_COLLECTION}/${studentId}`);
  }
}

/**
 * Save attendance record to Firestore
 */
export async function saveAttendanceToFirestore(record: Absensi): Promise<boolean> {
  const docId = record.id || `att_${record.nis}_${record.tanggal.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const docRef = doc(db, ATTENDANCE_COLLECTION, docId);
  try {
    const payload: Record<string, any> = {
      id: docId,
      nis: String(record.nis || '').trim(),
      nama: String(record.nama || '').trim(),
      kelas: String(record.kelas || '').trim(),
      tanggal: String(record.tanggal || '').trim(),
      status_akhir: String(record.status_akhir || 'Hadir').trim(),
      created_at: new Date().toISOString(),
    };

    if (record.siswa_id) payload.student_id = record.siswa_id;
    if (record.jam_masuk) payload.jam_masuk = record.jam_masuk;
    if (record.status_masuk) payload.status_masuk = record.status_masuk;
    if (record.jam_pulang) payload.jam_pulang = record.jam_pulang;
    if (record.status_pulang) payload.status_pulang = record.status_pulang;
    if (record.keterangan) payload.keterangan = record.keterangan;
    if (typeof record.notifikasi_wa_terkirim === 'boolean') {
      payload.notifikasi_wa_terkirim = record.notifikasi_wa_terkirim;
    }
    if (record.notifikasi_wa_detail) payload.notifikasi_wa_detail = record.notifikasi_wa_detail;

    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ATTENDANCE_COLLECTION}/${docId}`);
  }
}

/**
 * Save SchoolConfig to Firestore
 */
export async function saveSchoolConfigToFirestore(cfg: SchoolConfig): Promise<boolean> {
  const docRef = doc(db, CONFIG_COLLECTION, MAIN_CONFIG_DOC);
  try {
    const payload: Record<string, any> = {
      nama_sekolah: cfg.nama_sekolah || 'SMKS PGRI 1 KOTA SUKABUMI',
      npsn: cfg.npsn || '20221568',
      jam_masuk_batas: cfg.jam_masuk_batas || '07:15',
    };

    if (cfg.yayasan) payload.yayasan = cfg.yayasan;
    if (cfg.akreditasi) payload.akreditasi = cfg.akreditasi;
    if (cfg.alamat) payload.alamat = cfg.alamat;
    if (cfg.telepon) payload.telepon = cfg.telepon;
    if (cfg.email) payload.email = cfg.email;
    if (cfg.kepala_sekolah) payload.kepala_sekolah = cfg.kepala_sekolah;
    if (cfg.nip_kepsek) payload.nip_kepsek = cfg.nip_kepsek;
    if (cfg.logo_url) payload.logo_url = cfg.logo_url;
    if (cfg.jam_pulang_per_kelas) payload.jam_pulang_per_kelas = cfg.jam_pulang_per_kelas;
    if (cfg.jam_pulang_harian_per_kelas) payload.jam_pulang_harian_per_kelas = cfg.jam_pulang_harian_per_kelas;
    if (cfg.fonnte_token) payload.fonnte_token = cfg.fonnte_token;
    if (typeof cfg.fonnte_test_mode === 'boolean') payload.fonnte_test_mode = cfg.fonnte_test_mode;
    if (typeof cfg.sound_enabled === 'boolean') payload.sound_enabled = cfg.sound_enabled;
    if (typeof cfg.voice_announcement_enabled === 'boolean') payload.voice_announcement_enabled = cfg.voice_announcement_enabled;

    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CONFIG_COLLECTION}/${MAIN_CONFIG_DOC}`);
  }
}

/**
 * Real-time subscription to students
 */
export function subscribeStudentsFromFirestore(
  onUpdate: (students: Siswa[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, STUDENTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          nis: data.nis || '',
          nama: data.nama || '',
          jenis_kelamin: data.jenis_kelamin || 'L',
          kelas: data.kelas || '',
          jurusan: data.jurusan || '',
          no_wa_ortu: data.no_wa_ortu || '',
          jam_pulang: data.jam_pulang,
          nisn: data.nisn,
          nama_ortu: data.nama_ortu,
          alamat: data.alamat,
          foto_url: data.foto_url,
        } as Siswa;
      });
      onUpdate(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, STUDENTS_COLLECTION);
    }
  );
}
