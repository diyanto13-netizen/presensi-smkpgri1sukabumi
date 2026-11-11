import ExcelJS from 'exceljs';
import { Siswa, Absensi, SchoolConfig, PelanggaranSiswa } from '../types';
import { formatIndonesianDate, getTodayDateString } from './storage';
import { getStatusPembinaan } from './violationRules';
import { MASTER_KELAS_LIST } from './classConfig';

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

  // Define Column Widths (14 Columns)
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
    { key: 'colJ', width: 16 }, // SHOLAT DZUHUR
    { key: 'colK', width: 13 }, // JAM PULANG
    { key: 'colL', width: 16 }, // STATUS AKHIR
    { key: 'colM', width: 15 }, // NOTIF WA
    { key: 'colN', width: 22 }, // KETERANGAN
  ];

  // 1. KOP YAYASAN & SEKOLAH
  worksheet.mergeCells('A1:N1');
  const r1 = worksheet.getCell('A1');
  r1.value = 'YAYASAN PEMBINA LEMBAGA PENDIDIKAN DASAR DAN MENENGAH PGRI (YPLP DIKDASMEN PGRI)';
  r1.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A2:N2');
  const r2 = worksheet.getCell('A2');
  r2.value = config.nama_sekolah || 'SMKS PGRI 1 KOTA SUKABUMI';
  r2.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF0B2545' } };
  r2.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A3:N3');
  const r3 = worksheet.getCell('A3');
  r3.value = `NPSN: ${config.npsn} • ${config.akreditasi} • ${config.alamat} • Telp: ${config.telepon}`;
  r3.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF64748B' } };
  r3.alignment = { horizontal: 'center', vertical: 'middle' };

  // Decorative border line under Kop
  worksheet.getRow(4).height = 4;
  for (let c = 1; c <= 14; c++) {
    const cell = worksheet.getRow(4).getCell(c);
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FFD97706' } }, // Amber gold border
    };
  }

  // 2. JUDUL LAPORAN & METADATA
  worksheet.getRow(5).height = 8; // spacer

  worksheet.mergeCells('A6:N6');
  const r6 = worksheet.getCell('A6');
  r6.value = 'LAPORAN REKAPITULASI PRESENSI HARIAN SISWA';
  r6.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF0F172A' } };
  r6.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A7:N7');
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
    { col: 'I', title: 'Sudah Pulang', val: sudahPulang, fill: 'FFDBEAFE' },
    { col: 'K', title: 'Belum Hadir / Nihil', val: belumAbsen, fill: 'FFFEE2E2' },
    { col: 'M', title: '% Kehadiran', val: `${persentaseHadir}%`, fill: 'FFF1F5F9' },
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

    // Cell values (14 Columns)
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
    dataRow.getCell(11).value = row.jamPulang;
    dataRow.getCell(12).value = row.statusAkhir;
    dataRow.getCell(13).value = row.notifWa;
    dataRow.getCell(14).value = row.keterangan;

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
    dataRow.getCell(14).alignment = { horizontal: 'left', vertical: 'middle' };

    // Set font & basic borders
    for (let c = 1; c <= 14; c++) {
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

    // Styling Sholat Dzuhur cell
    const dzuhurCell = dataRow.getCell(10);
    if (String(row.jamDzuhur).startsWith('Hadir') || row.jamDzuhur === 'Terlaksana') {
      dzuhurCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } };
      dzuhurCell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF0F766E' } };
    } else if (row.jamDzuhur === 'Berhalangan') {
      dzuhurCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
      dzuhurCell.font = { name: 'Arial', size: 8.5, color: { argb: 'FF6B21A8' } };
    }

    const statusAkhirCell = dataRow.getCell(12);
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

  // Table bottom border (14 Columns)
  for (let c = 1; c <= 14; c++) {
    const cell = worksheet.getRow(currentRowIndex - 1).getCell(c);
    cell.border = {
      ...cell.border,
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
    };
  }

  // 6. TANDA TANGAN FORMAL / SIGN-OFF BLOCK
  currentRowIndex += 2; // spacer

  const signDateRow = worksheet.getRow(currentRowIndex);
  signDateRow.getCell(11).value = `Sukabumi, ${formatIndonesianDate(date)}`;
  signDateRow.getCell(11).font = { name: 'Arial', size: 9.5, italic: true };
  signDateRow.getCell(11).alignment = { horizontal: 'center' };

  currentRowIndex++;
  const signRoleRow = worksheet.getRow(currentRowIndex);
  signRoleRow.getCell(2).value = 'Mengetahui,';
  signRoleRow.getCell(2).font = { name: 'Arial', size: 9.5, bold: true };
  signRoleRow.getCell(2).alignment = { horizontal: 'center' };

  signRoleRow.getCell(11).value = 'Petugas Piket / Kesiswaan,';
  signRoleRow.getCell(11).font = { name: 'Arial', size: 9.5, bold: true };
  signRoleRow.getCell(11).alignment = { horizontal: 'center' };

  currentRowIndex++;
  const signOfficeRow = worksheet.getRow(currentRowIndex);
  signOfficeRow.getCell(2).value = 'Kepala SMKS PGRI 1 Kota Sukabumi';
  signOfficeRow.getCell(2).font = { name: 'Arial', size: 9.5, bold: true };
  signOfficeRow.getCell(2).alignment = { horizontal: 'center' };

  signOfficeRow.getCell(11).value = 'SMKS PGRI 1 Kota Sukabumi';
  signOfficeRow.getCell(11).font = { name: 'Arial', size: 9.5, bold: true };
  signOfficeRow.getCell(11).alignment = { horizontal: 'center' };

  // Space for physical signature / stempel
  currentRowIndex += 4;

  const signNameRow = worksheet.getRow(currentRowIndex);
  signNameRow.getCell(2).value = config.kepala_sekolah || 'Drs. H. Mulyadi, M.M.Pd.';
  signNameRow.getCell(2).font = { name: 'Arial', size: 10, bold: true, underline: true };
  signNameRow.getCell(2).alignment = { horizontal: 'center' };

  signNameRow.getCell(11).value = '( .................................................... )';
  signNameRow.getCell(11).font = { name: 'Arial', size: 10, bold: true };
  signNameRow.getCell(11).alignment = { horizontal: 'center' };

  currentRowIndex++;
  const signNipRow = worksheet.getRow(currentRowIndex);
  signNipRow.getCell(2).value = `NIP. ${config.nip_kepsek || '19680512 199303 1 004'}`;
  signNipRow.getCell(2).font = { name: 'Arial', size: 8.5 };
  signNipRow.getCell(2).alignment = { horizontal: 'center' };

  signNipRow.getCell(11).value = 'NIP / NUPTK. -';
  signNipRow.getCell(11).font = { name: 'Arial', size: 8.5 };
  signNipRow.getCell(11).alignment = { horizontal: 'center' };

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

