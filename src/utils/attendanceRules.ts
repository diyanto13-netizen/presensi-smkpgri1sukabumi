/**
 * Pure business logic for attendance calculation and WhatsApp message formatting.
 * Decoupled from UI components for deterministic unit testing.
 */

export interface AttendanceRuleResult {
  allowed: boolean;
  type: 'MASUK' | 'PULANG' | 'DZUHUR' | 'ASHAR' | 'REJECTED' | 'ALREADY_COMPLETED';
  status: 'TEPAT_WAKTU' | 'TERLAMBAT' | 'PULANG' | 'DZUHUR' | 'ASHAR' | 'REJECTED';
  message: string;
  minutesLate: number;
  minutesEarly: number;
}

/**
 * Converts "HH:mm" or "HH:mm:ss" into total minutes from midnight.
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const hours = parseInt(parts[0] || '0', 10);
  const minutes = parseInt(parts[1] || '0', 10);
  return hours * 60 + minutes;
}

/**
 * Evaluates whether check-in is on-time or late.
 * Rule: <= jamMasukBatas (default 07:00) is "TEPAT_WAKTU", > 07:00 is "TERLAMBAT".
 */
export function evaluateCheckInTime(
  currentTimeStr: string,
  jamMasukBatas = '07:00'
): { status: 'TEPAT_WAKTU' | 'TERLAMBAT'; minutesLate: number } {
  const currentMinutes = timeStringToMinutes(currentTimeStr);
  const cutoffMinutes = timeStringToMinutes(jamMasukBatas);

  if (currentMinutes <= cutoffMinutes) {
    return {
      status: 'TEPAT_WAKTU',
      minutesLate: 0,
    };
  }

  return {
    status: 'TERLAMBAT',
    minutesLate: currentMinutes - cutoffMinutes,
  };
}

/**
 * Evaluates whether checkout is permitted.
 * Rule: Student can only checkout if currentTime >= jamPulang.
 */
export function evaluateCheckOutTime(
  currentTimeStr: string,
  jamPulangSiswa: string
): { allowed: boolean; minutesRemaining: number; reason?: string } {
  const currentMinutes = timeStringToMinutes(currentTimeStr);
  const targetPulangMinutes = timeStringToMinutes(jamPulangSiswa);

  if (currentMinutes >= targetPulangMinutes) {
    return {
      allowed: true,
      minutesRemaining: 0,
    };
  }

  const remaining = targetPulangMinutes - currentMinutes;
  return {
    allowed: false,
    minutesRemaining: remaining,
    reason: `Belum waktunya pulang! Jam pulang siswa adalah ${jamPulangSiswa} (kurang ${remaining} menit lagi).`,
  };
}

/**
 * High-level evaluator for a scan event given the student's existing record for the day.
 */
