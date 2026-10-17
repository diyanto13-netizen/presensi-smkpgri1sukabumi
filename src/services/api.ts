import { Siswa, Absensi, SchoolConfig } from '../types';

/**
 * Service to communicate with Cloud SQL PostgreSQL backend routes
 */

export async function fetchSchoolConfigApi(): Promise<SchoolConfig | null> {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) return null;
    const json = await res.json();
    return json.success && json.data ? (json.data as SchoolConfig) : null;
  } catch (err) {
    console.warn('API fetchSchoolConfig failed (falling back to local cache):', err);
    return null;
  }
}

export async function saveSchoolConfigApi(config: SchoolConfig): Promise<boolean> {
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.ok;
  } catch (err) {
    console.warn('API saveSchoolConfig failed:', err);
    return false;
  }
}

export async function fetchStudentsApi(): Promise<Siswa[] | null> {
  try {
    const res = await fetch('/api/students');
    if (!res.ok) return null;
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? (json.data as Siswa[]) : null;
  } catch (err) {
    console.warn('API fetchStudents failed (falling back to local cache):', err);
    return null;
  }
}

export async function bulkSaveStudentsApi(students: Siswa[]): Promise<boolean> {
  try {
    const res = await fetch('/api/students/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students }),
    });
    return res.ok;
  } catch (err) {
    console.warn('API bulkSaveStudents failed:', err);
    return false;
  }
}

export async function syncAllStudentsApi(students: Siswa[]): Promise<boolean> {
  try {
    const res = await fetch('/api/students/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students }),
    });
    return res.ok;
  } catch (err) {
    console.warn('API syncAllStudents failed:', err);
    return false;
  }
}

export async function saveStudentApi(student: Siswa): Promise<boolean> {
  try {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    return res.ok;
  } catch (err) {
    console.warn('API saveStudent failed:', err);
    return false;
  }
}

export async function deleteStudentApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/students/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('API deleteStudent failed:', err);
    return false;
  }
}

export async function bulkDeleteStudentsApi(ids: string[]): Promise<boolean> {
  try {
    if (!ids || ids.length === 0) return true;
    const res = await fetch('/api/students/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    return res.ok;
  } catch (err) {
    console.warn('API bulkDeleteStudents failed:', err);
    return false;
  }
}

export async function fetchAttendanceApi(tanggal?: string): Promise<Absensi[] | null> {
  try {
    const url = tanggal && tanggal !== 'all' ? `/api/attendance?tanggal=${encodeURIComponent(tanggal)}` : '/api/attendance';
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? (json.data as Absensi[]) : null;
  } catch (err) {
    console.warn('API fetchAttendance failed (falling back to local cache):', err);
    return null;
  }
}

export async function recordAttendanceApi(record: Absensi): Promise<boolean> {
  try {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    return res.ok;
  } catch (err) {
    console.warn('API recordAttendance failed:', err);
    return false;
  }
}

export async function bulkSaveAttendanceApi(records: Absensi[]): Promise<boolean> {
  try {
    const res = await fetch('/api/attendance/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    });
    return res.ok;
  } catch (err) {
    console.warn('API bulkSaveAttendance failed:', err);
    return false;
  }
}
