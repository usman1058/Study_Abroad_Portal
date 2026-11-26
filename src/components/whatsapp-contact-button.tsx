"use client";

import { MessageCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const CONTACT_URL = "https://checkmyuni.com/contact";

function WhatsAppMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.08 0C5.47 0 .1 5.37.1 11.98c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.63a11.98 11.98 0 0 0 5.88 1.5h.01c6.6 0 11.98-5.37 11.98-11.98 0-3.2-1.25-6.21-3.55-8.41ZM12.08 21.83h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.68.97.98-3.59-.23-.37a9.8 9.8 0 0 1-1.5-5.28c0-5.41 4.4-9.81 9.81-9.81 2.62 0 5.08 1.02 6.93 2.88a9.75 9.75 0 0 1 2.87 6.94c0 5.41-4.4 9.81-9.81 9.81Z" />
      <path d="M17.46 14.26c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.41-1.49-.89-.8-1.49-1.78-1.67-2.08-.18-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.38-.27.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.12 3.24 5.14 4.55.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35Z" />
    </svg>
  );
}

export function WhatsAppContactButton() {
  const [number, setNumber] = useState("");

  const refreshNumber = useCallback(async () => {
    try {
      const response = await fetch("/api/public/contact-settings", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load WhatsApp settings");
      const data = await response.json() as { whatsappNumber?: string };
      const value = (data?.whatsappNumber ?? "").replace(/\D/g, "");
      setNumber(/^\d{7,15}$/.test(value) ? value : "");
    } catch {
      setNumber("");
    }
  }, []);

  useEffect(() => {
    void refreshNumber();
    window.addEventListener("focus", refreshNumber);
    window.addEventListener("portal-contact-settings-updated", refreshNumber);
    return () => {
      window.removeEventListener("focus", refreshNumber);
      window.removeEventListener("portal-contact-settings-updated", refreshNumber);
    };
  }, [refreshNumber]);

  const iconButton = "grid h-11 w-11 place-items-center rounded-full text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 sm:h-12 sm:w-12";

  return (
    <nav aria-label="Quick contact" className="fixed bottom-4 right-4 z-50 flex flex-col items-center gap-2 sm:bottom-6 sm:right-6">
      <a href={CONTACT_URL} aria-label="Contact CheckMyUni" title="Contact CheckMyUni" className={`${iconButton} bg-brand-700 hover:bg-brand-800 focus-visible:ring-brand-500/40`}>
        <MessageCircle aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
      </a>
      {number ? (
        <a href={`https://wa.me/${number}?text=${encodeURIComponent("Hi CheckMyUni, I would like to ask about studying abroad.")}`} target="_blank" rel="noopener noreferrer" aria-label="Chat with CheckMyUni on WhatsApp (opens in a new tab)" title="WhatsApp CheckMyUni" className={`${iconButton} bg-[#128c4a] hover:bg-[#0f773f] focus-visible:ring-[#25d366]/40`}>
          <WhatsAppMark />
        </a>
      ) : (
        <button type="button" disabled title="WhatsApp contact is not configured" aria-label="WhatsApp contact is not available" className={`${iconButton} cursor-not-allowed bg-emerald-800 opacity-75`}>
          <WhatsAppMark />
        </button>
      )}
    </nav>
  );
}