export function processAttendanceRules(params: {
  currentTime: string; // "HH:mm" or "HH:mm:ss"
  studentJamPulang: string; // "15:00" or "LIBUR"
  jamMasukBatas?: string; // "07:00"
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  hasCheckedDzuhur?: boolean;
  hasCheckedAshar?: boolean;
  forcedMode?: 'AUTO' | 'MASUK' | 'DZUHUR' | 'ASHAR' | 'PULANG';
  isWeekendHoliday?: boolean;
  dayName?: string;
  sholatAbsenEnabled?: boolean;
  sholatDzuhurMulai?: string;
  sholatDzuhurSelesai?: string;
  sholatAsharMulai?: string;
  sholatAsharSelesai?: string;
}): AttendanceRuleResult {
  const {
    currentTime,
    studentJamPulang,
    jamMasukBatas = '07:00',
    hasCheckedIn,
    hasCheckedOut,
    hasCheckedDzuhur = false,
    hasCheckedAshar = false,
    forcedMode = 'AUTO',
    isWeekendHoliday = false,
    dayName = '',
    sholatAbsenEnabled = true,
    sholatDzuhurMulai = '11:45',
    sholatDzuhurSelesai = '13:00',
    sholatAsharMulai = '15:15',
    sholatAsharSelesai = '16:15',
  } = params;

  // Weekend / Holiday Check in AUTO mode
  if ((isWeekendHoliday || studentJamPulang === 'LIBUR') && forcedMode === 'AUTO') {
    return {
      allowed: false,
      type: 'REJECTED',
      status: 'REJECTED',
      message: `Hari ini (${dayName || 'Sabtu / Minggu'}) adalah HARI LIBUR SEKOLAH. Sistem presensi aktif kembali pada hari Senin.`,
      minutesLate: 0,
      minutesEarly: 0,
    };
  }

  // 1. Forced Mode: SHOLAT DZUHUR
  if (forcedMode === 'DZUHUR') {
    if (hasCheckedDzuhur) {
      return {
        allowed: false,
        type: 'ALREADY_COMPLETED',
        status: 'REJECTED',
        message: 'Siswa sudah tercatat absensi Sholat Dzuhur berjamaah hari ini.',
        minutesLate: 0,
        minutesEarly: 0,
      };
    }
    return {
      allowed: true,
      type: 'DZUHUR',
      status: 'DZUHUR',
      message: 'Absensi Sholat Dzuhur Berhasil. Selamat menunaikan ibadah sholat berjamaah.',
      minutesLate: 0,
      minutesEarly: 0,
    };
  }

  // 2. Forced Mode: SHOLAT ASHAR
  if (forcedMode === 'ASHAR') {
    if (hasCheckedAshar) {
      return {
        allowed: false,
        type: 'ALREADY_COMPLETED',
        status: 'REJECTED',
        message: 'Siswa sudah tercatat absensi Sholat Ashar berjamaah hari ini.',
        minutesLate: 0,
        minutesEarly: 0,
      };
    }
    return {
      allowed: true,
      type: 'ASHAR',
      status: 'ASHAR',
      message: 'Absensi Sholat Ashar Berhasil. Selamat menunaikan ibadah sholat berjamaah.',
      minutesLate: 0,
      minutesEarly: 0,
    };
  }

  // 3. Forced Mode: MASUK
  if (forcedMode === 'MASUK') {
    const checkInEval = evaluateCheckInTime(currentTime, jamMasukBatas);
    return {
      allowed: true,
      type: 'MASUK',
      status: checkInEval.status,
      message:
        checkInEval.status === 'TEPAT_WAKTU'
          ? 'Absen Masuk Berhasil: Hadir Tepat Waktu.'
          : `Absen Masuk Berhasil: Terlambat ${checkInEval.minutesLate} menit.`,
      minutesLate: checkInEval.minutesLate,
      minutesEarly: 0,
    };
  }

  // 4. Forced Mode: PULANG
  if (forcedMode === 'PULANG') {
    const checkOutEval = evaluateCheckOutTime(currentTime, studentJamPulang);
    if (!checkOutEval.allowed) {
      return {
        allowed: false,
        type: 'REJECTED',
        status: 'REJECTED',
        message: checkOutEval.reason || 'Ditolak: Belum waktunya pulang.',
        minutesLate: 0,
        minutesEarly: checkOutEval.minutesRemaining,
      };
    }
    return {
      allowed: true,
      type: 'PULANG',
      status: 'PULANG',
      message: 'Absen Pulang Berhasil. Selamat istirahat dan hati-hati di jalan.',
      minutesLate: 0,
      minutesEarly: 0,
    };
  }

  // 5. AUTO Mode:
  // If not checked in yet, this scan is check-in
  if (!hasCheckedIn) {
    const checkInEval = evaluateCheckInTime(currentTime, jamMasukBatas);
    return {
      allowed: true,
      type: 'MASUK',
      status: checkInEval.status,
      message:
        checkInEval.status === 'TEPAT_WAKTU'
          ? 'Absen Masuk Berhasil: Hadir Tepat Waktu.'
          : `Absen Masuk Berhasil: Terlambat ${checkInEval.minutesLate} menit.`,
      minutesLate: checkInEval.minutesLate,
      minutesEarly: 0,
    };
  }

  // If already checked out for today in AUTO mode
  if (hasCheckedOut) {
    return {
      allowed: false,
      type: 'ALREADY_COMPLETED',
      status: 'REJECTED',
      message: 'Siswa telah menyelesaikan seluruh absensi (masuk & pulang) hari ini.',
      minutesLate: 0,
      minutesEarly: 0,
    };
  }

  // Check Sholat Windows in AUTO Mode
  if (sholatAbsenEnabled) {
    const curMin = timeStringToMinutes(currentTime);
    const dzuhurStartMin = timeStringToMinutes(sholatDzuhurMulai);
    const dzuhurEndMin = timeStringToMinutes(sholatDzuhurSelesai);

    if (curMin >= dzuhurStartMin && curMin <= dzuhurEndMin && !hasCheckedDzuhur) {
      return {
        allowed: true,
        type: 'DZUHUR',
        status: 'DZUHUR',
        message: 'Absensi Sholat Dzuhur Berhasil. Selamat menunaikan ibadah sholat berjamaah.',
        minutesLate: 0,
        minutesEarly: 0,
      };
    }

    const asharStartMin = timeStringToMinutes(sholatAsharMulai);
    const asharEndMin = timeStringToMinutes(sholatAsharSelesai);

    if (curMin >= asharStartMin && curMin <= asharEndMin && !hasCheckedAshar && !hasCheckedOut) {
      return {
        allowed: true,
        type: 'ASHAR',
        status: 'ASHAR',
        message: 'Absensi Sholat Ashar Berhasil. Selamat menunaikan ibadah sholat berjamaah.',
        minutesLate: 0,
        minutesEarly: 0,
      };
    }
  }

  // Check Departure / Checkout
  const checkOutEval = evaluateCheckOutTime(currentTime, studentJamPulang);
  if (!checkOutEval.allowed) {
    return {
      allowed: false,
      type: 'REJECTED',
      status: 'REJECTED',
      message: checkOutEval.reason || 'Ditolak: Belum waktunya pulang.',
      minutesLate: 0,
      minutesEarly: checkOutEval.minutesRemaining,
    };
  }

  return {
    allowed: true,
    type: 'PULANG',
    status: 'PULANG',
    message: 'Absen Pulang Berhasil. Selamat istirahat dan berhati-hati di perjalanan.',
    minutesLate: 0,
    minutesEarly: 0,
  };
}

