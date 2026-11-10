/**
 * Theme & Color Palette Management Utility
 * Based on the Official Heraldic Colors & Philosophy of Logo SMKS PGRI 1 Kota Sukabumi:
 * 1. Biru Perisai PGRI (#2b75dc / #1e3a8a) - Ilmu pengetahuan, teknologi, keluasan wawasan & profesionalisme
 * 2. Kuning Emas Kejayaan (#f5ce0b / #d97706) - Kejayaan, optimisme, kemuliaan budi pekerti & prestasi emas
 * 3. Hijau Lingkaran Lencana (#009a3e / #059669) - Pertumbuhan karakter, kesuburan ibadah & keteduhan
 * 4. Merah Api Suluh Obor (#dc2626 / #ef4444) - Semangat juang pengabdian pendidikan yang tak pernah padam
 * 5. Putih Tugu & Hitam Tegas (#ffffff & #0f172a) - Kesucian niat, integritas, dan ketegasan disiplin
 */

export type Theme = 'light' | 'dark';
export type ThemePalette = 'aurora' | 'sunrise' | 'slate';

export interface LogoPhilosophyItem {
  colorName: string;
  hex: string;
  element: string;
  meaning: string;
}

export const PGRI_LOGO_PHILOSOPHY: LogoPhilosophyItem[] = [
  {
    colorName: 'Biru Samudra PGRI',
    hex: '#2b75dc',
    element: 'Sisi Kiri Perisai',
    meaning: 'Kedalaman ilmu pengetahuan, penguasaan teknologi informasi, keluasan wawasan, dan profesionalisme.',
  },
  {
    colorName: 'Kuning Emas Kejayaan',
    hex: '#f5ce0b',
    element: 'Sisi Kanan Perisai & Padi-Kapas',
    meaning: 'Kejayaan, kemuliaan akhlak, optimisme masa depan cerah, dan prestasi emas lulusan.',
  },
  {
    colorName: 'Hijau Lencana Pendidikan',
    hex: '#009a3e',
    element: 'Lingkaran Tengah & Gedung',
    meaning: 'Pertumbuhan karakter, kesuburan amal ibadah, keseimbangan iman & takwa, serta keteduhan.',
  },
  {
    colorName: 'Merah Nyala Api Obor',
    hex: '#dc2626',
    element: 'Api Suluh 5 Lidah di Puncak Tugu',
    meaning: 'Semangat juang pengabdian pendidikan yang tak pernah padam dan keberanian berinovasi.',
  },
  {
    colorName: 'Putih Tugu & Hitam Tegas',
    hex: '#0f172a',
    element: 'Tugu Suluh & Bingkai Perisai',
    meaning: 'Kesucian niat pengabdian, transparansi, ketegasan disiplin waktu, dan integritas.',
  },
];

export interface PaletteOption {
  id: ThemePalette;
  name: string;
  shortName: string;
  sourceLabel: string;
  description: string;
  philosophy: string;
  previewBg: string;
  swatches: string[];
  accentColor: string;
  recommendedFor: 'dark' | 'light' | 'both';
  badge?: string;
}

export const THEME_PALETTES: PaletteOption[] = [
  {
    id: 'aurora',
    name: 'Perisai Royal PGRI (Biru & Emas)',
    shortName: 'Perisai Royal PGRI',
    sourceLabel: 'Filosofi Perisai Utama',
    description:
      'Perpaduan elegan Biru Perisai PGRI (#2b75dc) dan Kuning Emas Kejayaan (#f5ce0b) di atas kanvas bersih berkelas. Kontras huruf & angka sangat tajam di Mode Terang maupun Mode Gelap.',
    philosophy:
      'Melambangkan kedalaman ilmu teknologi & profesionalisme (Biru) yang bersanding dengan kejayaan prestasi lulusan (Kuning Emas).',
    previewBg: 'linear-gradient(135deg, #0d214f 0%, #1e40af 48%, #d97706 100%)',
    swatches: ['#1e3a8a', '#2b75dc', '#f5ce0b', '#ffffff'],
    accentColor: '#2b75dc',
    recommendedFor: 'both',
    badge: 'Tema Utama Resmi',
  },
  {
    id: 'sunrise',
    name: 'Suluh Fajar PGRI (Langit, Emas & Obor)',
    shortName: 'Suluh Fajar PGRI',
    sourceLabel: 'Filosofi Obor & Cahaya Pagi',
    description:
      'Nuansa cerah dan hangat yang memadukan Biru Langit PGRI, Kuning Mentari Emas, dan aksen Merah Obor Pendidikan. Sangat nyaman di mata untuk operasional presensi pagi hingga sore.',
    philosophy:
      'Melambangkan nyala api obor PGRI yang tak pernah padam dalam menyinari masa depan siswa dengan semangat pagi dan optimisme.',
    previewBg: 'linear-gradient(135deg, #1d4ed8 0%, #f59e0b 55%, #dc2626 100%)',
    swatches: ['#2b75dc', '#f5ce0b', '#dc2626', '#fffbeb'],
    accentColor: '#d97706',
    recommendedFor: 'light',
    badge: 'Hangat & Optimis',
  },
  {
    id: 'slate',
    name: 'Harmoni Lencana PGRI (Hijau & Tugu Putih)',
    shortName: 'Harmoni Hijau PGRI',
    sourceLabel: 'Filosofi Lingkaran Hijau & Tugu',
    description:
      'Keseimbangan teduh Hijau Lingkaran Lencana (#009a3e), Putih Tugu Bersih, dan Navy Tegas (#0f172a). Memberikan kesan formal, tenang, dan fokus tinggi pada tabel data.',
    philosophy:
      'Melambangkan pertumbuhan karakter, ketaatan ibadah sholat berjamaah, kesucian niat, dan ketegasan disiplin waktu.',
    previewBg: 'linear-gradient(135deg, #064e3b 0%, #009a3e 50%, #1e3a8a 100%)',
    swatches: ['#009a3e', '#1e3a8a', '#f5ce0b', '#f8fafc'],
    accentColor: '#009a3e',
    recommendedFor: 'both',
    badge: 'Teduh & Eksekutif',
  },
];

const THEME_STORAGE_KEY = 'school_presensi_theme';
const PALETTE_STORAGE_KEY = 'school_presensi_palette';

/**
 * Gets the current active theme, checking localStorage then defaulting to 'light' for crisp daytime clarity.
 */
export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch (e) {
    console.warn('Theme preference error:', e);
  }
  return 'light';
}

/**
 * Gets the current active palette, checking localStorage. Defaults to 'aurora' (Perisai Royal PGRI).
 */
export function getInitialPalette(): ThemePalette {
  if (typeof window === 'undefined') return 'aurora';
  try {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (saved === 'aurora' || saved === 'sunrise' || saved === 'slate') {
      return saved;
    }
  } catch (e) {
    console.warn('Palette preference error:', e);
  }
  return 'aurora';
}

/**
 * Applies the selected theme & palette to the <html> document root and persists in storage.
 */
export function applyThemeToDocument(theme: Theme, palette: ThemePalette = 'aurora'): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // 1. Apply dark/light classes
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }

  // 2. Apply palette classes & data attributes
  root.classList.remove('palette-aurora', 'palette-sunrise', 'palette-slate');
  root.classList.add(`palette-${palette}`);
  root.setAttribute('data-palette', palette);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  } catch (e) {
    console.warn('Failed to save theme/palette to localStorage:', e);
  }
}
