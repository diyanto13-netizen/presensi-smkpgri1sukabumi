import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';

test('ExcelJS generates proper workbook with A4 Landscape page setup', async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Rekap Presensi Harian', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3,
      },
    },
  });

  // Verify Kop Header row
  worksheet.mergeCells('A1:M1');
  const r1 = worksheet.getCell('A1');
  r1.value = 'YAYASAN PEMBINA LEMBAGA PENDIDIKAN DASAR DAN MENENGAH PGRI';
  assert.equal(r1.value, 'YAYASAN PEMBINA LEMBAGA PENDIDIKAN DASAR DAN MENENGAH PGRI');

  worksheet.mergeCells('A2:M2');
  const r2 = worksheet.getCell('A2');
  r2.value = 'SMKS PGRI 1 KOTA SUKABUMI';
  assert.equal(r2.value, 'SMKS PGRI 1 KOTA SUKABUMI');

  // Verify pageSetup
  assert.equal(worksheet.pageSetup?.paperSize, 9);
  assert.equal(worksheet.pageSetup?.orientation, 'landscape');
  assert.equal(worksheet.pageSetup?.fitToPage, true);

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  assert.ok(buffer.byteLength > 1000, 'Excel buffer should be non-empty and valid');
});
