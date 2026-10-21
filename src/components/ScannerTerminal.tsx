import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
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
  Upload,
  Maximize2,
  Minimize2,
  HelpCircle,
  FileText,
  Settings2,
  Scan,
  ZoomIn,
  ZoomOut,
  Contrast,
  Lightbulb,
  Check,
} from 'lucide-react';
import { Siswa, Absensi, ScanResult, SchoolConfig } from '../types';
import { processAttendanceRules, formatWhatsAppMessage } from '../utils/attendanceRules';
import { soundService } from '../utils/audio';
import { sendWhatsAppNotification } from '../utils/fonnte';
import { getTodayDateString, formatIndonesianDate } from '../utils/storage';
import {
  getEffectiveJamPulang,
  getEffectiveJamMasuk,
  isWeekendHoliday,
  getHariDisplayName,
} from '../utils/classConfig';
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
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'card' | 'wide'>('wide'); // Default wide (16:9) matching PC 720p webcams
  const [zoomLevel, setZoomLevel] = useState<number>(1.4); // Default 1.4x digital zoom for PC 720p webcams
  const [highContrast, setHighContrast] = useState<boolean>(false); // High contrast black/white booster
  const [scanFullFrame, setScanFullFrame] = useState<boolean>(true); // Scan entire frame without cropping box
  const [isScanningFile, setIsScanningFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [manualNis, setManualNis] = useState<string>('');
  const [mode, setMode] = useState<'AUTO' | 'MASUK' | 'DZUHUR' | 'ASHAR' | 'PULANG'>('AUTO');

  // Simulated Time Controls for testing/demo
  const [useSimulatedTime, setUseSimulatedTime] = useState<boolean>(false);
  const [simulatedTime, setSimulatedTime] = useState<string>('06:45');
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState<string>('');

  // Audio & Voice toggles & Diagnostic for Android Tablet
  const [soundActive, setSoundActive] = useState<boolean>(config.sound_enabled);
  const [voiceActive, setVoiceActive] = useState<boolean>(config.voice_announcement_enabled);
  const [isTestingAudio, setIsTestingAudio] = useState<boolean>(false);
  const [audioDiagnosticMessage, setAudioDiagnosticMessage] = useState<string | null>(null);
  const [showAudioGuide, setShowAudioGuide] = useState<boolean>(false);

  // Camera switching loading state
  const [cameraSwitching, setCameraSwitching] = useState<boolean>(false);

  // Result state
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [waDetailsOpen, setWaDetailsOpen] = useState<boolean>(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Enumerate cameras on mount
  useEffect(() => {
    let isMounted = true;
    Html5Qrcode.getCameras()
      .then(devices => {
        if (isMounted && devices && devices.length > 0) {
          setAvailableCameras(devices);
          // Prefer external or environment camera if available
          const preferred = devices.find(
            d =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('belakang') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('external') ||
              d.label.toLowerCase().includes('usb')
          );
          if (preferred) {
            setSelectedCameraId(preferred.id);
            setCameraFacing('environment');
          } else {
            setSelectedCameraId(devices[0].id);
            const isBack =
              devices[0].label.toLowerCase().includes('back') ||
              devices[0].label.toLowerCase().includes('belakang') ||
              devices[0].label.toLowerCase().includes('rear');
            setCameraFacing(isBack ? 'environment' : 'user');
          }
        }
      })
      .catch(() => {
        // Permissions not yet requested
      });
    return () => {
      isMounted = false;
    };
  }, []);

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

  // Main Attendance Processing Function with deep multi-format extraction
  const handleAttendanceScan = useCallback(
    async (scannedNis: string) => {
      if (isProcessing) return;
      let rawScanned = scannedNis.trim();
      if (!rawScanned) return;

      // 1. Strip enclosing quotes if any
      let cleanNis = rawScanned.replace(/^["']+|["']+$/g, '').trim();

      // 2. Extract from JSON format (if QR contains student object or JSON payload)
      if (
        (cleanNis.startsWith('{') && cleanNis.endsWith('}')) ||
        (cleanNis.startsWith('[') && cleanNis.endsWith(']'))
      ) {
        try {
          const parsed = JSON.parse(cleanNis);
          const obj = Array.isArray(parsed) ? parsed[0] : parsed;
          const candidate =
            obj?.nis ??
            obj?.NIS ??
            obj?.nisn ??
            obj?.NISN ??
            obj?.id ??
            obj?.ID ??
            obj?.kode ??
            obj?.code ??
            obj?.nomor_induk;
          if (candidate) cleanNis = String(candidate).trim();
        } catch {
          // keep original
        }
      }

      // 3. Extract from URL (e.g. https://domain.sch.id/absen?nis=124015112 or /siswa/124015112)
      if (cleanNis.includes('nis=')) {
        const match = cleanNis.match(/nis=([a-zA-Z0-9_\-\.]+)/i);
        if (match) cleanNis = match[1].trim();
      } else if (cleanNis.includes('id=')) {
        const match = cleanNis.match(/id=([a-zA-Z0-9_\-\.]+)/i);
        if (match) cleanNis = match[1].trim();
      } else if (cleanNis.includes('nisn=')) {
        const match = cleanNis.match(/nisn=([a-zA-Z0-9_\-\.]+)/i);
        if (match) cleanNis = match[1].trim();
      } else if (/^https?:\/\//i.test(cleanNis)) {
        try {
          const url = new URL(cleanNis);
          const qNis =
            url.searchParams.get('nis') ||
            url.searchParams.get('id') ||
            url.searchParams.get('nisn');
          if (qNis) {
            cleanNis = qNis.trim();
          } else {
            const parts = url.pathname.split('/').filter(Boolean);
            if (parts.length > 0) {
              const last = parts[parts.length - 1];
              if (last && /^[\w\-]+$/.test(last)) cleanNis = last;
            }
          }
        } catch {
          // ignore
        }
      }

      // 4. Strip common prefixes like "NIS:", "NIS :", "NISN:", "ID:"
      if (/^nis[:\s\-_=]+/i.test(cleanNis)) {
        cleanNis = cleanNis.replace(/^nis[:\s\-_=]+/i, '').trim();
      } else if (/^nisn[:\s\-_=]+/i.test(cleanNis)) {
        cleanNis = cleanNis.replace(/^nisn[:\s\-_=]+/i, '').trim();
      } else if (/^id[:\s\-_=]+/i.test(cleanNis)) {
        cleanNis = cleanNis.replace(/^id[:\s\-_=]+/i, '').trim();
      }

      cleanNis = cleanNis.replace(/^["']+|["']+$/g, '').trim();

      setIsProcessing(true);

      // 5. Flexible matching against student records:
      // Exact NIS, NISN, ID, or numeric match ignoring leading zeroes
      const student = students.find(s => {
        const sNis = (s.nis || '').trim().toLowerCase();
        const sNisn = (s.nisn || '').trim().toLowerCase();
        const sId = (s.id || '').trim().toLowerCase();
        const target = cleanNis.toLowerCase();

        if (sNis === target || sNisn === target || sId === target) return true;

        // Numeric match
        if (/^\d+$/.test(target) && /^\d+$/.test(sNis)) {
          if (parseInt(target, 10) === parseInt(sNis, 10)) return true;
        }
        if (sNisn && /^\d+$/.test(target) && /^\d+$/.test(sNisn)) {
          if (parseInt(target, 10) === parseInt(sNisn, 10)) return true;
        }
        return false;
      });

      const effectiveTime = getEffectiveTime();
      const todayDate = getTodayDateString();

      if (!student) {
        if (soundActive) soundService.playError();
        if (voiceActive) soundService.speak('Kartu tidak terdaftar dalam sistem.');
        setLastScanResult({
          success: false,
          type: 'REJECTED',
          message: `Kode QR "${cleanNis}" tidak ditemukan dalam data siswa SMKS PGRI 1! Periksa apakah NIS sudah terdaftar di menu Siswa.`,
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
      const hasCheckedDzuhur = Boolean(existingRecord?.jam_dzuhur);
      const hasCheckedAshar = Boolean(existingRecord?.jam_ashar);

      // Determine effective class departure time from daily schedule (Senin - Jum'at) or config
      const effectiveJamPulang = getEffectiveJamPulang(student.kelas, todayDate, config);
      const effectiveJamMasuk = getEffectiveJamMasuk(todayDate, config);
      const isWeekend = isWeekendHoliday(todayDate, config);
      const dayDisplayName = getHariDisplayName(todayDate);

      // Run pure business rules
      const ruleResult = processAttendanceRules({
        currentTime: effectiveTime,
        studentJamPulang: effectiveJamPulang,
        jamMasukBatas: effectiveJamMasuk !== '-' ? effectiveJamMasuk : config.jam_masuk_batas,
        hasCheckedIn,
        hasCheckedOut,
        hasCheckedDzuhur,
        hasCheckedAshar,
        forcedMode: mode,
        isWeekendHoliday: isWeekend,
        dayName: dayDisplayName,
        sholatAbsenEnabled: config.sholat_absen_enabled !== false,
        sholatDzuhurMulai: config.sholat_dzuhur_mulai || '11:45',
        sholatDzuhurSelesai: config.sholat_dzuhur_selesai || '13:00',
        sholatAsharMulai: config.sholat_ashar_mulai || '15:15',
        sholatAsharSelesai: config.sholat_ashar_selesai || '16:15',
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
          jam_pulang: existingRecord?.jam_pulang || null,
          status_pulang: existingRecord?.status_pulang || null,
          jam_dzuhur: existingRecord?.jam_dzuhur || null,
          status_dzuhur: existingRecord?.status_dzuhur || null,
          jam_ashar: existingRecord?.jam_ashar || null,
          status_ashar: existingRecord?.status_ashar || null,
          status_akhir: ruleResult.status as 'TEPAT_WAKTU' | 'TERLAMBAT',
          notifikasi_wa_terkirim: false,
          created_at: existingRecord?.created_at || new Date().toISOString(),
        };
      } else if (ruleResult.type === 'DZUHUR') {
        updatedRecord = {
          id: existingRecord?.id || 'att-' + Date.now(),
          siswa_id: student.id,
          nis: student.nis,
          nama: student.nama,
          kelas: student.kelas,
          tanggal: todayDate,
          jam_masuk: existingRecord?.jam_masuk || effectiveTime,
          status_masuk: existingRecord?.status_masuk || 'TEPAT_WAKTU',
          jam_pulang: existingRecord?.jam_pulang || null,
          status_pulang: existingRecord?.status_pulang || null,
          jam_dzuhur: effectiveTime,
          status_dzuhur: 'TERLAKSANA',
          jam_ashar: existingRecord?.jam_ashar || null,
          status_ashar: existingRecord?.status_ashar || null,
          status_akhir: existingRecord?.status_akhir || 'TEPAT_WAKTU',
          notifikasi_wa_terkirim: false,
          created_at: existingRecord?.created_at || new Date().toISOString(),
        };
      } else if (ruleResult.type === 'ASHAR') {
        updatedRecord = {
          id: existingRecord?.id || 'att-' + Date.now(),
          siswa_id: student.id,
          nis: student.nis,
          nama: student.nama,
          kelas: student.kelas,
          tanggal: todayDate,
          jam_masuk: existingRecord?.jam_masuk || '07:00:00',
          status_masuk: existingRecord?.status_masuk || 'TEPAT_WAKTU',
          jam_pulang: existingRecord?.jam_pulang || null,
          status_pulang: existingRecord?.status_pulang || null,
          jam_dzuhur: existingRecord?.jam_dzuhur || null,
          status_dzuhur: existingRecord?.status_dzuhur || null,
          jam_ashar: effectiveTime,
          status_ashar: 'TERLAKSANA',
          status_akhir: existingRecord?.status_akhir || 'TEPAT_WAKTU',
          notifikasi_wa_terkirim: false,
          created_at: existingRecord?.created_at || new Date().toISOString(),
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
          jam_dzuhur: existingRecord?.jam_dzuhur || null,
          status_dzuhur: existingRecord?.status_dzuhur || null,
          jam_ashar: existingRecord?.jam_ashar || null,
          status_ashar: existingRecord?.status_ashar || null,
          status_akhir: 'PULANG',
          notifikasi_wa_terkirim: false,
          created_at: existingRecord?.created_at || new Date().toISOString(),
        };
      }

      // Audio & Voice Feedback
      if (soundActive) {
        if (ruleResult.status === 'TEPAT_WAKTU' || ruleResult.type === 'DZUHUR' || ruleResult.type === 'ASHAR') {
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
        let greeting = '';
        if (ruleResult.type === 'MASUK') {
          greeting = `Selamat datang ${student.nama}. Presensi masuk ${
            ruleResult.status === 'TEPAT_WAKTU' ? 'tepat waktu' : 'terlambat'
          }.`;
        } else if (ruleResult.type === 'DZUHUR') {
          greeting = `Selamat siang ${student.nama}. Presensi sholat dzuhur berjamaah berhasil. Selamat beribadah.`;
        } else if (ruleResult.type === 'ASHAR') {
          greeting = `Selamat sore ${student.nama}. Presensi sholat ashar berjamaah berhasil. Selamat beribadah.`;
        } else {
          greeting = `Selamat sore ${student.nama}. Presensi pulang berhasil. Hati-hati di jalan.`;
        }
        soundService.speak(greeting);
      }

      // Format WhatsApp Notification
      const waMessage = formatWhatsAppMessage({
        namaSiswa: student.nama,
        nis: student.nis,
        kelas: student.kelas,
        jenisAbsen: ruleResult.type as any,
        status: ruleResult.status as any,
        waktu: `${effectiveTime} WIB`,
        tanggal: formatIndonesianDate(todayDate),
        keterangan:
          ruleResult.status === 'TERLAMBAT'
            ? `Terlambat ${ruleResult.minutesLate} menit`
            : ruleResult.type === 'DZUHUR'
            ? 'Sholat Dzuhur Berjamaah di Masjid Sekolah'
            : ruleResult.type === 'ASHAR'
            ? 'Sholat Ashar Berjamaah di Masjid Sekolah'
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
        statusDetail: ruleResult.status as any,
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

  // Apply digital zoom to video stream (or hardware zoom if supported)
  const applyZoom = useCallback((zoom: number) => {
    setZoomLevel(zoom);
    try {
      const videoEl = document.querySelector('#qr-reader-container video') as HTMLVideoElement;
      if (videoEl) {
        videoEl.style.transform = `scale(${zoom})`;
        videoEl.style.transformOrigin = 'center center';

        // Check if camera supports native hardware optical/digital zoom
        const stream = videoEl.srcObject as MediaStream;
        const track = stream?.getVideoTracks?.()[0];
        const caps = track?.getCapabilities?.() as any;
        if (caps && 'zoom' in caps) {
          const min = caps.zoom.min || 1;
          const max = caps.zoom.max || 3;
          const target = Math.min(max, Math.max(min, zoom));
          track.applyConstraints({ advanced: [{ zoom: target }] } as any).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Could not apply camera zoom:', e);
    }
  }, []);

  // Initialize and Mount HTML5 QR Code Scanner with Native Hardware Acceleration & HD Resolution
  const startCameraScanner = useCallback(
    async (overrideFacing?: 'user' | 'environment', overrideDeviceId?: string) => {
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

        // 1. Enable Hardware-Accelerated BarcodeDetector (Chrome/Edge C++ Native Engine)
        const html5QrCode = new Html5Qrcode('qr-reader-container', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
          ],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
          verbose: false,
        });
        html5QrCodeRef.current = html5QrCode;

        // Determine effective facing and device ID
        const effectiveFacing = overrideFacing || cameraFacing;
        const effectiveDeviceId =
          overrideDeviceId !== undefined ? overrideDeviceId : selectedCameraId;

        // 2. Determine camera device or facing mode
        // If device ID is available, attempt exact device first; fallback to facingMode if rejected
        const cameraSource: any = effectiveDeviceId
          ? { deviceId: { exact: effectiveDeviceId } }
          : { facingMode: effectiveFacing };

        // 3. Scan callback
        const onScanSuccess = (decodedText: string) => {
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
        };

        // 4. Configuration optimized for PC 720p webcams & mobile cameras:
        const scanConfig: any = {
          fps: 15,
          videoConstraints: {
            facingMode: effectiveFacing,
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            aspectRatio: { ideal: 1.7777777778 },
          },
        };

        if (!scanFullFrame) {
          scanConfig.qrbox = (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.max(220, Math.floor(minEdge * 0.85));
            return { width: edge, height: edge };
          };
        }

        try {
          await html5QrCode.start(
            cameraSource,
            scanConfig,
            onScanSuccess,
            () => {}
          );
        } catch (hdErr) {
          console.warn('Primary camera config rejected, trying facingMode fallback:', hdErr);
          // Fallback for Android tablets / mobile where exact deviceId or HD constraints might fail
          const fallbackSource: any = { facingMode: effectiveFacing };
          const fallbackConfig: any = {
            fps: 15,
          };
          if (!scanFullFrame) {
            fallbackConfig.qrbox = { width: 250, height: 250 };
          }
          await html5QrCode.start(
            fallbackSource,
            fallbackConfig,
            onScanSuccess,
            () => {}
          );
        }

        setIsScannerRunning(true);

        // Re-apply zoom level once stream is playing
        setTimeout(() => {
          applyZoom(zoomLevel);
        }, 350);

        // Re-populate camera list once permission is granted
        Html5Qrcode.getCameras()
          .then(devices => {
            if (devices && devices.length > 0) {
              setAvailableCameras(devices);
            }
          })
          .catch(() => {});
      } catch (err: any) {
        console.warn('Camera initialization warning:', err);
        setIsScannerRunning(false);
        setScannerError(
          'Kamera fisik tidak dapat diakses atau diblokir izinnya oleh browser. Pastikan izin kamera aktif (Allow), atau gunakan tombol "Pindai File Gambar" / input NIS manual di bawah.'
        );
      }
    },
    [cameraFacing, selectedCameraId, scanFullFrame, zoomLevel, handleAttendanceScan, applyZoom]
  );

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

  // Handle switching camera device from dropdown
  const handleCameraChange = async (cameraId: string) => {
    setSelectedCameraId(cameraId);
    const selected = availableCameras.find(c => c.id === cameraId);
    if (selected) {
      const isBack =
        selected.label.toLowerCase().includes('back') ||
        selected.label.toLowerCase().includes('belakang') ||
        selected.label.toLowerCase().includes('rear') ||
        selected.label.toLowerCase().includes('environment');
      setCameraFacing(isBack ? 'environment' : 'user');
    }
    if (isScannerRunning && html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        setIsScannerRunning(false);
        setTimeout(() => {
          startCameraScanner(undefined, cameraId);
        }, 300);
      } catch {
        // ignore
      }
    }
  };

  // Robust toggle front/back camera with auto device selection & live restart
  const handleToggleCamera = useCallback(async () => {
    if (cameraSwitching) return;
    setCameraSwitching(true);
    setScannerError(null);

    const nextFacing: 'user' | 'environment' = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);

    // Pick corresponding camera from availableCameras if available
    let nextDeviceId = '';
    if (availableCameras && availableCameras.length > 1) {
      if (nextFacing === 'environment') {
        const backCam = availableCameras.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('belakang') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        nextDeviceId = backCam
          ? backCam.id
          : availableCameras.find(d => d.id !== selectedCameraId)?.id || availableCameras[0].id;
      } else {
        const frontCam = availableCameras.find(d =>
          d.label.toLowerCase().includes('front') ||
          d.label.toLowerCase().includes('depan') ||
          d.label.toLowerCase().includes('user') ||
          d.label.toLowerCase().includes('selfie')
        );
        nextDeviceId = frontCam
          ? frontCam.id
          : availableCameras.find(d => d.id !== selectedCameraId)?.id || availableCameras[1]?.id || availableCameras[0].id;
      }
    } else {
      nextDeviceId = '';
    }

    setSelectedCameraId(nextDeviceId);

    // If scanner is running, restart it with the new camera
    if (html5QrCodeRef.current && isScannerRunning) {
      try {
        await html5QrCodeRef.current.stop();
        setIsScannerRunning(false);
      } catch (e) {
        console.warn('Error stopping scanner during switch:', e);
      }

      setTimeout(async () => {
        try {
          await startCameraScanner(nextFacing, nextDeviceId);
        } finally {
          setCameraSwitching(false);
        }
      }, 350);
    } else {
      setCameraSwitching(false);
    }
  }, [cameraFacing, cameraSwitching, availableCameras, selectedCameraId, isScannerRunning, startCameraScanner]);

  // Audio handlers with Android Tablet AudioContext unlocker
  const handleToggleSound = async () => {
    const next = !soundActive;
    setSoundActive(next);
    if (next) {
      await soundService.unlockAudio();
      soundService.playSuccess();
    }
  };

  const handleToggleVoice = async () => {
    const next = !voiceActive;
    setVoiceActive(next);
    if (next) {
      await soundService.unlockAudio();
      soundService.speak('Suara sambutan absensi aktif');
    }
  };

  const handleTestTabletAudio = async () => {
    setIsTestingAudio(true);
    setAudioDiagnosticMessage(null);
    try {
      const res = await soundService.testAudioAndSpeech();
      if (!res.hasIndonesianVoice) {
        setAudioDiagnosticMessage(
          `🔊 Bip berhasil dibunyikan! Mesin suara saat ini: ${res.voiceName}. Bila ucapan bahasa Indonesia belum keluar di tablet, pasang paket bahasa Indonesia di Pengaturan Tablet Android.`
        );
      } else {
        setAudioDiagnosticMessage(
          `✅ Audio & Suara Tablet Aktif! Suara: ${res.voiceName}. Bip dan ucapan siap berfungsi otomatis.`
        );
      }
    } catch {
      setAudioDiagnosticMessage(
        '⚠️ Gagal mengaktifkan audio. Pastikan volume tablet tidak di-mute dan izin audio diperbolehkan.'
      );
    } finally {
      setIsTestingAudio(false);
    }
  };

  // Scan directly from Image/Photo File (Upload fallback for cards)
  const handleScanFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningFile(true);
    setScannerError(null);

    try {
      if (html5QrCodeRef.current && isScannerRunning) {
        try {
          await html5QrCodeRef.current.stop();
          setIsScannerRunning(false);
        } catch {
          // ignore
        }
      }

      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('qr-reader-container', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
          ],
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          verbose: false,
        });
        html5QrCodeRef.current = scanner;
      }

      const decodedText = await scanner.scanFile(file, true);
      if (decodedText) {
        handleAttendanceScan(decodedText);
      }
    } catch (err: any) {
      console.error('File scan error:', err);
      if (soundActive) soundService.playError();
      setScannerError(
        'Kode QR tidak terdeteksi pada file/foto yang dipilih. Pastikan foto kartu tampak tegak, terang, fokus, dan tidak terpotong.'
      );
    } finally {
      setIsScanningFile(false);
      if (e.target) e.target.value = '';
    }
  };

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
    <div className="space-y-6">
      {/* Top Status & Clock Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/95 p-1 flex items-center justify-center border border-slate-700/60 shadow-sm shrink-0">
            <SchoolLogo
              src={config.logo_url}
              className="w-full h-full object-contain"
              alt={config.nama_sekolah}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium flex-wrap">
              <span className="font-semibold text-slate-200">Terminal Presensi Gerbang</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              {isWeekendHoliday(getTodayDateString(), config) ? (
                <span className="text-rose-400 font-semibold">
                  Hari {getHariDisplayName(getTodayDateString())}: Libur Akhir Pekan
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Hari {getHariDisplayName(getTodayDateString())}: KBM Aktif
                </span>
              )}
              <span aria-hidden="true" className="text-slate-600 hidden sm:inline">·</span>
              <span className="hidden sm:inline text-slate-300">
                Batas Masuk: <strong className="text-amber-400">{getEffectiveJamMasuk(getTodayDateString(), config)} WIB</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              Pemindai Kartu Siswa QR Code
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Arahkan QR Code kartu pelajar ke arah kamera untuk pencatatan otomatis
            </p>
          </div>
        </div>

        {/* Live Clock & Controls */}
        <div className="flex flex-col sm:flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto">
          <div className="flex items-center gap-3 bg-slate-950/90 px-4 py-2 rounded-xl border border-slate-800 shadow-inner">
            <Clock className="w-5 h-5 text-amber-400" />
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-mono font-bold tracking-wider text-amber-400 leading-tight">
                {useSimulatedTime ? simulatedTime + ':00' : currentTimeDisplay || '07:00:00'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {useSimulatedTime ? 'Mode Simulasi Waktu' : 'Waktu Indonesia Barat (WIB)'}
              </div>
            </div>
          </div>

          {/* Quick Audio & Voice Toggles */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={handleToggleSound}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                soundActive
                  ? 'bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-750'
                  : 'bg-slate-950/60 text-slate-500 border border-slate-850'
              }`}
              title="Klik untuk menghidupkan/mematikan efek suara bip"
            >
              {soundActive ? <Volume2 className="w-3.5 h-3.5 text-blue-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{soundActive ? 'Bip Aktif' : 'Bip Nonaktif'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleVoice}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                voiceActive
                  ? 'bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-750'
                  : 'bg-slate-950/60 text-slate-500 border border-slate-850'
              }`}
              title="Klik untuk menghidupkan/mematikan suara sambutan"
            >
              <Sparkles className={`w-3.5 h-3.5 ${voiceActive ? 'text-amber-400' : 'text-slate-500'}`} />
              <span>{voiceActive ? 'Suara Aktif' : 'Suara Nonaktif'}</span>
            </button>

            {/* Tablet / Kiosk Audio Test & Unlock Button */}
            <button
              type="button"
              onClick={handleTestTabletAudio}
              disabled={isTestingAudio}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-75"
              title="Buka blokir audio browser & tes speaker tablet"
            >
              <Volume2 className={`w-3.5 h-3.5 text-slate-950 ${isTestingAudio ? 'animate-pulse' : ''}`} />
              <span>{isTestingAudio ? 'Menguji...' : 'Tes Audio Tablet'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAudioGuide(prev => !prev)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              title="Bantuan masalah suara tablet Android"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tablet Audio Notification / Diagnostic Banner */}
      {(audioDiagnosticMessage || showAudioGuide) && (
        <div className="bg-slate-900 border border-amber-400/40 text-slate-200 p-4 rounded-2xl shadow-md text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Status &amp; Solusi Audio Tablet Android</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAudioDiagnosticMessage(null);
                setShowAudioGuide(false);
              }}
              className="text-slate-400 hover:text-white text-xs underline cursor-pointer"
            >
              Tutup
            </button>
          </div>
          {audioDiagnosticMessage && (
            <p className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300">
              {audioDiagnosticMessage}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-slate-300 leading-relaxed text-[11.5px]">
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
              <strong className="text-white block mb-1">1. Mengapa di Smartphone Normal tapi di Tablet Sempat Bisu?</strong>
              Pada tablet yang dipasang di meja/stand (mode kiosk), tidak ada yang menyentuh layar. Browser Chrome memblokir audio otomatis (*Autoplay Policy*) sampai layar disentuh minimal 1 kali. Cukup klik tombol <strong>"Tes Audio Tablet"</strong> untuk membuka izin selamanya.
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
              <strong className="text-white block mb-1">2. Jika Suara Ucapan Belum Terdengar di Tablet:</strong>
              Pastikan paket offline Bahasa Indonesia terpasang di tablet: Buka <em>Pengaturan Tablet &gt; Manajemen Umum &gt; Bahasa &amp; Input &gt; Teks ke Ucapan (TTS) &gt; Mesin Google TTS &gt; Pasang data suara Bahasa Indonesia</em>.
            </div>
          </div>
        </div>
      )}

      {/* Grid: Left = Camera / Scanner, Right = Last Scan Result & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Scanner Terminal & Manual Input (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Scanner Box */}
          <div className="premium-card overflow-hidden">
            {/* Hidden File Input for Scan from Image/Photo */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleScanFromFile}
              className="hidden"
            />

            <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-900 text-amber-400 rounded-xl border border-slate-800 shadow-2xs shrink-0">
                  <Camera className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-slate-900 text-base sm:text-lg leading-tight">
                      Pemindai Kamera QR Code
                    </h3>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 border ${
                        isScannerRunning
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isScannerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      <span>{isScannerRunning ? 'Live Aktif' : 'Siap'}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Akselerasi hardware • Arahkan kartu presensi siswa ke arah kamera
                  </p>
                </div>
              </div>

              {/* Action Buttons: Ganti Kamera, Dropdown, File Upload, dan Nyalakan/Hentikan */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Switch Front/Back Camera */}
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  disabled={cameraSwitching}
                  className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border shadow-2xs ${
                    cameraFacing === 'environment'
                      ? 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                      : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                  }`}
                  title={`Klik untuk berganti ke Kamera ${cameraFacing === 'user' ? 'Belakang' : 'Depan'}`}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${cameraSwitching ? 'animate-spin text-blue-600' : 'text-slate-600'}`}
                  />
                  <span>
                    {cameraSwitching
                      ? 'Ganti...'
                      : cameraFacing === 'environment'
                      ? 'Kamera Belakang'
                      : 'Kamera Depan'}
                  </span>
                </button>

                {/* Camera device selector if multiple exist */}
                {availableCameras.length > 1 && (
                  <select
                    value={selectedCameraId}
                    onChange={e => handleCameraChange(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 sm:py-2 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 max-w-[125px] truncate cursor-pointer shadow-2xs"
                    title="Pilih sensor kamera"
                  >
                    {availableCameras.map((cam, idx) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `Lensa ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}

                {/* Upload Image Fallback */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanningFile}
                  className="px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-2xs"
                  title="Pindai langsung dari file foto/gambar kartu"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isScanningFile ? 'Memindai...' : 'File Kartu'}</span>
                </button>

                {/* Start / Stop Toggle (Primary Button) */}
                {isScannerRunning ? (
                  <button
                    type="button"
                    onClick={stopCameraScanner}
                    className="px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-300 transition cursor-pointer shadow-2xs"
                  >
                    Hentikan Kamera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCameraScanner()}
                    className="px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-black text-amber-300 transition flex items-center gap-1.5 shadow-sm cursor-pointer border border-slate-800"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nyalakan Kamera</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sub-Toolbar: Precision Controls (View Mode, Zoom, Full Frame & Contrast) */}
            <div className="px-4 py-2 bg-slate-50/90 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Left: View Mode Segmented Switcher */}
              <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg border border-slate-300/70">
                <button
                  type="button"
                  onClick={() => setViewMode('wide')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'wide'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Mode Layar Lebar 16:9 HD (Sangat direkomendasikan untuk Webcam PC & Laptop)"
                >
                  <Maximize2 className="w-3 h-3 text-blue-600" />
                  <span>Layar Lebar (16:9)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'card'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Mode Presisi Portrait Kartu Pelajar"
                >
                  <Minimize2 className="w-3 h-3 text-blue-600" />
                  <span>Bingkai Kartu</span>
                </button>
              </div>

              {/* Right: Digital Zoom & Scanner Tweaks */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Digital Zoom Segment */}
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 pl-1.5 flex items-center gap-1">
                    <ZoomIn className="w-3 h-3 text-slate-400" />
                    <span>Zoom:</span>
                  </span>
                  {[
                    { label: '1.0x', val: 1.0 },
                    { label: '1.4x', val: 1.4 },
                    { label: '1.8x', val: 1.8 },
                  ].map(z => (
                    <button
                      key={z.val}
                      type="button"
                      onClick={() => applyZoom(z.val)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                        zoomLevel === z.val
                          ? 'bg-slate-900 text-amber-300'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>

                {/* Scan Full Frame Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !scanFullFrame;
                    setScanFullFrame(next);
                    if (isScannerRunning && html5QrCodeRef.current) {
                      stopCameraScanner().then(() => {
                        setTimeout(startCameraScanner, 250);
                      });
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-[11px] border ${
                    scanFullFrame
                      ? 'bg-slate-900 text-slate-100 border-slate-850'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                  }`}
                  title="Pindai seluruh bidang kamera (tanpa kotak pembatas sempit)"
                >
                  <Scan className="w-3 h-3 text-emerald-400" />
                  <span>{scanFullFrame ? 'Seluruh Layar' : 'Kotak Fokus'}</span>
                </button>

                {/* High Contrast Toggle */}
                <button
                  type="button"
                  onClick={() => setHighContrast(!highContrast)}
                  className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-[11px] border ${
                    highContrast
                      ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-300'
                  }`}
                  title="Peningkatan kontras hitam-putih untuk ruangan minim cahaya"
                >
                  <Contrast className="w-3 h-3" />
                  <span>{highContrast ? 'Kontras Tinggi' : 'Kontras'}</span>
                </button>
              </div>
            </div>

            {/* Precision Camera Viewport */}
            <div
              className={`relative bg-gradient-to-b from-slate-50 via-slate-50/80 to-white min-h-[460px] sm:min-h-[490px] md:min-h-[520px] w-full flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden border-b border-slate-200 ${
                highContrast ? 'scanner-high-contrast' : ''
              }`}
            >
              {/* Card Container Box */}
              <div
                className={`relative rounded-2xl overflow-hidden border-2 border-amber-400 shadow-[0_12px_36px_rgba(245,158,11,0.25),0_4px_16px_rgba(15,23,42,0.12)] bg-black flex items-center justify-center shrink-0 ring-4 ring-amber-400/20 transition-all duration-300 ${
                  viewMode === 'card'
                    ? 'w-[260px] sm:w-[280px] md:w-[300px] h-[412px] sm:h-[444px] md:h-[475px]'
                    : 'w-full max-w-[560px] aspect-video scanner-view-wide'
                }`}
              >
                {/* Live Camera Viewport */}
                <div
                  id="qr-reader-container"
                  className="w-full h-full scanner-camera-view flex items-center justify-center"
                />

                {/* Inactive State */}
                {!isScannerRunning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-between p-4 text-center bg-slate-950 text-slate-200 z-10">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider bg-black/80 px-2.5 py-1 rounded-md border border-amber-400/40 mt-1">
                      <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                      <span>{viewMode === 'card' ? 'Standar Portrait 54×85.6mm' : 'Mode Layar Lebar HD (16:9 PC)'}</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-xl">
                        <Camera className="w-8 h-8" />
                      </div>
                      <h4 className="text-white font-heading font-black text-sm sm:text-base leading-tight mt-1">
                        Kamera Siap Memindai
                      </h4>
                      <p className="text-[11px] text-slate-300 max-w-[240px] leading-snug">
                        Arahkan Kode QR kartu absensi siswa SMKS PGRI 1. Pada webcam PC 720p, jaga jarak kartu 35–45 cm.
                      </p>
                    </div>

                    <div className="w-full pb-1 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => startCameraScanner()}
                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 hover:from-amber-300 hover:to-yellow-400 shadow-lg flex items-center justify-center gap-2 transition cursor-pointer font-heading"
                      >
                        <Camera className="w-3.5 h-3.5 text-slate-950" />
                        <span>Aktifkan Kamera Live</span>
                      </button>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pindai dari Foto / Gambar Kartu</span>
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
                        {viewMode === 'card' ? 'BINGKAI KARTU' : 'LAYAR LEBAR HD (16:9)'}
                      </span>
                      <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        SCAN AKTIF
                      </span>
                    </div>

                    {/* QR Target Guide Box */}
                    {!scanFullFrame ? (
                      <div className="w-36 h-36 border-2 border-dashed border-amber-400/80 rounded-2xl mx-auto flex items-center justify-center bg-black/20 my-auto">
                        <span className="text-[9px] font-mono text-amber-200/95 bg-black/80 px-2 py-0.5 rounded border border-amber-400/30">
                          FOKUS KODE QR
                        </span>
                      </div>
                    ) : (
                      <div className="w-11/12 h-5/6 border border-dashed border-amber-400/50 rounded-2xl mx-auto flex flex-col items-center justify-between p-2 pointer-events-none my-auto">
                        <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-amber-300/90 bg-black/70 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                          <span>⚡ SCAN SELURUH LAYAR AKTIF</span>
                          <span className="text-slate-400">•</span>
                          <span>ZOOM {zoomLevel.toFixed(1)}x</span>
                        </div>
                        <div className="text-[8px] text-amber-200/80 bg-black/60 px-2 py-0.5 rounded">
                          Jaga kartu di jarak 35–45 cm (bebas posisi)
                        </div>
                      </div>
                    )}

                    {/* Sweeping Laser Line for Scan View */}
                    <div className="absolute left-2.5 right-2.5 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(251,191,36,1)] animate-laser-sweep pointer-events-none" />

                    {/* Bottom Card Guide Footer */}
                    <div className="text-center text-[10px] font-semibold text-slate-100 bg-black/80 px-2 py-1 rounded-md backdrop-blur-xs border border-slate-700">
                      Pegang kartu stabil di jarak 35–45 cm dari kamera PC
                    </div>
                  </div>
                )}
              </div>
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
                      <div className="flex flex-wrap gap-1 mt-1">
                        {todayRecord?.status_masuk && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
                            {todayRecord.status_pulang ? '✓ Pulang' : '✓ Masuk'}
                          </span>
                        )}
                        {todayRecord?.jam_dzuhur && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-300">
                            🕌 Dzuhur
                          </span>
                        )}
                        {todayRecord?.jam_ashar && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300">
                            🕌 Ashar
                          </span>
                        )}
                      </div>
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setMode('AUTO')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition cursor-pointer col-span-2 sm:col-span-1 ${
                    mode === 'AUTO'
                      ? 'bg-slate-950 text-amber-300 shadow-sm'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  ⚡ Otomatis
                </button>
                <button
                  type="button"
                  onClick={() => setMode('MASUK')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                    mode === 'MASUK'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Masuk</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('DZUHUR')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                    mode === 'DZUHUR'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                  title="Presensi Sholat Dzuhur Berjamaah"
                >
                  <span>🕌</span>
                  <span>Dzuhur</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('ASHAR')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                    mode === 'ASHAR'
                      ? 'bg-cyan-700 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                  title="Presensi Sholat Ashar Berjamaah"
                >
                  <span>🕌</span>
                  <span>Ashar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('PULANG')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                    mode === 'PULANG'
                      ? 'bg-indigo-700 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Pulang</span>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed font-medium">
                {mode === 'AUTO' && '• Otomatis: Mendeteksi Masuk (pagi), Sholat Dzuhur (11:45–13:00), Sholat Ashar (15:15–16:15), dan Pulang sesuai jam kepulangan siswa.'}
                {mode === 'MASUK' && '• Paksa Masuk: Setiap scan dinilai sebagai absensi kedatangan pagi (Tepat Waktu / Terlambat).'}
                {mode === 'DZUHUR' && '• Sholat Dzuhur: Setiap scan dinilai sebagai kehadiran Sholat Dzuhur Berjamaah.'}
                {mode === 'ASHAR' && '• Sholat Ashar: Setiap scan dinilai sebagai kehadiran Sholat Ashar Berjamaah.'}
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
                      onClick={() => setSimulatedTime('12:15')}
                      className="text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl bg-white text-teal-950 border border-teal-300 hover:bg-teal-50 cursor-pointer"
                    >
                      🕌 12:15 (Dzuhur)
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
                      onClick={() => setSimulatedTime('15:20')}
                      className="text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl bg-white text-cyan-950 border border-cyan-300 hover:bg-cyan-50 cursor-pointer"
                    >
                      🕌 15:20 (Ashar)
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
                        ? lastScanResult.type === 'DZUHUR' || lastScanResult.type === 'ASHAR'
                          ? 'bg-teal-50 border-2 border-teal-400 text-teal-950'
                          : lastScanResult.statusDetail === 'TEPAT_WAKTU'
                          ? 'bg-emerald-50 border-2 border-emerald-400 text-emerald-950'
                          : lastScanResult.statusDetail === 'TERLAMBAT'
                          ? 'bg-amber-50 border-2 border-amber-400 text-amber-950'
                          : 'bg-blue-50 border-2 border-blue-400 text-blue-950'
                        : 'bg-rose-50 border-2 border-rose-400 text-rose-950'
                    }`}
                  >
                    {lastScanResult.success ? (
                      lastScanResult.type === 'DZUHUR' || lastScanResult.type === 'ASHAR' ? (
                        <div className="w-9 h-9 rounded-xl bg-teal-100 border border-teal-300 flex items-center justify-center text-xl shrink-0">
                          🕌
                        </div>
                      ) : lastScanResult.statusDetail === 'TEPAT_WAKTU' ? (
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
                            ? lastScanResult.type === 'DZUHUR'
                              ? 'SHOLAT DZUHUR TERLAKSANA'
                              : lastScanResult.type === 'ASHAR'
                              ? 'SHOLAT ASHAR TERLAKSANA'
                              : lastScanResult.statusDetail === 'TEPAT_WAKTU'
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
