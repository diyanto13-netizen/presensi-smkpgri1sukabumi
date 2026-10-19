import ExcelJS from 'exceljs';
import { Siswa, Absensi, SchoolConfig } from '../types';
import { formatIndonesianDate } from './storage';

interface ExportParams {
  students: Siswa[];
  attendanceRecords: Absensi[];
  date: string;
  selectedClass: string;
  config: SchoolConfig;
}

export async function exportAttendanceToExcel(params: ExportParams): Promise<void> {
  const { students, attendanceRecords, date, selectedClass, config } = params;

  // Filter students
  const filteredStudents = students.filter(
    s => selectedClass === 'ALL' || s.kelas === selectedClass
  );

  // Calculate statistics
  let tepatWaktu = 0;
  let terlambat = 0;
  let sudahPulang = 0;
  let belumAbsen = 0;

  const dataList = filteredStudents.map((student, index) => {
    const record = attendanceRecords.find(
      r => r.nis === student.nis && r.tanggal === date
    );

    const jamMasuk = record?.jam_masuk || '-';
    const statusMasuk = record?.status_masuk || (record?.jam_masuk ? 'TEPAT_WAKTU' : 'BELUM HADIR');
    const jamDzuhur = record?.status_dzuhur === 'TERLAKSANA' 
      ? (record?.jam_dzuhur ? `Hadir (${record.jam_dzuhur})` : 'Terlaksana')
      : record?.status_dzuhur === 'BERHALANGAN'
      ? 'Berhalangan'
      : '-';
    const jamAshar = record?.status_ashar === 'TERLAKSANA'
      ? (record?.jam_ashar ? `Hadir (${record.jam_ashar})` : 'Terlaksana')
      : record?.status_ashar === 'BERHALANGAN'
      ? 'Berhalangan'
      : '-';
    const jamPulang = record?.jam_pulang || '-';
    const statusAkhir = record?.status_akhir || 'BELUM_ABSEN';
    const notifWa = record?.notifikasi_wa_terkirim ? 'Terkirim (WA)' : '-';
    const keterangan = record?.keterangan || (statusAkhir === 'TERLAMBAT' ? 'Terlambat Masuk' : '-');

    if (!record || !record.jam_masuk) {
      belumAbsen++;
    } else {
      if (record.status_masuk === 'TEPAT_WAKTU') tepatWaktu++;
      if (record.status_masuk === 'TERLAMBAT') terlambat++;
      if (record.status_pulang === 'PULANG') sudahPulang++;
    }

    return {
      no: index + 1,
      nis: student.nis,
      nisn: student.nisn || '-',
      nama: student.nama,
      jk: student.jenis_kelamin,
      kelas: student.kelas,
      jurusan: student.jurusan,
      jamMasuk,
      statusMasuk,
      jamDzuhur,
      jamAshar,
      jamPulang,
      statusAkhir,
      notifWa,
      keterangan,
    };
  });

  const totalSiswa = filteredStudents.length;
  const persentaseHadir = totalSiswa > 0 
    ? Math.round(((tepatWaktu + terlambat) / totalSiswa) * 100) 
    : 0;

  // Create workbook & worksheet
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem Presensi SMKS PGRI 1 Sukabumi';
  workbook.lastModifiedBy = 'Guru Piket / Kesiswaan';
  workbook.created = new Date();
  workbook.modified = new Date();

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
    views: [{ showGridLines: true }],
  });

  // Define Column Widths (15 Columns)
  worksheet.columns = [
    { key: 'colA', width: 6 },  // NO
    { key: 'colB', width: 13 }, // NIS
    { key: 'colC', width: 14 }, // NISN
    { key: 'colD', width: 30 }, // NAMA LENGKAP
    { key: 'colE', width: 6 },  // L/P
    { key: 'colF', width: 13 }, // KELAS
    { key: 'colG', width: 26 }, // JURUSAN
    { key: 'colH', width: 13 }, // JAM MASUK
    { key: 'colI', width: 16 }, // STATUS MASUK
    { key: 'colJ', width: 15 }, // SHOLAT DZUHUR
    { key: 'colK', width: 15 }, // SHOLAT ASHAR
    { key: 'colL', width: 13 }, // JAM PULANG
    { key: 'colM', width: 16 }, // STATUS AKHIR
    { key: 'colN', width: 15 }, // NOTIF WA
    { key: 'colO', width: 22 }, // KETERANGAN
  ];

  // 1. KOP YAYASAN & SEKOLAH
  worksheet.mergeCells('A1:O1');
  const r1 = worksheet.getCell('A1');
  r1.value = 'YAYASAN PEMBINA LEMBAGA PENDIDIKAN DASAR DAN MENENGAH PGRI (YPLP DIKDASMEN PGRI)';
  r1.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A2:O2');
  const r2 = worksheet.getCell('A2');
  r2.value = config.nama_sekolah || 'SMKS PGRI 1 KOTA SUKABUMI';
  r2.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF0B2545' } };
  r2.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A3:O3');
  const r3 = worksheet.getCell('A3');
  r3.value = `NPSN: ${config.npsn} • ${config.akreditasi} • ${config.alamat} • Telp: ${config.telepon}`;
  r3.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF64748B' } };
  r3.alignment = { horizontal: 'center', vertical: 'middle' };

  // Decorative border line under Kop
  worksheet.getRow(4).height = 4;
  for (let c = 1; c <= 15; c++) {
    const cell = worksheet.getRow(4).getCell(c);
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FFD97706' } }, // Amber gold border
    };
  }

  // 2. JUDUL LAPORAN & METADATA
  worksheet.getRow(5).height = 8; // spacer

  worksheet.mergeCells('A6:O6');
  const r6 = worksheet.getCell('A6');
  r6.value = 'LAPORAN REKAPITULASI PRESENSI HARIAN SISWA';
  r6.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF0F172A' } };
  r6.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A7:O7');
  const r7 = worksheet.getCell('A7');
  const classText = selectedClass === 'ALL' ? 'Semua Kelas' : `Kelas ${selectedClass}`;
  r7.value = `Hari / Tanggal: ${formatIndonesianDate(date)}    |    Rombel: ${classText}    |    Batas Jam Masuk: ${config.jam_masuk_batas} WIB`;
  r7.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF334155' } };
  r7.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.getRow(8).height = 8; // spacer

  // 3. TABEL RINGKASAN STATISTIK (Print-ready metrics box)
  const summaryRow = worksheet.getRow(9);
  summaryRow.height = 24;

  const summaryHeaders = [
    { col: 'B', title: 'Total Siswa', val: totalSiswa, fill: 'FFE2E8F0' },
    { col: 'D', title: 'Hadir Tepat Waktu', val: tepatWaktu, fill: 'FFDCFCE7' },
    { col: 'G', title: 'Terlambat', val: terlambat, fill: 'FFFEF3C7' },
    { col: 'J', title: 'Sudah Pulang', val: sudahPulang, fill: 'FFDBEAFE' },
    { col: 'L', title: 'Belum Hadir / Nihil', val: belumAbsen, fill: 'FFFEE2E2' },
    { col: 'N', title: '% Kehadiran', val: `${persentaseHadir}%`, fill: 'FFF1F5F9' },
  ];

  summaryHeaders.forEach(item => {
    const c = summaryRow.getCell(item.col);
    c.value = `${item.title}: ${item.val}`;
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.fill } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  worksheet.getRow(10).height = 10; // spacer

  // 4. HEADER TABEL UTAMA
  const headerRowIndex = 11;
  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.height = 28;

  const tableHeaders = [
    'NO',
    'NIS',
    'NISN',
    'NAMA LENGKAP SISWA',
    'L/P',
    'KELAS',
    'JURUSAN',
    'JAM MASUK',
    'STATUS MASUK',
    'SHOLAT DZUHUR',
    'SHOLAT ASHAR',
    'JAM PULANG',
    'STATUS AKHIR',
    'NOTIFIKASI WA',
    'KETERANGAN',
  ];

  tableHeaders.forEach((title, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = title;
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // Deep Blue header
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  // 5. ISI DATA PRESENSI
  let currentRowIndex = 12;

  dataList.forEach((row, i) => {
    const dataRow = worksheet.getRow(currentRowIndex);
    dataRow.height = 20;

    const isZebra = i % 2 === 1;
    const bgZebra = isZebra ? 'FFF8FAFC' : 'FFFFFFFF';

    // Cell values (15 Columns)
    dataRow.getCell(1).value = row.no;
    dataRow.getCell(2).value = row.nis;
    dataRow.getCell(3).value = row.nisn;
    dataRow.getCell(4).value = row.nama;
    dataRow.getCell(5).value = row.jk;
    dataRow.getCell(6).value = row.kelas;
    dataRow.getCell(7).value = row.jurusan;
    dataRow.getCell(8).value = row.jamMasuk;
    dataRow.getCell(9).value = row.statusMasuk;
    dataRow.getCell(10).value = row.jamDzuhur;
    dataRow.getCell(11).value = row.jamAshar;
    dataRow.getCell(12).value = row.jamPulang;
    dataRow.getCell(13).value = row.statusAkhir;
    dataRow.getCell(14).value = row.notifWa;
    dataRow.getCell(15).value = row.keterangan;

    // Alignments
    dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    dataRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(7).alignment = { horizontal: 'left', vertical: 'middle' };
    dataRow.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(13).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(14).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(15).alignment = { horizontal: 'left', vertical: 'middle' };

    // Set font & basic borders
    for (let c = 1; c <= 15; c++) {
      const cell = dataRow.getCell(c);
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgZebra } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }

    // Bold NIS and Name
    dataRow.getCell(2).font = { name: 'Courier New', size: 9, bold: true };
    dataRow.getCell(4).font = { name: 'Arial', size: 9, bold: true };

    // Conditional styling for status columns
    const statusMasukCell = dataRow.getCell(9);
    if (row.statusMasuk === 'TEPAT_WAKTU') {
      statusMasukCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      statusMasukCell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF166534' } };
    } else if (row.statusMasuk === 'TERLAMBAT') {
      statusMasukCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      statusMasukCell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF92400E' } };
    } else {
      statusMasukCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      statusMasukCell.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF991B1B' } };
    }

    // Styling Sholat Dzuhur & Ashar cells
    const dzuhurCell = dataRow.getCell(10);
    if (String(row.jamDzuhur).startsWith('Hadir') || row.jamDzuhur === 'Terlaksana') {
      dzuhurCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } };
      dzuhurCell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF0F766E' } };
    } else if (row.jamDzuhur === 'Berhalangan') {
      dzuhurCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
      dzuhurCell.font = { name: 'Arial', size: 8.5, color: { argb: 'FF6B21A8' } };
    }

    const asharCell = dataRow.getCell(11);
    if (String(row.jamAshar).startsWith('Hadir') || row.jamAshar === 'Terlaksana') {
      asharCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
      asharCell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF0369A1' } };
    } else if (row.jamAshar === 'Berhalangan') {
      asharCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
      asharCell.font = { name: 'Arial', size: 8.5, color: { argb: 'FF6B21A8' } };
    }

    const statusAkhirCell = dataRow.getCell(13);
    if (row.statusAkhir === 'TEPAT_WAKTU') {
      statusAkhirCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      statusAkhirCell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF166534' } };
    } else if (row.statusAkhir === 'TERLAMBAT') {
      statusAkhirCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      statusAkhirCell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF92400E' } };
    } else if (row.statusAkhir === 'PULANG') {
      statusAkhirCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      statusAkhirCell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF1E40AF' } };
    } else {
      statusAkhirCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      statusAkhirCell.font = { name: 'Arial', size: 8.5, color: { argb: 'FF64748B' } };
    }

    currentRowIndex++;
  });

  // Table bottom border (15 Columns)
  for (let c = 1; c <= 15; c++) {
    const cell = worksheet.getRow(currentRowIndex - 1).getCell(c);
    cell.border = {
      ...cell.border,
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
    };
  }

  // 6. TANDA TANGAN FORMAL / SIGN-OFF BLOCK
  currentRowIndex += 2; // spacer

  const signDateRow = worksheet.getRow(currentRowIndex);
  signDateRow.getCell(12).value = `Sukabumi, ${formatIndonesianDate(date)}`;
  signDateRow.getCell(12).font = { name: 'Arial', size: 9.5, italic: true };
  signDateRow.getCell(12).alignment = { horizontal: 'center' };

  currentRowIndex++;
  const signRoleRow = worksheet.getRow(currentRowIndex);
  signRoleRow.getCell(2).value = 'Mengetahui,';
  signRoleRow.getCell(2).font = { name: 'Arial', size: 9.5, bold: true };
  signRoleRow.getCell(2).alignment = { horizontal: 'center' };

  signRoleRow.getCell(12).value = 'Petugas Piket / Kesiswaan,';
  signRoleRow.getCell(12).font = { name: 'Arial', size: 9.5, bold: true };
  signRoleRow.getCell(12).alignment = { horizontal: 'center' };

  currentRowIndex++;
  const signOfficeRow = worksheet.getRow(currentRowIndex);
  signOfficeRow.getCell(2).value = 'Kepala SMKS PGRI 1 Kota Sukabumi';
  signOfficeRow.getCell(2).font = { name: 'Arial', size: 9.5, bold: true };
  signOfficeRow.getCell(2).alignment = { horizontal: 'center' };

  signOfficeRow.getCell(12).value = 'SMKS PGRI 1 Kota Sukabumi';
  signOfficeRow.getCell(12).font = { name: 'Arial', size: 9.5, bold: true };
  signOfficeRow.getCell(12).alignment = { horizontal: 'center' };

  // Space for physical signature / stempel
  currentRowIndex += 4;

  const signNameRow = worksheet.getRow(currentRowIndex);
  signNameRow.getCell(2).value = config.kepala_sekolah || 'Drs. H. Mulyadi, M.M.Pd.';
  signNameRow.getCell(2).font = { name: 'Arial', size: 10, bold: true, underline: true };
  signNameRow.getCell(2).alignment = { horizontal: 'center' };

  signNameRow.getCell(12).value = '( .................................................... )';
  signNameRow.getCell(12).font = { name: 'Arial', size: 10, bold: true };
  signNameRow.getCell(12).alignment = { horizontal: 'center' };

  currentRowIndex++;
  const signNipRow = worksheet.getRow(currentRowIndex);
  signNipRow.getCell(2).value = `NIP. ${config.nip_kepsek || '19680512 199303 1 004'}`;
  signNipRow.getCell(2).font = { name: 'Arial', size: 8.5 };
  signNipRow.getCell(2).alignment = { horizontal: 'center' };

  signNipRow.getCell(12).value = 'NIP / NUPTK. -';
  signNipRow.getCell(12).font = { name: 'Arial', size: 8.5 };
  signNipRow.getCell(12).alignment = { horizontal: 'center' };

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const cleanClass = selectedClass === 'ALL' ? 'Semua_Kelas' : selectedClass.replace(/\s+/g, '_');
  const filename = `Rekap_Presensi_SMKS_PGRI_1_Sukabumi_${date}_${cleanClass}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
