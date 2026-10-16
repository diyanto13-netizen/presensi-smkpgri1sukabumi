import React, { useState } from 'react';
import { Database, FileCode, Copy, Check, Terminal, Shield, Key } from 'lucide-react';

export const SqlSchemaGuide: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sqlSchemaCode = `-- ========================================================
-- SKEMA DATABASE POSTGRESQL / SUPABASE
-- SISTEM PRESENSI QR & KARTU PELAJAR SMKS PGRI 1 SUKABUMI
-- ========================================================

-- 1. Enable extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM Tipe Status Absensi
CREATE TYPE status_kehadiran_type AS ENUM (
  'TEPAT_WAKTU',
  'TERLAMBAT',
  'PULANG',
  'IZIN',
  'SAKIT',
  'ALPA'
);

-- 3. Tabel Master Data Siswa
CREATE TABLE IF NOT EXISTS public.siswa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nis VARCHAR(20) UNIQUE NOT NULL,
    nisn VARCHAR(20),
    nama VARCHAR(150) NOT NULL,
    jenis_kelamin VARCHAR(2) NOT NULL DEFAULT 'L',
    kelas VARCHAR(50) NOT NULL,
    jurusan VARCHAR(100) NOT NULL,
    no_wa_ortu VARCHAR(20) NOT NULL,
    nama_ortu VARCHAR(100),
    jam_pulang TIME NOT NULL DEFAULT '15:00:00',
    foto_url TEXT,
    alamat TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing tabel siswa
CREATE INDEX idx_siswa_nis ON public.siswa(nis);
CREATE INDEX idx_siswa_kelas ON public.siswa(kelas);

-- 4. Tabel Transaksi Absensi Harian
CREATE TABLE IF NOT EXISTS public.absensi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    siswa_id UUID REFERENCES public.siswa(id) ON DELETE CASCADE,
    nis VARCHAR(20) NOT NULL,
    nama VARCHAR(150) NOT NULL,
    kelas VARCHAR(50) NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_masuk TIME,
    status_masuk VARCHAR(20), -- 'TEPAT_WAKTU' atau 'TERLAMBAT'
    jam_pulang TIME,
    status_pulang VARCHAR(20), -- 'PULANG'
    status_akhir status_kehadiran_type NOT NULL DEFAULT 'TEPAT_WAKTU',
    keterangan TEXT,
    notifikasi_wa_terkirim BOOLEAN DEFAULT FALSE,
    notifikasi_wa_detail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraint: 1 Siswa hanya memiliki 1 baris absensi per tanggal
    CONSTRAINT unique_siswa_tanggal UNIQUE (nis, tanggal)
);

-- Indexing tabel absensi
CREATE INDEX idx_absensi_tanggal ON public.absensi(tanggal);
CREATE INDEX idx_absensi_nis_tanggal ON public.absensi(nis, tanggal);
CREATE INDEX idx_absensi_kelas ON public.absensi(kelas);

-- 5. Row Level Security (RLS) Supabase
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses publik baca siswa" ON public.siswa FOR SELECT USING (true);
CREATE POLICY "Akses publik tulis absensi" ON public.absensi FOR ALL USING (true);
`;

  const envGuideCode = `# ========================================================
# ENVIRONMENT VARIABLES (.env.local / .env)
# SISTEM PRESENSI QR SMKS PGRI 1 SUKABUMI
# ========================================================

# 1. Kredensial Supabase (PostgreSQL)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 2. Fonnte WhatsApp Gateway API
FONNTE_TOKEN=your_fonnte_api_token_here
FONNTE_TEST_MODE=true

# 3. Konfigurasi Jam Sekolah (Default: SMKS PGRI 1 Sukabumi)
NEXT_PUBLIC_JAM_BATAS_MASUK=07:00
NEXT_PUBLIC_NAMA_SEKOLAH="SMKS PGRI 1 KOTA SUKABUMI"
NEXT_PUBLIC_NPSN="20221574"
NEXT_PUBLIC_ALAMAT="Jl. Pelabuhan II Perum Cipoho Indah, Cikondang-Citamiang Kota Sukabumi"
`;

  const nextJsRouteCode = `// ========================================================
// FILE: /app/api/absen/route.ts (Next.js App Router)
// Logika Validasi Waktu Masuk/Pulang & Trigger Fonnte WA
// ========================================================

import { NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nis, forcedMode = 'AUTO' } = body;

    if (!nis) {
      return NextResponse.json({ success: false, message: 'NIS wajib diisi' }, { status: 400 });
    }

    // 1. Dapatkan waktu saat ini di WIB
    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta'
    });
    const todayDate = now.toISOString().split('T')[0];

    // 2. Query Siswa dari Database (Contoh Supabase)
    // const { data: student } = await supabase.from('siswa').select('*').eq('nis', nis).single();
    // if (!student) return NextResponse.json({ success: false, message: 'Siswa tidak ditemukan' }, { status: 404 });

    // 3. Logika Jam Masuk vs Jam Pulang
    // Misal: jam_masuk_batas = '07:00'
    // Jika currentTimeStr <= '07:00' -> status = 'TEPAT_WAKTU'
    // Jika currentTimeStr > '07:00' -> status = 'TERLAMBAT'

    // 4. Validasi Absen Pulang (Sesuai Jam Pulang Per Kelas)
    // Setiap kelas memiliki jam pulang yang berbeda (misal: Kelas XII = 15:30, Kelas XI = 15:00, Kelas X = 14:30)
    // Cek apakah currentTimeStr >= student.jam_pulang (atau jam_pulang_per_kelas)
    // Jika currentTimeStr < student.jam_pulang -> Tolak absensi pulang!

    // 5. Trigger Fonnte WhatsApp API
    const fonnteRes = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: process.env.FONNTE_TOKEN || '' },
      body: new URLSearchParams({
        target: '081234567890',
        message: \`*SMKS PGRI 1 SUKABUMI*\\nPresensi tercatat...\`,
        countryCode: '62'
      })
    });

    return NextResponse.json({
      success: true,
      message: 'Absensi berhasil diproses',
      time: currentTimeStr
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200">
            DOKUMENTASI TEKNIS &amp; SETUP
          </span>
          <span className="text-xs sm:text-sm text-slate-600 font-semibold">PostgreSQL / Supabase &amp; Fonnte API</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-black text-blue-950 mt-1.5">
          Panduan Skema Database &amp; API Routes
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-1 leading-relaxed font-medium">
          Berikut adalah skema tabel database (SQL), konfigurasi file <code>.env</code>, dan struktur backend route lengkap untuk integrasi ke Supabase dan Fonnte WhatsApp.
        </p>
      </div>

      {/* SQL Schema Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-amber-400" />
            <h3 className="font-heading font-bold text-sm sm:text-base text-slate-100">
              1. Skema Database PostgreSQL / Supabase (`schema.sql`)
            </h3>
          </div>
          <button
            onClick={() => copyToClipboard(sqlSchemaCode, 'sql')}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-2 transition cursor-pointer"
          >
            {copiedSection === 'sql' ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin SQL</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-5 text-xs sm:text-sm font-mono bg-slate-950 text-emerald-400 overflow-x-auto max-h-[380px] leading-relaxed">
          {sqlSchemaCode}
        </pre>
      </div>

      {/* Environment Variables (.env) Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-amber-400" />
            <h3 className="font-heading font-bold text-sm sm:text-base text-slate-100">
              2. Konfigurasi Lingkungan (`.env.local`)
            </h3>
          </div>
          <button
            onClick={() => copyToClipboard(envGuideCode, 'env')}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-2 transition cursor-pointer"
          >
            {copiedSection === 'env' ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin .env</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-5 text-xs sm:text-sm font-mono bg-slate-950 text-amber-300 overflow-x-auto max-h-[260px] leading-relaxed">
          {envGuideCode}
        </pre>
      </div>

      {/* Backend API Route Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileCode className="w-5 h-5 text-amber-400" />
            <h3 className="font-heading font-bold text-sm sm:text-base text-slate-100">
              3. API Route Backend (`/app/api/absen/route.ts`)
            </h3>
          </div>
          <button
            onClick={() => copyToClipboard(nextJsRouteCode, 'route')}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-2 transition cursor-pointer"
          >
            {copiedSection === 'route' ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Route Code</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-5 text-xs sm:text-sm font-mono bg-slate-950 text-cyan-300 overflow-x-auto max-h-[380px] leading-relaxed">
          {nextJsRouteCode}
        </pre>
      </div>
    </div>
  );
};
