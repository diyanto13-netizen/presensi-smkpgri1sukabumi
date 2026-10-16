import { Siswa, Absensi, SchoolConfig } from '../types';
import {
  getStoredStudents,
  saveStudents as saveLocalStudents,
  getStoredAttendance,
  saveAttendance as saveLocalAttendance,
  getSchoolConfig as getLocalSchoolConfig,
  saveSchoolConfig as saveLocalSchoolConfig,
} from './storage';

// 1. School Configuration API with Offline Fallback
export async function fetchSchoolConfig(): Promise<SchoolConfig> {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        saveLocalSchoolConfig(json.data);
        return json.data;
      }
    }
  } catch (err) {
    // Silent offline fallback
  }
  return getLocalSchoolConfig();
}

export async function saveSchoolConfigApi(config: SchoolConfig): Promise<SchoolConfig> {
  // Always update local storage first for instant feedback
  saveLocalSchoolConfig(config);
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    // Silent fallback
  }
  return config;
}

// 2. Students API with Offline Fallback
export async function fetchStudents(): Promise<Siswa[]> {
  try {
    const res = await fetch('/api/students');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        if (json.data.length > 0) {
          saveLocalStudents(json.data);
          return json.data;
        }
      }
    }
  } catch (err) {
    // Silent fallback
  }
  return getStoredStudents();
}

export async function saveStudentApi(siswa: Siswa): Promise<Siswa> {
  try {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(siswa),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    // Silent fallback
  }
  return siswa;
}

export async function bulkSaveStudentsApi(students: Siswa[]): Promise<void> {
  saveLocalStudents(students);
  try {
    await fetch('/api/students/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(students),
    });
  } catch (err) {
    // Silent fallback
  }
}

export async function deleteStudentApi(id: string): Promise<void> {
  try {
    await fetch(`/api/students/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    // Silent fallback
  }
}

// 3. Attendance API with Offline Fallback
export async function fetchAttendance(tanggal: string): Promise<Absensi[]> {
  try {
    const res = await fetch(`/api/attendance?tanggal=${encodeURIComponent(tanggal)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    // Silent fallback
  }
  const allLocal = getStoredAttendance();
  return allLocal.filter(a => a.tanggal === tanggal);
}

export async function recordAttendanceApi(record: Absensi): Promise<Absensi> {
  // Update local attendance
  const localList = getStoredAttendance();
  const existingIdx = localList.findIndex(
    r => r.nis === record.nis && r.tanggal === record.tanggal
  );
  let nextList: Absensi[];
  if (existingIdx >= 0) {
    nextList = [...localList];
    nextList[existingIdx] = record;
  } else {
    nextList = [...localList, record];
  }
  saveLocalAttendance(nextList);

  // Sync to PostgreSQL
  try {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    // Silent fallback
  }
  return record;
}

export async function bulkUpdateAttendanceApi(records: Absensi[]): Promise<void> {
  saveLocalAttendance(records);
  try {
    await fetch('/api/attendance/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(records),
    });
  } catch (err) {
    // Silent fallback
  }
}
