/**
 * Theme & Color Palette Management Utility
 * Derived from user-provided reference gradients:
 * - Foto 1: "Sunrise Horizon" (Warm Teal Sky & Golden Amber Sunset)
 * - Foto 2: "Midnight Aurora" (Deep Midnight Blue, Indigo Violet & Neon Glow)
 */

export type Theme = 'light' | 'dark';
export type ThemePalette = 'aurora' | 'sunrise' | 'slate';

export interface PaletteOption {
  id: ThemePalette;
  name: string;
  sourceLabel: string;
  description: string;
  previewBg: string;
  accentColor: string;
  recommendedFor: 'dark' | 'light' | 'both';
  badge?: string;
}

export const THEME_PALETTES: PaletteOption[] = [
  {
    id: 'aurora',
    name: 'Midnight Aurora (Foto 2)',
    sourceLabel: 'Lampiran Foto 2 (Ungu / Biru Malam)',
    description: 'Gradasi mewah Deep Midnight Blue, Indigo, dan sentuhan pendaran neon violet. Kontras terbaik untuk kartu pelajar emas & terminal scanner.',
    previewBg: 'linear-gradient(135deg, #090d22 0%, #17113e 50%, #29104f 100%)',
    accentColor: '#818cf8',
    recommendedFor: 'dark',
    badge: 'Paling Populer & Futuristik',
  },
  {
    id: 'sunrise',
    name: 'Sunrise Horizon (Foto 1)',
    sourceLabel: 'Lampiran Foto 1 (Langit Biru & Mentari)',
    description: 'Nuansa hangat langit pagi cerah Cyan Sky, Cream lembut, dan Golden Amber. Sangat ramah di mata untuk operasional sekolah pagi hari.',
    previewBg: 'linear-gradient(135deg, #e0f2fe 0%, #fef3c7 50%, #fed7aa 100%)',
    accentColor: '#f59e0b',
    recommendedFor: 'light',
    badge: 'Hangat & Ramah di Mata',
  },
  {
    id: 'slate',
    name: 'Slate Minimalis (Netral)',
    sourceLabel: 'Tema Netral Klasik',
    description: 'Warna dasar abu-abu monokrom netral yang bersih, ringkas, dan formal untuk instansi pemerintahan/kantor.',
    previewBg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
    accentColor: '#64748b',
    recommendedFor: 'both',
  },
];

const THEME_STORAGE_KEY = 'school_presensi_theme';
const PALETTE_STORAGE_KEY = 'school_presensi_palette';

/**
 * Gets the current active theme, checking localStorage then system preference.
 */
export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (e) {
    console.warn('Theme preference error:', e);
  }
  return 'light';
}

/**
 * Gets the current active palette, checking localStorage. Defaults to 'aurora' (Foto 2).
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
