import React, { useState, useMemo, useRef } from 'react';
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  QrCode,
  Send,
  X,
  Save,
  CheckCircle,
  CheckCircle2,
  ExternalLink,
  Users,
  Clock,
  Phone,
  FileSpreadsheet,
  Download,
  UploadCloud,
  AlertTriangle,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Camera,
  RotateCcw,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Siswa, SchoolConfig } from '../types';
import { IdCard } from './IdCard';
import { sendWhatsAppNotification, formatPhoneNumber } from '../utils/fonnte';
import { INITIAL_STUDENTS, applyClassScheduleToStudents } from '../utils/storage';
import {
  MASTER_KELAS_LIST,
  ALL_CLASS_NAMES,
  DAFTAR_JURUSAN,
  getJurusanByClassName,
  getDefaultDepartureForClass,
} from '../utils/classConfig';
import {
  downloadStudentImportTemplate,
  parseStudentFile,
  ImportParseResult,
} from '../utils/studentExcel';
import { deleteStudentApi, bulkDeleteStudentsApi } from '../services/api';
import {
  deleteStudentFromFirestore,
  bulkDeleteStudentsFromFirestore,
} from '../services/firestoreService';
import { compressAndFormatStudentPhoto } from '../utils/imageUtils';

interface StudentManagerProps {
  students: Siswa[];
  config: SchoolConfig;
  onUpdateStudents: (updated: Siswa[]) => void;
  onSyncCloud?: () => Promise<void>;
  isSyncing?: boolean;
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  config,
  onUpdateStudents,
  onSyncCloud,
  isSyncing,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Siswa | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [viewingStudent, setViewingStudent] = useState<Siswa | null>(null);

  // Bulk Import Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportParseResult | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [duplicateMode, setDuplicateMode] = useState<'SKIP' | 'OVERWRITE'>('SKIP');
  const [importNotification, setImportNotification] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // WA Test status state
  const [waTestStatus, setWaTestStatus] = useState<string | null>(null);

