"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

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

  const href = number ? `https://wa.me/${number}` : "/contact";
  const label = number ? "Chat with us on WhatsApp" : "Contact our team";

  return <a href={href} target={number ? "_blank" : undefined} rel={number ? "noopener noreferrer" : undefined}
    aria-label={number ? `${label} (opens in a new tab)` : label}
    className={`fixed bottom-4 right-4 z-50 inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 sm:bottom-6 sm:right-6 ${number ? "bg-[#128c4a] hover:bg-[#0f773f] focus-visible:ring-[#25d366]/40" : "bg-brand-700 hover:bg-brand-800 focus-visible:ring-brand-500/40"}`}>
    <MessageCircle aria-hidden="true" className="h-5 w-5" />
    <span className="hidden sm:inline">{number ? "WhatsApp us" : "Contact us"}</span>
  </a>;
}
