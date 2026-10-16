import React from 'react';

export interface SchoolLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'shield' | 'emblem-only';
  src?: string;
  alt?: string;
}

/**
 * Official Logo SMKS PGRI 1 Kota Sukabumi
 * Faithful 1:1 reproduction of the official heraldic emblem as uploaded in "Desain Tanpa Judul (1).png":
 * - Two-tone shield with sharp scalloped top ears and outer notch
 * - Sky Blue (left) to Canary Yellow (right) split gradient
 * - Top title: "SMKS PGRI 1" in authentic bold serif typography
 * - Center PGRI emblem: 5-pronged red torch flame, white pillar, twin school grid windows, green circle, golden laurel wreath
 * - "PGRI" white tab
 * - "YAYASAN PEMBINA LEMBAGA PENDIDIKAN" notched ribbon banner
 * - Main city label: "SUKABUMI" in tall bold condensed black lettering
 * - Bottom arc banner: "BISNIS MANAJEMEN DAN TEKHNOLOGI INFORMATIKA"
 */
export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  className = 'w-12 h-12',
  size,
  src,
  alt = 'Logo Resmi SMKS PGRI 1 Kota Sukabumi',
}) => {
  const inlineStyle = size ? { width: size, height: size } : undefined;

  if (src && src.trim() !== '') {
    return (
      <img
        src={src}
        alt={alt}
        style={inlineStyle}
        className={`inline-block select-none shrink-0 object-contain ${className}`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 500 540"
      className={`inline-block select-none shrink-0 ${className}`}
      style={inlineStyle}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Logo Resmi SMKS PGRI 1 Kota Sukabumi"
    >
      <defs>
        {/* Sky Blue to Golden Yellow Dual-tone Gradient (Exact match to Desain Tanpa Judul (1).png) */}
        <linearGradient id="pgriShieldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2b75dc" />
          <stop offset="44%" stopColor="#5591eb" />
          <stop offset="49%" stopColor="#9cc2f7" />
          <stop offset="51%" stopColor="#fff485" />
          <stop offset="56%" stopColor="#ffea12" />
          <stop offset="100%" stopColor="#f5ce0b" />
        </linearGradient>

        {/* Torch Flame Gradient */}
        <linearGradient id="torchFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#991b1b" />
          <stop offset="35%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>

        {/* Laurel Leaves Gold Gradient */}
        <linearGradient id="laurelLeavesGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffea3b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>

        {/* Path for curved text along the bottom shield contour */}
        <path
          id="bottomArcPath"
          d="M 112,320 C 136,440 196,482 250,484 C 304,482 364,440 388,320"
          fill="none"
        />
      </defs>

      {/* ================= 1. SHIELD SILHOUETTE & BORDERS ================= */}
      {/* Outer White Silhouette with Black Contour (Scalloped Top Ears & Neck) */}
      <path
        d="M 128,92
           C 134,102 144,108 160,108
           C 195,108 220,113 250,113
           C 280,113 305,108 340,108
           C 356,108 366,102 372,92
           C 378,106 376,120 372,130
           C 388,145 402,175 404,220
           C 406,275 404,325 398,375
           C 388,440 330,485 250,510
           C 170,485 112,440 102,375
           C 96,325 94,275 96,220
           C 98,175 112,145 128,130
           C 124,120 122,106 128,92 Z"
        fill="#FFFFFF"
        stroke="#000000"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Inner Two-Tone Shield (Blue on Left, Yellow on Right) */}
      <path
        d="M 132,100
           C 137,108 147,113 162,113
           C 195,113 220,117 250,117
           C 280,117 305,113 338,113
           C 353,113 363,108 368,100
           C 372,112 370,124 366,133
           C 382,147 395,175 397,218
           C 399,272 397,320 391,368
           C 382,430 326,475 250,498
           C 174,475 118,430 109,368
           C 103,320 101,272 103,218
           C 105,175 118,147 134,133
           C 130,124 128,112 132,100 Z"
        fill="url(#pgriShieldGrad)"
        stroke="#000000"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Inner Framing Fine Line */}
      <path
        d="M 136,106
           C 140,112 149,117 164,117
           C 195,117 220,120 250,120
           C 280,120 305,117 336,117
           C 351,117 360,112 364,106
           C 367,116 365,126 362,135
           C 376,149 388,175 390,216
           C 392,268 390,315 385,362
           C 376,422 322,465 250,488
           C 178,465 124,422 115,362
           C 110,315 108,268 110,216
           C 112,175 124,149 138,135
           C 135,126 133,116 136,106 Z"
        fill="none"
        stroke="#000000"
        strokeWidth="1"
        opacity="0.45"
      />

      {/* ================= 2. TOP BANNER TEXT: "SMKS PGRI 1" (Authentic Serif Font) ================= */}
      <g>
        <text
          x="250"
          y="156"
          textAnchor="middle"
          fill="#000000"
          fontFamily="'Times New Roman', 'Bookman Old Style', Georgia, serif"
          fontWeight="900"
          fontSize="38"
          letterSpacing="1.5"
        >
          SMKS PGRI 1
        </text>
      </g>

      {/* ================= 3. CENTER PGRI & SCHOOL EMBLEM ================= */}
      <g>
        {/* Golden Laurel Leaves Left (6 distinct leaves curving upwards) */}
        <g fill="url(#laurelLeavesGrad)" stroke="#000000" strokeWidth="1.5">
          <path d="M 216,275 C 185,270 168,242 172,212 C 182,226 196,238 216,248 Z" />
          <path d="M 206,264 C 172,246 158,214 172,186 C 184,204 199,218 213,232 Z" />
          <path d="M 209,240 C 182,216 172,184 191,165 C 199,183 209,201 219,215 Z" />
          <path d="M 218,220 C 196,192 192,163 211,144 C 216,165 222,184 226,200 Z" />
          <path d="M 226,202 C 211,178 213,150 230,136 C 232,154 234,172 233,188 Z" />
          <path d="M 222,278 C 205,278 192,268 198,252 C 208,258 218,266 222,278 Z" />
        </g>

        {/* Golden Laurel Leaves Right (6 distinct leaves curving upwards) */}
        <g fill="url(#laurelLeavesGrad)" stroke="#000000" strokeWidth="1.5">
          <path d="M 284,275 C 315,270 332,242 328,212 C 318,226 304,238 284,248 Z" />
          <path d="M 294,264 C 328,246 342,214 328,186 C 316,204 301,218 287,232 Z" />
          <path d="M 291,240 C 318,216 328,184 309,165 C 301,183 291,201 281,215 Z" />
          <path d="M 282,220 C 304,192 308,163 289,144 C 284,165 278,184 274,200 Z" />
          <path d="M 274,202 C 289,178 287,150 270,136 C 268,154 266,172 267,188 Z" />
          <path d="M 278,278 C 295,278 308,268 302,252 C 292,258 282,266 278,278 Z" />
        </g>

        {/* Central Circular Green Base */}
        <circle
          cx="250"
          cy="230"
          r="46"
          fill="#009a3e"
          stroke="#000000"
          strokeWidth="3.5"
        />

        {/* School Building Motif Left (Dark rectangle with 4 white window panes) */}
        <g>
          <rect
            x="224"
            y="222"
            width="18"
            height="31"
            fill="#0f172a"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            rx="1"
          />
          {/* 4 White Windows */}
          <rect x="226.5" y="225" width="5.5" height="5.5" fill="#FFFFFF" />
          <rect x="234.5" y="225" width="5.5" height="5.5" fill="#FFFFFF" />
          <rect x="226.5" y="235" width="5.5" height="5.5" fill="#FFFFFF" />
          <rect x="234.5" y="235" width="5.5" height="5.5" fill="#FFFFFF" />
          <rect x="226.5" y="245" width="5.5" height="5" fill="#FFFFFF" />
          <rect x="234.5" y="245" width="5.5" height="5" fill="#FFFFFF" />
        </g>

        {/* School Building Motif Right (Dark rectangle with 4 white window panes) */}
        <g>
          <rect
            x="258"
            y="222"
            width="18"
            height="31"
            fill="#0f172a"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            rx="1"
          />
          {/* 4 White Windows */}
          <rect x="260" y="225" width="5.5" height="5.5" fill="#FFFFFF" />
          <rect x="268" y="225" width="5.5" height="5.5" fill="#FFFFFF" />
          <rect x="260" y="235" width="5.5" height="5.5" fill="#FFFFFF" />
          <rect x="268" y="235" width="5.5" height="5.5" fill="#FFFFFF" />
          <rect x="260" y="245" width="5.5" height="5" fill="#FFFFFF" />
          <rect x="268" y="245" width="5.5" height="5" fill="#FFFFFF" />
        </g>

        {/* Center White Torch Pillar */}
        <path
          d="M 244,182 L 244,255 L 256,255 L 256,182 Z"
          fill="#FFFFFF"
          stroke="#000000"
          strokeWidth="2"
        />
        <line x1="244" y1="205" x2="256" y2="205" stroke="#000000" strokeWidth="1" />
        <line x1="244" y1="230" x2="256" y2="230" stroke="#000000" strokeWidth="1" />

        {/* Torch Flame Holder Bowl / Capital */}
        <path
          d="M 238,182 C 238,189 262,189 262,182 L 257,176 L 243,176 Z"
          fill="#FFFFFF"
          stroke="#000000"
          strokeWidth="2"
        />

        {/* 5-Pronged Red Torch Flame (Exact match to official emblem) */}
        <path
          d="M 243,176
             C 234,168 222,154 233,142
             C 237,150 242,152 245,138
             C 248,126 250,115 250,113
             C 250,115 252,126 255,138
             C 258,152 263,150 267,142
             C 278,154 266,168 257,176 Z"
          fill="url(#torchFlameGrad)"
          stroke="#000000"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* White PGRI Label Tab */}
        <g>
          <path
            d="M 224,254 L 276,254 L 272,273 L 228,273 Z"
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth="2"
          />
          <text
            x="250"
            y="268"
            textAnchor="middle"
            fill="#000000"
            fontFamily="'Times New Roman', Georgia, serif"
            fontWeight="900"
            fontSize="14"
            letterSpacing="1"
          >
            PGRI
          </text>
        </g>

        {/* Ribbon: YAYASAN PEMBINA LEMBAGA PENDIDIKAN */}
        <g>
          {/* Ribbon with notched swallowtail ends */}
          <path
            d="M 136,278
               L 152,286 L 136,294
               L 364,294 L 348,286 L 364,278
               Z"
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <text
            x="250"
            y="289.5"
            textAnchor="middle"
            fill="#000000"
            fontFamily="'Arial Black', Arial, sans-serif"
            fontWeight="900"
            fontSize="9.5"
            letterSpacing="0.8"
          >
            YAYASAN PEMBINA LEMBAGA PENDIDIKAN
          </text>
        </g>
      </g>

      {/* ================= 4. MAIN CITY LABEL: "SUKABUMI" ================= */}
      <g>
        <text
          x="250"
          y="348"
          textAnchor="middle"
          fill="#000000"
          fontFamily="Impact, 'Arial Black', sans-serif"
          fontWeight="900"
          fontSize="48"
          letterSpacing="3.5"
        >
          SUKABUMI
        </text>
      </g>

      {/* ================= 5. BOTTOM ARC: "BISNIS MANAJEMEN DAN TEKHNOLOGI INFORMATIKA" ================= */}
      <g>
        <text
          fill="#000000"
          fontFamily="'Arial Black', Arial, sans-serif"
          fontWeight="900"
          fontSize="12"
          letterSpacing="0.5"
        >
          <textPath href="#bottomArcPath" startOffset="50%" textAnchor="middle">
            BISNIS MANAJEMEN DAN TEKHNOLOGI INFORMATIKA
          </textPath>
        </text>
      </g>
    </svg>
  );
};
