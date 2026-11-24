"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, Check, ExternalLink, Megaphone, Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUploadLimit } from "@/hooks/use-upload-limit";
import { formatUploadSizeMB } from "@/lib/upload-limits";
import { canConvertImageToWebP, prepareUploadFile } from "@/lib/upload-image";

export type DashboardAd = {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  ctaLabel: string | null;
  active: boolean;
  targetRoles: string[];
  sortOrder: number;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
};

type FormState = {
  title: string; body: string; imageUrl: string; linkUrl: string; ctaLabel: string;
  active: boolean; targetRoles: string[]; sortOrder: string; startsAt: string; endsAt: string;
};

const blankForm: FormState = { title: "", body: "", imageUrl: "", linkUrl: "", ctaLabel: "Learn more", active: true, targetRoles: [], sortOrder: "0", startsAt: "", endsAt: "" };

function toDateInput(value: Date | string | null): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function adToForm(ad: DashboardAd): FormState {
  return {
    title: ad.title,
    body: ad.body ?? "",
    imageUrl: ad.imageUrl ?? "",
    linkUrl: ad.linkUrl ?? "",
    ctaLabel: ad.ctaLabel ?? "Learn more",
    active: ad.active,
    targetRoles: ad.targetRoles ?? [],
    sortOrder: String(ad.sortOrder),
    startsAt: toDateInput(ad.startsAt),
    endsAt: toDateInput(ad.endsAt),
  };
}

/**
 * Stored advertisement images keep only an `s3:<key>` reference in Postgres and
 * are streamed through the session-scoped image endpoint; external http(s) URLs
 * and legacy `data:` values are rendered as-is.
 */
export function adImageSrc(ad: Pick<DashboardAd, "id" | "imageUrl">): string | null {
  if (!ad.imageUrl) return null;
  return ad.imageUrl.startsWith("s3:") ? `/api/dashboard-ads/${ad.id}/image` : ad.imageUrl;
}

type AdStatus = "live" | "scheduled" | "paused" | "expired";

/** One derivation of the four visible states, shared by the list and the counts. */
function adStatus(ad: DashboardAd, now: number): AdStatus {
  if (!ad.active) return "paused";
  if (ad.startsAt && new Date(ad.startsAt).getTime() > now) return "scheduled";
  if (ad.endsAt && new Date(ad.endsAt).getTime() < now) return "expired";
  return "live";
}

const STATUS_LABEL: Record<AdStatus, string> = {
  live: "Live",
  scheduled: "Scheduled",
  paused: "Paused",
  expired: "Expired",
};

const STATUS_TONE: Record<AdStatus, "green" | "brand" | "slate" | "red"> = {
  live: "green",
  scheduled: "brand",
  paused: "slate",
  expired: "red",
};

