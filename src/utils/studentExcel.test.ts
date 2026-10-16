import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  cleanPhoneNumber,
  cleanTimeString,
  parseStudentRows,
} from './studentExcel.ts';

test('cleanPhoneNumber normalizes various formats to standard Indonesian mobile format', () => {
  assert.equal(cleanPhoneNumber('+6281234567890'), '081234567890');
  assert.equal(cleanPhoneNumber('6281234567890'), '081234567890');
  assert.equal(cleanPhoneNumber('0812-3456-7890'), '081234567890');
  assert.equal(cleanPhoneNumber('81234567890'), '081234567890');
});

test('cleanTimeString normalizes time strings to HH:mm', () => {
  assert.equal(cleanTimeString('15:00'), '15:00');
  assert.equal(cleanTimeString('15.30'), '15:30');
  assert.equal(cleanTimeString('7:00'), '07:00');
});

test('parseStudentRows correctly parses worksheet, catches duplicates and missing values', () => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('DATA_SISWA');

  // Header row
  ws.addRow([
    'NIS',
    'NISN',
    'NAMA LENGKAP',
    'L/P',
    'KELAS',
    'JURUSAN',
    'NO WA ORTU',
    'NAMA ORTU',
    'JAM PULANG',
    'ALAMAT',
  ]);

  // Row 2: Valid student
  ws.addRow([
    '23249001',
    '006819991',
    'Budi Santoso',
    'L',
    'XII TKJ 1',
    'Teknik Komputer & Jaringan',
    '08123456789',
    'Santoso',
    '15:30',
    'Sukabumi',
  ]);

  // Row 3: Duplicate student (NIS already in DB)
  ws.addRow([
    '23241001',
    '006819992',
    'Existing Student',
    'L',
    'XII TKJ 1',
    'Teknik Komputer & Jaringan',
    '08123456788',
    'Ortu',
    '15:30',
    'Sukabumi',
  ]);

  // Row 4: Invalid row (missing name)
  ws.addRow(['23249002', '', '', 'L', 'XII TKJ 1', 'TKJ', '0812', '', '15:30', '']);

  const existingNisSet = new Set(['23241001']);
  const result = parseStudentRows(ws, existingNisSet);

  assert.equal(result.totalRows, 3);
  assert.equal(result.validRows.length, 1);
  assert.equal(result.validRows[0].data.nama, 'Budi Santoso');
  assert.equal(result.validRows[0].data.nis, '23249001');

  assert.equal(result.duplicateRows.length, 1);
  assert.equal(result.duplicateRows[0].data.nis, '23241001');

  assert.equal(result.invalidRows.length, 1);
  assert.match(result.invalidRows[0].error || '', /Nama Lengkap Siswa/);
});
