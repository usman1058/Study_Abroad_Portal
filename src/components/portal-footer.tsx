import Image from "next/image";

export function PortalFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-white/70 px-4 py-3 dark:border-navy-800 dark:bg-navy-950/70 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} CheckMyUni</p>
        <nav aria-label="Legal and support" className="flex flex-wrap gap-x-4 gap-y-2">
          <a href="https://checkmyuni.com/terms" className="rounded-sm hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-white">Terms and conditions</a>
          <a href="https://checkmyuni.com/privacy" className="rounded-sm hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-white">Privacy</a>
          <a href="https://checkmyuni.com/cookies" className="rounded-sm hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-white">Cookies</a>
          <a href="https://checkmyuni.com/contact" className="rounded-sm hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-white">Contact</a>
        </nav>
        <a
          href="https://unifexsolutions.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-8 items-center gap-2 self-start rounded-md text-xs text-ink-muted transition hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-white sm:self-auto"
        >
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-[#101010]">
            <Image src="/unifex-solutions-logo.webp" alt="" aria-hidden="true" width={32} height={32} unoptimized className="h-8 w-8 object-contain" />
          </span>
          <span>Made by <span className="font-semibold text-navy-800 dark:text-slate-200">Unifex Solutions</span></span>
        </a>
      </div>
    </footer>
  );
}
