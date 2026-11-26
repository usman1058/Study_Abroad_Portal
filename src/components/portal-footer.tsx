import Image from "next/image";

export function PortalFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-white/70 px-4 py-3 dark:border-navy-800 dark:bg-navy-950/70 sm:px-6">
      <div className="mx-auto flex max-w-7xl justify-center">
        <a
          href="https://unifexsolutions.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-8 items-center gap-2 rounded-md text-xs text-ink-muted transition hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-white"
        >
          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-[#101010]">
            <Image src="/unifex-solutions-logo.webp" alt="" aria-hidden="true" width={28} height={28} unoptimized className="h-7 w-7 object-contain" />
          </span>
          <span>Made by <span className="font-semibold text-navy-800 dark:text-slate-200">Unifex Solutions</span></span>
        </a>
      </div>
    </footer>
  );
}