/**
 * Generates official Indonesian WhatsApp message template for parents via Fonnte.
 */
export function formatWhatsAppMessage(params: {
  namaSiswa: string;
  nis: string;
  kelas: string;
  jenisAbsen: 'MASUK' | 'PULANG' | 'DZUHUR' | 'ASHAR';
  status: 'TEPAT_WAKTU' | 'TERLAMBAT' | 'PULANG' | 'DZUHUR' | 'ASHAR';
  waktu: string; // e.g. "06:45:10 WIB"
  tanggal: string; // e.g. "Kamis, 15 Oktober 2026"
  keterangan?: string;
  namaSekolah?: string;
}): string {
  const {
    namaSiswa,
    nis,
    kelas,
    jenisAbsen,
    status,
    waktu,
    tanggal,
    keterangan,
    namaSekolah = 'SMKS PGRI 1 SUKABUMI',
  } = params;

  let statusText = 'HADIR TEPAT WAKTU ✅';
  if (status === 'TERLAMBAT') {
    statusText = 'TERLAMBAT ⚠️';
  } else if (status === 'PULANG') {
    statusText = 'SELESAI KBM & PULANG 🏠';
  } else if (status === 'DZUHUR') {
    statusText = 'MELAKSANAKAN SHOLAT DZUHUR BERJAMAAH 🕌';
  } else if (status === 'ASHAR') {
    statusText = 'MELAKSANAKAN SHOLAT ASHAR BERJAMAAH 🕌';
  }

  const judul =
    jenisAbsen === 'MASUK'
      ? 'ABSENSI MASUK'
      : jenisAbsen === 'PULANG'
      ? 'ABSENSI PULANG'
      : jenisAbsen === 'DZUHUR'
      ? 'ABSENSI SHOLAT DZUHUR'
      : 'ABSENSI SHOLAT ASHAR';

  return `*${namaSekolah}*
*NOTIFIKASI KEHADIRAN SISWA - ${judul}*
━━━━━━━━━━━━━━━━━━━━━
Yth. Bapak/Ibu Orang Tua / Wali Siswa,

Kami informasikan bahwa putra/putri Anda telah tercatat melakukan absensi dengan rincian berikut:

👤 *Nama:* ${namaSiswa}
🆔 *NIS:* ${nis}
🏫 *Kelas:* ${kelas}
📅 *Hari/Tanggal:* ${tanggal}
⏰ *Waktu:* ${waktu}
📋 *Status:* ${statusText}
${keterangan ? `📝 *Keterangan:* ${keterangan}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━
_Pesan ini dikirim secara otomatis oleh Sistem Presensi QR SMKS PGRI 1 Sukabumi._
_Mohon untuk tidak membalas pesan ini._`;
}
