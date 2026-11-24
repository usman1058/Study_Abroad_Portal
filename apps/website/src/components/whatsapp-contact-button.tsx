import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { getWhatsAppNumber } from "@/lib/portal";

export async function WhatsAppContactButton() {
  const number = await getWhatsAppNumber();
  const href = number ? `https://wa.me/${number}` : "/contact";
  const label = number ? "Chat with us on WhatsApp (opens in a new tab)" : "Contact our team";

  const style = number ? "bg-[#128c4a] hover:bg-[#0f773f] focus-visible:ring-[#25d366]/40" : "bg-blue-dark hover:bg-navy focus-visible:ring-blue/40";
  return <>
    <Link href={href} target={number ? "_blank" : undefined} rel={number ? "noopener noreferrer" : undefined}
      aria-label={label}
      className={`fixed bottom-6 right-6 z-50 hidden min-h-12 items-center gap-2 rounded-full px-4 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 sm:inline-flex ${style}`}>
      <MessageCircle aria-hidden="true" className="h-5 w-5" />
      <span>{number ? "WhatsApp us" : "Contact us"}</span>
    </Link>
    <div className="flex justify-end bg-navy px-5 pb-4 sm:hidden">
      <Link href={href} target={number ? "_blank" : undefined} rel={number ? "noopener noreferrer" : undefined}
        aria-label={label}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold text-white shadow-sm focus-visible:outline-none focus-visible:ring-4 ${style}`}>
        <MessageCircle aria-hidden="true" className="h-5 w-5" />
        <span>{number ? "WhatsApp us" : "Contact us"}</span>
      </Link>
    </div>
  </>;
}
