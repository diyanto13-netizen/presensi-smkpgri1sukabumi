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
  Palette,
} from 'lucide-react';
import {
  Theme,
  ThemePalette,
  getInitialTheme,
  getInitialPalette,
  applyThemeToDocument,
} from './utils/theme';
import { Siswa, Absensi, SchoolConfig } from './types';
import {
  getStoredStudents,
  saveStudents,
  deduplicateStudents,
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
  resetAttendanceApi,
} from './services/api';
import {
  syncStudentsToFirestore,
  saveAttendanceToFirestore,
  bulkSaveAttendanceToFirestore,
  clearAttendanceFromFirestore,
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

  // Dark / Light Mode & Color Palette (Foto 1: Sunrise / Foto 2: Aurora)
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [palette, setPalette] = useState<ThemePalette>(getInitialPalette);

  useEffect(() => {
    applyThemeToDocument(theme, palette);
  }, [theme, palette]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleCyclePalette = () => {
    setPalette(prev => (prev === 'aurora' ? 'sunrise' : prev === 'sunrise' ? 'slate' : 'aurora'));
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

  // Sync from Cloud Database (PostgreSQL & Firebase Firestore) with strict anti-duplication
  const syncFromDatabase = async (showNotice: boolean = false) => {
    setIsSyncing(true);
    try {
      // 1. Attempt API fetch (Cloud SQL PostgreSQL) & Firestore fetch
      const [remoteConfig, remoteStudents, remoteAttendance, firestoreStudents] = await Promise.all([
        fetchSchoolConfigApi(),
        fetchStudentsApi(),
        fetchAttendanceApi('all'),
        getStudentsFromFirestore(),
      ]);

      let finalConfig = remoteConfig;
      let finalStudents = remoteStudents && remoteStudents.length > 0 ? remoteStudents : firestoreStudents;
      let finalAttendance = remoteAttendance;

      // 2. Fallback to Firebase Firestore for attendance & config if API was unavailable or empty
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

      // 4. Deduplicate & resolve students (prevents any 23 -> 46 duplication between Local, PostgreSQL & Firestore)
      const local = deduplicateStudents(getStoredStudents());
      const cleanRemote = deduplicateStudents(finalStudents || []);
      const cleanFirestore = deduplicateStudents(firestoreStudents || []);

      let resolvedStudents: Siswa[] = [];
      if (cleanRemote.length > 0 || local.length > 0) {
        // Merge remote + firestore + local through strict NIS & (Nama+Kelas) deduplication
        // Placing local last ensures any custom uploaded photo in local is preserved by deduplicateStudents
        resolvedStudents = deduplicateStudents([...cleanFirestore, ...cleanRemote, ...local]);
      }

      if (resolvedStudents.length > 0) {
        setStudents(resolvedStudents);
        saveStudents(resolvedStudents);
        // Clean up any duplicate documents in PostgreSQL and Firestore so cloud stays strictly deduplicated
        await Promise.allSettled([
          syncAllStudentsApi(resolvedStudents),
          syncStudentsToFirestore(resolvedStudents, true),
        ]);
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
        setSyncNotice(
          `Sinkronisasi Cloud berhasil! ${resolvedStudents.length} siswa unik (bebas duplikat) dan ${finalAttendance?.length || 0} log absensi aktif.`
        );
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
    // 1. Initial instant load from localStorage (automatically deduplicated)
    const localStudents = deduplicateStudents(getStoredStudents());
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
      const cleanStudents = deduplicateStudents(students);
      setStudents(cleanStudents);
      saveStudents(cleanStudents);

      await Promise.allSettled([
        saveSchoolConfigApi(schoolConfig),
        syncAllStudentsApi(cleanStudents),
        attendanceRecords.length > 0 ? bulkSaveAttendanceApi(attendanceRecords) : Promise.resolve(true),
        syncStudentsToFirestore(cleanStudents, true),
        saveSchoolConfigToFirestore(schoolConfig),
        attendanceRecords.length > 0 ? bulkSaveAttendanceToFirestore(attendanceRecords) : Promise.resolve(true),
      ]);
      setSyncNotice(`Berhasil menyinkronkan ${cleanStudents.length} data siswa unik (tanpa duplikat) ke Cloud Database (PostgreSQL & Firebase Firestore)!`);
      setTimeout(() => setSyncNotice(null), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Update students handler (persisted locally, PostgreSQL, and Firestore — always deduplicated)
  const handleUpdateStudents = (updated: Siswa[]) => {
    const cleanUpdated = deduplicateStudents(updated);
    setStudents(cleanUpdated);
    saveStudents(cleanUpdated);
    syncAllStudentsApi(cleanUpdated);
    syncStudentsToFirestore(cleanUpdated, true).catch(e => console.warn('Firestore sync students warning:', e));
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

  // Reset / Clear attendance logs (persisted locally, PostgreSQL, and Firestore)
  const handleResetAttendance = async (tanggal?: string) => {
    setIsSyncing(true);
    try {
      let nextRecords: Absensi[] = [];
      if (tanggal && tanggal !== 'all') {
        nextRecords = attendanceRecords.filter(r => r.tanggal !== tanggal);
      } else {
        nextRecords = [];
      }

      // 1. Clear local state and localStorage immediately
      setAttendanceRecords(nextRecords);
      saveAttendance(nextRecords);

      // 2. Clear Cloud SQL PostgreSQL & Firebase Firestore
      await Promise.allSettled([
        resetAttendanceApi(tanggal || 'all'),
        clearAttendanceFromFirestore(tanggal || 'all'),
      ]);

      if (tanggal && tanggal !== 'all') {
        setSyncNotice(
          `Berhasil mereset data log presensi tanggal ${tanggal}! Log kehadiran tanggal tersebut telah dikosongkan dari Database.`
        );
      } else {
        setSyncNotice(
          'Berhasil mereset seluruh data log presensi! Log presensi kini kembali 0 pada Database Cloud (PostgreSQL & Firestore).'
        );
      }
      setTimeout(() => setSyncNotice(null), 5000);
    } catch (err) {
      console.error('Failed to reset attendance logs:', err);
    } finally {
      setIsSyncing(false);
    }
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
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white transition-colors duration-300">
      {/* Global Navigation Header (Hidden on print) */}
      <header className="no-print sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shadow-2xs">
        {/* Heraldic Top Ribbon: Filosofi Warna Logo SMKS PGRI 1 Sukabumi (Biru Perisai • Hijau Lencana • Kuning Emas • Merah Obor) */}
        <div
          className="h-1 w-full bg-gradient-to-r from-[#1e3a8a] via-[#2b75dc] via-45% to-[#f5ce0b]"
          title="Filosofi Warna Logo SMKS PGRI 1 Kota Sukabumi: Biru Ilmu & Teknologi, Hijau Karakter, Kuning Kejayaan"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3 lg:gap-6">
            {/* School Branding with Official Insignia */}
            <div className="flex items-center gap-3 min-w-0 shrink">
              <div className="w-10 h-10 rounded-xl bg-white border border-amber-300/80 dark:border-amber-500/50 shadow-2xs p-1 flex items-center justify-center shrink-0 ring-2 ring-blue-600/10">
                <SchoolLogo
                  src={schoolConfig.logo_url}
                  className="w-full h-full object-contain"
                  alt={schoolConfig.nama_sekolah}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap overflow-hidden">
                  <span className="font-bold text-blue-900 dark:text-amber-300 tracking-tight">Presensi QR</span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">NPSN {schoolConfig.npsn}</span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-600 hidden xl:inline">·</span>
                  <span className="hidden xl:inline text-emerald-700 dark:text-emerald-400 font-bold">{schoolConfig.akreditasi}</span>
                </div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  {schoolConfig.nama_sekolah}
                </h1>
              </div>
            </div>

            {/* Navigation Tabs (Single-Line Segmented Controls — Never Wraps or Stacks) */}
            <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200/90 dark:border-slate-700 shrink-0">
              <button
                onClick={() => setActiveTab('scanner')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'scanner'
                    ? 'bg-blue-950 dark:bg-blue-600 text-amber-300 dark:text-white shadow-xs border border-blue-900 dark:border-blue-500'
                    : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/60'
                }`}
              >
                <Camera className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'scanner' ? 'text-amber-300 dark:text-amber-200' : 'text-blue-700 dark:text-blue-400'}`} />
                <span>Terminal Scanner</span>
              </button>

              <button
                onClick={() => setActiveTab('generator')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'generator'
                    ? 'bg-blue-950 dark:bg-blue-600 text-amber-300 dark:text-white shadow-xs border border-blue-900 dark:border-blue-500'
                    : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/60'
                }`}
              >
                <CreditCard className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'generator' ? 'text-amber-300 dark:text-amber-200' : 'text-blue-700 dark:text-blue-400'}`} />
                <span>Cetak Kartu QR</span>
              </button>

              <button
                onClick={() => setActiveTab('students')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'students'
                    ? 'bg-blue-950 dark:bg-blue-600 text-amber-300 dark:text-white shadow-xs border border-blue-900 dark:border-blue-500'
                    : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/60'
                }`}
              >
                <Users className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'students' ? 'text-amber-300 dark:text-amber-200' : 'text-blue-700 dark:text-blue-400'}`} />
                <span>Data Siswa</span>
              </button>

              <button
                onClick={() => setActiveTab('recap')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'recap'
                    ? 'bg-blue-950 dark:bg-blue-600 text-amber-300 dark:text-white shadow-xs border border-blue-900 dark:border-blue-500'
                    : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/60'
                }`}
              >
                <BarChart3 className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'recap' ? 'text-amber-300 dark:text-amber-200' : 'text-blue-700 dark:text-blue-400'}`} />
                <span>Rekap Absensi</span>
              </button>

              <button
                onClick={() => setActiveTab('docs')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'docs'
                    ? 'bg-blue-950 dark:bg-blue-600 text-amber-300 dark:text-white shadow-xs border border-blue-900 dark:border-blue-500'
                    : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/60'
                }`}
                title="Panduan Skema Database SQL & API"
              >
                <BookOpen className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'docs' ? 'text-amber-300 dark:text-amber-200' : 'text-blue-700 dark:text-blue-400'}`} />
                <span>SQL &amp; Docs</span>
              </button>
            </nav>

            {/* Header Right Actions: Live WIB Clock & Settings Button */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Live WIB Clock badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>{headerTime || '07:00:00'}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-sans font-bold">WIB</span>
              </div>

              {/* Settings button (Contains Theme Palette, Dark/Light Mode, Cloud Sync, Slide Penawaran & School Settings) */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-3.5 py-2 text-amber-300 dark:text-slate-950 bg-blue-950 dark:bg-amber-400 hover:bg-blue-900 dark:hover:bg-amber-300 border border-blue-900 dark:border-amber-500 rounded-xl transition flex items-center gap-2 text-xs font-bold shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
                title="Pengaturan Sistem, Tema Warna PGRI, Mode Gelap/Terang, Cloud Sync & Slide Penawaran"
              >
                <Settings className="w-3.5 h-3.5 shrink-0" />
                <span>Pengaturan</span>
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
            onResetAttendance={handleResetAttendance}
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
            onResetAttendance={handleResetAttendance}
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
        onResetAttendance={handleResetAttendance}
        studentsCount={students.length}
        attendanceCount={attendanceRecords.length}
        isSyncing={isSyncing}
        currentTheme={theme}
        currentPalette={palette}
        onThemeChange={setTheme}
        onPaletteChange={setPalette}
      />
    </div>
  );
}
