/**
 * Image Compression and Optimization Utility for INIP
 * Compresses client-side images before uploading to Firestore to stay within
 * free-tier document size limits while maintaining high visual forensic clarity.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export interface CompressionResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  reductionRatio: number; // percentage (e.g. 85 for 85% reduction)
  width: number;
  height: number;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|gif|heic)$/i.test(file.name);
}

/**
 * Compresses an image file using HTML5 Canvas
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.8,
    mimeType = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao carregar a imagem para compressão.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional scale
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            maxHeight ? (height = maxHeight) : null;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível inicializar o processador gráfico.'));
          return;
        }

        // Fill white background for transparent PNGs converted to JPEG
        if (mimeType === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to compressed Data URL
        const dataUrl = canvas.toDataURL(mimeType, quality);

        // Calculate approximate byte size of base64 string
        // base64 size in bytes = (length * 3/4) - padding
        const head = dataUrl.indexOf('base64,') + 7;
        const base64Len = dataUrl.length - head;
        const compressedSize = Math.round((base64Len * 3) / 4);

        const originalSize = file.size;
        const reductionRatio = originalSize > compressedSize
          ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
          : 0;

        resolve({
          dataUrl,
          originalSize,
          compressedSize,
          reductionRatio,
          width,
          height,
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
