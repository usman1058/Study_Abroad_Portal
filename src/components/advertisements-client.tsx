"use client";

import { useState } from "react";
import { AdvertisementManager, type DashboardAd } from "@/components/advertisement-manager";
import { DashboardAdRail } from "@/components/dashboard-ad-rail";

/**
 * Holds the advertisement list once so the editor and the live preview never
 * disagree: saving, pausing or deleting updates both immediately.
 */
export function AdvertisementsClient({ initialAds }: { initialAds: DashboardAd[] }) {
  const [ads, setAds] = useState(initialAds);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <AdvertisementManager initialAds={ads} onChange={setAds} />
      </div>
      <aside className="min-w-0 space-y-3 xl:sticky xl:top-20 xl:h-fit">
        <div>
          <h2 className="text-sm font-semibold">Preview</h2>
          <p className="text-xs text-ink-muted">
            Live announcements rotate on staff and partner dashboards. Scheduled and paused items stay hidden.
          </p>
        </div>
        <DashboardAdRail ads={ads} variant="hero" />
        <p className="text-xs text-ink-muted">
          The carousel pauses on hover and has an explicit pause control, so it meets WCAG 2.2.2.
        </p>
      </aside>
    </div>
  );
}
