import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Siswa, SchoolConfig } from '../types';
import { IdCard } from './IdCard';
import { SchoolLogo } from './SchoolLogo';
import { MASTER_KELAS_LIST } from '../utils/classConfig';

interface CardGeneratorProps {
  students: Siswa[];
  config: SchoolConfig;
}

export const CardGenerator: React.FC<CardGeneratorProps> = ({ students, config }) => {
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
                    <div className="no-print text-center text-sm text-slate-700 mt-1 font-medium">
                      <span className="font-bold text-slate-900">{student.nama}</span>
                      <span className="text-slate-400"> • </span>
                      <span className="font-mono font-bold text-blue-950">{student.nis}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
