/**
 * Utility for resizing and compressing student photos for ID Card (Kartu Absensi)
 * Produces lightweight, high-quality Base64 Data URLs suitable for PostgreSQL and offline printing.
 */

export async function compressAndFormatStudentPhoto(
  file: File,
  targetWidth = 360,
  targetHeight = 480
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('File yang dipilih bukan gambar valid (harus JPG/PNG/WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        // Calculate crop or cover dimensions for standard 3:4 portrait pass photo
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Gagal menginisialisasi canvas untuk pengolahan foto.'));
          return;
        }

        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const sourceAspect = img.width / img.height;
        const targetAspect = targetWidth / targetHeight;

        let sx = 0;
        let sy = 0;
        let sWidth = img.width;
        let sHeight = img.height;

        // Center-crop to 3:4 ratio
        if (sourceAspect > targetAspect) {
          // Source is wider than target: crop left & right
          sWidth = img.height * targetAspect;
          sx = (img.width - sWidth) / 2;
        } else {
          // Source is taller than target: crop top & bottom (slightly biased to upper half for faces)
          sHeight = img.width / targetAspect;
          sy = (img.height - sHeight) * 0.2; // 20% from top keeps head/face centered
        }

        // Fill clean white background first (for transparent PNGs)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Draw cropped and scaled image
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

        // Export as optimized JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('Gagal memuat file gambar foto siswa.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca file foto.'));
    };

    reader.readAsDataURL(file);
  });
}
