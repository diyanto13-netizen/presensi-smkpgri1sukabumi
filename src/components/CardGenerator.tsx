import React, { useState, useMemo, useRef } from 'react';
import {
  Printer,
  Filter,
  Search,
  CheckSquare,
  Square,
  Layers,
  RotateCw,
  Info,
  CreditCard,
  Sparkles,
  Camera,
  Upload,
  X,
  Check,
  RotateCcw,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { Siswa, SchoolConfig } from '../types';
import { IdCard } from './IdCard';
import { SchoolLogo } from './SchoolLogo';
import { MASTER_KELAS_LIST } from '../utils/classConfig';
import { compressAndFormatStudentPhoto } from '../utils/imageUtils';

interface CardGeneratorProps {
  students: Siswa[];
  config: SchoolConfig;
  onUpdateStudents?: (updated: Siswa[]) => void;
}

export const CardGenerator: React.FC<CardGeneratorProps> = ({
  students,
  config,
  onUpdateStudents,
}) => {
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [cardSide, setCardSide] = useState<'front' | 'back' | 'both'>('front');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedJurusan, setSelectedJurusan] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    students.map(s => s.id)
  );

  // Extract unique classes and departments
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => set.add(s.kelas));
    return Array.from(set).sort();
  }, [students]);

  const availableJurusan = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => set.add(s.jurusan));
    return Array.from(set).sort();
  }, [students]);

  // Quick Photo Edit Modal States
  const [photoModalStudent, setPhotoModalStudent] = useState<Siswa | null>(null);
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string>('');
  const [isPhotoProcessing, setIsPhotoProcessing] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const cardPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenPhotoModal = (student: Siswa) => {
    setPhotoModalStudent(student);
    setTempPhotoUrl(student.foto_url || '');
    setPhotoError(null);
  };

  const handleCardPhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsPhotoProcessing(true);
      setPhotoError(null);
      const dataUrl = await compressAndFormatStudentPhoto(file);
      setTempPhotoUrl(dataUrl);
    } catch (err: any) {
      console.error('Error processing card photo:', err);
      setPhotoError(err.message || 'Gagal memproses foto.');
    } finally {
      setIsPhotoProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveCardPhoto = () => {
    if (!photoModalStudent || !onUpdateStudents) return;
    const updated = students.map(s =>
      s.id === photoModalStudent.id ? { ...s, foto_url: tempPhotoUrl } : s
    );
    onUpdateStudents(updated);
    setPhotoModalStudent(null);
  };

  const handleResetCardPhoto = () => {
    if (!photoModalStudent) return;
    const defaultPhoto =
      photoModalStudent.jenis_kelamin === 'P'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80';
    setTempPhotoUrl(defaultPhoto);
  };

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = selectedClass === 'ALL' || s.kelas === selectedClass;
      const matchJurusan = selectedJurusan === 'ALL' || s.jurusan === selectedJurusan;
      const matchSearch =
        searchQuery === '' ||
        s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis.includes(searchQuery) ||
        (s.nisn && s.nisn.includes(searchQuery));
      return matchClass && matchJurusan && matchSearch;
    });
  }, [students, selectedClass, selectedJurusan, searchQuery]);

  // Bulk selection controls
  const handleSelectAll = () => {
    setSelectedStudentIds(filteredStudents.map(s => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Trigger Print to PDF
  const handlePrint = () => {
    window.print();
  };

  const studentsToPrint = useMemo(() => {
    return filteredStudents.filter(s => selectedStudentIds.includes(s.id));
  }, [filteredStudents, selectedStudentIds]);

  return (
    <div className="space-y-6">
      {/* Top Banner (Hidden when printing) */}
      <div className="no-print bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-18 p-0.5 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 shadow-md hidden sm:flex items-center justify-center border border-amber-300 shrink-0">
              <div className="w-full h-full rounded-xl bg-white/95 flex items-center justify-center p-1 overflow-hidden">
                <SchoolLogo
                  src={config.logo_url}
                  className="w-full h-full object-contain drop-shadow-xs"
                  alt={config.nama_sekolah}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200">
                  STANDAR ISO/IEC 7810 ID-1
                </span>
                <span className="text-xs sm:text-sm text-amber-800 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-300">
                  Kop Yayasan YPLP PGRI
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-blue-950 mt-1.5">
                Generator &amp; Cetak Kartu Absensi QR
              </h1>
              <p className="text-sm sm:text-base text-slate-600 mt-1 leading-relaxed font-medium">
                Buat kartu absensi siswa digital beresolusi tinggi dengan QR Code instan untuk presensi gerbang SMKS PGRI 1 Sukabumi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              disabled={studentsToPrint.length === 0}
              className="px-6 py-3 rounded-xl font-bold text-sm sm:text-base bg-gradient-to-r from-blue-700 via-blue-800 to-blue-950 text-amber-300 hover:from-blue-800 hover:to-black shadow-md flex items-center gap-2.5 transition disabled:opacity-50 disabled:cursor-not-allowed print-include cursor-pointer"
            >
              <Printer className="w-5 h-5 text-amber-300" />
              <span>Cetak {studentsToPrint.length} Kartu Absensi Terpilih</span>
            </button>
          </div>
        </div>

        {/* Print Configuration Controls Bar */}
        <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Orientation Toggle */}
          <div className="md:col-span-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Orientasi Kartu:
            </label>
            <div className="flex items-center bg-slate-100 p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-blue-950 text-amber-300 shadow-sm'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <CreditCard className="w-4 h-4 rotate-90" />
                <span>Landscape (85.6x54)</span>
              </button>
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-blue-950 text-amber-300 shadow-sm'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Portrait (54x85.6)</span>
              </button>
            </div>
          </div>

          {/* Card Side Toggle */}
          <div className="md:col-span-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Sisi Kartu:
            </label>
            <div className="flex items-center bg-slate-100 p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => setCardSide('front')}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition cursor-pointer ${
                  cardSide === 'front'
                    ? 'bg-blue-950 text-amber-300 shadow-sm'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                Depan
              </button>
              <button
                type="button"
                onClick={() => setCardSide('back')}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition cursor-pointer ${
                  cardSide === 'back'
                    ? 'bg-blue-950 text-amber-300 shadow-sm'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                Belakang
              </button>
              <button
                type="button"
                onClick={() => setCardSide('both')}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition cursor-pointer ${
                  cardSide === 'both'
                    ? 'bg-blue-950 text-amber-300 shadow-sm'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                Bolak-Balik
              </button>
            </div>
          </div>

          {/* Filter by Kelas */}
          <div className="md:col-span-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Filter Kelas:
            </label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full py-2.5 px-3.5 text-sm bg-slate-50 border border-slate-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
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

          {/* Search Box */}
          <div className="md:col-span-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Cari Nama / NIS:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari siswa..."
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Selection Toolbar */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSelectAll}
              className="text-blue-700 hover:text-blue-950 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Pilih Semua ({filteredStudents.length})</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={handleDeselectAll}
              className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Square className="w-4 h-4" />
              <span>Batalkan Pilihan</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <Info className="w-4 h-4 text-blue-600" />
            <span>
              Terpilih: <strong className="text-blue-950 font-bold">{studentsToPrint.length}</strong> dari{' '}
              {filteredStudents.length} siswa ditampilkan.
            </span>
          </div>
        </div>
      </div>

      {/* Printable Cards Area */}
      <div className="print-only-container">
        {studentsToPrint.length === 0 ? (
          <div className="no-print bg-white rounded-2xl p-14 text-center text-slate-400 space-y-4 border border-slate-200">
            <div className="w-18 h-18 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Layers className="w-9 h-9" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Tidak Ada Siswa Terpilih</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Silakan centang siswa pada kartu di bawah atau klik tombol &quot;Pilih Semua&quot; untuk mencetak kartu absensi.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Print Grid notice for screen */}
            <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm text-slate-600 px-1 gap-2 font-medium">
              <span>
                Pratinjau Layout Cetak (Ukuran Standar ID-1: {orientation === 'landscape' ? '85.6mm x 54mm' : '54mm x 85.6mm'})
              </span>
              <span className="text-amber-800 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-300 inline-block">
                Tips Cetak: Aktifkan opsi &quot;Background Graphics&quot; di jendela dialog printer browser.
              </span>
            </div>

            {/* Cards Grid */}
            <div className="id-cards-print-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
              {studentsToPrint.map(student => {
                const isSelected = selectedStudentIds.includes(student.id);

                return (
                  <div
                    key={student.id}
                    className="relative group flex flex-col items-center"
                  >
                    {/* Floating Selection Checkbox (Hidden on print) */}
                    <div className="no-print absolute -top-3.5 -right-3.5 z-20">
                      <button
                        onClick={() => toggleSelectStudent(student.id)}
                        className={`p-2 rounded-full shadow-md transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-950 text-amber-400 border border-blue-800'
                            : 'bg-white text-slate-400 border border-slate-300'
                        }`}
                        title="Centang untuk cetak"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4.5 h-4.5" />
                        ) : (
                          <Square className="w-4.5 h-4.5" />
                        )}
                      </button>
                    </div>

                    {/* Front side if requested */}
                    {(cardSide === 'front' || cardSide === 'both') && (
                      <div className="mb-4">
                        <IdCard
                          siswa={student}
                          config={config}
                          orientation={orientation}
                          side="front"
                        />
                      </div>
                    )}

                    {/* Back side if requested */}
                    {(cardSide === 'back' || cardSide === 'both') && (
                      <div className="mb-4">
                        <IdCard
                          siswa={student}
                          config={config}
                          orientation={orientation}
                          side="back"
                        />
                      </div>
                    )}

                    {/* Student quick info footer (hidden on print) */}
                    {/* Student quick info footer (hidden on print) */}
                    <div className="no-print text-center text-sm text-slate-700 mt-1 font-medium flex flex-col items-center gap-1.5">
                      <div>
                        <span className="font-bold text-slate-900">{student.nama}</span>
                        <span className="text-slate-400"> • </span>
                        <span className="font-mono font-bold text-blue-950">{student.nis}</span>
                      </div>
                      {onUpdateStudents && (
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoModal(student)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          title="Ganti foto siswa untuk kartu ini"
                        >
                          <Camera className="w-3.5 h-3.5 text-amber-700" />
                          <span>Ubah Pas Foto</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick Photo Upload Modal (Card Generator) */}
      {photoModalStudent && (
        <div className="no-print fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-amber-300">Ubah Pas Foto Kartu</h3>
                  <p className="text-xs text-slate-300">
                    {photoModalStudent.nama} ({photoModalStudent.kelas})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPhotoModalStudent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="flex flex-col items-center">
                <div className="w-28 h-36 rounded-2xl overflow-hidden border-3 border-amber-400 bg-slate-100 shadow-md flex items-center justify-center relative">
                  {isPhotoProcessing ? (
                    <div className="flex flex-col items-center justify-center p-2 text-center text-slate-600 text-xs">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-950 mb-1" />
                      <span>Memproses foto...</span>
                    </div>
                  ) : tempPhotoUrl ? (
                    <img
                      src={tempPhotoUrl}
                      alt={photoModalStudent.nama}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-slate-400 text-xs p-2">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                      <span>Belum Ada Foto</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-slate-500 font-medium mt-2">
                  Format Pas Foto Standar 3:4
                </span>
              </div>

              {photoError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold text-center">
                  {photoError}
                </div>
              )}

              <input
                ref={cardPhotoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleCardPhotoFileChange}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => cardPhotoInputRef.current?.click()}
                  disabled={isPhotoProcessing}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-950 hover:bg-black text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Pilih Foto dari HP / PC</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetCardPhoto}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Avatar Standar</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                Foto akan otomatis dipotong dan disesuaikan ke rasio 3:4 kartu absensi, serta disimpan langsung ke database PostgreSQL.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPhotoModalStudent(null)}
                className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-200 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveCardPhoto}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Simpan ke Kartu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
