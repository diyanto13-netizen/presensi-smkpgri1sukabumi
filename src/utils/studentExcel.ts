import ExcelJS from 'exceljs';
import {
  getJurusanByClassName,
  getDefaultDepartureForClass,
  DAFTAR_JURUSAN,
} from './classConfig.ts';

export interface Siswa {
  id: string;
  nis: string;
  nisn?: string;
  nama: string;
  jenis_kelamin: 'L' | 'P';
  kelas: string;
  jurusan: string;
  no_wa_ortu: string;
  nama_ortu?: string;
  jam_pulang: string;
  foto_url?: string;
  alamat?: string;
}

export interface SchoolConfig {
  nama_sekolah: string;
  yayasan?: string;
  npsn?: string;
  akreditasi?: string;
  alamat?: string;
  telepon?: string;
  email?: string;
  kepala_sekolah?: string;
  nip_kepsek?: string;
  jam_masuk_batas?: string;
  fonnte_token?: string;
  fonnte_test_mode?: boolean;
  sound_enabled?: boolean;
  voice_announcement_enabled?: boolean;
}

export interface ParsedStudentRow {
  rowNumber: number;
  data: Siswa;
  isValid: boolean;
  isDuplicate: boolean;
  error?: string;
}

export interface ImportParseResult {
  totalRows: number;
  validRows: ParsedStudentRow[];
  duplicateRows: ParsedStudentRow[];
  invalidRows: ParsedStudentRow[];
}

/**
 * Normalizes Indonesian phone numbers
 */
export function cleanPhoneNumber(phoneStr: string): string {
  if (!phoneStr) return '081234567890';
  let cleaned = String(phoneStr).trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+62')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.substring(2);
  }
  if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

/**
 * Normalizes Time String (HH:mm)
 */
export function cleanTimeString(timeStr: string): string {
  if (!timeStr) return '15:00';
  const str = String(timeStr).trim();
  // If time is decimal from Excel (e.g. 0.625 for 15:00)
  if (!isNaN(Number(str)) && Number(str) > 0 && Number(str) < 1) {
    const totalMinutes = Math.round(Number(str) * 24 * 60);
    const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const m = String(totalMinutes % 60).padStart(2, '0');
    return `${h}:${m}`;
  }
  const match = str.match(/(\d{1,2})[:.](\d{1,2})/);
  if (match) {
    const h = match[1].padStart(2, '0');
    const m = match[2].padStart(2, '0');
    return `${h}:${m}`;
  }
  return '15:00';
}

/**
 * Parses student data from an ExcelJS Worksheet instance.
 * Decoupled from UI for testing.
 */
