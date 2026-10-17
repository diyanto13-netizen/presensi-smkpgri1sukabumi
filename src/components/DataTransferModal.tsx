import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Copy,
  Check,
  FileJson,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Laptop,
  CheckCircle2,
} from 'lucide-react';
import { Siswa, Absensi, SchoolConfig } from '../types';
import { exportAppDataToJson, parseAppDataFromJson, saveStudents, saveSchoolConfig, saveAttendance } from '../utils/storage';

interface DataTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Siswa[];
  config: SchoolConfig;
  attendanceRecords: Absensi[];
  onApplyImportedData: (data: {
    students: Siswa[];
    config: SchoolConfig;
    attendanceRecords: Absensi[];
  }) => void;
}

export const DataTransferModal: React.FC<DataTransferModalProps> = ({
  isOpen,
  onClose,
  students,
  config,
  attendanceRecords,
  onApplyImportedData,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'code'>('file');
  const [pasteCode, setPasteCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Download JSON
  const handleDownload = () => {
    try {
      exportAppDataToJson(students, config, attendanceRecords);
      setFeedbackNotice({
        type: 'success',
        message: `File cadangan berisi ${students.length} data siswa berhasil diunduh! Sekarang buka file ini di browser Edge.`,
      });
      setTimeout(() => setFeedbackNotice(null), 6000);
    } catch (err: any) {
      setFeedbackNotice({ type: 'error', message: 'Gagal mengunduh file: ' + err.message });
    }
  };

  // Handle File Upload JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseAppDataFromJson(text);

        // Apply to local storage and parent state
        saveStudents(parsed.students);
        if (parsed.config) saveSchoolConfig(parsed.config);
        if (parsed.attendanceRecords) saveAttendance(parsed.attendanceRecords);

        onApplyImportedData({
          students: parsed.students,
          config: parsed.config || config,
          attendanceRecords: parsed.attendanceRecords || attendanceRecords,
        });

        setFeedbackNotice({
          type: 'success',
          message: `Berhasil! ${parsed.students.length} data siswa dan pengaturan telah diterapkan ke browser ini!`,
        });
        setTimeout(() => {
          setFeedbackNotice(null);
          onClose();
        }, 1500);
      } catch (err: any) {
        setFeedbackNotice({
          type: 'error',
          message: 'Gagal membaca file cadangan: ' + err.message,
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  // Generate Compact Code
  const getCompactCode = () => {
    const payload = {
      cfg: config,
      std: students,
      att: attendanceRecords.slice(0, 500),
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  };

  // Handle Copy Code
  const handleCopyCode = async () => {
    try {
      const code = getCompactCode();
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setFeedbackNotice({
        type: 'success',
        message: 'Kode data siswa berhasil disalin! Sekarang buka browser Edge, lalu tempel kode ini.',
      });
      setTimeout(() => setCopied(false), 3000);
      setTimeout(() => setFeedbackNotice(null), 6000);
    } catch (err: any) {
      setFeedbackNotice({ type: 'error', message: 'Gagal menyalin kode: ' + err.message });
    }
  };

  // Handle Apply Paste Code
  const handleApplyCode = () => {
    if (!pasteCode.trim()) {
      setFeedbackNotice({ type: 'error', message: 'Harap masukkan atau tempel kode data terlebih dahulu!' });
      return;
    }

    try {
      const jsonStr = decodeURIComponent(escape(atob(pasteCode.trim())));
      const parsed = JSON.parse(jsonStr);

      if (!parsed.std || !Array.isArray(parsed.std)) {
        throw new Error('Format kode data tidak dikenali.');
      }

      const importedStudents: Siswa[] = parsed.std;
      const importedConfig: SchoolConfig = parsed.cfg || config;
      const importedAttendance: Absensi[] = parsed.att || attendanceRecords;

      saveStudents(importedStudents);
      saveSchoolConfig(importedConfig);
      saveAttendance(importedAttendance);

      onApplyImportedData({
        students: importedStudents,
        config: importedConfig,
        attendanceRecords: importedAttendance,
      });

      setFeedbackNotice({
        type: 'success',
        message: `Berhasil! ${importedStudents.length} data siswa berhasil dipindahkan ke browser ini!`,
      });
      setTimeout(() => {
        setFeedbackNotice(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setFeedbackNotice({
        type: 'error',
        message: 'Kode data tidak valid: ' + err.message,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-400 text-blue-950 shadow-md">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-blue-950">
                  Sinkronisasi Browser
                </span>
                <span className="text-xs text-blue-200 font-mono">Chrome ↔ Edge ↔ HP</span>
              </div>
              <h3 className="text-lg sm:text-xl font-heading font-black text-white mt-0.5">
                Pindahkan Data Siswa Antar Browser
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-4 sm:p-5 bg-blue-50 border-b border-blue-200 text-xs sm:text-sm text-blue-950 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-blue-950">
              Mengapa data di browser Edge berbeda dengan Chrome?
            </p>
            <p className="text-slate-600 leading-relaxed font-medium">
              Aplikasi ini dibuka melalui hosting <strong>Vercel (vercel.app)</strong>. Pada hosting statis Vercel, data siswa disimpan di memori masing-masing browser. Gunakan salah satu cara instan di bawah ini agar data <strong>23 siswa</strong> Anda langsung tampil di Edge!
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center border-b border-slate-200 px-6 pt-3 bg-slate-50 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'file'
                ? 'border-blue-900 text-blue-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileJson className="w-4 h-4 text-blue-700" />
            <span>Cara 1: Unduh &amp; Unggah File (.json)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'code'
                ? 'border-blue-900 text-blue-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Copy className="w-4 h-4 text-indigo-700" />
            <span>Cara 2: Salin Kode Data (Copy-Paste)</span>
          </button>
        </div>

        {/* Notification Toast */}
        {feedbackNotice && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-fadeIn ${
              feedbackNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
                : 'bg-rose-50 text-rose-950 border border-rose-300'
            }`}
          >
            {feedbackNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedbackNotice.message}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'file' && (
            <div className="space-y-5">
              {/* Step 1: Export */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-[11px]">
                    1
                  </span>
                  Langkah di Browser Google Chrome (Tempat data 23 siswa berada)
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Unduh File Cadangan Data</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Mengunduh file JSON berisi <strong>{students.length} siswa</strong> lengkap dengan kelas, jadwal, dan foto.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-blue-900 hover:bg-blue-950 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition shrink-0"
                  >
                    <Download className="w-4 h-4 text-amber-300" />
                    <span>Unduh Cadangan ({students.length} Siswa)</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Import */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[11px]">
                    2
                  </span>
                  Langkah di Browser Microsoft Edge (Yang datanya masih kosong/bawaan)
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">Pasang File Cadangan di Edge</h4>
                    <p className="text-xs text-emerald-800 font-medium">
                      Pilih file cadangan yang tadi diunduh untuk langsung mengisi Edge dengan 23 siswa.
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-700 hover:bg-emerald-800 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition shrink-0"
                  >
                    <Upload className="w-4 h-4 text-emerald-200" />
                    <span>Pilih File Cadangan &amp; Pasang</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-5">
              {/* Step 1: Copy Code */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-[11px]">
                    1
                  </span>
                  Di Browser Google Chrome
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Salin Kode Teks Data</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Salin seluruh data {students.length} siswa menjadi kode teks tanpa perlu mengunduh file.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-indigo-700 hover:bg-indigo-800 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Kode Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-indigo-200" />
                        <span>Salin Kode Data Siswa</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step 2: Paste Code */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[11px]">
                    2
                  </span>
                  Di Browser Microsoft Edge
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1.5">
                    Tempelkan Kode Data di Sini:
                  </label>
                  <textarea
                    rows={3}
                    value={pasteCode}
                    onChange={(e) => setPasteCode(e.target.value)}
                    placeholder="Klik kanan lalu pilih Paste (atau tekan Ctrl+V) di sini..."
                    className="w-full p-3 bg-white border border-emerald-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none text-slate-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyCode}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-emerald-700 hover:bg-emerald-800 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Terapkan Data ke Browser Ini Sekarang</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
