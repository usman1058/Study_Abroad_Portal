export type PreparedUploadFile = { file: File; convertedToWebP: boolean };

const CONVERTIBLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const INITIAL_MAX_DIMENSION = 4096;

export function canConvertImageToWebP(file: File): boolean {
  return CONVERTIBLE_IMAGE_TYPES.has(file.type);
}

function canvasToWebP(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("This browser could not optimize the selected image."));
    }, "image/webp", quality);
  });
}

function webpName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "") + ".webp";
}

/** Compress JPG/PNG uploads to WebP when it saves space or is needed to fit the configured limit. */
export async function prepareUploadFile(file: File, maxBytes: number): Promise<PreparedUploadFile> {
  if (!canConvertImageToWebP(file)) return { file, convertedToWebP: false };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (file.size <= maxBytes) return { file, convertedToWebP: false };
    throw new Error("This image could not be optimized on this device. Resize it or choose a smaller image.");
  }

  try {
    const canvas = document.createElement("canvas");
    const initialScale = Math.min(1, INITIAL_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * initialScale));
    let height = Math.max(1, Math.round(bitmap.height * initialScale));

    for (let resizeAttempt = 0; resizeAttempt < 9; resizeAttempt++) {
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: file.type === "image/png" });
      if (!context) throw new Error("This browser could not optimize the selected image.");
      context.drawImage(bitmap, 0, 0, width, height);

      for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5]) {
        const blob = await canvasToWebP(canvas, quality);
        if (blob.type !== "image/webp") {
          throw new Error("This browser does not support WebP image conversion. Use a browser with WebP support or choose a smaller file.");
        }
        if (blob.size <= maxBytes && blob.size < file.size) {
          return {
            file: new File([blob], webpName(file.name), { type: "image/webp", lastModified: file.lastModified }),
            convertedToWebP: true,
          };
        }
      }

      if (file.size <= maxBytes) return { file, convertedToWebP: false };

      width = Math.max(1, Math.floor(width * 0.82));
      height = Math.max(1, Math.floor(height * 0.82));
    }

    if (file.size <= maxBytes) return { file, convertedToWebP: false };
    throw new Error("This image could not be reduced to the configured upload limit. Choose a smaller image.");
  } finally {
    bitmap.close();
  }
}
