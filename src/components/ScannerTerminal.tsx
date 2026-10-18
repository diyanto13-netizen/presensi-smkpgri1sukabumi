import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Volume2,
  VolumeX,
  Keyboard,
  Clock,
  Sparkles,
  RefreshCw,
  Send,
  ExternalLink,
  UserCheck,
  LogOut,
  Sliders,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { Siswa, Absensi, ScanResult, SchoolConfig } from '../types';
import { processAttendanceRules, formatWhatsAppMessage } from '../utils/attendanceRules';
import { soundService } from '../utils/audio';
import { sendWhatsAppNotification } from '../utils/fonnte';
import { getTodayDateString, formatIndonesianDate } from '../utils/storage';
import { getEffectiveJamPulang } from '../utils/classConfig';
import { SchoolLogo } from './SchoolLogo';

interface ScannerTerminalProps {
  students: Siswa[];
  attendanceRecords: Absensi[];
  config: SchoolConfig;
  onRecordAttendance: (record: Absensi) => void;
}

export const ScannerTerminal: React.FC<ScannerTerminalProps> = ({
  students,
  attendanceRecords,
  config,
  onRecordAttendance,
}) => {
  // Scanner state
  const [isScannerRunning, setIsScannerRunning] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [manualNis, setManualNis] = useState<string>('');
  const [mode, setMode] = useState<'AUTO' | 'MASUK' | 'PULANG'>('AUTO');

  // Simulated Time Controls for testing/demo
  const [useSimulatedTime, setUseSimulatedTime] = useState<boolean>(false);
  const [simulatedTime, setSimulatedTime] = useState<string>('06:45');
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState<string>('');

  // Audio & Voice toggles
  const [soundActive, setSoundActive] = useState<boolean>(config.sound_enabled);
  const [voiceActive, setVoiceActive] = useState<boolean>(config.voice_announcement_enabled);

  // Result state
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [waDetailsOpen, setWaDetailsOpen] = useState<boolean>(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setCurrentTimeDisplay(timeStr);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine effective time (Live or Simulated)
  const getEffectiveTime = useCallback((): string => {
    if (useSimulatedTime) {
      return simulatedTime + ':00';
    }
    const now = new Date();
    return now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }, [useSimulatedTime, simulatedTime]);

  // Main Attendance Processing Function
  const handleAttendanceScan = useCallback(
    async (scannedNis: string) => {
      if (isProcessing) return;
      const cleanNis = scannedNis.trim();
      if (!cleanNis) return;

      setIsProcessing(true);

      // Find student by NIS
      const student = students.find(
        s => s.nis.toLowerCase() === cleanNis.toLowerCase() || s.nisn === cleanNis
      );

      const effectiveTime = getEffectiveTime();
      const todayDate = getTodayDateString();

      if (!student) {
        if (soundActive) soundService.playError();
        if (voiceActive) soundService.speak('Kartu tidak terdaftar dalam sistem.');
        setLastScanResult({
          success: false,
          type: 'REJECTED',
          message: `NIS ${cleanNis} tidak ditemukan dalam database siswa!`,
          timestamp: effectiveTime,
        });
        setIsProcessing(false);
        return;
      }

      // Check existing attendance for today
      const existingRecord = attendanceRecords.find(
        r => r.nis === student.nis && r.tanggal === todayDate
      );

      const hasCheckedIn = Boolean(existingRecord?.jam_masuk);
      const hasCheckedOut = Boolean(existingRecord?.jam_pulang);

      // Determine effective class departure time from daily schedule (Senin - Jum'at) or config
      const effectiveJamPulang = getEffectiveJamPulang(student.kelas, todayDate, config);

      // Run pure business rules
      const ruleResult = processAttendanceRules({
        currentTime: effectiveTime,
        studentJamPulang: effectiveJamPulang,
        jamMasukBatas: config.jam_masuk_batas,
        hasCheckedIn,
        hasCheckedOut,
        forcedMode: mode,
      });

      if (!ruleResult.allowed) {
        let displayMessage = ruleResult.message;
        if (ruleResult.minutesEarly > 0) {
          displayMessage = `Belum waktunya pulang! Jam pulang kelas ${student.kelas} adalah ${effectiveJamPulang} WIB (kurang ${ruleResult.minutesEarly} menit lagi).`;
        }
        if (soundActive) soundService.playError();
        if (voiceActive) soundService.speak(displayMessage);
        setLastScanResult({
          success: false,
          type: ruleResult.type,
          siswa: student,
          message: displayMessage,
          timestamp: effectiveTime,
        });
        setIsProcessing(false);
        return;
      }

      // Prepare attendance record
      let updatedRecord: Absensi;
      if (ruleResult.type === 'MASUK') {
        updatedRecord = {
          id: existingRecord?.id || 'att-' + Date.now(),
          siswa_id: student.id,
          nis: student.nis,
          nama: student.nama,
          kelas: student.kelas,
          tanggal: todayDate,
          jam_masuk: effectiveTime,
          status_masuk: ruleResult.status as 'TEPAT_WAKTU' | 'TERLAMBAT',
          jam_pulang: null,
          status_pulang: null,
          status_akhir: ruleResult.status as 'TEPAT_WAKTU' | 'TERLAMBAT',
          notifikasi_wa_terkirim: false,
          created_at: new Date().toISOString(),
        };
      } else {
        // PULANG
        updatedRecord = {
          id: existingRecord?.id || 'att-' + Date.now(),
          siswa_id: student.id,
          nis: student.nis,
          nama: student.nama,
          kelas: student.kelas,
          tanggal: todayDate,
          jam_masuk: existingRecord?.jam_masuk || '07:00:00',
          status_masuk: existingRecord?.status_masuk || 'TEPAT_WAKTU',
          jam_pulang: effectiveTime,
          status_pulang: 'PULANG',
          status_akhir: 'PULANG',
          notifikasi_wa_terkirim: false,
          created_at: existingRecord?.created_at || new Date().toISOString(),
        };
      }

      // Audio & Voice Feedback
      if (soundActive) {
        if (ruleResult.status === 'TEPAT_WAKTU') {
          soundService.playSuccess();
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
          });
        } else if (ruleResult.status === 'TERLAMBAT') {
          soundService.playWarning();
        } else {
          soundService.playSuccess();
        }
      }

      if (voiceActive) {
        const greeting =
          ruleResult.type === 'MASUK'
            ? `Selamat datang ${student.nama}. Presensi masuk ${
                ruleResult.status === 'TEPAT_WAKTU' ? 'tepat waktu' : 'terlambat'
              }.`
            : `Selamat sore ${student.nama}. Presensi pulang berhasil. Hati-hati di jalan.`;
        soundService.speak(greeting);
      }

      // Format WhatsApp Notification
      const waMessage = formatWhatsAppMessage({
        namaSiswa: student.nama,
        nis: student.nis,
        kelas: student.kelas,
        jenisAbsen: ruleResult.type as 'MASUK' | 'PULANG',
        status: ruleResult.status as 'TEPAT_WAKTU' | 'TERLAMBAT' | 'PULANG',
        waktu: `${effectiveTime} WIB`,
        tanggal: formatIndonesianDate(todayDate),
        keterangan:
          ruleResult.status === 'TERLAMBAT'
            ? `Terlambat ${ruleResult.minutesLate} menit`
            : undefined,
        namaSekolah: config.nama_sekolah,
      });

      // Dispatch WhatsApp Notification (Fonnte)
      const waResponse = await sendWhatsAppNotification({
        target: student.no_wa_ortu,
        message: waMessage,
        token: config.fonnte_token,
        isTestMode: config.fonnte_test_mode,
      });

      updatedRecord.notifikasi_wa_terkirim = waResponse.status;
      updatedRecord.notifikasi_wa_detail = waResponse.isSimulated
        ? 'Tersimulasi (Fonnte Sandbox)'
        : 'Terkirim langsung via Fonnte';

      // Save into system state
      onRecordAttendance(updatedRecord);

      setLastScanResult({
        success: true,
        type: ruleResult.type,
        siswa: student,
        absensi: updatedRecord,
        message: ruleResult.message,
        timestamp: effectiveTime,
        statusDetail: ruleResult.status as 'TEPAT_WAKTU' | 'TERLAMBAT' | 'PULANG',
        waNotificationStatus: waResponse.isSimulated ? 'SIMULATED' : 'SENT',
      });

      setIsProcessing(false);
    },
    [
      isProcessing,
      students,
      attendanceRecords,
      config,
      mode,
      getEffectiveTime,
      soundActive,
      voiceActive,
      onRecordAttendance,
    ]
  );

  // Initialize and Mount HTML5 QR Code Scanner
  const startCameraScanner = useCallback(async () => {
    try {
      setScannerError(null);
      const element = document.getElementById('qr-reader-container');
      if (!element) return;

      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode('qr-reader-container');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: cameraFacing },
        {
          fps: 20,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            // Viewport is precisely the portrait card, scan full active area
            return {
              width: Math.floor(viewfinderWidth * 0.94),
              height: Math.floor(viewfinderHeight * 0.94),
            };
          },
        },
        (decodedText: string) => {
          const now = Date.now();
          if (
            decodedText === lastScannedCodeRef.current &&
            now - lastScannedTimeRef.current < 2500
          ) {
            return;
          }
          lastScannedCodeRef.current = decodedText;
          lastScannedTimeRef.current = now;
          handleAttendanceScan(decodedText);
        },
        () => {}
      );

      setIsScannerRunning(true);
    } catch (err) {
      console.warn('Camera initialization warning:', err);
      setIsScannerRunning(false);
      setScannerError(
        'Kamera fisik tidak dapat diakses atau sedang digunakan aplikasi lain. Anda tetap dapat menggunakan input NIS manual atau tombol simulasi cepat di bawah.'
      );
    }
  }, [cameraFacing, handleAttendanceScan]);

  const stopCameraScanner = useCallback(async () => {
    if (html5QrCodeRef.current && isScannerRunning) {
      try {
        await html5QrCodeRef.current.stop();
        setIsScannerRunning(false);
      } catch (err) {
        console.error('Failed to stop camera:', err);
      }
    }
  }, [isScannerRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Handle Manual NIS Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNis.trim()) return;
    handleAttendanceScan(manualNis.trim());
    setManualNis('');
  };

  return (
    <div className="space-y-8">
      {/* Top Status & Clock Banner (Midnight Navy & Amber Gold Premium Surface) */}
      <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-900/60 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-5 relative z-10">
          <div className="w-18 h-20 p-0.5 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 shadow-xl flex items-center justify-center border border-amber-300 shrink-0">
            <div className="w-full h-full rounded-[14px] bg-white/95 flex items-center justify-center p-1 overflow-hidden">
              <SchoolLogo
                src={config.logo_url}
                className="w-full h-full object-contain drop-shadow-xs"
                alt={config.nama_sekolah}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400/25 text-amber-300 border border-amber-400/50">
                TERMINAL ABSENSI GERBANG
              </span>
              <span className="inline-flex items-center gap-2 text-xs sm:text-sm text-emerald-400 font-bold bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-500/40">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                Sistem Siap
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-black tracking-tight text-white mt-1.5">
              Terminal Scanner QR Code
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-1 font-medium">
              {config.nama_sekolah} • Batas Masuk: <span className="text-amber-400 font-black text-base">{config.jam_masuk_batas} WIB</span>
            </p>
          </div>
        </div>

        {/* Live Clock & Audio Controls */}
        <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto relative z-10">
          <div className="flex items-center gap-4 bg-black/60 px-6 py-3.5 rounded-2xl border border-blue-500/40 shadow-inner">
            <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
            <div className="text-right">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-mono font-black tracking-widest text-amber-400 leading-tight">
                {useSimulatedTime ? simulatedTime + ':00' : currentTimeDisplay || '07:00:00'}
              </div>
              <div className="text-xs sm:text-sm text-slate-300 uppercase tracking-wider font-bold mt-0.5">
                {useSimulatedTime ? '⚠️ Mode Waktu Simulasi Demo' : 'Waktu Indonesia Barat (WIB)'}
              </div>
            </div>
          </div>

          {/* Quick Audio & Voice toggles */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSoundActive(!soundActive)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                soundActive
                  ? 'bg-blue-600/70 text-blue-100 border border-blue-400/60 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
              title="Aktifkan/nonaktifkan efek suara bip"
            >
              {soundActive ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundActive ? 'Audio Bip ON' : 'Audio OFF'}</span>
            </button>

            <button
              onClick={() => setVoiceActive(!voiceActive)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                voiceActive
                  ? 'bg-indigo-600/70 text-indigo-100 border border-indigo-400/60 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
              title="Aktifkan/nonaktifkan pengumuman suara bahasa Indonesia"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{voiceActive ? 'Suara Sambutan ON' : 'Suara OFF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Left = Camera / Scanner, Right = Last Scan Result & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Scanner Terminal & Manual Input (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Scanner Box */}
          <div className="premium-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/90">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-950 rounded-xl">
                  <Camera className="w-5 h-5 text-blue-900" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-slate-900 text-base sm:text-lg">
                      Pemindai Kamera QR Code
                    </h3>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                      Format Portrait Kartu
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                    Orientasi tegak (portrait) presisi sesuai ukuran kartu pelajar siswa SMKS PGRI 1
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isScannerRunning ? (
                  <button
                    onClick={stopCameraScanner}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-300 transition cursor-pointer"
                  >
                    Hentikan Kamera
                  </button>
                ) : (
                  <button
                    onClick={startCameraScanner}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-950 text-amber-400 hover:bg-black transition flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Nyalakan Kamera</span>
                  </button>
                )}
                <button
                  onClick={() =>
                    setCameraFacing(prev => (prev === 'user' ? 'environment' : 'user'))
                  }
                  className="p-2 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-slate-200 transition border border-slate-300 cursor-pointer"
                  title="Ganti Kamera Depan/Belakang"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Precision Portrait Card Camera Viewport (Exact 54 x 85.6 mm ratio) */}
            <div className="relative bg-slate-950 min-h-[460px] sm:min-h-[490px] md:min-h-[520px] w-full flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
              
              {/* Card Container Box - Camera is strictly confined inside this yellow box with zero shadow/bleed outside */}
              <div className="relative w-[260px] sm:w-[280px] md:w-[300px] h-[412px] sm:h-[444px] md:h-[475px] rounded-2xl overflow-hidden border-2 border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.35)] bg-black flex items-center justify-center shrink-0">
                
                {/* Live Camera Viewport - Perfectly fitted inside the portrait card */}
                <div
                  id="qr-reader-container"
                  className="w-full h-full scanner-camera-view flex items-center justify-center"
                />

                {/* Inactive State (Displayed inside the Card Box) */}
                {!isScannerRunning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-between p-4 text-center bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 text-slate-200 z-10">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider bg-black/80 px-2.5 py-1 rounded-md border border-amber-400/40 mt-1">
                      <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                      <span>Standar Portrait 54×85.6mm</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-2xl bg-blue-950/90 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-xl">
                        <Camera className="w-8 h-8" />
                      </div>
                      <h4 className="text-white font-heading font-black text-sm sm:text-base leading-tight mt-1">
                        Kamera Siap Memindai
                      </h4>
                      <p className="text-[11px] text-slate-300 max-w-[210px] leading-snug">
                        Kotak presisi ukuran kartu absensi siswa SMKS PGRI 1.
                      </p>
                    </div>

                    <div className="w-full pb-1">
                      <button
                        onClick={startCameraScanner}
                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-700 via-blue-800 to-blue-950 text-amber-300 hover:from-blue-800 hover:to-black shadow-lg flex items-center justify-center gap-2 transition border border-amber-400/50 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-amber-400" />
                        <span>Aktifkan Pemindai</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Scanning Guides & Accents strictly over the Card Box */}
                {isScannerRunning && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 z-10">
                    {/* Corner Bracket Highlights */}
                    <div className="absolute -top-0.5 -left-0.5 w-7 h-7 border-t-3 border-l-3 border-amber-300 rounded-tl-xl" />
                    <div className="absolute -top-0.5 -right-0.5 w-7 h-7 border-t-3 border-r-3 border-amber-300 rounded-tr-xl" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-7 h-7 border-b-3 border-l-3 border-amber-300 rounded-bl-xl" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 border-b-3 border-r-3 border-amber-300 rounded-br-xl" />

                    {/* Top Card Guide Header */}
                    <div className="flex items-center justify-between text-[10px] font-bold text-amber-300 bg-black/80 px-2.5 py-1 rounded-md backdrop-blur-xs border border-amber-400/40">
                      <span className="flex items-center gap-1.5 truncate">
                        <CreditCard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        KARTU PORTRAIT
                      </span>
                      <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        SCAN AKTIF
                      </span>
                    </div>

                    {/* Center QR Target Guide Box */}
                    <div className="w-32 h-32 border border-dashed border-amber-400/70 rounded-xl mx-auto flex items-center justify-center bg-black/25">
                      <span className="text-[9px] font-mono text-amber-200/95 bg-black/80 px-2 py-0.5 rounded border border-amber-400/30">
                        FOKUS KODE QR
                      </span>
                    </div>

                    {/* Sweeping Laser Line for Portrait View */}
                    <div className="absolute left-2.5 right-2.5 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(251,191,36,1)] animate-laser-sweep pointer-events-none" />

                    {/* Bottom Card Guide Footer */}
                    <div className="text-center text-[10px] font-semibold text-slate-100 bg-black/80 px-2 py-1 rounded-md backdrop-blur-xs border border-slate-700">
                      Posisikan kartu pas di dalam bingkai ini
                    </div>
                  </div>
                )}
              </div>

              {/* Informative Sub-Caption outside the yellow card box */}
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium text-center mt-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400/80 inline-block animate-pulse" />
                Format Kartu Pelajar Portrait (54 × 85.6 mm) • Area pemindaian presisi
              </p>
            </div>

            {scannerError && (
              <div className="p-4 bg-amber-50 border-t border-amber-200 text-amber-950 text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{scannerError}</span>
              </div>
            )}

            {/* Manual NIS & Barcode Gun Scanner Form */}
            <div className="p-5 bg-slate-50 border-t border-slate-200">
              <form onSubmit={handleManualSubmit} className="flex gap-3">
                <div className="relative flex-1">
                  <Keyboard className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={manualNis}
                    onChange={e => setManualNis(e.target.value)}
                    placeholder="Ketik NIS Manual / Scan Menggunakan Barcode Gun..."
                    className="w-full pl-12 pr-4 py-3.5 text-sm sm:text-base bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono shadow-xs font-semibold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualNis.trim() || isProcessing}
                  className="px-7 py-3.5 bg-blue-950 hover:bg-black text-amber-400 font-black text-sm sm:text-base rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Proses</span>
                </button>
              </form>
            </div>
          </div>

          {/* Quick Simulation Buttons for Demo / Testing */}
          <div className="premium-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <h4 className="font-heading font-black text-sm sm:text-base text-slate-900 uppercase tracking-wide">
                  Uji Coba Cepat Presensi (Klik Siswa Demo)
                </h4>
              </div>
              <span className="text-xs sm:text-sm text-slate-500 font-semibold">Klik nama untuk menguji</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {students.slice(0, 6).map(s => {
                const todayRecord = attendanceRecords.find(
                  r => r.nis === s.nis && r.tanggal === getTodayDateString()
                );
                return (
                  <button
                    key={s.id}
                    onClick={() => handleAttendanceScan(s.nis)}
                    disabled={isProcessing}
                    className="p-3.5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/60 text-left transition flex items-center gap-3.5 group disabled:opacity-60 bg-white shadow-xs cursor-pointer"
                  >
                    <img
                      src={s.foto_url}
                      alt={s.nama}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-300 group-hover:border-blue-500 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-bold text-slate-900 truncate group-hover:text-blue-950">
                        {s.nama}
                      </p>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 mt-0.5">
                        <span className="font-mono font-bold">{s.nis}</span>
                        <span>•</span>
                        <span className="font-bold text-amber-800" title="Jam pulang resmi kelas ini">
                          {config.jam_pulang_per_kelas?.[s.kelas] || s.jam_pulang}
                        </span>
                      </div>
                      {todayRecord?.status_masuk && (
                        <span className="inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
                          {todayRecord.status_pulang ? '✓ Sudah Pulang' : '✓ Sudah Masuk'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Scan Result, WA status & Mode Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Mode & Time Simulation Controller Card */}
          <div className="premium-card p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2 text-sm sm:text-base font-heading font-black text-slate-900 uppercase">
                <Sliders className="w-5 h-5 text-blue-900" />
                <span>Pengaturan Mode Presensi</span>
              </div>
              <span className="text-xs sm:text-sm bg-blue-100 text-blue-950 px-3 py-1 rounded-full font-bold">
                Satpam / Piket
              </span>
            </div>

            {/* Mode selection buttons */}
            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-800 mb-2.5 block uppercase tracking-wider">
                Mode Penilaian Kehadiran:
              </label>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setMode('AUTO')}
                  className={`py-2.5 text-sm font-bold rounded-xl transition cursor-pointer ${
                    mode === 'AUTO'
                      ? 'bg-slate-950 text-amber-300 shadow-sm'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  Otomatis
                </button>
                <button
                  type="button"
                  onClick={() => setMode('MASUK')}
                  className={`py-2.5 text-sm font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'MASUK'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Masuk</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('PULANG')}
                  className={`py-2.5 text-sm font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'PULANG'
                      ? 'bg-indigo-700 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Pulang</span>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed font-medium">
                {mode === 'AUTO' && '• Otomatis: Scan ke-1 = Masuk pagi, Scan ke-2 = Pulang (jika mencapai batas jam pulang siswa).'}
                {mode === 'MASUK' && '• Paksa Masuk: Setiap scan dinilai sebagai absensi kedatangan pagi.'}
                {mode === 'PULANG' && '• Paksa Pulang: Setiap scan dinilai untuk kepulangan siswa.'}
              </p>
            </div>

            {/* Simulated Time Tool */}
            <div className="pt-3.5 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Simulasi Waktu Demo:</span>
                </label>
                <button
                  onClick={() => setUseSimulatedTime(!useSimulatedTime)}
                  className={`text-xs sm:text-sm px-3.5 py-1 rounded-full font-bold transition cursor-pointer ${
                    useSimulatedTime
                      ? 'bg-amber-100 text-amber-950 border border-amber-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {useSimulatedTime ? 'Simulasi Aktif' : 'Gunakan Waktu Riil'}
                </button>
              </div>

              {useSimulatedTime && (
                <div className="mt-3.5 space-y-3 bg-amber-50/90 p-4 rounded-2xl border border-amber-200">
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      value={simulatedTime}
                      onChange={e => setSimulatedTime(e.target.value)}
                      className="px-3.5 py-2 text-base bg-white border border-amber-300 rounded-xl font-mono font-bold text-slate-900"
                    />
                    <span className="text-xs sm:text-sm font-bold text-amber-950">Preset Cepat:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSimulatedTime('06:45')}
                      className="text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                    >
                      06:45 (Tepat Waktu)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulatedTime('07:15')}
                      className="text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl bg-white text-amber-950 border border-amber-300 hover:bg-amber-50 cursor-pointer"
                    >
                      07:15 (Terlambat)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulatedTime('14:00')}
                      className="text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl bg-white text-rose-900 border border-rose-300 hover:bg-rose-50 cursor-pointer"
                    >
                      14:00 (Belum Pulang)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulatedTime('15:05')}
                      className="text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl bg-white text-blue-900 border border-blue-300 hover:bg-blue-50 cursor-pointer"
                    >
                      15:05 (Pulang Reguler)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulatedTime('15:35')}
                      className="text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl bg-white text-indigo-900 border border-indigo-300 hover:bg-indigo-50 cursor-pointer"
                    >
                      15:35 (Pulang TJKT)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Last Scan Live Feedback Card */}
          <div className="premium-card overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-950 text-white flex items-center justify-between">
              <span className="text-sm sm:text-base font-heading font-black text-amber-400 uppercase tracking-wider">
                Hasil Pemindaian Terakhir
              </span>
              {lastScanResult && (
                <span className="text-xs sm:text-sm font-mono font-bold text-slate-300">
                  {lastScanResult.timestamp} WIB
                </span>
              )}
            </div>

            <div className="p-6">
              {!lastScanResult ? (
                <div className="py-10 text-center text-slate-400 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <p className="text-base sm:text-lg font-bold text-slate-800">Belum ada pemindaian kartu.</p>
                  <p className="text-sm sm:text-base text-slate-500 max-w-sm mx-auto">
                    Arahkan QR Code kartu pelajar ke kamera gerbang atau klik salah satu kartu siswa demo.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Status Banner */}
                  <div
                    className={`p-5 rounded-2xl flex items-start gap-4 ${
                      lastScanResult.success
                        ? lastScanResult.statusDetail === 'TEPAT_WAKTU'
                          ? 'bg-emerald-50 border-2 border-emerald-400 text-emerald-950'
                          : lastScanResult.statusDetail === 'TERLAMBAT'
                          ? 'bg-amber-50 border-2 border-amber-400 text-amber-950'
                          : 'bg-blue-50 border-2 border-blue-400 text-blue-950'
                        : 'bg-rose-50 border-2 border-rose-400 text-rose-950'
                    }`}
                  >
                    {lastScanResult.success ? (
                      lastScanResult.statusDetail === 'TEPAT_WAKTU' ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" />
                      ) : lastScanResult.statusDetail === 'TERLAMBAT' ? (
                        <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-8 h-8 text-blue-600 shrink-0 mt-0.5" />
                      )
                    ) : (
                      <XCircle className="w-8 h-8 text-rose-600 shrink-0 mt-0.5" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-base sm:text-lg font-heading font-black uppercase tracking-wider">
                          {lastScanResult.success
                            ? lastScanResult.statusDetail === 'TEPAT_WAKTU'
                              ? 'HADIR TEPAT WAKTU'
                              : lastScanResult.statusDetail === 'TERLAMBAT'
                              ? 'HADIR TERLAMBAT'
                              : 'ABSENSI PULANG'
                            : 'ABSENSI DITOLAK'}
                        </span>
                        <span className="text-xs font-mono font-bold px-2.5 py-1 bg-black/10 rounded-md">
                          {lastScanResult.type}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base font-semibold mt-1 leading-snug">{lastScanResult.message}</p>
                    </div>
                  </div>

                  {/* Student Details Card if recognized */}
                  {lastScanResult.siswa && (
                    <div className="flex items-center gap-4 p-4.5 bg-slate-50 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="w-22 h-26 rounded-xl overflow-hidden border-2 border-amber-400 bg-slate-200 shrink-0 shadow-md">
                        <img
                          src={lastScanResult.siswa.foto_url}
                          alt={lastScanResult.siswa.nama}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <h4 className="text-lg sm:text-xl font-heading font-black text-blue-950 truncate">
                          {lastScanResult.siswa.nama}
                        </h4>
                        <div className="text-sm sm:text-base text-slate-800 space-y-1">
                          <p>
                            <span className="font-semibold text-slate-500">NIS:</span>{' '}
                            <span className="font-mono font-bold text-slate-950">
                              {lastScanResult.siswa.nis}
                            </span>
                          </p>
                          <p>
                            <span className="font-semibold text-slate-500">Kelas:</span>{' '}
                            <span className="font-bold text-blue-950">
                              {lastScanResult.siswa.kelas}
                            </span>
                          </p>
                          <p>
                            <span className="font-semibold text-slate-500">Jadwal Pulang Kelas:</span>{' '}
                            <span className="font-bold text-amber-800">
                              {config.jam_pulang_per_kelas?.[lastScanResult.siswa.kelas] || lastScanResult.siswa.jam_pulang} WIB
                            </span>
                          </p>
                          <p>
                            <span className="font-semibold text-slate-500">No WA Ortu:</span>{' '}
                            <span className="font-mono font-semibold text-slate-900">
                              {lastScanResult.siswa.no_wa_ortu}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* WhatsApp Notification Status Accordion */}
                  {lastScanResult.siswa && lastScanResult.success && (
                    <div className="border border-emerald-300 bg-emerald-50/80 rounded-2xl p-4.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm sm:text-base">
                          <Send className="w-4 h-4 text-emerald-700" />
                          <span>Notifikasi WhatsApp (Fonnte):</span>
                        </div>
                        <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-emerald-200 text-emerald-950 border border-emerald-300">
                          {lastScanResult.waNotificationStatus === 'SENT' ? 'Terkirim Langsung' : 'Simulasi Berhasil'}
                        </span>
                      </div>

                      <p className="text-sm sm:text-base text-slate-800 leading-relaxed">
                        Notifikasi dikirimkan kepada wali murid:{' '}
                        <strong className="text-slate-950 font-bold">{lastScanResult.siswa.nama_ortu || 'Bpk/Ibu'}</strong>{' '}
                        ({lastScanResult.siswa.no_wa_ortu}).
                      </p>

                      <div className="flex items-center gap-4 pt-1">
                        <button
                          onClick={() => setWaDetailsOpen(!waDetailsOpen)}
                          className="text-sm font-bold text-blue-700 hover:text-blue-950 hover:underline cursor-pointer"
                        >
                          {waDetailsOpen ? 'Sembunyikan Isi Pesan' : 'Lihat Teks Pesan WhatsApp'}
                        </button>
                        <a
                          href={`https://wa.me/62${lastScanResult.siswa.no_wa_ortu.replace(/^0/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1.5 ml-auto"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Buka Chat WA</span>
                        </a>
                      </div>

                      {waDetailsOpen && (
                        <pre className="p-3.5 bg-slate-950 text-emerald-400 rounded-xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-mono mt-2 overflow-x-auto border border-emerald-800">
                          {formatWhatsAppMessage({
                            namaSiswa: lastScanResult.siswa.nama,
                            nis: lastScanResult.siswa.nis,
                            kelas: lastScanResult.siswa.kelas,
                            jenisAbsen: lastScanResult.type as 'MASUK' | 'PULANG',
                            status: lastScanResult.statusDetail || 'TEPAT_WAKTU',
                            waktu: `${lastScanResult.timestamp} WIB`,
                            tanggal: formatIndonesianDate(getTodayDateString()),
                            namaSekolah: config.nama_sekolah,
                          })}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Running list of today's recent scans */}
          <div className="premium-card p-5 sm:p-6">
            <h4 className="text-sm sm:text-base font-heading font-black text-slate-900 uppercase tracking-wide mb-3.5 flex items-center justify-between">
              <span>Aktivitas Presensi Hari Ini</span>
              <span className="text-xs sm:text-sm font-bold text-blue-950 bg-blue-100 px-3.5 py-1 rounded-full">
                {attendanceRecords.length} Catatan
              </span>
            </h4>

            {attendanceRecords.length === 0 ? (
              <p className="text-sm sm:text-base text-slate-400 text-center py-6">Belum ada data absensi hari ini.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {attendanceRecords.slice(-5).reverse().map(rec => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-sm sm:text-base"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{rec.nama}</p>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        {rec.kelas} • NIS {rec.nis}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs sm:text-sm font-bold px-3 py-1 rounded-full ${
                          rec.status_akhir === 'TEPAT_WAKTU'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : rec.status_akhir === 'TERLAMBAT'
                            ? 'bg-amber-100 text-amber-950 border border-amber-300'
                            : 'bg-blue-100 text-blue-950 border border-blue-300'
                        }`}
                      >
                        {rec.status_akhir}
                      </span>
                      <p className="text-xs sm:text-sm text-slate-500 font-mono mt-1 font-semibold">
                        {rec.jam_pulang || rec.jam_masuk} WIB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