  // Photo Upload States
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isPhotoLoading, setIsPhotoLoading] = useState<boolean>(false);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const photoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Bulk Photo Upload States
  const [isBulkPhotoModalOpen, setIsBulkPhotoModalOpen] = useState<boolean>(false);
  const [isBulkPhotoProcessing, setIsBulkPhotoProcessing] = useState<boolean>(false);
  const [bulkPhotoProgress, setBulkPhotoProgress] = useState<{ current: number; total: number; currentName: string }>({
    current: 0,
    total: 0,
    currentName: '',
  });
  const [bulkPhotoResult, setBulkPhotoResult] = useState<{
    matched: { nis: string; nama: string; filename: string; photoUrl: string }[];
    unmatched: string[];
    totalFiles: number;
  } | null>(null);
  const bulkPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const singleQuickPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [quickPhotoStudentId, setQuickPhotoStudentId] = useState<string | null>(null);

  // Bulk Selection & Deletion States
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  // Form State for Single Add / Edit
  const [formData, setFormData] = useState<Partial<Siswa>>({
    nis: '',
    nisn: '',
    nama: '',
    jenis_kelamin: 'L',
    kelas: 'XII TKJ 1',
    jurusan: 'Teknik Komputer & Jaringan',
    no_wa_ortu: '',
    nama_ortu: '',
    jam_pulang: '15:30',
    foto_url: '',
    alamat: '',
  });

  // Extract all available classes (21 official classes + any extra)
  const classes = useMemo(() => {
    const set = new Set<string>(ALL_CLASS_NAMES);
    students.forEach(s => set.add(s.kelas));
    return Array.from(set);
  }, [students]);

  // Sync class departure times to all students
  const handleSyncClassSchedule = () => {
    if (!config.jam_pulang_per_kelas) return;
    if (confirm('Sinkronkan jam pulang seluruh data siswa dengan jadwal resmi per kelas saat ini?')) {
      const updated = applyClassScheduleToStudents(students, config.jam_pulang_per_kelas);
      onUpdateStudents(updated);
      setImportNotification('Berhasil menyinkronkan jam pulang seluruh siswa sesuai jadwal resmi kelas!');
      setTimeout(() => setImportNotification(null), 4000);
    }
  };

  // Filtered
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = selectedClass === 'ALL' || s.kelas === selectedClass;
      const matchSearch =
        searchQuery === '' ||
        s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis.includes(searchQuery);
      return matchClass && matchSearch;
    });
  }, [students, selectedClass, searchQuery]);

  // Bulk Selection Helpers
  const isAllFilteredSelected = useMemo(() => {
    if (filteredStudents.length === 0) return false;
    return filteredStudents.every(s => selectedStudentIds.has(s.id));
  }, [filteredStudents, selectedStudentIds]);

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        filteredStudents.forEach(s => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        filteredStudents.forEach(s => next.add(s.id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  const handleBulkDelete = async () => {
    const count = selectedStudentIds.size;
    if (count === 0) return;

    const confirmMsg = `Yakin ingin menghapus ${count} data siswa yang ditandai dari tabel dan database?\n\nData yang telah dihapus tidak dapat dipulihkan.`;
    if (!confirm(confirmMsg)) return;

    setIsBulkDeleting(true);
    try {
      const idsToDelete = Array.from(selectedStudentIds);
      const studentsToDelete = students.filter(s => selectedStudentIds.has(s.id));
      const nisToDelete = studentsToDelete.map(s => s.nis);
      const updated = students.filter(s => !selectedStudentIds.has(s.id));

      onUpdateStudents(updated);
      bulkDeleteStudentsApi(idsToDelete).catch(() => {});
      await bulkDeleteStudentsFromFirestore([...idsToDelete, ...nisToDelete]);

      setSelectedStudentIds(new Set());
      setImportNotification(`Berhasil menghapus ${count} data siswa secara permanen dari database.`);
      setTimeout(() => setImportNotification(null), 5000);
    } catch (err) {
      console.error('Failed to bulk delete students:', err);
      alert('Terjadi kesalahan saat menghapus data siswa massal.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // 1. Download Template Excel
  const handleDownloadTemplate = async () => {
    try {
      await downloadStudentImportTemplate(config);
    } catch (err) {
      console.error('Failed to download template:', err);
      alert('Gagal mengunduh template: ' + (err as Error).message);
    }
  };

  // 2. Open Import Modal
  const handleOpenImportModal = () => {
    setImportResult(null);
    setUploadedFileName('');
    setIsImportModalOpen(true);
  };

  // 3. Handle File Upload & Parse
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadedFileName(file.name);
    setIsProcessingFile(true);

    try {
      const parsed = await parseStudentFile(file, students);
      setImportResult(parsed);
    } catch (err) {
      console.error('Failed to parse excel:', err);
      alert('Gagal membaca file Excel. Pastikan file berformat .xlsx, .xls, atau .csv yang valid.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 4. Execute Bulk Import
  const handleExecuteImport = () => {
    if (!importResult) return;

    const newValidStudents = importResult.validRows.map(r => r.data);
    const duplicateRows = importResult.duplicateRows.map(r => r.data);

    let finalStudents = [...students];
    let insertedCount = newValidStudents.length;
    let updatedCount = 0;

    if (duplicateMode === 'OVERWRITE') {
      duplicateRows.forEach(dup => {
        const idx = finalStudents.findIndex(s => s.nis === dup.nis);
        if (idx >= 0) {
          finalStudents[idx] = {
            ...finalStudents[idx],
            ...dup,
            id: finalStudents[idx].id,
          };
          updatedCount++;
        }
      });
      finalStudents = [...newValidStudents, ...finalStudents];
    } else {
      finalStudents = [...newValidStudents, ...finalStudents];
    }

    onUpdateStudents(finalStudents);
    setIsImportModalOpen(false);

    const message =
      duplicateMode === 'OVERWRITE'
        ? `Berhasil mengimpor massal! ${insertedCount} siswa baru ditambahkan, dan ${updatedCount} siswa diperbarui.`
        : `Berhasil mengimpor massal! ${insertedCount} siswa baru berhasil ditambahkan ke database.`;

    setImportNotification(message);
    setTimeout(() => setImportNotification(null), 6000);
  };

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    const initialClass = 'XII TKJ 1';
    const initialTime = config.jam_pulang_per_kelas?.[initialClass] || '15:30';
    setFormData({
      nis: String(Math.floor(23241000 + students.length + 1)),
      nisn: '00681' + Math.floor(10000 + Math.random() * 90000),
      nama: '',
      jenis_kelamin: 'L',
      kelas: initialClass,
      jurusan: getJurusanByClassName(initialClass),
      no_wa_ortu: '081234567890',
      nama_ortu: '',
      jam_pulang: initialTime,
      foto_url:
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80',
      alamat: 'Kota Sukabumi',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (student: Siswa) => {
    setEditingStudent(student);
    setFormData({ ...student });
    setIsEditModalOpen(true);
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm('Yakin ingin menghapus data siswa ini?')) {
      const target = students.find(s => s.id === id);
      const updated = students.filter(s => s.id !== id);
      onUpdateStudents(updated);
      deleteStudentApi(id).catch(() => {});
      if (target) {
        deleteStudentFromFirestore(target.id);
        deleteStudentFromFirestore(target.nis);
      } else {
        deleteStudentFromFirestore(id);
      }
    }
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsPhotoLoading(true);
      setPhotoError(null);
      const compressedDataUrl = await compressAndFormatStudentPhoto(file);
      setFormData(prev => ({ ...prev, foto_url: compressedDataUrl }));
    } catch (err: any) {
      console.error('Error processing student photo:', err);
      setPhotoError(err.message || 'Gagal memproses file foto siswa.');
    } finally {
      setIsPhotoLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleTriggerQuickPhoto = (studentId: string) => {
    setQuickPhotoStudentId(studentId);
    singleQuickPhotoInputRef.current?.click();
  };

  const handleQuickSinglePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickPhotoStudentId) return;

    try {
      const compressedDataUrl = await compressAndFormatStudentPhoto(file);
      const updated = students.map(s =>
        s.id === quickPhotoStudentId ? { ...s, foto_url: compressedDataUrl } : s
      );
      onUpdateStudents(updated);
      setImportNotification('Pas foto asli siswa berhasil diperbarui!');
      setTimeout(() => setImportNotification(null), 3500);
    } catch (err: any) {
      console.error('Error uploading quick student photo:', err);
      alert('Gagal memproses foto: ' + (err.message || 'Format tidak didukung'));
    } finally {
      setQuickPhotoStudentId(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleBulkPhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setIsBulkPhotoModalOpen(true);
    setIsBulkPhotoProcessing(true);
    setBulkPhotoProgress({ current: 0, total: fileList.length, currentName: '' });

    const matchedList: { nis: string; nama: string; filename: string; photoUrl: string }[] = [];
    const unmatchedList: string[] = [];
    const studentPhotoUpdates = new Map<string, string>(); // studentId -> photoDataUrl

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setBulkPhotoProgress({ current: i + 1, total: fileList.length, currentName: file.name });

      // Clean filename: remove extension, trim, lowercase
      const dotIndex = file.name.lastIndexOf('.');
      const baseName = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
      const cleanBase = baseName.trim().toLowerCase();
      const cleanDigits = baseName.replace(/\D/g, ''); // Extract just numbers (e.g., NIS)

      // Try matching student
      const matched = students.find(s => {
        const sNis = (s.nis || '').trim().toLowerCase();
        const sNisDigits = (s.nis || '').replace(/\D/g, '');
        const sNisn = (s.nisn || '').trim().toLowerCase();
        const sNisnDigits = (s.nisn || '').replace(/\D/g, '');
        const sNama = (s.nama || '').trim().toLowerCase();

        // 1. Exact NIS match
        if (sNis && (cleanBase === sNis || (cleanDigits.length >= 3 && cleanDigits === sNisDigits))) return true;
        // 2. Exact NISN match
        if (sNisn && (cleanBase === sNisn || (cleanDigits.length >= 5 && cleanDigits === sNisnDigits))) return true;
        // 3. Exact Name match
        if (sNama && cleanBase === sNama) return true;
        // 4. Filename contains student NIS (e.g., "124015101_ADI.jpg" or "foto_124015101.jpg")
        if (sNis && cleanBase.includes(sNis)) return true;
        // 5. Filename contains student Name
        if (sNama && cleanBase.includes(sNama)) return true;

        return false;
      });

      if (matched) {
        try {
          const compressed = await compressAndFormatStudentPhoto(file);
          studentPhotoUpdates.set(matched.id, compressed);
          matchedList.push({
            nis: matched.nis,
            nama: matched.nama,
            filename: file.name,
            photoUrl: compressed,
          });
        } catch (err: any) {
          console.error(`Gagal memproses file ${file.name}:`, err);
          unmatchedList.push(`${file.name} (Gagal kompresi)`);
        }
      } else {
        unmatchedList.push(file.name);
      }
    }

    if (studentPhotoUpdates.size > 0) {
      const updated = students.map(s => {
        const newPhoto = studentPhotoUpdates.get(s.id);
        return newPhoto ? { ...s, foto_url: newPhoto } : s;
      });
      onUpdateStudents(updated);
    }

    setBulkPhotoResult({
      matched: matchedList,
      unmatched: unmatchedList,
      totalFiles: fileList.length,
    });
    setIsBulkPhotoProcessing(false);

    // Reset input
    if (bulkPhotoInputRef.current) {
      bulkPhotoInputRef.current.value = '';
    }
  };

  const handleResetToDefaultPhoto = () => {
    const defaultPhoto =
      formData.jenis_kelamin === 'P'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80';
    setFormData(prev => ({ ...prev, foto_url: defaultPhoto }));
    setPhotoError(null);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nis || !formData.nama || !formData.kelas || !formData.jam_pulang) {
      alert('Mohon lengkapi data NIS, Nama, Kelas, dan Jam Pulang!');
      return;
    }

    if (editingStudent) {
      const updated = students.map(s =>
        s.id === editingStudent.id ? ({ ...s, ...formData } as Siswa) : s
      );
      onUpdateStudents(updated);
    } else {
      const newStudent: Siswa = {
        id: 's-' + Date.now(),
        nis: formData.nis!,
        nisn: formData.nisn || '',
        nama: formData.nama!,
        jenis_kelamin: formData.jenis_kelamin || 'L',
        kelas: formData.kelas!,
        jurusan: formData.jurusan || 'Rekayasa Perangkat Lunak',
        no_wa_ortu: formData.no_wa_ortu || '081234567890',
        nama_ortu: formData.nama_ortu || '',
        jam_pulang: formData.jam_pulang || '15:00',
        foto_url:
          formData.foto_url ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
        alamat: formData.alamat || '',
      };
      onUpdateStudents([newStudent, ...students]);
    }

    setIsEditModalOpen(false);
  };

  const handleTestWhatsApp = async (student: Siswa) => {
    setWaTestStatus(`Mengirim notifikasi tes ke ${student.no_wa_ortu}...`);
    const testMessage = `*SMKS PGRI 1 SUKABUMI*
Halo Bapak/Ibu ${student.nama_ortu || 'Orang Tua Siswa'},
Ini adalah pesan uji coba integrasi WhatsApp Fonnte untuk siswa: *${student.nama}* (NIS: ${student.nis}, Kelas: ${student.kelas}).
Jadwal kepulangan: *${student.jam_pulang} WIB*.`;

    const res = await sendWhatsAppNotification({
      target: student.no_wa_ortu,
      message: testMessage,
      token: config.fonnte_token,
      isTestMode: config.fonnte_test_mode,
    });

    if (res.status) {
      setWaTestStatus(`Berhasil! ${res.message}`);
    } else {
      setWaTestStatus(`Gagal: ${res.message}`);
    }
    setTimeout(() => setWaTestStatus(null), 4000);
  };

  const handleResetDemoData = () => {
    if (confirm('Kembalikan data siswa ke 23 siswa resmi SMKS PGRI 1 Sukabumi (Kelas XII TKJ 2)?')) {
      onUpdateStudents(INITIAL_STUDENTS);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-2xs border border-slate-200/90 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="font-semibold text-slate-700">Master Data Siswa</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>{students.length} Siswa Terdaftar</span>
            <span aria-hidden="true" className="text-slate-300 hidden sm:inline">·</span>
            <span className="hidden sm:inline">21 Rombel Resmi</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Manajemen Siswa &amp; Import Rombel
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
            Kelola database siswa, jadwal kepulangan khusus, nomor WhatsApp wali murid, dan impor massal dari Excel.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Hidden inputs for Bulk & Quick Photo */}
          <input
            ref={bulkPhotoInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={e => handleBulkPhotoFiles(e.target.files)}
            className="hidden"
          />
          <input
            ref={singleQuickPhotoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleQuickSinglePhotoFile}
            className="hidden"
          />

          {/* Download Template Excel */}
          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Download Template Format Excel (.xlsx) untuk pengisian data siswa"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Unduh Template</span>
          </button>

          {/* Import Excel Massal */}
          <button
            onClick={handleOpenImportModal}
            className="px-4 py-2 rounded-xl font-semibold text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Import banyak data siswa sekaligus dari file Excel (.xlsx / .csv)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import Excel</span>
          </button>

          {/* Upload Pas Foto Massal */}
          <button
            onClick={() => bulkPhotoInputRef.current?.click()}
            className="px-4 py-2 rounded-xl font-semibold text-xs bg-indigo-700 hover:bg-indigo-800 text-white shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Upload sekaligus banyak pas foto asli siswa (otomatis dicocokkan berdasarkan nomor NIS)"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-200" />
            <span>Upload Foto Massal</span>
            <span className="bg-indigo-500/60 text-[10px] px-1.5 py-0.2 rounded-md font-mono">NIS</span>
          </button>

          {/* Add Single Student */}
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-black text-white shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-300" />
            <span>+ Tambah Siswa</span>
          </button>

          {/* Sync to Cloud Button */}
          {onSyncCloud && (
            <button
              onClick={onSyncCloud}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-xl font-medium text-xs bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
              title="Kirim dan sinkronkan data siswa tabel saat ini ke Database Cloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isSyncing ? 'Sinkron...' : 'Sinkron Cloud'}</span>
            </button>
          )}

          {/* Reset Demo Data */}
          <button
            onClick={handleResetDemoData}
            className="px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-rose-700 transition cursor-pointer"
            title="Reset ke siswa demo PGRI 1"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Photo Info & Solution Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">
                Penyebab &amp; Cara Mengganti Pas Foto Asli Siswa
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                Panduan
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              File Excel Dapodik yang di-impor hanya berisi data teks tanpa file gambar fisik, sehingga sistem otomatis memasang avatar contoh agar kartu tidak kosong.
              <br className="hidden sm:inline" />
              Untuk memasang <strong>pas foto asli siswa</strong>:
              <br />
              1. <strong>Massal Sekaligus (Rekomendasi)</strong>: Klik tombol <span className="font-semibold text-indigo-700">"Upload Foto Massal"</span> di atas, pilih sekaligus seluruh file foto siswa (cukup beri nama file sesuai NIS siswa, misal: <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-300 text-amber-900">124015101.jpg</code>).
              <br />
              2. <strong>Per Siswa</strong>: Klik foto siswa di tabel di bawah untuk unggah foto dari galeri HP/laptop atau foto langsung.
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 self-start md:self-center">
          <button
            type="button"
            onClick={() => bulkPhotoInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Pilih File Foto Sekaligus</span>
          </button>
        </div>
      </div>

      {/* Import Notification Toast */}
      {importNotification && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-sm flex items-center justify-between gap-3 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{importNotification}</span>
          </div>
          <button
            onClick={() => setImportNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* WhatsApp Test Feedback Toast */}
      {waTestStatus && (
        <div className="p-4 bg-blue-50 border border-blue-300 text-blue-900 rounded-xl text-sm flex items-center gap-2.5 animate-bounce shadow-xs">
          <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />
          <span className="font-semibold">{waTestStatus}</span>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan NIS atau Nama Siswa..."
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <label className="text-sm font-bold text-slate-700 shrink-0">Filter Kelas:</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="py-2.5 px-3.5 text-sm bg-slate-50 border border-slate-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
            >
              <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
              <optgroup label="Kelas XII (7 Rombel)">
                {MASTER_KELAS_LIST.filter(k => k.tingkat === 'XII').map(k => (
                  <option key={k.kelas} value={k.kelas}>
                    {k.kelas} - {k.namaJurusan}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Kelas XI (7 Rombel)">
                {MASTER_KELAS_LIST.filter(k => k.tingkat === 'XI').map(k => (
                  <option key={k.kelas} value={k.kelas}>
                    {k.kelas} - {k.namaJurusan}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Kelas X (7 Rombel)">
                {MASTER_KELAS_LIST.filter(k => k.tingkat === 'X').map(k => (
                  <option key={k.kelas} value={k.kelas}>
                    {k.kelas} - {k.namaJurusan}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <button
            type="button"
            onClick={handleSyncClassSchedule}
            className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Perbarui jam pulang semua siswa agar sesuai dengan jam pulang resmi masing-masing kelas"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-800" />
            <span>Sinkronkan Jadwal Kelas</span>
          </button>
        </div>
      </div>

      {/* Floating Bulk Action Bar (when students are marked) */}
      {selectedStudentIds.size > 0 && (
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 text-white p-4 rounded-2xl shadow-lg border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
              <Trash2 className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm sm:text-base">
                  {selectedStudentIds.size} Siswa Ditandai
                </span>
                <span className="text-xs bg-rose-500/30 text-rose-200 px-2 py-0.5 rounded-full font-semibold border border-rose-500/40">
                  Siap Dihapus
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Centang kotak pada baris siswa untuk menambah atau mengurangi pilihan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              Batal Tandai
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isBulkDeleting ? 'Menghapus...' : `Hapus ${selectedStudentIds.size} Siswa`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-900 text-amber-300 uppercase font-heading text-xs font-bold tracking-wider">
                <th className="py-3.5 px-3 text-center w-12">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="p-1 rounded-lg hover:bg-slate-800 text-amber-300 transition cursor-pointer flex items-center justify-center mx-auto"
                    title={isAllFilteredSelected ? 'Batalkan tandai semua' : 'Tandai semua siswa'}
                  >
                    {isAllFilteredSelected ? (
                      <CheckSquare className="w-5 h-5 text-amber-400" />
                    ) : selectedStudentIds.size > 0 ? (
                      <div className="w-5 h-5 rounded bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center">
                        <div className="w-2.5 h-0.5 bg-amber-400 rounded-full" />
                      </div>
                    ) : (
                      <Square className="w-5 h-5 text-slate-400 hover:text-amber-300" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4">Siswa</th>
                <th className="py-3.5 px-4">NIS / NISN</th>
                <th className="py-3.5 px-4">Kelas &amp; Jurusan</th>
                <th className="py-3.5 px-4">No. WA Orang Tua</th>
                <th className="py-3.5 px-4">Jadwal Pulang</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-base">
                    Tidak ada siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const isRowSelected = selectedStudentIds.has(student.id);
                  return (
                    <tr
                      key={student.id}
                      className={
                        isRowSelected
                          ? 'bg-amber-50/70 border-l-4 border-l-amber-500 transition'
                          : 'hover:bg-blue-50/50 transition'
                      }
                    >
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectStudent(student.id)}
                          className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center mx-auto ${
                            isRowSelected
                              ? 'text-blue-900 bg-blue-100'
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                          }`}
                          title={isRowSelected ? 'Batalkan tanda' : 'Tandai siswa ini'}
                        >
                          {isRowSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-950" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3.5">
                        <div className="relative group shrink-0">
                          <img
                            src={student.foto_url}
                            alt={student.nama}
                            className="w-12 h-14 rounded-xl object-cover border-2 border-amber-300/80 shadow-xs group-hover:border-indigo-600 transition"
                          />
                          {student.foto_url?.includes('images.unsplash.com') && (
                            <span
                              className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-xs"
                              title="Masih avatar contoh. Klik untuk ganti pas foto asli."
                            >
                              Sample
                            </span>
                          )}
                          <div
                            onClick={() => handleTriggerQuickPhoto(student.id)}
                            className="absolute inset-0 bg-indigo-950/70 opacity-0 group-hover:opacity-100 rounded-xl flex flex-col items-center justify-center transition cursor-pointer text-white"
                            title="Klik untuk langsung ganti pas foto asli siswa ini"
                          >
                            <Camera className="w-4 h-4 text-amber-300" />
                            <span className="text-[9px] font-bold mt-0.5">Ubah</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 text-base">{student.nama}</p>
                            <button
                              type="button"
                              onClick={() => handleTriggerQuickPhoto(student.id)}
                              className="text-slate-400 hover:text-indigo-600 text-xs p-1 rounded-md hover:bg-indigo-50 transition cursor-pointer"
                              title="Unggah pas foto asli untuk siswa ini"
                            >
                              <Upload className="w-3.5 h-3.5 text-indigo-600" />
                            </button>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                            {student.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                            {student.nama_ortu ? ` • Ortu: ${student.nama_ortu}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-blue-950">
                      <div className="text-sm sm:text-base">{student.nis}</div>
                      {student.nisn && (
                        <div className="text-xs text-slate-500 font-normal">
                          NISN: {student.nisn}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-3 py-1 rounded-full font-bold bg-blue-100 text-blue-950 text-xs">
                        {student.kelas}
                      </span>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1 truncate max-w-[200px] font-medium">
                        {student.jurusan}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 font-mono text-slate-900 font-semibold text-sm">
                        <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{student.no_wa_ortu}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{student.jam_pulang} WIB</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setViewingStudent(student);
                            setIsQrModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                          title="Lihat Kartu QR"
                        >
                          <QrCode className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => handleTestWhatsApp(student)}
                          className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                          title="Uji Kirim WhatsApp Orang Tua"
                        >
                          <Send className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(student)}
                          className="p-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                          title="Edit Data Siswa"
                        >
                          <Edit2 className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="p-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== MODAL IMPORT SISWA MASSAL (EXCEL) ==================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-xl text-blue-950">
                    Import Siswa Massal dari Excel
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                    Unggah file Excel (.xlsx / .xls) untuk menambahkan data siswa secara cepat
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto py-5 space-y-5 text-sm">
              {/* Step 1: Upload Box & Template Link */}
              <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 transition text-center space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-file-input"
                />

                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                  <UploadCloud className="w-7 h-7" />
                </div>

                <div>
                  <label
                    htmlFor="excel-file-input"
                    className="cursor-pointer inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-950 text-white font-bold hover:bg-black transition shadow-sm text-sm"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-amber-300" />
                    <span>{isProcessingFile ? 'Membaca File...' : 'Pilih File Excel (.xlsx / .csv)'}</span>
                  </label>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
                    {uploadedFileName ? (
                      <span className="font-bold text-emerald-700">File terpilih: {uploadedFileName}</span>
                    ) : (
                      'Format yang didukung: .xlsx, .xls, .csv'
                    )}
                  </p>
                </div>

                {/* Template download link inside upload box */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-center gap-2 text-xs sm:text-sm">
                  <span className="text-slate-600 font-medium">Belum memiliki format yang sesuai?</span>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-blue-700 hover:text-blue-950 font-bold underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Template Resmi (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Validation Results & Preview */}
              {importResult && (
                <div className="space-y-4">
                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200">
                      <span className="text-xs uppercase font-bold text-slate-600">Total Baris</span>
                      <p className="text-2xl font-heading font-black text-slate-900 mt-1">
                        {importResult.totalRows}
                      </p>
                    </div>

                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="text-xs uppercase font-bold text-emerald-800">Siap Diimpor (Valid)</span>
                      <p className="text-2xl font-heading font-black text-emerald-900 mt-1">
                        {importResult.validRows.length}
                      </p>
                    </div>

                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                      <span className="text-xs uppercase font-bold text-amber-800">Duplikat NIS</span>
                      <p className="text-2xl font-heading font-black text-amber-900 mt-1">
                        {importResult.duplicateRows.length}
                      </p>
                    </div>

                    <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
                      <span className="text-xs uppercase font-bold text-rose-800">Format Salah / Kosong</span>
                      <p className="text-2xl font-heading font-black text-rose-900 mt-1">
                        {importResult.invalidRows.length}
                      </p>
                    </div>
                  </div>

                  {/* Duplicate Handling Option if duplicates exist */}
                  {importResult.duplicateRows.length > 0 && (
                    <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2.5">
                      <p className="font-bold text-amber-950 flex items-center gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Ditemukan {importResult.duplicateRows.length} siswa dengan NIS yang sudah ada di database:</span>
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 pl-6 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="duplicateMode"
                            checked={duplicateMode === 'SKIP'}
                            onChange={() => setDuplicateMode('SKIP')}
                            className="text-blue-950 focus:ring-blue-700"
                          />
                          <span className="text-slate-800">
                            <strong>Lewati</strong> (Hanya tambahkan siswa baru)
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="duplicateMode"
                            checked={duplicateMode === 'OVERWRITE'}
                            onChange={() => setDuplicateMode('OVERWRITE')}
                            className="text-blue-950 focus:ring-blue-700"
                          />
                          <span className="text-slate-800">
                            <strong>Perbarui / Timpa</strong> data lama dengan data baru dari file
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs mb-2">
                      Pratinjau Data yang Terdeteksi:
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 text-slate-800 font-bold">
                          <tr>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3">NIS</th>
                            <th className="py-2.5 px-3">Nama Siswa</th>
                            <th className="py-2.5 px-3">Kelas</th>
                            <th className="py-2.5 px-3">No WA Ortu</th>
                            <th className="py-2.5 px-3">Jam Pulang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importResult.validRows.map(r => (
                            <tr key={'val-' + r.rowNumber} className="bg-emerald-50/20">
                              <td className="py-2 px-3 text-center">
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-900">
                                  Valid
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-blue-950">{r.data.nis}</td>
                              <td className="py-2 px-3 font-semibold text-slate-900">{r.data.nama}</td>
                              <td className="py-2 px-3">{r.data.kelas}</td>
                              <td className="py-2 px-3 font-mono">{r.data.no_wa_ortu}</td>
                              <td className="py-2 px-3 font-bold text-amber-800">{r.data.jam_pulang}</td>
                            </tr>
                          ))}

                          {importResult.duplicateRows.map(r => (
                            <tr key={'dup-' + r.rowNumber} className="bg-amber-50/30">
                              <td className="py-2 px-3 text-center">
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-950">
                                  {duplicateMode === 'OVERWRITE' ? 'Akan Ditimpa' : 'Dilewati'}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-amber-950">{r.data.nis}</td>
                              <td className="py-2 px-3 font-semibold text-slate-800">{r.data.nama}</td>
                              <td className="py-2 px-3">{r.data.kelas}</td>
                              <td className="py-2 px-3 font-mono">{r.data.no_wa_ortu}</td>
                              <td className="py-2 px-3 font-bold text-amber-800">{r.data.jam_pulang}</td>
                            </tr>
                          ))}

                          {importResult.invalidRows.map(r => (
                            <tr key={'inv-' + r.rowNumber} className="bg-rose-50/30">
                              <td className="py-2 px-3 text-center">
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-900">
                                  Error
                                </span>
                              </td>
                              <td colSpan={5} className="py-2 px-3 text-rose-800 font-medium italic">
                                Baris {r.rowNumber}: {r.error}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs sm:text-sm text-slate-600 font-medium">
                {importResult ? (
                  <>
                    Akan menambahkan{' '}
                    <strong className="text-emerald-800 font-bold">
                      {duplicateMode === 'OVERWRITE'
                        ? importResult.validRows.length + importResult.duplicateRows.length
                        : importResult.validRows.length}
                    </strong>{' '}
                    siswa ke sistem.
                  </>
                ) : (
                  'Pilih file Excel untuk memulai pratinjau'
                )}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={
                    !importResult ||
                    (importResult.validRows.length === 0 &&
                      (duplicateMode === 'SKIP' || importResult.duplicateRows.length === 0))
                  }
                  className="px-5 py-2.5 rounded-xl font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Simpan &amp; Impor Siswa Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Single Student Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-heading font-black text-xl text-blue-950">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    NIS (Nomor Induk Siswa) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nis || ''}
                    onChange={e => setFormData({ ...formData, nis: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    placeholder="23241001"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">NISN (Opsional)</label>
                  <input
                    type="text"
                    value={formData.nisn || ''}
                    onChange={e => setFormData({ ...formData, nisn: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    placeholder="0068123456"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  required
                  value={formData.nama || ''}
                  onChange={e => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold text-slate-900"
                  placeholder="Muhammad Rizky Pratama"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-800">Kelas *</label>
                    <span className="text-[11px] text-blue-900 font-semibold">21 Rombel Resmi</span>
                  </div>
                  <select
                    required
                    value={formData.kelas || 'XII TKJ 1'}
                    onChange={e => {
                      const selectedKls = e.target.value;
                      const autoJurusan = getJurusanByClassName(selectedKls);
                      const autoPulang =
                        config.jam_pulang_per_kelas?.[selectedKls] ||
                        getDefaultDepartureForClass(selectedKls);
                      setFormData({
                        ...formData,
                        kelas: selectedKls,
                        jurusan: autoJurusan,
                        jam_pulang: autoPulang,
                      });
                    }}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold text-slate-900"
                  >
                    <optgroup label="Kelas XII (7 Rombel)">
                      {MASTER_KELAS_LIST.filter(k => k.tingkat === 'XII').map(k => (
                        <option key={k.kelas} value={k.kelas}>
                          {k.kelas} - {k.namaJurusan}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Kelas XI (7 Rombel)">
                      {MASTER_KELAS_LIST.filter(k => k.tingkat === 'XI').map(k => (
                        <option key={k.kelas} value={k.kelas}>
                          {k.kelas} - {k.namaJurusan}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Kelas X (7 Rombel)">
                      {MASTER_KELAS_LIST.filter(k => k.tingkat === 'X').map(k => (
                        <option key={k.kelas} value={k.kelas}>
                          {k.kelas} - {k.namaJurusan}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Jurusan / Kompetensi *</label>
                  <input
                    type="text"
                    required
                    value={formData.jurusan || ''}
                    onChange={e => setFormData({ ...formData, jurusan: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium text-slate-900"
                    placeholder="Teknik Komputer & Jaringan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Jadwal Pulang Khusus *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.jam_pulang || '15:00'}
                    onChange={e => setFormData({ ...formData, jam_pulang: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <span className="text-xs text-slate-500 mt-1 block">
                    Batas waktu minimal siswa boleh scan pulang.
                  </span>
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.jenis_kelamin || 'L'}
                    onChange={e =>
                      setFormData({ ...formData, jenis_kelamin: e.target.value as 'L' | 'P' })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    No. WhatsApp Orang Tua *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.no_wa_ortu || ''}
                    onChange={e => setFormData({ ...formData, no_wa_ortu: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    placeholder="081234567890"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    value={formData.nama_ortu || ''}
                    onChange={e => setFormData({ ...formData, nama_ortu: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    placeholder="Bambang Pratama"
                  />
                </div>
              </div>

              {/* Foto Siswa & Pas Foto Kartu Absensi */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-blue-900" />
                      <span>Pas Foto Kartu Absensi (Standar 3:4)</span>
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Foto langsung tersimpan ke database & tampil di kartu absensi QR
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Auto-Crop 3:4
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Preview Pas Foto */}
                  <div className="relative group shrink-0">
                    <div className="w-20 h-26 rounded-xl overflow-hidden border-2 border-amber-400 bg-slate-200 shadow-sm flex items-center justify-center">
                      {isPhotoLoading ? (
                        <div className="flex flex-col items-center justify-center p-2 text-center text-slate-600 text-xs">
                          <RefreshCw className="w-5 h-5 animate-spin text-blue-900 mb-1" />
                          <span>Memproses...</span>
                        </div>
                      ) : formData.foto_url ? (
                        <img
                          src={formData.foto_url}
                          alt={formData.nama || 'Preview Foto'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center text-slate-400 text-xs p-1">
                          <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                          <span>Belum Ada Foto</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Buttons */}
                  <div className="flex-1 w-full space-y-2">
                    <input
                      ref={photoFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handlePhotoFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => photoFileInputRef.current?.click()}
                        disabled={isPhotoLoading}
                        className="px-4 py-2 rounded-xl bg-blue-950 hover:bg-black text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Unggah Foto dari HP / Komputer</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetToDefaultPhoto}
                        className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        title="Gunakan avatar standar"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Default</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition cursor-pointer"
                      >
                        {showUrlInput ? 'Tutup URL' : 'Input URL Web'}
                      </button>
                    </div>

                    {photoError && (
                      <p className="text-xs text-rose-600 font-semibold">{photoError}</p>
                    )}

                    {showUrlInput && (
                      <div className="mt-2">
                        <input
                          type="url"
                          value={formData.foto_url || ''}
                          onChange={e => setFormData({ ...formData, foto_url: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs font-mono"
                          placeholder="https://contoh-domain.com/foto.jpg"
                        />
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500">
                      Mendukung format JPG, PNG, atau WebP. Gambar otomatis disesuaikan dengan rasio pas foto 3:4 kartu pelajar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-bold bg-blue-950 hover:bg-black text-amber-300 flex items-center gap-2 shadow-md transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Student Card Preview Modal */}
      {isQrModalOpen && viewingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <h3 className="font-heading font-black text-base sm:text-lg text-blue-950">
                Kartu Absensi: {viewingStudent.nama}
              </h3>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-center py-2">
              <IdCard siswa={viewingStudent} config={config} orientation="landscape" side="front" />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-sm">
              <span className="text-slate-600 font-mono font-bold">NIS: {viewingStudent.nis}</span>
              <a
                href={`https://wa.me/${formatPhoneNumber(viewingStudent.no_wa_ortu)}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 hover:text-emerald-950 font-bold flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Hubungi Orang Tua</span>
              </a>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Photo Upload Result / Progress Modal */}
      {isBulkPhotoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-2xl border border-slate-200 max-w-2xl w-full space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg text-slate-900">
                    Upload Pas Foto Massal Siswa
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pencocokan otomatis berkas pas foto sesuai NIS / Nama siswa
                  </p>
                </div>
              </div>
              {!isBulkPhotoProcessing && (
                <button
                  onClick={() => {
                    setIsBulkPhotoModalOpen(false);
                    setBulkPhotoResult(null);
                  }}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Processing State */}
            {isBulkPhotoProcessing && (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto text-indigo-600 animate-pulse">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">
                    Memproses &amp; Mengompres Pas Foto ({bulkPhotoProgress.current} dari {bulkPhotoProgress.total})
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    Sedang memproses: {bulkPhotoProgress.currentName}
                  </p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden max-w-md mx-auto">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-200"
                    style={{
                      width: `${bulkPhotoProgress.total > 0 ? (bulkPhotoProgress.current / bulkPhotoProgress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Completed State */}
            {!isBulkPhotoProcessing && bulkPhotoResult && (
              <div className="space-y-4">
                {/* Summary stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <span className="text-[11px] font-bold text-slate-500 block uppercase">Total File</span>
                    <span className="text-xl font-black text-slate-800">{bulkPhotoResult.totalFiles}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                    <span className="text-[11px] font-bold text-emerald-600 block uppercase">Berhasil Terpasang</span>
                    <span className="text-xl font-black text-emerald-700">{bulkPhotoResult.matched.length} Siswa</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-bold text-amber-600 block uppercase">Tidak Cocok</span>
                    <span className="text-xl font-black text-amber-700">{bulkPhotoResult.unmatched.length}</span>
                  </div>
                </div>

                {/* Matched Students Grid */}
                {bulkPhotoResult.matched.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Pas Foto Siswa Berhasil Terpasang ke Database &amp; Kartu:</span>
                    </h5>
                    <div className="max-h-56 overflow-y-auto space-y-1.5 p-1 bg-slate-50 rounded-xl border border-slate-200">
                      {bulkPhotoResult.matched.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 text-xs"
                        >
                          <img
                            src={m.photoUrl}
                            alt={m.nama}
                            className="w-8 h-10 object-cover rounded border border-amber-300 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">{m.nama}</p>
                            <p className="text-[11px] text-slate-500 font-mono">NIS: {m.nis}</p>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate max-w-[150px]">
                            {m.filename}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unmatched Files Warning */}
                {bulkPhotoResult.unmatched.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                    <p className="font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{bulkPhotoResult.unmatched.length} berkas foto tidak cocok dengan NIS siswa:</span>
                    </p>
                    <p className="text-amber-800 mt-1 font-mono text-[11px] max-h-20 overflow-y-auto">
                      {bulkPhotoResult.unmatched.join(', ')}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      Tip: Beri nama file sesuai NIS siswa (contoh: <code className="font-bold">124015101.jpg</code>), lalu pilih file lagi.
                    </p>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsBulkPhotoModalOpen(false);
                      setBulkPhotoResult(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    Selesai &amp; Simpan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