function destinationLabel(url: string | null): string {
  if (!url) return "No destination";
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function scheduleLabel(ad: DashboardAd): string {
  const start = toDateInput(ad.startsAt);
  const end = toDateInput(ad.endsAt);
  if (start && end) return `${start} → ${end}`;
  if (start) return `Starts ${start}`;
  if (end) return `Ends ${end}`;
  return "Always on";
}

/**
 * Advertisement CRUD shared by the dashboard carousel dialog and the full
 * `/advertisements` page. The list is the primary surface: every row shows its
 * live state, schedule, order and destination, and one click opens the editor.
 */
export function AdvertisementManager({
  initialAds,
  onChange,
  headingLevel = "h2",
}: {
  initialAds: DashboardAd[];
  onChange?: (ads: DashboardAd[]) => void;
  headingLevel?: "h2" | "h3";
}) {
  const [ads, setAds] = useState(initialAds);
  const [editing, setEditing] = useState<DashboardAd | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { maxUploadSizeMB, maxUploadSizeBytes } = useUploadLimit();
  const [saved, setSaved] = useState<string | null>(null);
  const [preparingImage, setPreparingImage] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<DashboardAd | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Keep in step with the server list while avoiding a loop when the parent
  // simply echoes the array this component produced.
  useEffect(() => setAds((current) => (current === initialAds ? current : initialAds)), [initialAds]);

  function publish(next: DashboardAd[]) {
    setAds(next);
    onChange?.(next);
  }

  function focusForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => document.getElementById("ad-title")?.focus(), 150);
  }

  function startCreate() {
    setEditing(null);
    setForm(blankForm);
    setError(null);
    setSaved(null);
    focusForm();
  }

  function startEdit(ad: DashboardAd) {
    setEditing(ad);
    setForm(adToForm(ad));
    setError(null);
    setSaved(null);
    focusForm();
  }

  function field(key: keyof FormState, value: string | boolean | string[]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]).has(file.type)) {
      setError("Choose a PNG, JPEG, WebP, or GIF image.");
      return;
    }
    if (file.size > maxUploadSizeBytes && !canConvertImageToWebP(file)) {
      setError(`Image must be ${formatUploadSizeMB(maxUploadSizeMB)} or smaller.`);
      return;
    }
    setPreparingImage(true);
    setError(null);
    setSaved(null);
    void (async () => {
      try {
        const prepared = await prepareUploadFile(file, maxUploadSizeBytes);
        if (prepared.file.size > maxUploadSizeBytes) {
          setError(`Image must be ${formatUploadSizeMB(maxUploadSizeMB)} or smaller.`);
          return;
        }
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("The image could not be read. Please try another file."));
          reader.readAsDataURL(prepared.file);
        });
        field("imageUrl", dataUrl);
        setSaved(prepared.convertedToWebP ? "Image optimized to WebP. Save the announcement to apply it." : null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The image could not be prepared.");
      } finally {
        setPreparingImage(false);
      }
    })();
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (preparingImage) {
      setError("Wait for the image optimization to finish before saving.");
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(null);
    const payload = {
      ...form,
      sortOrder: Number(form.sortOrder),
      startsAt: form.startsAt ? new Date(`${form.startsAt}T00:00:00.000Z`).toISOString() : null,
      endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59.999Z`).toISOString() : null,
    };
    try {
      const response = await fetch(editing ? `/api/dashboard-ads/${editing.id}` : "/api/dashboard-ads", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json.error ?? "Could not save the advertisement.");
        return;
      }
      // Uploaded images are replaced by an `s3:` reference, so re-read the
      // server's copy rather than trusting the optimistic payload.
      const listResponse = await fetch("/api/dashboard-ads");
      const listJson = await listResponse.json().catch(() => ({}));
      if (listResponse.ok && Array.isArray(listJson.data)) {
        publish(listJson.data as DashboardAd[]);
      } else {
        const next = editing
          ? ads.map((ad) => (ad.id === editing.id ? { ...ad, ...payload, imageUrl: ad.imageUrl } : ad))
          : [{ ...payload, id: json.data?.id ?? crypto.randomUUID(), imageUrl: payload.imageUrl } as DashboardAd, ...ads];
        publish([...next].sort((a, b) => a.sortOrder - b.sortOrder));
      }
      setSaved(editing ? "Announcement updated." : "Announcement created.");
      setEditing(null);
      setForm(blankForm);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(ad: DashboardAd) {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const response = await fetch(`/api/dashboard-ads/${ad.id}`, { method: "DELETE" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json.error ?? "Could not delete the advertisement.");
        return;
      }
      publish(ads.filter((item) => item.id !== ad.id));
      setConfirmDelete(null);
      setSaved("Announcement deleted.");
      if (editing?.id === ad.id) {
        setEditing(null);
        setForm(blankForm);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const now = Date.now();
  const statuses = new Map(ads.map((ad) => [ad.id, adStatus(ad, now)] as const));
  const counts = { live: 0, scheduled: 0, paused: 0, expired: 0 };
  for (const status of statuses.values()) counts[status] += 1;
  const Heading = headingLevel;

  return (
    <section className="space-y-4" aria-labelledby="ad-manager-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading id="ad-manager-heading" className="text-lg font-semibold">
            Announcements
          </Heading>
          <p className="text-sm text-ink-muted">
            {ads.length} total · {counts.live} live · {counts.scheduled} scheduled · {counts.paused} paused
            {counts.expired > 0 ? ` · ${counts.expired} expired` : ""}
          </p>
        </div>
        <Button type="button" onClick={startCreate} size="sm">
          <Plus className="h-3.5 w-3.5" /> New announcement
        </Button>
      </div>

      {ads.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">
          No announcements yet. Create one to highlight an offer, partner, or deadline on the dashboards.
        </p>
      ) : (
        <ul className="space-y-2">
          {ads.map((ad) => {
            const status = statuses.get(ad.id) ?? "paused";
            const active = editing?.id === ad.id;
            return (
              <li
                key={ad.id}
                className={
                  "space-y-2 rounded-xl border p-3 transition " +
                  (active
                    ? "border-brand-400 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-950/20"
                    : "border-line bg-white dark:border-navy-700 dark:bg-navy-900")
                }
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => startEdit(ad)}
                    aria-label={`Edit ${ad.title}`}
                    aria-pressed={active}
                    className="min-h-8 min-w-0 flex-1 text-left"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{ad.title}</span>
                      <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                    </span>
                    <span className="mt-1 block text-xs text-ink-muted">
                      Order {ad.sortOrder} · {scheduleLabel(ad)}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      {destinationLabel(ad.linkUrl)}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(ad)} aria-label={`Edit ${ad.title}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-red-700 dark:text-red-300"
                      onClick={() => setConfirmDelete(ad)}
                      aria-label={`Delete ${ad.title}`}
                      disabled={busy}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {confirmDelete?.id === ad.id && (
                  <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-900 dark:bg-red-900/30 dark:text-red-200">
                    <span>Delete “{ad.title}” permanently?</span>
                    <Button type="button" size="sm" variant="danger" onClick={() => remove(ad)} disabled={busy}>
                      {busy ? "Deleting…" : "Delete announcement"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setConfirmDelete(null)} disabled={busy}>
                      Cancel
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form
        ref={formRef}
        onSubmit={save}
        aria-labelledby="ad-form-heading"
        className="scroll-mt-24 space-y-3 rounded-xl border border-line bg-white p-4 dark:border-navy-700 dark:bg-navy-900"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="ad-form-heading" className="font-semibold">
            {editing ? "Edit announcement" : "New announcement"}
          </h3>
          {editing ? (
            <Button type="button" size="sm" variant="outline" onClick={startCreate}>
              <Plus className="h-3.5 w-3.5" /> Start a new one
            </Button>
          ) : (
            <span className="flex items-center gap-1 text-xs text-ink-muted">
              <Megaphone className="h-3.5 w-3.5" aria-hidden="true" /> Shown on every dashboard unless paused
            </span>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> {saved}
          </p>
        )}

        <div>
          <Label htmlFor="ad-title">Title</Label>
          <Input id="ad-title" value={form.title} onChange={(event) => field("title", event.target.value)} maxLength={120} required />
        </div>
        <div>
          <Label htmlFor="ad-body">Message</Label>
          <Textarea id="ad-body" value={form.body} onChange={(event) => field("body", event.target.value)} maxLength={400} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dashboard-ad-image">Advertisement image (optional)</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="dashboard-ad-image"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={selectImage}
              className="max-w-xs"
              aria-label="Upload advertisement image"
              aria-describedby="dashboard-ad-image-help"
              disabled={busy || preparingImage}
            />
            <span id="dashboard-ad-image-help" className="text-xs text-ink-muted">PNG, JPEG, WebP, or GIF · maximum {formatUploadSizeMB(maxUploadSizeMB)}. JPG/PNG images are optimized as WebP; GIF animation is preserved.</span>
          </div>
          <Input
            type="url"
            value={form.imageUrl.startsWith("data:") || form.imageUrl.startsWith("s3:") ? "" : form.imageUrl}
            onChange={(event) => field("imageUrl", event.target.value)}
            placeholder="Or paste an https:// image URL"
            aria-label="Advertisement image URL"
          />
          {form.imageUrl && (
            <div className="relative overflow-hidden rounded-lg border border-line dark:border-navy-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.imageUrl.startsWith("s3:") && editing ? `/api/dashboard-ads/${editing.id}/image` : form.imageUrl}
                alt="Advertisement preview"
                className="h-28 w-full object-cover"
              />
              <Button type="button" size="sm" variant="secondary" className="absolute right-2 top-2" onClick={() => field("imageUrl", "")}>
                <X className="h-3.5 w-3.5" /> Remove image
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="ad-link">Destination URL</Label>
            <Input id="ad-link" type="url" value={form.linkUrl} onChange={(event) => field("linkUrl", event.target.value)} placeholder="https://…" />
          </div>
          <div>
            <Label htmlFor="ad-cta">Button label</Label>
            <Input id="ad-cta" value={form.ctaLabel} onChange={(event) => field("ctaLabel", event.target.value)} maxLength={40} />
          </div>
        </div>

        <fieldset className="rounded-lg border border-line p-3"><legend className="px-1 text-sm font-medium">Show announcement to</legend><p className="mb-2 text-xs text-ink-muted">Leave all unchecked to show it to everyone.</p><div className="flex flex-wrap gap-4">{[["STUDENT", "Students"], ["COUNSELOR", "Consultants"], ["AGENCY", "Agencies"]].map(([value, label]) => <label key={value} className="inline-flex min-h-8 items-center gap-2 text-sm"><input type="checkbox" checked={form.targetRoles.includes(value)} onChange={(event) => field("targetRoles", event.target.checked ? [...form.targetRoles, value] : form.targetRoles.filter((role) => role !== value))} />{label}</label>)}</div></fieldset>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="ad-order">Order</Label>
            <Input id="ad-order" type="number" min="0" max="999" value={form.sortOrder} onChange={(event) => field("sortOrder", event.target.value)} />
          </div>
          <div>
            <Label htmlFor="ad-starts">Starts</Label>
            <Input id="ad-starts" type="date" value={form.startsAt} onChange={(event) => field("startsAt", event.target.value)} />
          </div>
          <div>
            <Label htmlFor="ad-ends">Ends</Label>
            <Input id="ad-ends" type="date" value={form.endsAt} onChange={(event) => field("endsAt", event.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="ad-active"
            type="checkbox"
            checked={form.active}
            onChange={(event) => field("active", event.target.checked)}
            className="h-4 w-4 rounded border-line-strong text-brand-600 focus:ring-2 focus:ring-brand-500/30 dark:border-navy-600"
          />
          <Label htmlFor="ad-active" className="mb-0">
            Show this announcement
          </Label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy || preparingImage}>
            {preparingImage ? "Optimizing image…" : busy ? "Saving…" : editing ? "Save changes" : "Create announcement"}
          </Button>
          {editing && (
            <Button type="button" variant="outline" onClick={startCreate} disabled={busy}>
              Cancel edit
            </Button>
          )}
        </div>

        <p className="flex items-center gap-1 text-xs text-ink-muted">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          Leave the dates empty for an always-on announcement. Order sets the carousel sequence.
        </p>
      </form>
    </section>
  );
}
