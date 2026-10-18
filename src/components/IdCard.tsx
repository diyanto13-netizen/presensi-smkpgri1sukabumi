import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Siswa, SchoolConfig } from '../types';
import { SchoolLogo } from './SchoolLogo';

interface IdCardProps {
  siswa: Siswa;
  config: SchoolConfig;
  orientation?: 'portrait' | 'landscape';
  side?: 'front' | 'back';
}

export const IdCard: React.FC<IdCardProps> = ({
  siswa,
  config,
  orientation = 'landscape',
  side = 'front',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    // Generate clean high-resolution QR Code from NIS with high contrast and optimal error correction
    QRCode.toDataURL(siswa.nis, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating QR:', err));
  }, [siswa.nis]);

  // Official School Insignia Component (Vector Shield or Custom Uploaded Logo)
  const OfficialLogo = ({ size = 26 }: { size?: number }) => (
    <div
      style={{ width: size, height: size }}
      className="shrink-0 flex items-center justify-center select-none"
    >
      <SchoolLogo
        src={config.logo_url}
        size={size}
        className="w-full h-full object-contain drop-shadow-xs"
        alt="Logo SMKS PGRI 1 Kota Sukabumi"
      />
    </div>
  );

  // Digital Official Institutional Stamp
  const DigitalStamp = () => (
    <div className="relative inline-block text-center opacity-90 select-none">
      <div className="w-13 h-13 rounded-full border-2 border-dashed border-blue-700/70 p-1 flex items-center justify-center rotate-[-10deg]">
        <div className="w-full h-full rounded-full border border-blue-600/70 flex flex-col items-center justify-center text-[5px] leading-tight text-blue-800 font-bold uppercase tracking-tighter">
          <span>SMKS PGRI 1</span>
          <span className="text-[4px] text-amber-600 font-black">★ SUKABUMI ★</span>
          <span className="text-[4.5px] text-emerald-700 font-extrabold">RESMI / SAH</span>
        </div>
      </div>
    </div>
  );

  // ==================== LANDSCAPE VIEW ====================
  if (orientation === 'landscape') {
    // BACK LANDSCAPE
    if (side === 'back') {
      return (
        <div className="id-card-landscape bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden relative flex flex-col justify-between text-slate-800 p-3 select-none">
          {/* Top header accent */}
          <div className="flex items-center justify-between border-b-2 border-amber-400 pb-1.5">
            <div className="flex items-center gap-2">
              <OfficialLogo size={24} />
              <div>
                <p className="text-[5.5px] uppercase tracking-wider text-slate-500 font-bold leading-none">
                  YPLP DIKDASMEN PGRI
                </p>
                <div className="text-[8.5px] font-heading font-black tracking-wider uppercase text-blue-950 leading-tight">
                  KETENTUAN KARTU ABSENSI
                </div>
              </div>
            </div>
            <div className="text-[7.5px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              SMKS PGRI 1 SUKABUMI
            </div>
          </div>

          {/* Rules list */}
          <div className="text-[7.2px] leading-relaxed text-slate-600 space-y-1 my-1">
            <p>1. Kartu Absensi ini adalah identitas resmi presensi siswa SMKS PGRI 1 Kota Sukabumi.</p>
            <p>2. Wajib dibawa setiap hari dan digunakan saat pemindaian QR Code di terminal presensi.</p>
            <p>3. Kartu ini tidak dapat dipindahtangankan kepada orang lain dalam bentuk apapun.</p>
            <p>4. Apabila hilang atau rusak, segera melapor kepada pihak Kesiswaan / Tata Usaha.</p>
          </div>

          {/* Bottom signature and school metadata */}
          <div className="flex items-end justify-between pt-1 border-t border-slate-200">
            <div className="text-[6.2px] text-slate-500 leading-tight max-w-[150px]">
              <p className="font-bold text-blue-950">SMKS PGRI 1 KOTA SUKABUMI</p>
              <p className="truncate">{config.alamat}</p>
              <p>NPSN: {config.npsn} • Telp: {config.telepon}</p>
            </div>

            <div className="flex items-center gap-1.5">
              <DigitalStamp />
              <div className="text-right text-[7px] leading-tight text-slate-800">
                <p className="text-[6px] text-slate-500">Sukabumi, Juli 2026</p>
                <p className="font-bold text-blue-950">Kepala Sekolah,</p>
                <div className="h-5 flex items-center justify-end">
                  <span className="font-serif italic text-[8.5px] text-blue-950 underline font-black">
                    {config.kepala_sekolah}
                  </span>
                </div>
                <p className="text-[5.8px] text-slate-500 font-mono">NIP. {config.nip_kepsek}</p>
              </div>
            </div>
          </div>

          {/* Micro gold border base */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-950 via-amber-400 to-blue-950" />
        </div>
      );
    }

    // FRONT LANDSCAPE
    return (
      <div className="id-card-landscape bg-gradient-to-br from-slate-50 via-white to-blue-50/50 rounded-xl shadow-md border border-slate-300 overflow-hidden relative flex flex-col justify-between select-none">
        {/* Navy & Gold Header */}
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white px-3 py-1.5 flex items-center justify-between border-b-2 border-amber-400 shrink-0">
          <div className="flex items-center gap-2.5">
            <OfficialLogo size={34} />
            <div className="leading-tight">
              <p className="text-[5.5px] uppercase tracking-wider text-amber-300 font-bold">
                YPLP DIKDASMEN PGRI KOTA SUKABUMI
              </p>
              <h2 className="text-[10px] font-heading font-black tracking-tight text-white leading-none mt-0.5">
                SMKS PGRI 1 KOTA SUKABUMI
              </h2>
              <p className="text-[5.5px] text-slate-300 font-medium mt-0.5">
                NPSN: {config.npsn} • {config.akreditasi}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 text-[7px] font-black px-2 py-0.5 rounded-full shadow-xs uppercase tracking-widest border border-amber-200">
              KARTU ABSENSI
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-2.5 flex-1 flex items-center justify-between gap-2.5">
          {/* Photo & Class Badge */}
          <div className="flex flex-col items-center shrink-0">
            <div className="w-[52px] h-[64px] rounded-lg overflow-hidden border-2 border-amber-400 shadow-sm bg-slate-200">
              <img
                src={
                  siswa.foto_url ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80'
                }
                alt={siswa.nama}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="mt-1 text-[6.5px] font-black px-2 py-0.5 rounded-full bg-blue-950 text-amber-300 border border-blue-800">
              {siswa.kelas}
            </span>
          </div>

          {/* Student Bio Details (No Jam Pulang here!) */}
          <div className="flex-1 min-w-0 pr-1">
            <h3 className="text-[11px] font-heading font-black text-blue-950 truncate leading-tight">
              {siswa.nama}
            </h3>

            <div className="grid grid-cols-[38px_1fr] text-[7.5px] gap-y-0.5 mt-1 text-slate-700">
              <span className="text-slate-500 font-medium">NIS</span>
              <span className="font-mono font-bold text-blue-900">: {siswa.nis}</span>

              {siswa.nisn && (
                <>
                  <span className="text-slate-500 font-medium">NISN</span>
                  <span className="font-mono font-semibold text-slate-800">: {siswa.nisn}</span>
                </>
              )}

              <span className="text-slate-500 font-medium">Jurusan</span>
              <span className="font-semibold text-slate-800 truncate">: {siswa.jurusan}</span>

              <span className="text-slate-500 font-medium">Status</span>
              <span className="text-emerald-700 font-bold">: SISWA AKTIF</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center justify-center shrink-0 pl-1 border-l border-slate-200">
            <div className="p-1 bg-white rounded-lg border border-slate-300 shadow-sm">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR ${siswa.nis}`} className="w-[60px] h-[60px] object-contain" />
              ) : (
                <div className="w-[60px] h-[60px] bg-slate-100 animate-pulse rounded" />
              )}
            </div>
            <span className="text-[6.5px] font-mono font-bold text-slate-600 mt-0.5 tracking-tight">
              {siswa.nis}
            </span>
          </div>
        </div>

        {/* Bottom accent stripe */}
        <div className="h-1 bg-gradient-to-r from-blue-950 via-amber-400 to-blue-950" />
      </div>
    );
  }

  // ==================== PORTRAIT VIEW (PRECISION KOP & ELEGANT DESIGN) ====================
  // BACK PORTRAIT
  if (side === 'back') {
    return (
      <div className="id-card-portrait bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden relative flex flex-col justify-between text-slate-800 p-2.5 select-none">
        <div className="border-b-2 border-amber-400 pb-1.5 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <OfficialLogo size={22} />
            <span className="text-[6.5px] uppercase tracking-wider text-slate-600 font-bold">
              SMKS PGRI 1 KOTA SUKABUMI
            </span>
          </div>
          <h4 className="text-[8.5px] font-heading font-black text-blue-950 uppercase tracking-wide">
            KETENTUAN KARTU ABSENSI
          </h4>
        </div>

        <div className="text-[6.8px] leading-relaxed text-slate-600 space-y-1 my-1 px-1">
          <p>1. Kartu Absensi ini adalah identitas resmi presensi siswa SMKS PGRI 1 Kota Sukabumi.</p>
          <p>2. Wajib dibawa setiap hari kerja untuk pemindaian kode QR di terminal absensi gerbang sekolah.</p>
          <p>3. Dilarang keras memindahtangankan kartu kepada siapapun.</p>
          <p>4. Simpan dengan baik. Kehilangan wajib lapor ke pihak Kesiswaan / Tata Usaha.</p>
        </div>

        <div className="border-t border-slate-200 pt-1 flex flex-col items-center text-center">
          <DigitalStamp />
          <p className="text-[6px] text-slate-500 mt-0.5">Sukabumi, Juli 2026</p>
          <p className="text-[7px] font-bold text-blue-950">Kepala Sekolah,</p>
          <p className="text-[8px] font-serif font-black italic text-blue-950 underline mt-0.5">
            {config.kepala_sekolah}
          </p>
          <p className="text-[5.5px] font-mono text-slate-500">NIP. {config.nip_kepsek}</p>
          <p className="text-[5px] text-slate-400 mt-0.5 truncate max-w-[180px]">
            {config.alamat}
          </p>
        </div>

        {/* Micro gold border base */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-950 via-amber-400 to-blue-950" />
      </div>
    );
  }

  // FRONT PORTRAIT (ELEGANT, HIGH PRESTIGE, ULTRA-PRECISE KOP, NO JAM PULANG)
  return (
    <div className="id-card-portrait bg-gradient-to-b from-slate-50 via-white to-blue-50/40 rounded-xl shadow-md border border-slate-300 overflow-hidden relative flex flex-col justify-between select-none">
      {/* 1. Ultra-Precise Formal Kop Sekolah */}
      <div className="bg-gradient-to-b from-slate-950 via-blue-950 to-indigo-950 text-white px-2.5 pt-2 pb-1.5 text-center relative border-b-2 border-amber-400 shrink-0">
        <div className="flex items-center justify-center gap-2 mb-1 px-0.5">
          <OfficialLogo size={38} />
          <div className="text-left leading-none flex-1 min-w-0">
            <p className="text-[5.5px] uppercase tracking-wider text-amber-300 font-bold truncate">
              YPLP DIKDASMEN PGRI KOTA SUKABUMI
            </p>
            <h2 className="text-[9.5px] font-heading font-black text-white tracking-tight uppercase mt-0.5 truncate">
              SMKS PGRI 1 KOTA SUKABUMI
            </h2>
            <p className="text-[5px] text-slate-300 font-medium tracking-wide mt-0.5">
              NPSN: {config.npsn} • {config.akreditasi}
            </p>
          </div>
        </div>

        {/* Gold Accent Badge "KARTU ABSENSI" */}
        <div className="inline-block bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 text-[6.5px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest shadow-xs border border-amber-200">
          ✦ KARTU ABSENSI ✦
        </div>
      </div>

      {/* 2. Middle Body: Photo, Student Info & Class (NO Jam Pulang!) */}
      <div className="px-2 py-1.5 flex flex-col items-center flex-1 justify-center">
        {/* Student Photo with Luxury Double Frame */}
        <div className="p-0.5 rounded-xl bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 shadow-sm mb-1">
          <div className="w-[54px] h-[66px] rounded-[10px] overflow-hidden bg-slate-200">
            <img
              src={
                siswa.foto_url ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80'
              }
              alt={siswa.nama}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Name */}
        <h3 className="text-[10px] font-heading font-black text-blue-950 text-center leading-tight truncate max-w-[185px]">
          {siswa.nama}
        </h3>

        {/* NIS Badge */}
        <div className="mt-0.5 flex items-center justify-center gap-1">
          <span className="font-mono font-bold text-[7.5px] text-blue-950 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200">
            NIS: {siswa.nis}
          </span>
        </div>

        {/* Class & Department Badge */}
        <div className="mt-1 flex flex-col items-center text-center">
          <span className="px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 text-[7px] font-black uppercase tracking-wide border border-amber-400/50">
            {siswa.kelas}
          </span>
          <p className="text-[6.5px] font-bold text-slate-600 truncate max-w-[170px] mt-0.5">
            {siswa.jurusan}
          </p>
        </div>

        {/* QR Code Container */}
        <div className="mt-1.5 p-1 bg-white rounded-lg border border-slate-300 shadow-xs flex flex-col items-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR ${siswa.nis}`} className="w-[54px] h-[54px] object-contain" />
          ) : (
            <div className="w-[54px] h-[54px] bg-slate-100 animate-pulse rounded" />
          )}
        </div>
        <span className="text-[5.5px] font-mono font-bold text-slate-500 mt-0.5 tracking-wider">
          SCAN QR PRESENSI
        </span>
      </div>

      {/* 3. Bottom Dual-Stripe Accent Ribbon */}
      <div className="h-1.5 bg-gradient-to-r from-blue-950 via-amber-400 to-blue-950 shrink-0" />
    </div>
  );
};