export function parseStudentRows(
  worksheet: ExcelJS.Worksheet,
  existingNisSet: Set<string>
): ImportParseResult {
  const result: ImportParseResult = {
    totalRows: 0,
    validRows: [],
    duplicateRows: [],
    invalidRows: [],
  };

  if (!worksheet || worksheet.rowCount < 2) {
    return result;
  }

  // Find column indexes from header row (row 1 or row 2)
  let headerRowIndex = 1;
  let headerMap: { [key: string]: number } = {};

  // Check row 1 or row 2 for standard headers
  for (let r = 1; r <= 3; r++) {
    const row = worksheet.getRow(r);
    const map: { [key: string]: number } = {};
    row.eachCell((cell, colNumber) => {
      const val = String(cell.value || '').trim().toUpperCase();
      if (val.includes('ORTU') || val.includes('WALI')) map['ortu'] = colNumber;
      else if (val.includes('NISN')) map['nisn'] = colNumber;
      else if (val.includes('NIS')) map['nis'] = colNumber;
      else if (val.includes('NAMA')) map['nama'] = colNumber;
      else if (val.includes('KELAMIN') || val === 'L/P' || val === 'JK') map['jk'] = colNumber;
      else if (val.includes('KELAS')) map['kelas'] = colNumber;
      else if (val.includes('JURUSAN')) map['jurusan'] = colNumber;
      else if (val.includes('WA') || val.includes('HP') || val.includes('TELEPON')) map['wa'] = colNumber;
      else if (val.includes('PULANG') || val.includes('JADWAL')) map['jam_pulang'] = colNumber;
      else if (val.includes('ALAMAT')) map['alamat'] = colNumber;
      else if (val.includes('FOTO')) map['foto'] = colNumber;
    });

    if (map['nis'] && map['nama']) {
      headerRowIndex = r;
      headerMap = map;
      break;
    }
  }

  // If header not found by keyword, fallback to default positional column order:
  // 1: NIS, 2: NISN, 3: NAMA, 4: JK, 5: KELAS, 6: JURUSAN, 7: WA, 8: ORTU, 9: JAM PULANG, 10: ALAMAT
  if (!headerMap['nis']) {
    headerRowIndex = 1;
    headerMap = {
      nis: 1,
      nisn: 2,
      nama: 3,
      jk: 4,
      kelas: 5,
      jurusan: 6,
      wa: 7,
      ortu: 8,
      jam_pulang: 9,
      alamat: 10,
    };
  }

  const seenInFileNis = new Set<string>();

  // Process rows
  for (let r = headerRowIndex + 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    // Skip empty rows
    const firstCell = row.getCell(headerMap['nis'] || 1).value;
    const secondCell = row.getCell(headerMap['nama'] || 3).value;
    if (!firstCell && !secondCell) continue;

    result.totalRows++;

    const getVal = (colIdx?: number): string => {
      if (!colIdx) return '';
      const cell = row.getCell(colIdx);
      if (cell.value === null || cell.value === undefined) return '';
      if (typeof cell.value === 'object' && 'text' in cell.value) {
        return String((cell.value as { text: string }).text).trim();
      }
      return String(cell.value).trim();
    };

    const rawNis = getVal(headerMap['nis']);
    const rawNisn = getVal(headerMap['nisn']);
    const rawNama = getVal(headerMap['nama']);
    const rawJk = getVal(headerMap['jk']).toUpperCase();
    const rawKelas = getVal(headerMap['kelas']) || 'XII TKJ 1';
    const rawJurusan = getVal(headerMap['jurusan']) || getJurusanByClassName(rawKelas);
    const rawWa = getVal(headerMap['wa']);
    const rawOrtu = getVal(headerMap['ortu']);
    const rawJamPulang = getVal(headerMap['jam_pulang']);
    const rawAlamat = getVal(headerMap['alamat']) || 'Kota Sukabumi';
    const rawFoto = getVal(headerMap['foto']);

    // Validation
    if (!rawNis) {
      result.invalidRows.push({
        rowNumber: r,
        isValid: false,
        isDuplicate: false,
        error: 'Kolom NIS tidak boleh kosong',
        data: {} as Siswa,
      });
      continue;
    }

    if (!rawNama) {
      result.invalidRows.push({
        rowNumber: r,
        isValid: false,
        isDuplicate: false,
        error: 'Kolom Nama Lengkap Siswa tidak boleh kosong',
        data: {} as Siswa,
      });
      continue;
    }

    const cleanNis = String(rawNis).replace(/[^\w-]/g, '');
    const cleanJk: 'L' | 'P' = rawJk.startsWith('P') ? 'P' : 'L';
    const cleanWa = cleanPhoneNumber(rawWa);
    const cleanPulang = rawJamPulang
      ? cleanTimeString(rawJamPulang)
      : getDefaultDepartureForClass(rawKelas);

    const studentData: Siswa = {
      id: 's-imp-' + Date.now() + '-' + r,
      nis: cleanNis,
      nisn: rawNisn || '',
      nama: rawNama,
      jenis_kelamin: cleanJk,
      kelas: rawKelas,
      jurusan: rawJurusan,
      no_wa_ortu: cleanWa,
      nama_ortu: rawOrtu || '',
      jam_pulang: cleanPulang,
      foto_url:
        rawFoto ||
        (cleanJk === 'P'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80'),
      alamat: rawAlamat,
    };

    // Check duplicate in database or in file
    const isDbDuplicate = existingNisSet.has(cleanNis);
    const isFileDuplicate = seenInFileNis.has(cleanNis);

    if (isDbDuplicate || isFileDuplicate) {
      result.duplicateRows.push({
        rowNumber: r,
        isValid: true,
        isDuplicate: true,
        error: isDbDuplicate
          ? `NIS ${cleanNis} sudah terdaftar di database`
          : `NIS ${cleanNis} terduplikasi di dalam file import`,
        data: studentData,
      });
    } else {
      seenInFileNis.add(cleanNis);
      result.validRows.push({
        rowNumber: r,
        isValid: true,
        isDuplicate: false,
        data: studentData,
      });
    }
  }

  return result;
}

/**
 * Downloads standardized Excel import template (.xlsx) with guidelines and sample data
 */
export async function downloadStudentImportTemplate(config: SchoolConfig): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = config.nama_sekolah;
  workbook.created = new Date();

  // Sheet 1: DATA_SISWA
  const wsData = workbook.addWorksheet('DATA_SISWA', {
    views: [{ showGridLines: true }],
  });

  wsData.columns = [
    { key: 'nis', width: 14 },
    { key: 'nisn', width: 14 },
    { key: 'nama', width: 28 },
    { key: 'jk', width: 8 },
    { key: 'kelas', width: 14 },
    { key: 'jurusan', width: 26 },
    { key: 'no_wa_ortu', width: 18 },
    { key: 'nama_ortu', width: 20 },
    { key: 'jam_pulang', width: 14 },
    { key: 'alamat', width: 26 },
    { key: 'foto_url', width: 20 },
  ];

  // Header banner info
  wsData.mergeCells('A1:K1');
  const t1 = wsData.getCell('A1');
  t1.value = `TEMPLATE IMPORT DATA SISWA - ${config.nama_sekolah}`;
  t1.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2545' } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsData.getRow(1).height = 26;

  wsData.mergeCells('A2:K2');
  const t2 = wsData.getCell('A2');
  t2.value =
    'Petunjuk: Isi data siswa mulai dari baris 4. Kolom bertanda (*) Wajib diisi. Jam pulang format HH:mm (contoh: 15:00).';
  t2.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF334155' } };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  t2.alignment = { horizontal: 'left', vertical: 'middle' };
  wsData.getRow(2).height = 20;

  // Header Row
  const headerRow = wsData.getRow(3);
  headerRow.height = 28;

  const headers = [
    'NIS *',
    'NISN',
    'NAMA LENGKAP *',
    'L/P *',
    'KELAS *',
    'JURUSAN *',
    'NO WA ORTU *',
    'NAMA ORTU',
    'JAM PULANG *',
    'ALAMAT',
    'FOTO URL (Opsional)',
  ];

  headers.forEach((h, idx) => {
    const c = headerRow.getCell(idx + 1);
    c.value = h;
    c.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  // Sample student rows
  const sampleData = [
    [
      '23241010',
      '0068123491',
      'Raden Gilang Ramadhan',
      'L',
      'XII TKJ 1',
      'Teknik Komputer & Jaringan',
      '081234567891',
      'H. Gunawan',
      '15:30',
      'Cipoho Indah, Kota Sukabumi',
      '',
    ],
    [
      '23241011',
      '0068123492',
      'Tiara Dewi Lestari',
      'P',
      'XII AKL',
      'Akuntansi',
      '081398765431',
      'Ibu Dewi Sartika',
      '15:00',
      'Baros, Kota Sukabumi',
      '',
    ],
    [
      '23241012',
      '0068123493',
      'Reza Pratama Kusuma',
      'L',
      'XI TKJ 1',
      'Teknik Komputer & Jaringan',
      '085712349911',
      'Bpk. Kusuma',
      '15:30',
      'Citamiang, Sukabumi',
      '',
    ],
    [
      '23241013',
      '0068123494',
      'Salma Nurul Fadhilah',
      'P',
      'X MPLB 1',
      'Manajemen Perkantoran',
      '082198877611',
      'Bpk. Fadhil',
      '14:30',
      'Cikondang, Sukabumi',
      '',
    ],
    [
      '23241014',
      '0068123495',
      'Galih Arya Wibowo',
      'L',
      'XII BR 1',
      'Pemasaran',
      '087811223311',
      'Bpk. Wibowo',
      '15:00',
      'Lembursitu, Sukabumi',
      '',
    ],
    [
      '23241015',
      '0068123496',
      'Zahra Amelia Putri',
      'P',
      'X PM 1',
      'Pemasaran',
      '085811223344',
      'Ibu Amelia',
      '14:30',
      'Cikole, Kota Sukabumi',
      '',
    ],
  ];

  sampleData.forEach((item, rIdx) => {
    const row = wsData.getRow(rIdx + 4);
    row.height = 20;
    item.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = val;
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = {
        horizontal: cIdx === 0 || cIdx === 1 || cIdx === 3 || cIdx === 4 || cIdx === 8 ? 'center' : 'left',
        vertical: 'middle',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // Sheet 2: PANDUAN_PENGISIAN
  const wsGuide = workbook.addWorksheet('PANDUAN_PENGISIAN');
  wsGuide.columns = [{ width: 22 }, { width: 50 }, { width: 38 }];

  wsGuide.addRow(['PANDUAN PENGISIAN IMPORT SISWA SMKS PGRI 1 SUKABUMI']);
  wsGuide.getCell('A1').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0B2545' } };

  wsGuide.addRow([]);
  wsGuide.addRow(['NAMA KOLOM', 'ATURAN & KETENTUAN', 'CONTOH PENGISIAN']);
  const guideHeader = wsGuide.getRow(3);
  guideHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  for (let c = 1; c <= 3; c++) {
    guideHeader.getCell(c).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0B2545' },
    };
  }

  const guideRules = [
    ['NIS *', 'Wajib diisi unik. Digunakan sebagai kode QR absensi siswa.', '23241010'],
    ['NISN', 'Nomor Induk Siswa Nasional (Opsional)', '0068123491'],
    ['NAMA LENGKAP *', 'Nama lengkap siswa tanpa singkatan jika memungkinkan', 'Raden Gilang Ramadhan'],
    ['L/P *', 'Jenis kelamin: L (Laki-laki) atau P (Perempuan)', 'L atau P'],
    ['KELAS *', 'Pilihan 21 Rombel resmi SMKS PGRI 1:\n- XII: XII TKJ 1, XII TKJ 2, XII AKL, XII MP 1, XII MP 2, XII BR 1, XII BR 2\n- XI: XI TKJ 1, XI TKJ 2, XI AKL, XI MP 1, XI MP 2, XI BR 1, XI BR 2\n- X: X TKJT 1, X TKJT 2, X AKL, X MPLB 1, X MPLB 2, X PM 1, X PM 2', 'XII TKJ 1, XI AKL, X MPLB 1'],
    ['JURUSAN *', '4 Kompetensi Keahlian resmi:\n1. Teknik Komputer & Jaringan\n2. Akuntansi\n3. Manajemen Perkantoran\n4. Pemasaran', 'Teknik Komputer & Jaringan'],
    ['NO WA ORTU *', 'Nomor WhatsApp aktif orang tua untuk notifikasi otomatis', '081234567890 (awalan 08 atau 62)'],
    ['NAMA ORTU', 'Nama Orang Tua / Wali Siswa', 'H. Gunawan'],
    ['JAM PULANG *', 'Format HH:mm. Waktu minimal siswa boleh scan pulang. Jika dikosongkan, sistem otomatis menerapkan jam pulang resmi kelas.', '15:30 (TKJ), 15:00 (AKL/MP/BR), 14:30 (Kelas X)'],
    ['ALAMAT', 'Alamat domisili siswa di Sukabumi', 'Jl. Pelabuhan II, Kota Sukabumi'],
    ['FOTO URL', 'Tautan foto siswa (opsional, ada avatar otomatis)', 'https://...'],
  ];

  guideRules.forEach(r => wsGuide.addRow(r));

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Template_Import_Siswa_SMKS_PGRI_1_Sukabumi.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Parses user-uploaded file into parsed student records
 */
export async function parseStudentFile(
  file: File,
  existingStudents: Siswa[]
): Promise<ImportParseResult> {
  const existingNisSet = new Set(existingStudents.map(s => s.nis.trim()));
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  // Take DATA_SISWA sheet or first worksheet
  const worksheet =
    workbook.getWorksheet('DATA_SISWA') ||
    workbook.worksheets[0];

  return parseStudentRows(worksheet, existingNisSet);
}
