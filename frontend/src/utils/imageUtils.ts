/**
 * Utilitas pemrosesan, validasi, dan kompresi gambar foto profil (avatar).
 * Memastikan file foto tidak melebihi batas ukuran (maksimal 2MB) dan
 * melakukan auto-resizing ke rasio 1:1 (square center-crop) agar ringan (~40KB-80KB).
 */

export interface CompressedImageResult {
  base64: string;
  sizeKB: number;
}

/**
 * Validasi dan kompresi file gambar dari input file.
 */
export function validateAndCompressImage(
  file: File,
  _maxSizeMB = 2,
  targetDim = 400,
  quality = 0.85,
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("Tidak ada file gambar yang dipilih."));
    }

    // 1. Validasi Tipe MIME Gambar
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type.toLowerCase())) {
      return reject(
        new Error(
          "Format gambar tidak didukung. Silakan gunakan format JPG, JPEG, PNG, atau WEBP.",
        ),
      );
    }

    // 2. Validasi Batas Ukuran File (Maksimal < 500 KB)
    const maxSizeBytes = 500 * 1024; // 500 KB
    if (file.size >= maxSizeBytes) {
      const actualKB = Math.round(file.size / 1024);
      return reject(
        new Error(
          `Ukuran foto terlalu besar (${actualKB} KB). Maksimal ukuran file foto profil yang diizinkan adalah < 500 KB.`,
        ),
      );
    }

    // 3. Baca File dan Muat ke HTML5 Image Element
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memproses data gambar."));
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = targetDim;
          canvas.height = targetDim;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return reject(new Error("Gagal menginisialisasi 2D context canvas."));
          }

          // Hitung Center Crop Square (Aspect Ratio 1:1)
          const sw = img.naturalWidth;
          const sh = img.naturalHeight;
          const minSide = Math.min(sw, sh);
          const sx = (sw - minSide) / 2;
          const sy = (sh - minSide) / 2;

          // Aktifkan high-quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Gambar crop ke canvas target
          ctx.drawImage(
            img,
            sx,
            sy,
            minSide,
            minSide,
            0,
            0,
            targetDim,
            targetDim,
          );

          // Ekspor ke Base64 JPEG dengan kompresi optimal
          const base64 = canvas.toDataURL("image/jpeg", quality);
          // Hitung estimasi ukuran setelah kompresi
          const sizeBytes = Math.round((base64.length * 3) / 4);
          const sizeKB = Math.round(sizeBytes / 1024);

          resolve({ base64, sizeKB });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          reject(new Error("Gagal mengompresi gambar: " + message));
        }
      };
      if (typeof e.target?.result === 'string') {
        img.src = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  });
}
