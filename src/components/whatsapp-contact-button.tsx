"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

const CONTACT_URL = "https://checkmyuni.com/contact";

export function WhatsAppContactButton() {
  const [number, setNumber] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/public/contact-settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { whatsappNumber?: string } | null) => {
        const value = (data?.whatsappNumber ?? "").replace(/\D/g, "");
        if (active && /^\d{7,15}$/.test(value)) setNumber(value);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
    <a href={CONTACT_URL}
      aria-label="Contact CheckMyUni"
      className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-700 px-4 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/40">
      <MessageCircle aria-hidden="true" className="h-5 w-5" />
      <span>Contact us</span>
    </a>
    {number ? <a href={`https://wa.me/${number}`} target="_blank" rel="noopener noreferrer"
      aria-label="Chat with CheckMyUni on WhatsApp (opens in a new tab)"
      className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#128c4a] px-4 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#0f773f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25d366]/40">
      <MessageCircle aria-hidden="true" className="h-5 w-5" />
      <span>WhatsApp us</span>
    </a> : <button type="button" disabled title="Add a WhatsApp number in portal Settings to enable this button"
      aria-label="WhatsApp contact is not configured yet"
      className="inline-flex min-h-12 cursor-not-allowed items-center gap-2 rounded-full bg-emerald-800 px-4 text-sm font-bold text-white opacity-75 shadow-lg shadow-black/20">
      <MessageCircle aria-hidden="true" className="h-5 w-5" />
      <span>WhatsApp not set up</span>
    </button>}
  </div>;
}
