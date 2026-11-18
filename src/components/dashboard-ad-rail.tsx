"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Megaphone, Pause, Pencil, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AdvertisementManager, adImageSrc, type DashboardAd } from "@/components/advertisement-manager";

export type { DashboardAd };

export function DashboardAdRail({
  ads,
  canManage = false,
  variant = "rail",
  id,
}: {
  ads: DashboardAd[];
  canManage?: boolean;
  variant?: "rail" | "hero" | "image";
  id?: string;
}) {
  const [allItems, setAllItems] = useState(ads);
  const [index, setIndex] = useState(0);
  const [manageOpen, setManageOpen] = useState(false);
  // WCAG 2.2.2: auto-rotating content must be stoppable.
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const now = Date.now();
  const items = allItems.filter(
    (item) =>
      item.active &&
      (!item.startsAt || new Date(item.startsAt).getTime() <= now) &&
      (!item.endsAt || new Date(item.endsAt).getTime() >= now),
  );

  useEffect(() => {
    setAllItems(ads);
    setIndex(0);
  }, [ads]);
  useEffect(() => {
    if (items.length < 2 || paused || hovering) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % items.length), 6500);
    return () => window.clearInterval(timer);
  }, [items.length, paused, hovering]);

  const ad = items[index];
  const move = (direction: number) => setIndex((current) => (current + direction + items.length) % items.length);
  const imageOnly = variant === "image";

  return (
    <aside
      id={id}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="h-fit overflow-hidden rounded-2xl border border-line bg-white shadow-sm dark:border-navy-700 dark:bg-navy-900"
      aria-label="Dashboard carousel"
    >
      {!imageOnly && (
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 dark:border-navy-700">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Megaphone className="h-4 w-4 text-brand-600" /> {variant === "hero" ? "Featured updates" : "Dashboard carousel"}
            </div>
            {variant === "hero" && <p className="mt-0.5 text-xs text-ink-muted">News, offers, and important deadlines</p>}
          </div>
          {canManage && (
            <Button size="sm" variant="ghost" onClick={() => setManageOpen(true)} aria-label="Manage advertisements">
              <Pencil className="h-3.5 w-3.5" /> Manage ads
            </Button>
          )}
        </div>
      )}
      {!ad ? (
        <div
          className={
            imageOnly
              ? "flex h-56 items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-brand-700 p-5 text-center text-sm text-white sm:h-64"
              : "p-5 text-sm text-ink-muted"
          }
        >
          {imageOnly
            ? "New updates will appear here."
            : canManage
              ? "No active announcements. Add one to highlight an offer, partner, or deadline."
              : "No announcements right now. New updates from your team will appear here."}
        </div>
      ) : (
        <div className="relative">
          {imageOnly ? (
            ad.linkUrl ? (
              <a href={ad.linkUrl} target="_blank" rel="noreferrer" aria-label={ad.title} className="block">
                <AdImage ad={ad} className="h-56 sm:h-64" />
              </a>
            ) : (
              <AdImage ad={ad} className="h-56 sm:h-64" />
            )
          ) : (
            <AdImage ad={ad} className={variant === "hero" ? "h-48 sm:h-60" : "h-28"} />
          )}
          {!imageOnly && (
            <div className="space-y-3 p-4">
              <div>
                <p className="text-sm font-semibold">{ad.title}</p>
                {ad.body && <p className="mt-1 text-xs leading-5 text-ink-muted">{ad.body}</p>}
              </div>
              {ad.linkUrl && (
                <a
                  href={ad.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                >
                  {ad.ctaLabel || "Learn more"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
          {items.length > 1 &&
            (imageOnly ? (
              <>
                <button
                  type="button"
                  onClick={() => move(-1)}
                  aria-label="Previous announcement"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-navy-950/55 p-2 text-white transition hover:bg-navy-950/80"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(1)}
                  aria-label="Next announcement"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-navy-950/55 p-2 text-white transition hover:bg-navy-950/80"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPaused((value) => !value)}
                  aria-label={paused ? "Play announcements" : "Pause announcements"}
                  aria-pressed={paused}
                  className="absolute bottom-3 right-3 rounded-full bg-navy-950/55 p-2 text-white transition hover:bg-navy-950/80"
                >
                  {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
              </>
            ) : (
              <div className="flex items-center justify-between border-t border-line px-3 py-2 dark:border-navy-700">
                <button
                  type="button"
                  onClick={() => move(-1)}
                  aria-label="Previous announcement"
                  className="rounded-md p-1.5 text-ink-muted hover:bg-canvas-subtle dark:hover:bg-navy-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-ink-muted">
                    {index + 1} of {items.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPaused((value) => !value)}
                    aria-label={paused ? "Play announcements" : "Pause announcements"}
                    aria-pressed={paused}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-canvas-subtle dark:hover:bg-navy-800"
                  >
                    {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => move(1)}
                  aria-label="Next announcement"
                  className="rounded-md p-1.5 text-ink-muted hover:bg-canvas-subtle dark:hover:bg-navy-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ))}
        </div>
      )}
      {canManage && (
        <Dialog open={manageOpen} onClose={() => setManageOpen(false)} title="Manage dashboard announcements" wide>
          <AdvertisementManager
            initialAds={allItems}
            headingLevel="h3"
            onChange={(next) => {
              setAllItems(next);
              setIndex(0);
            }}
          />
        </Dialog>
      )}
    </aside>
  );
}

function AdImage({ ad, className }: { ad: DashboardAd; className: string }) {
  const src = adImageSrc(ad);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={ad.title} className={`w-full object-cover ${className}`} />
  ) : (
    <div className={`bg-gradient-to-br from-navy-900 via-navy-800 to-brand-700 ${className}`} />
  );
}
