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
  Presentation,
  Sun,
  Moon,
} from 'lucide-react';
import { Theme, getInitialTheme, applyThemeToDocument } from './utils/theme';
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

  // Dark / Light Mode Theme State
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Global Navigation Header (Hidden on print) */}
      <header className="no-print sticky top-0 z-40 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* School Branding with Official Insignia */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 dark:border-slate-700 shadow-2xs p-1 flex items-center justify-center shrink-0">
                <SchoolLogo
                  src={schoolConfig.logo_url}
                  className="w-full h-full object-contain"
                  alt={schoolConfig.nama_sekolah}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 tracking-tight">Presensi QR</span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                  <span>NPSN {schoolConfig.npsn}</span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-600 hidden sm:inline">·</span>
                  <span className="hidden sm:inline text-emerald-700 dark:text-emerald-400 font-semibold">{schoolConfig.akreditasi}</span>
                </div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  {schoolConfig.nama_sekolah}
                </h1>
              </div>
            </div>

            {/* Navigation Tabs (Refined Segmented Controls) */}
            <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                onClick={() => setActiveTab('scanner')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'scanner'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-750'
                }`}
              >
                <Camera className={`w-3.5 h-3.5 ${activeTab === 'scanner' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>Terminal Scanner</span>
              </button>

              <button
                onClick={() => setActiveTab('generator')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'generator'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-750'
                }`}
              >
                <CreditCard className={`w-3.5 h-3.5 ${activeTab === 'generator' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>Cetak Kartu QR</span>
              </button>

              <button
                onClick={() => setActiveTab('students')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'students'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-750'
                }`}
              >
                <Users className={`w-3.5 h-3.5 ${activeTab === 'students' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>Data Siswa</span>
              </button>

              <button
                onClick={() => setActiveTab('recap')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'recap'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-750'
                }`}
              >
                <BarChart3 className={`w-3.5 h-3.5 ${activeTab === 'recap' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>Rekap Absensi</span>
              </button>

              <button
                onClick={() => setActiveTab('docs')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'docs'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-750'
                }`}
                title="Panduan Skema Database SQL & API"
              >
                <BookOpen className={`w-3.5 h-3.5 ${activeTab === 'docs' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>SQL &amp; Docs</span>
              </button>
            </nav>

            {/* Header Right Actions & Live Clock */}
            <div className="flex items-center gap-2">
              {/* Dark / Light Mode Switcher Button */}
              <button
                type="button"
                onClick={handleToggleTheme}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer select-none ${
                  theme === 'dark'
                    ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700 hover:text-amber-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
                title={theme === 'dark' ? 'Klik untuk beralih ke Mode Terang (Light Mode)' : 'Klik untuk beralih ke Mode Gelap (Dark Mode)'}
                aria-label="Ganti Mode Gelap / Terang"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="hidden sm:inline font-bold text-amber-300">Mode Terang</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="hidden sm:inline font-bold text-slate-700">Mode Gelap</span>
                  </>
                )}
              </button>

              {/* Cloud Database Sync Status */}
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition shadow-2xs cursor-pointer disabled:opacity-60"
                title="Sinkronisasi Cloud Database (PostgreSQL & Firestore)"
              >
                <Database className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>{isSyncing ? 'Sinkron...' : 'Cloud Sync'}</span>
                <RotateCw className={`w-3 h-3 text-slate-400 ${isSyncing ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
              </button>

              {/* Live WIB Clock badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-xs font-mono font-medium text-slate-700 dark:text-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{headerTime || '07:00:00'}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-sans font-semibold">WIB</span>
              </div>

              {/* Proposal Presentation Slide Deck Link */}
              <a
                href="/presentation.html"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 sm:px-3 py-1.5 text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-300 dark:border-amber-700/60 rounded-lg transition flex items-center gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer"
                title="Buka Slide Presentasi Penawaran untuk Pihak Sekolah (Bisa Tayang Fullscreen / Cetak PDF)"
              >
                <Presentation className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                <span className="hidden md:inline">Slide Penawaran</span>
              </a>

              {/* Settings button */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-2.5 sm:px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition flex items-center gap-1.5 text-xs font-medium shadow-2xs cursor-pointer"
                title="Pengaturan Sekolah & Fonnte"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="hidden md:inline">Pengaturan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="lg:hidden border-t border-slate-200/80 dark:border-slate-800 px-2 py-1.5 grid grid-cols-5 gap-1 bg-white/95 dark:bg-slate-900/95 text-[11px] font-semibold text-center">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`py-1.5 px-1 rounded-lg flex flex-col items-center gap-0.5 transition ${
              activeTab === 'scanner' ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/60' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span className="truncate w-full">Scanner</span>
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`py-1.5 px-1 rounded-lg flex flex-col items-center gap-0.5 transition ${
              activeTab === 'generator' ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/60' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span className="truncate w-full">Kartu</span>
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`py-1.5 px-1 rounded-lg flex flex-col items-center gap-0.5 transition ${
              activeTab === 'students' ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/60' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="truncate w-full">Siswa</span>
          </button>
          <button
            onClick={() => setActiveTab('recap')}
            className={`py-1.5 px-1 rounded-lg flex flex-col items-center gap-0.5 transition ${
              activeTab === 'recap' ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/60' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="truncate w-full">Rekap</span>
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`py-1.5 px-1 rounded-lg flex flex-col items-center gap-0.5 transition ${
              activeTab === 'docs' ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/60' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="truncate w-full">Docs</span>
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
      <footer className="no-print mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-sm text-slate-600 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            © 2026 <strong className="text-blue-950 dark:text-blue-400 font-black">{schoolConfig.nama_sekolah}</strong>. Sistem Absensi &amp; Generator Kartu Pelajar QR.
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            NPSN: <span className="font-bold text-slate-800 dark:text-slate-200">{schoolConfig.npsn}</span> • {schoolConfig.alamat}
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