export interface ExportSholatParams {
  students: Siswa[];
  attendanceRecords: Absensi[];
  date: string;
  selectedClass: string;
  config: SchoolConfig;
}

/**
 * Laporan Khusus Rekapitulasi Presensi Sholat Dzuhur Berjamaah
 * Diformat khusus siap cetak A4 Landscape lengkap dengan Kop PGRI, ringkasan statistik ibadah,
 * tabel bergaris rapi, pewarnaan status syar'i (Terlaksana/Berhalangan), dan lembar tanda tangan.
 */
export async function exportSholatAttendanceToExcel(params: ExportSholatParams): Promise<void> {
  const { students, attendanceRecords, date, selectedClass, config } = params;

  // Filter siswa berdasarkan rombel / kelas
  const filteredStudents = students.filter(
    s => selectedClass === 'ALL' || s.kelas === selectedClass
  );

  let dzuhurTerlaksana = 0;
  let dzuhurBerhalangan = 0;
  let dzuhurBelum = 0;

  const dataList = filteredStudents.map((student, index) => {
    const record = attendanceRecords.find(
      r => r.nis === student.nis && r.tanggal === date
    );

    const jamMasuk = record?.jam_masuk || '-';

    // Status Shalat Dzuhur
    let statusDzuhurText = 'Belum Presensi';
    let jamDzuhur = record?.jam_dzuhur || '-';
    if (record?.status_dzuhur === 'TERLAKSANA') {
      statusDzuhurText = 'TERLAKSANA';
      dzuhurTerlaksana++;
    } else if (record?.status_dzuhur === 'BERHALANGAN') {
      statusDzuhurText = "BERHALANGAN (Udzur Syar'i)";
      jamDzuhur = '-';
      dzuhurBerhalangan++;
    } else {
      dzuhurBelum++;
    }

    // Evaluasi / Keterangan Pembinaan
    let keterangan = '-';
    if (record?.status_dzuhur === 'TERLAKSANA') {
      keterangan = 'Tertib Sholat Dzuhur Berjamaah';
    } else if (record?.status_dzuhur === 'BERHALANGAN') {
      keterangan = "Udzur Syar'i / Izin";
    } else if (!record?.jam_masuk) {
      keterangan = 'Tidak Hadir Sekolah (Nihil)';
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
      jamDzuhur,
      statusDzuhur: statusDzuhurText,
      rawDzuhurStatus: record?.status_dzuhur || null,
      keterangan,
    };
  });

  const totalSiswa = filteredStudents.length;
  const persentaseDzuhur = totalSiswa > 0 ? Math.round((dzuhurTerlaksana / totalSiswa) * 100) : 0;

  // Inisialisasi Workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem Presensi SMKS PGRI 1 Sukabumi - Divisi Kerohanian';
  workbook.lastModifiedBy = 'Pembina Rohis / Guru PAI';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Rekap Sholat Dzuhur', {
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

  // Lebar Kolom (11 Kolom)
  worksheet.columns = [
    { key: 'colA', width: 6 },  // NO
    { key: 'colB', width: 13 }, // NIS
    { key: 'colC', width: 14 }, // NISN
    { key: 'colD', width: 32 }, // NAMA SISWA
    { key: 'colE', width: 6 },  // L/P
    { key: 'colF', width: 12 }, // KELAS
    { key: 'colG', width: 26 }, // JURUSAN
    { key: 'colH', width: 13 }, // JAM MASUK
    { key: 'colI', width: 14 }, // JAM DZUHUR
    { key: 'colJ', width: 24 }, // STATUS DZUHUR
    { key: 'colK', width: 30 }, // EVALUASI ROHIS
  ];

  // 1. KOP SURAT RESMI
  worksheet.mergeCells('A1:K1');
  const r1 = worksheet.getCell('A1');
  r1.value = 'YAYASAN PEMBINA LEMBAGA PENDIDIKAN DASAR DAN MENENGAH PGRI (YPLP DIKDASMEN PGRI)';
  r1.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A2:K2');
  const r2 = worksheet.getCell('A2');
  r2.value = config.nama_sekolah || 'SMKS PGRI 1 KOTA SUKABUMI';
  r2.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF064E3B' } }; // Islamic Deep Green
  r2.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A3:K3');
  const r3 = worksheet.getCell('A3');
  r3.value = `NPSN: ${config.npsn} • ${config.akreditasi} • Divisi Pembinaan Karakter & Kerohanian Islam (Rohis) • ${config.alamat}`;
  r3.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF047857' } };
  r3.alignment = { horizontal: 'center', vertical: 'middle' };

  // Garis Emas Hijau Pembatas Kop
  worksheet.getRow(4).height = 4;
  for (let c = 1; c <= 11; c++) {
    const cell = worksheet.getRow(4).getCell(c);
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FFD97706' } }, // Gold line
    };
  }

  worksheet.getRow(5).height = 8; // spacer

  // 2. JUDUL LAPORAN
  worksheet.mergeCells('A6:K6');
  const r6 = worksheet.getCell('A6');
  r6.value = 'LAPORAN REKAPITULASI PRESENSI SHOLAT DZUHUR BERJAMAAH';
  r6.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF065F46' } };
  r6.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A7:K7');
  const r7 = worksheet.getCell('A7');
  const classText = selectedClass === 'ALL' ? 'Semua Rombel (Kelas)' : `Rombel: Kelas ${selectedClass}`;
  const dzuhurJadwal = `${config.sholat_dzuhur_mulai || '11:45'} - ${config.sholat_dzuhur_selesai || '13:00'} WIB`;
  r7.value = `Hari / Tanggal: ${formatIndonesianDate(date)}   |   ${classText}   |   Sesi Sholat Dzuhur: ${dzuhurJadwal}`;
  r7.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF334155' } };
  r7.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.getRow(8).height = 8; // spacer

  // 3. STATISTIK KEPATUHAN IBADAH (Print-Ready Summary Box)
  const summaryRow = worksheet.getRow(9);
  summaryRow.height = 24;

  const sholatSummaryHeaders = [
    { col: 'B', title: 'Total Siswa', val: totalSiswa, fill: 'FFE2E8F0' },
    { col: 'D', title: 'Dzuhur Terlaksana', val: `${dzuhurTerlaksana} (${persentaseDzuhur}%)`, fill: 'FFCCFBF1' },
    { col: 'G', title: "Berhalangan / Udzur", val: dzuhurBerhalangan, fill: 'FFF3E8FF' },
    { col: 'J', title: 'Belum Presensi', val: dzuhurBelum, fill: 'FFFEE2E2' },
  ];

  sholatSummaryHeaders.forEach(item => {
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

  // 4. HEADER TABEL SHOLAT
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
    'JAM DZUHUR',
    'STATUS SHALAT DZUHUR',
    'CATATAN PEMBINAAN ROHIS',
  ];

  tableHeaders.forEach((title, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = title;
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF065F46' }, // Islamic Emerald Green
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF064E3B' } },
      left: { style: 'thin', color: { argb: 'FF6EE7B7' } },
      bottom: { style: 'medium', color: { argb: 'FF064E3B' } },
      right: { style: 'thin', color: { argb: 'FF6EE7B7' } },
    };
  });

  // 5. ISI DATA PRESENSI SHOLAT
  let currentRowIndex = 12;

  dataList.forEach((row, i) => {
    const dataRow = worksheet.getRow(currentRowIndex);
    dataRow.height = 20;

    const isZebra = i % 2 === 1;
    const bgZebra = isZebra ? 'FFF0FDF4' : 'FFFFFFFF'; // Subtle green tint zebra

    dataRow.getCell(1).value = row.no;
    dataRow.getCell(2).value = row.nis;
    dataRow.getCell(3).value = row.nisn;
    dataRow.getCell(4).value = row.nama;
    dataRow.getCell(5).value = row.jk;
    dataRow.getCell(6).value = row.kelas;
    dataRow.getCell(7).value = row.jurusan;
    dataRow.getCell(8).value = row.jamMasuk;
    dataRow.getCell(9).value = row.jamDzuhur;
    dataRow.getCell(10).value = row.statusDzuhur;
    dataRow.getCell(11).value = row.keterangan;

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
    dataRow.getCell(11).alignment = { horizontal: 'left', vertical: 'middle' };

    // Basic styling
    for (let c = 1; c <= 11; c++) {
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

    dataRow.getCell(2).font = { name: 'Courier New', size: 9, bold: true };
    dataRow.getCell(4).font = { name: 'Arial', size: 9, bold: true };

    // Format Shalat Dzuhur Cell
    const cellDzuhur = dataRow.getCell(10);
    if (row.rawDzuhurStatus === 'TERLAKSANA') {
      cellDzuhur.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } };
      cellDzuhur.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF0F766E' } };
    } else if (row.rawDzuhurStatus === 'BERHALANGAN') {
      cellDzuhur.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
      cellDzuhur.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF7E22CE' } };
    } else {
      cellDzuhur.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cellDzuhur.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF64748B' } };
    }

    currentRowIndex++;
  });

  // Bottom Border
  for (let c = 1; c <= 11; c++) {
    const cell = worksheet.getRow(currentRowIndex - 1).getCell(c);
    cell.border = {
      ...cell.border,
      bottom: { style: 'medium', color: { argb: 'FF065F46' } },
    };
  }

  // 6. LEMBAR TANDA TANGAN RESMI
  currentRowIndex += 2; // spacer

  const signDateRow = worksheet.getRow(currentRowIndex);
  signDateRow.getCell(9).value = `Sukabumi, ${formatIndonesianDate(date)}`;
  signDateRow.getCell(9).font = { name: 'Arial', size: 9.5, italic: true };
  signDateRow.getCell(9).alignment = { horizontal: 'center' };

  currentRowIndex++;
  const signRoleRow = worksheet.getRow(currentRowIndex);
  signRoleRow.getCell(2).value = 'Mengetahui,';
  signRoleRow.getCell(2).font = { name: 'Arial', size: 9.5, bold: true };
  signRoleRow.getCell(2).alignment = { horizontal: 'center' };

  signRoleRow.getCell(9).value = 'Pembina Rohis / Guru PAI,';
  signRoleRow.getCell(9).font = { name: 'Arial', size: 9.5, bold: true };
  signRoleRow.getCell(9).alignment = { horizontal: 'center' };

  currentRowIndex++;
  const signOfficeRow = worksheet.getRow(currentRowIndex);
  signOfficeRow.getCell(2).value = 'Kepala SMKS PGRI 1 Kota Sukabumi';
  signOfficeRow.getCell(2).font = { name: 'Arial', size: 9.5, bold: true };
  signOfficeRow.getCell(2).alignment = { horizontal: 'center' };

  signOfficeRow.getCell(9).value = 'SMKS PGRI 1 Kota Sukabumi';
  signOfficeRow.getCell(9).font = { name: 'Arial', size: 9.5, bold: true };
  signOfficeRow.getCell(9).alignment = { horizontal: 'center' };

  // Ruang tanda tangan / stempel
  currentRowIndex += 4;

  const signNameRow = worksheet.getRow(currentRowIndex);
  signNameRow.getCell(2).value = config.kepala_sekolah || 'Drs. H. Mulyadi, M.M.Pd.';
  signNameRow.getCell(2).font = { name: 'Arial', size: 10, bold: true, underline: true };
  signNameRow.getCell(2).alignment = { horizontal: 'center' };

  signNameRow.getCell(9).value = '( .................................................... )';
  signNameRow.getCell(9).font = { name: 'Arial', size: 10, bold: true };
  signNameRow.getCell(9).alignment = { horizontal: 'center' };

  currentRowIndex++;
  const signNipRow = worksheet.getRow(currentRowIndex);
  signNipRow.getCell(2).value = `NIP. ${config.nip_kepsek || '19680512 199303 1 004'}`;
  signNipRow.getCell(2).font = { name: 'Arial', size: 8.5 };
  signNipRow.getCell(2).alignment = { horizontal: 'center' };

  signNipRow.getCell(9).value = 'NIP / NUPTK. -';
  signNipRow.getCell(9).font = { name: 'Arial', size: 8.5 };
  signNipRow.getCell(9).alignment = { horizontal: 'center' };

  // Write buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const cleanClass = selectedClass === 'ALL' ? 'Semua_Kelas' : selectedClass.replace(/\s+/g, '_');
  const filename = `Rekap_Presensi_Sholat_Dzuhur_SMKS_PGRI_1_Sukabumi_${date}_${cleanClass}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

interface ExportViolationParams {
  students: Siswa[];
  violations: PelanggaranSiswa[];
  selectedClass: string;
  config: SchoolConfig;
}

export async function exportViolationReportToExcel(params: ExportViolationParams): Promise<void> {
  const { students, violations, selectedClass, config } = params;
  const todayStr = getTodayDateString();

  const filteredStudents = students.filter(
    s => selectedClass === 'ALL' || s.kelas === selectedClass
  );
  const filteredViolations = violations.filter(
    v => selectedClass === 'ALL' || v.kelas === selectedClass
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = config.nama_sekolah || 'SMKS PGRI 1 Kota Sukabumi';
  workbook.created = new Date();

  // ================= SHEET 1: REKAP POIN PER SISWA =================
  const wsSiswa = workbook.addWorksheet('Rekap Poin Per Siswa', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  wsSiswa.columns = [
    { key: 'no', width: 6 },
    { key: 'nis', width: 14 },
    { key: 'nama', width: 28 },
    { key: 'jk', width: 6 },
    { key: 'kelas', width: 14 },
    { key: 'jurusan', width: 26 },
    { key: 'ringan', width: 12 },
    { key: 'sedang', width: 12 },
    { key: 'berat', width: 12 },
    { key: 'totalPoin', width: 14 },
    { key: 'statusPembinaan', width: 28 },
    { key: 'tindakan', width: 36 },
  ];

  wsSiswa.mergeCells('A1:L1');
  wsSiswa.getCell('A1').value = (config.nama_sekolah || 'SMKS PGRI 1 KOTA SUKABUMI').toUpperCase();
  wsSiswa.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  wsSiswa.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  wsSiswa.mergeCells('A2:L2');
  wsSiswa.getCell('A2').value = `LAPORAN REKAPITULASI POIN PELANGGARAN PER SISWA (${selectedClass === 'ALL' ? 'SEMUA KELAS' : 'KELAS ' + selectedClass})`;
  wsSiswa.getCell('A2').font = { name: 'Arial', size: 11, bold: true };
  wsSiswa.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  wsSiswa.mergeCells('A3:L3');
  wsSiswa.getCell('A3').value = `Dicetak Tanggal: ${formatIndonesianDate(todayStr)} • NPSN: ${config.npsn}`;
  wsSiswa.getCell('A3').font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF475569' } };
  wsSiswa.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

  const headerRow1 = wsSiswa.getRow(5);
  headerRow1.height = 26;
  const headersSiswa = [
    'NO',
    'NIS',
    'NAMA LENGKAP SISWA',
    'L/P',
    'KELAS',
    'JURUSAN',
    'RINGAN (x)',
    'SEDANG (x)',
    'BERAT (x)',
    'TOTAL POIN',
    'STATUS PEMBINAAN',
    'TINDAK LANJUT SEKOLAH',
  ];

  headersSiswa.forEach((h, i) => {
    const cell = headerRow1.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  let rowIdx = 6;
  filteredStudents.forEach((s, idx) => {
    const sViolations = violations.filter(v => v.nis === s.nis);
    const ringanCount = sViolations.filter(v => v.kategori === 'RINGAN').length;
    const sedangCount = sViolations.filter(v => v.kategori === 'SEDANG').length;
    const beratCount = sViolations.filter(v => v.kategori === 'BERAT').length;
    const totalPoin = sViolations.reduce((acc, v) => acc + (Number(v.poin) || 0), 0);
    const hasKhusus = sViolations.some(v => v.penanganan_khusus);
    const pembinaan = getStatusPembinaan(totalPoin, hasKhusus);

    const row = wsSiswa.getRow(rowIdx++);
    row.height = 20;
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = s.nis;
    row.getCell(3).value = s.nama;
    row.getCell(4).value = s.jenis_kelamin;
    row.getCell(5).value = s.kelas;
    row.getCell(6).value = s.jurusan;
    row.getCell(7).value = ringanCount;
    row.getCell(8).value = sedangCount;
    row.getCell(9).value = beratCount;
    row.getCell(10).value = totalPoin;
    row.getCell(11).value = pembinaan.label;
    row.getCell(12).value = pembinaan.tindakan;

    for (let c = 1; c <= 12; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if ([1, 2, 4, 5, 7, 8, 9, 10].includes(c)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    }
    row.getCell(3).font = { name: 'Arial', size: 9, bold: true };
    row.getCell(10).font = {
      name: 'Arial',
      size: 9.5,
      bold: true,
      color: { argb: totalPoin >= 50 ? 'FFDC2626' : totalPoin > 0 ? 'FFD97706' : 'FF15803D' },
    };
  });

  // ================= SHEET 2: REKAP POIN PER KELAS =================
  const wsKelas = workbook.addWorksheet('Rekap Poin Per Kelas', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  wsKelas.columns = [
    { key: 'no', width: 6 },
    { key: 'kelas', width: 16 },
    { key: 'jurusan', width: 30 },
    { key: 'jmlSiswa', width: 14 },
    { key: 'siswaMelanggar', width: 16 },
    { key: 'terlambat', width: 16 },
    { key: 'tidakDzuhur', width: 18 },
    { key: 'manualLain', width: 16 },
    { key: 'totalKasus', width: 15 },
    { key: 'totalPoin', width: 16 },
  ];

  wsKelas.mergeCells('A1:J1');
  wsKelas.getCell('A1').value = `REKAPITULASI POIN PELANGGARAN PER KELAS - ${config.nama_sekolah}`;
  wsKelas.getCell('A1').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  wsKelas.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  const headerRow2 = wsKelas.getRow(3);
  headerRow2.height = 26;
  const headersKelas = [
    'NO',
    'KELAS',
    'PROGRAM KEAHLIAN / JURUSAN',
    'TOTAL SISWA',
    'SISWA MELANGGAR',
    'TERLAMBAT (R-01)',
    'TIDAK DZUHUR (R-18)',
    'PELANGGARAN LAIN',
    'TOTAL KASUS',
    'TOTAL POIN KELAS',
  ];

  headersKelas.forEach((h, i) => {
    const cell = headerRow2.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  let kRowIdx = 4;
  MASTER_KELAS_LIST.forEach((k, idx) => {
    const classStudents = students.filter(s => s.kelas === k.kelas);
    const classViolations = violations.filter(v => v.kelas === k.kelas);
    const uniqueNisSet = new Set(classViolations.map(v => v.nis));
    const lateCount = classViolations.filter(v => v.kode_pelanggaran === 'R-01').length;
    const dzuhurCount = classViolations.filter(v => v.kode_pelanggaran === 'R-18').length;
    const otherCount = classViolations.length - lateCount - dzuhurCount;
    const totalClassPoints = classViolations.reduce((acc, v) => acc + (Number(v.poin) || 0), 0);

    const row = wsKelas.getRow(kRowIdx++);
    row.height = 20;
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = k.kelas;
    row.getCell(3).value = k.namaJurusan;
    row.getCell(4).value = classStudents.length;
    row.getCell(5).value = uniqueNisSet.size;
    row.getCell(6).value = lateCount;
    row.getCell(7).value = dzuhurCount;
    row.getCell(8).value = otherCount;
    row.getCell(9).value = classViolations.length;
    row.getCell(10).value = totalClassPoints;

    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = { horizontal: c === 3 ? 'left' : 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }
    row.getCell(2).font = { name: 'Arial', size: 9, bold: true };
    row.getCell(10).font = { name: 'Arial', size: 9.5, bold: true };
  });

  // ================= SHEET 3: LOG RIWAYAT PELANGGARAN =================
  const wsLog = workbook.addWorksheet('Log Riwayat Pelanggaran', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  wsLog.columns = [
    { key: 'no', width: 6 },
    { key: 'tanggal', width: 14 },
    { key: 'waktu', width: 11 },
    { key: 'nis', width: 14 },
    { key: 'nama', width: 26 },
    { key: 'kelas', width: 14 },
    { key: 'kode', width: 10 },
    { key: 'kategori', width: 12 },
    { key: 'jenis', width: 38 },
    { key: 'poin', width: 10 },
    { key: 'sumber', width: 20 },
    { key: 'keterangan', width: 38 },
  ];

  const headerRow3 = wsLog.getRow(1);
  headerRow3.height = 26;
  const headersLog = [
    'NO',
    'TANGGAL',
    'WAKTU',
    'NIS',
    'NAMA SISWA',
    'KELAS',
    'KODE',
    'KATEGORI',
    'JENIS PELANGGARAN',
    'POIN',
    'SUMBER PENCATATAN',
    'KETERANGAN / PELAPOR',
  ];

  headersLog.forEach((h, i) => {
    const cell = headerRow3.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  filteredViolations.forEach((v, idx) => {
    const row = wsLog.getRow(idx + 2);
    row.height = 20;
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = v.tanggal;
    row.getCell(3).value = v.waktu;
    row.getCell(4).value = v.nis;
    row.getCell(5).value = v.nama;
    row.getCell(6).value = v.kelas;
    row.getCell(7).value = v.kode_pelanggaran;
    row.getCell(8).value = v.kategori;
    row.getCell(9).value = v.jenis_pelanggaran;
    row.getCell(10).value = v.poin;
    row.getCell(11).value = v.sumber === 'MANUAL_GURU' ? 'Input Guru / BK' : v.sumber === 'OTOMATIS_PRESENSI' ? 'Otomatis Scan Masuk' : 'Otomatis Sholat Dzuhur';
    row.getCell(12).value = v.keterangan || v.pelapor || '-';
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const cleanClass = selectedClass === 'ALL' ? 'Semua_Kelas' : selectedClass.replace(/\s+/g, '_');
  const filename = `Laporan_Poin_Pelanggaran_SMKS_PGRI_1_Sukabumi_${todayStr}_${cleanClass}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}


