/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Camera,
  CreditCard,
  Users,
  BarChart3,
  Settings,
  BookOpen,
  School,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  RotateCw,
  Database,
} from 'lucide-react';
import { Siswa, Absensi, SchoolConfig } from './types';
import {
  getStoredStudents,
  saveStudents,
  getStoredAttendance,
  saveAttendance,
  getSchoolConfig,
  saveSchoolConfig,
  applyClassScheduleToStudents,
  getTodayDateString,
} from './utils/storage';
import {
  fetchSchoolConfigApi,
  saveSchoolConfigApi,
  fetchStudentsApi,
  bulkSaveStudentsApi,
  syncAllStudentsApi,
  fetchAttendanceApi,
  recordAttendanceApi,
  bulkSaveAttendanceApi,
} from './services/api';
import {
  syncStudentsToFirestore,
  saveAttendanceToFirestore,
  bulkSaveAttendanceToFirestore,
  saveSchoolConfigToFirestore,
  getStudentsFromFirestore,
  getAttendanceFromFirestore,
  getSchoolConfigFromFirestore,
} from './services/firestoreService';
import { ScannerTerminal } from './components/ScannerTerminal';
import { CardGenerator } from './components/CardGenerator';
import { StudentManager } from './components/StudentManager';
import { AttendanceRecap } from './components/AttendanceRecap';
import { SettingsModal } from './components/SettingsModal';
import { SqlSchemaGuide } from './components/SqlSchemaGuide';
import { SchoolLogo } from './components/SchoolLogo';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'scanner' | 'generator' | 'students' | 'recap' | 'docs'
  >('scanner');

  const [students, setStudents] = useState<Siswa[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Absensi[]>([]);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(getSchoolConfig());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [headerTime, setHeaderTime] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Live ticking clock in header
  useEffect(() => {
    const updateHeaderClock = () => {
      const now = new Date();
      setHeaderTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateHeaderClock();
    const timer = setInterval(updateHeaderClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync from Cloud Database (PostgreSQL & Firebase Firestore)
  const syncFromDatabase = async (showNotice: boolean = false) => {
    setIsSyncing(true);
    try {
      // 1. Attempt API fetch (Cloud SQL PostgreSQL)
      const [remoteConfig, remoteStudents, remoteAttendance] = await Promise.all([
        fetchSchoolConfigApi(),
        fetchStudentsApi(),
        fetchAttendanceApi('all'),
      ]);

      let finalConfig = remoteConfig;
      let finalStudents = remoteStudents;
      let finalAttendance = remoteAttendance;

      // 2. If API was unavailable or returned empty (e.g. running on Vercel without express backend), fallback to Firebase Firestore
      if (!finalStudents || finalStudents.length === 0) {
        const firestoreStudents = await getStudentsFromFirestore();
        if (firestoreStudents && firestoreStudents.length > 0) {
          finalStudents = firestoreStudents;
        }
      }

      if (!finalAttendance || finalAttendance.length === 0) {
        const firestoreAttendance = await getAttendanceFromFirestore();
        if (firestoreAttendance && firestoreAttendance.length > 0) {
          finalAttendance = firestoreAttendance;
        }
      }

      if (!finalConfig) {
        const firestoreConfig = await getSchoolConfigFromFirestore();
        if (firestoreConfig) {
          finalConfig = firestoreConfig;
        }
      }

      // 3. Apply resolved configuration
      if (finalConfig) {
        setSchoolConfig(finalConfig);
        saveSchoolConfig(finalConfig);
      }

      // 4. Apply resolved students or auto-seed Firestore if local browser has real students (e.g. Chrome)
      if (finalStudents && finalStudents.length > 0) {
        setStudents(finalStudents);
        saveStudents(finalStudents);
      } else {
        const local = getStoredStudents();
        if (local && local.length > 0) {
          syncAllStudentsApi(local).catch(() => {});
          syncStudentsToFirestore(local).catch(() => {});
        }
      }

      // 5. Apply resolved attendance records
      if (finalAttendance && finalAttendance.length > 0) {
        setAttendanceRecords(finalAttendance);
        saveAttendance(finalAttendance);
      } else {
        const localAtt = getStoredAttendance();
        if (localAtt && localAtt.length > 0) {
          bulkSaveAttendanceApi(localAtt).catch(() => {});
          bulkSaveAttendanceToFirestore(localAtt).catch(() => {});
        }
      }

      if (showNotice) {
        setSyncNotice(`Sinkronisasi Cloud berhasil! ${finalStudents?.length || 0} siswa dan ${finalAttendance?.length || 0} log absensi aktif.`);
        setTimeout(() => setSyncNotice(null), 4000);
      }
    } catch (err) {
      console.warn('Database background sync notice:', err);
      if (showNotice) {
        setSyncNotice('Koneksi ke database sedang dicoba kembali...');
        setTimeout(() => setSyncNotice(null), 3000);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Load stored state on initial render and sync with Cloud Database
  useEffect(() => {
    // 1. Initial instant load from localStorage
    const localStudents = getStoredStudents();
    const localAttendance = getStoredAttendance();
    const localConfig = getSchoolConfig();

    setStudents(localStudents);
    setAttendanceRecords(localAttendance);
    setSchoolConfig(localConfig);

    // 2. Background sync from Cloud SQL / Firebase Firestore
    syncFromDatabase(false);
  }, []);

  const handleManualSync = async () => {
    await syncFromDatabase(true);
  };

  const handlePushLocalToCloud = async () => {
    setIsSyncing(true);
    try {
      await Promise.allSettled([
        saveSchoolConfigApi(schoolConfig),
        syncAllStudentsApi(students),
        attendanceRecords.length > 0 ? bulkSaveAttendanceApi(attendanceRecords) : Promise.resolve(true),
        syncStudentsToFirestore(students),
        saveSchoolConfigToFirestore(schoolConfig),
        attendanceRecords.length > 0 ? bulkSaveAttendanceToFirestore(attendanceRecords) : Promise.resolve(true),
      ]);
      setSyncNotice(`Berhasil mengunggah ${students.length} data siswa dan konfigurasi ke Cloud Database (PostgreSQL & Firebase Firestore)!`);
      setTimeout(() => setSyncNotice(null), 4000);
    } catch (e) {
      console.error(e);
      alert('Gagal mengunggah ke Cloud Database.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Update students handler (persisted locally, PostgreSQL, and Firestore)
  const handleUpdateStudents = (updated: Siswa[]) => {
    setStudents(updated);
    saveStudents(updated);
    syncAllStudentsApi(updated);
    syncStudentsToFirestore(updated).catch(e => console.warn('Firestore sync students warning:', e));
  };

  // Record single attendance event handler (persisted locally, PostgreSQL, and Firestore)
  const handleRecordAttendance = (record: Absensi) => {
    setAttendanceRecords(prev => {
      const existingIdx = prev.findIndex(
        r => r.nis === record.nis && r.tanggal === record.tanggal
      );
      let nextRecords: Absensi[];
      if (existingIdx >= 0) {
        nextRecords = [...prev];
        nextRecords[existingIdx] = record;
      } else {
        nextRecords = [...prev, record];
      }
      saveAttendance(nextRecords);
      return nextRecords;
    });
    recordAttendanceApi(record);
    saveAttendanceToFirestore(record).catch(e => console.warn('Firestore sync attendance warning:', e));
  };

  // Bulk update attendance (persisted locally, PostgreSQL, and Firestore)
  const handleBulkUpdateAttendance = (records: Absensi[]) => {
    setAttendanceRecords(records);
    saveAttendance(records);
    bulkSaveAttendanceApi(records);
    records.forEach(r => saveAttendanceToFirestore(r).catch(() => {}));
  };

  // Save config (persisted locally, PostgreSQL, and Firestore)
  const handleSaveConfig = async (newConfig: SchoolConfig) => {
    setSchoolConfig(newConfig);
    saveSchoolConfig(newConfig);
    const ok = await saveSchoolConfigApi(newConfig);
    saveSchoolConfigToFirestore(newConfig).catch(e => console.warn('Firestore sync config warning:', e));
    if (ok) {
      setSyncNotice('Pengaturan sekolah & jadwal jam pulang tersimpan di Cloud Database (PostgreSQL & Firestore)!');
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/90 via-slate-50 to-slate-100/80 text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-blue-950">
      {/* Global Navigation Header (Hidden on print) */}
      <header className="no-print sticky top-0 z-40 glass-nav shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            {/* School Branding with Official Insignia */}
            <div className="flex items-center gap-3.5">
              <div className="relative group shrink-0">
                <div className="w-13 h-14 p-0.5 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 shadow-md flex items-center justify-center border border-amber-300">
                  <div className="w-full h-full rounded-xl bg-white/95 flex items-center justify-center p-1 overflow-hidden">
                    <SchoolLogo
                      src={schoolConfig.logo_url}
                      className="w-full h-full object-contain drop-shadow-xs"
                      alt={schoolConfig.nama_sekolah}
                    />
                  </div>
                </div>
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300">
                    PRESENSI QR RESMI
                  </span>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    NPSN: <strong className="text-slate-900">{schoolConfig.npsn}</strong>
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 hidden md:inline">
                    {schoolConfig.akreditasi}
                  </span>
                </div>
                <h1 className="text-xs sm:text-sm font-heading font-bold tracking-tight text-slate-900 mt-0.5">
                  {schoolConfig.nama_sekolah}
                </h1>
              </div>
            </div>

            {/* Navigation Tabs (Spacious, Modern & High Legibility) */}
            <nav className="hidden lg:flex items-center gap-1.5 p-1.5 bg-slate-200/60 rounded-2xl border border-slate-300/80 shadow-inner">
              <button
                onClick={() => setActiveTab('scanner')}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'scanner'
                    ? 'bg-slate-950 text-amber-300 shadow-md ring-1 ring-amber-400/40'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
                }`}
              >
                <Camera className="w-4 h-4 text-amber-400" />
                <span>Terminal Scanner</span>
              </button>

              <button
                onClick={() => setActiveTab('generator')}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'generator'
                    ? 'bg-slate-950 text-amber-300 shadow-md ring-1 ring-amber-400/40'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
                }`}
              >
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Cetak Kartu QR</span>
              </button>

              <button
                onClick={() => setActiveTab('students')}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'students'
                    ? 'bg-slate-950 text-amber-300 shadow-md ring-1 ring-amber-400/40'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
                }`}
              >
                <Users className="w-4 h-4 text-amber-400" />
                <span>Data Siswa</span>
              </button>

              <button
                onClick={() => setActiveTab('recap')}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'recap'
                    ? 'bg-slate-950 text-amber-300 shadow-md ring-1 ring-amber-400/40'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span>Rekap Absensi</span>
              </button>

              <button
                onClick={() => setActiveTab('docs')}
                className={`px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'docs'
                    ? 'bg-slate-950 text-amber-300 shadow-md ring-1 ring-amber-400/40'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
                }`}
                title="Panduan Skema Database SQL & API"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>SQL &amp; Docs</span>
              </button>
            </nav>

            {/* Header Right Actions & Live Clock */}
            <div className="flex items-center gap-2 sm:gap-2.5">

              {/* Cloud Database Sync Status Badge */}
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100 transition shadow-xs cursor-pointer disabled:opacity-60"
                title="Klik untuk menyinkronkan data terbaru dari Cloud SQL PostgreSQL"
              >
                <Database className="w-3.5 h-3.5 text-emerald-700" />
                <span>
                  {isSyncing ? 'Sinkronisasi...' : `Cloud SQL`}
                </span>
                <RotateCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>

              {/* Live WIB Clock badge */}
              <div className="hidden sm:flex items-center gap-2 bg-slate-950 text-amber-300 px-3.5 py-2 rounded-xl border border-amber-400/30 shadow-xs">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="font-mono text-sm font-bold tracking-wider">
                  {headerTime || '07:00:00'} <span className="text-xs text-amber-400/80">WIB</span>
                </span>
              </div>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-3 py-2 sm:px-3.5 sm:py-2.5 text-slate-800 hover:text-slate-950 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition flex items-center gap-2 text-sm font-bold shadow-xs cursor-pointer"
                title="Pengaturan Jam Masuk & Konfigurasi Fonnte"
              >
                <Settings className="w-4 h-4 text-slate-600" />
                <span className="hidden md:inline">Pengaturan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="lg:hidden border-t border-slate-200 px-3 py-2.5 flex items-center justify-around bg-white/95 text-xs font-bold">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`p-2 rounded-xl flex flex-col items-center gap-1 transition ${
              activeTab === 'scanner' ? 'text-blue-950 font-black bg-blue-100/70' : 'text-slate-600'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Scanner</span>
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`p-2 rounded-xl flex flex-col items-center gap-1 transition ${
              activeTab === 'generator' ? 'text-blue-950 font-black bg-blue-100/70' : 'text-slate-600'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Kartu QR</span>
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`p-2 rounded-xl flex flex-col items-center gap-1 transition ${
              activeTab === 'students' ? 'text-blue-950 font-black bg-blue-100/70' : 'text-slate-600'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Data Siswa</span>
          </button>
          <button
            onClick={() => setActiveTab('recap')}
            className={`p-2 rounded-xl flex flex-col items-center gap-1 transition ${
              activeTab === 'recap' ? 'text-blue-950 font-black bg-blue-100/70' : 'text-slate-600'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Rekap</span>
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`p-2 rounded-xl flex flex-col items-center gap-1 transition ${
              activeTab === 'docs' ? 'text-blue-950 font-black bg-blue-100/70' : 'text-slate-600'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>SQL Docs</span>
          </button>
        </div>
      </header>

      {/* Cloud Sync Alert Toast */}
      {syncNotice && (
        <div className="no-print bg-blue-900 text-amber-200 px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-md border-b border-blue-800 animate-fadeIn">
          <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{syncNotice}</span>
            </div>
            <button
              onClick={() => setSyncNotice(null)}
              className="text-amber-300 hover:text-white text-xs underline cursor-pointer ml-3"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {activeTab === 'scanner' && (
          <ScannerTerminal
            students={students}
            attendanceRecords={attendanceRecords}
            config={schoolConfig}
            onRecordAttendance={handleRecordAttendance}
          />
        )}

        {activeTab === 'generator' && (
          <CardGenerator
            students={students}
            config={schoolConfig}
            onUpdateStudents={handleUpdateStudents}
          />
        )}

        {activeTab === 'students' && (
          <StudentManager
            students={students}
            config={schoolConfig}
            onUpdateStudents={handleUpdateStudents}
            onSyncCloud={handlePushLocalToCloud}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'recap' && (
          <AttendanceRecap
            students={students}
            attendanceRecords={attendanceRecords}
            config={schoolConfig}
            onUpdateAttendance={handleBulkUpdateAttendance}
          />
        )}

        {activeTab === 'docs' && <SqlSchemaGuide />}
      </main>

      {/* Footer (Hidden on print) */}
      <footer className="no-print mt-auto border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-semibold text-slate-800 text-sm">
            © 2026 <strong className="text-blue-950 font-black">{schoolConfig.nama_sekolah}</strong>. Sistem Absensi &amp; Generator Kartu Pelajar QR.
          </p>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            NPSN: <span className="font-bold text-slate-800">{schoolConfig.npsn}</span> • {schoolConfig.alamat}
          </p>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={schoolConfig}
        onSaveConfig={handleSaveConfig}
        onApplyScheduleToStudents={scheduleMap => {
          const updated = applyClassScheduleToStudents(students, scheduleMap);
          handleUpdateStudents(updated);
        }}
        onManualSync={handleManualSync}
        onPushLocalToCloud={handlePushLocalToCloud}
        studentsCount={students.length}
        attendanceCount={attendanceRecords.length}
        isSyncing={isSyncing}
      />
    </div>
  );
}
