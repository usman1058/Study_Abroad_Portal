"use client";

import { useEffect, useState } from "react";
import { BYTES_PER_MB, DEFAULT_MAX_UPLOAD_SIZE_MB } from "@/lib/upload-limits";

export function useUploadLimit() {
  const [maxUploadSizeMB, setMaxUploadSizeMB] = useState(DEFAULT_MAX_UPLOAD_SIZE_MB);

  useEffect(() => {
    let active = true;
    fetch("/api/public/upload-settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { maxUploadSizeMB?: number } | null) => {
        if (active && typeof data?.maxUploadSizeMB === "number") setMaxUploadSizeMB(data.maxUploadSizeMB);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return { maxUploadSizeMB, maxUploadSizeBytes: maxUploadSizeMB * BYTES_PER_MB };
}
