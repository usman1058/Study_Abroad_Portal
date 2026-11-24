export const UPLOAD_SIZE_OPTIONS_MB = [1, 1.5, 2, 2.5, 3] as const;
export const DEFAULT_MAX_UPLOAD_SIZE_MB = 3;
export const BYTES_PER_MB = 1024 * 1024;

export function parseUploadSizeMB(value: string | number | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return UPLOAD_SIZE_OPTIONS_MB.includes(parsed as (typeof UPLOAD_SIZE_OPTIONS_MB)[number])
    ? parsed
    : DEFAULT_MAX_UPLOAD_SIZE_MB;
}

export function formatUploadSizeMB(sizeMB: number): string {
  return `${Number.isInteger(sizeMB) ? sizeMB : sizeMB.toFixed(1)} MB`;
}
