"use client";

import { useState } from "react";
import { UploadDocument } from "@/components/upload-document";

/** Inline replacement flow for a document staff rejected. */
export function ReuploadDocument({
  type,
  applicationId,
  applications,
}: {
  type: string;
  applicationId: string | null;
  applications: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-6 items-center rounded-lg border border-line-strong px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-canvas dark:border-navy-700 dark:text-slate-300 dark:hover:bg-navy-800"
      >
        {open ? "Cancel re-upload" : "Re-upload"}
      </button>
      {open && (
        <div data-reupload-form className="mt-3 rounded-lg border border-line bg-canvas-subtle/40 p-3 dark:border-navy-700 dark:bg-navy-900/40">
          <UploadDocument
            applications={applications}
            defaultApplicationId={applicationId ?? ""}
            defaultType={type}
            submitLabel="Replace document"
          />
        </div>
      )}
    </div>
  );
}
