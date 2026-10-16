import test from 'node:test';
import assert from 'node:assert/strict';
import {
  timeStringToMinutes,
  evaluateCheckInTime,
  evaluateCheckOutTime,
  processAttendanceRules,
  formatWhatsAppMessage,
} from './attendanceRules.ts';

test('timeStringToMinutes converts string properly', () => {
  assert.equal(timeStringToMinutes('07:00'), 420);
  assert.equal(timeStringToMinutes('07:15'), 435);
  assert.equal(timeStringToMinutes('15:30'), 930);
  assert.equal(timeStringToMinutes('00:00'), 0);
});

test('evaluateCheckInTime marks on-time when <= 07:00', () => {
  const resultEarly = evaluateCheckInTime('06:45', '07:00');
  assert.equal(resultEarly.status, 'TEPAT_WAKTU');
  assert.equal(resultEarly.minutesLate, 0);

  const resultExact = evaluateCheckInTime('07:00', '07:00');
  assert.equal(resultExact.status, 'TEPAT_WAKTU');
  assert.equal(resultExact.minutesLate, 0);
});

test('evaluateCheckInTime marks late when > 07:00', () => {
  const resultLate = evaluateCheckInTime('07:01', '07:00');
  assert.equal(resultLate.status, 'TERLAMBAT');
  assert.equal(resultLate.minutesLate, 1);

  const resultLate20 = evaluateCheckInTime('07:20', '07:00');
  assert.equal(resultLate20.status, 'TERLAMBAT');
  assert.equal(resultLate20.minutesLate, 20);
});

test('evaluateCheckOutTime rejects checkout before student target time', () => {
  const result = evaluateCheckOutTime('14:40', '15:00');
  assert.equal(result.allowed, false);
  assert.equal(result.minutesRemaining, 20);
  assert.match(result.reason || '', /Belum waktunya pulang/);
});

test('evaluateCheckOutTime allows checkout at or after student target time', () => {
  const exact = evaluateCheckOutTime('15:00', '15:00');
  assert.equal(exact.allowed, true);
  assert.equal(exact.minutesRemaining, 0);

  const after = evaluateCheckOutTime('15:15', '15:00');
  assert.equal(after.allowed, true);
  assert.equal(after.minutesRemaining, 0);
});

test('processAttendanceRules handles first scan in morning as check-in', () => {
  const scanOnTime = processAttendanceRules({
    currentTime: '06:50',
    studentJamPulang: '15:00',
    hasCheckedIn: false,
    hasCheckedOut: false,
  });
  assert.equal(scanOnTime.allowed, true);
  assert.equal(scanOnTime.type, 'MASUK');
  assert.equal(scanOnTime.status, 'TEPAT_WAKTU');

  const scanLate = processAttendanceRules({
    currentTime: '07:10',
    studentJamPulang: '15:00',
    hasCheckedIn: false,
    hasCheckedOut: false,
  });
  assert.equal(scanLate.allowed, true);
  assert.equal(scanLate.type, 'MASUK');
  assert.equal(scanLate.status, 'TERLAMBAT');
  assert.equal(scanLate.minutesLate, 10);
});

test('processAttendanceRules rejects checkout before time and allows when time arrived', () => {
  const earlyAttempt = processAttendanceRules({
    currentTime: '12:30',
    studentJamPulang: '15:00',
    hasCheckedIn: true,
    hasCheckedOut: false,
  });
  assert.equal(earlyAttempt.allowed, false);
  assert.equal(earlyAttempt.type, 'REJECTED');
  assert.equal(earlyAttempt.minutesEarly, 150);

  const validCheckout = processAttendanceRules({
    currentTime: '15:05',
    studentJamPulang: '15:00',
    hasCheckedIn: true,
    hasCheckedOut: false,
  });
  assert.equal(validCheckout.allowed, true);
  assert.equal(validCheckout.type, 'PULANG');
  assert.equal(validCheckout.status, 'PULANG');
});

test('processAttendanceRules prevents double checkout', () => {
  const alreadyDone = processAttendanceRules({
    currentTime: '15:30',
    studentJamPulang: '15:00',
    hasCheckedIn: true,
    hasCheckedOut: true,
  });
  assert.equal(alreadyDone.allowed, false);
  assert.equal(alreadyDone.type, 'ALREADY_COMPLETED');
});

test('formatWhatsAppMessage formats message with student details and school name', () => {
  const msg = formatWhatsAppMessage({
    namaSiswa: 'Ahmad Fauzi',
    nis: '23241001',
    kelas: 'XI RPL 1',
    jenisAbsen: 'MASUK',
    status: 'TEPAT_WAKTU',
    waktu: '06:45:00 WIB',
    tanggal: 'Kamis, 15 Oktober 2026',
  });
  assert.match(msg, /SMKS PGRI 1 SUKABUMI/);
  assert.match(msg, /Ahmad Fauzi/);
  assert.match(msg, /23241001/);
  assert.match(msg, /HADIR TEPAT WAKTU/);
});
