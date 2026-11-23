import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { formatDuration, formatMoney, programHref, type PublicProgram } from "@/lib/portal";

export function ProgramCard({ program }: { program: PublicProgram }) {
  return <article className="surface-card program-card flex h-full flex-col overflow-hidden">
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-blue-soft/80 to-white p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-lg font-extrabold text-blue shadow-sm ring-1 ring-slate-100" aria-hidden="true">{program.university.name.slice(0, 1)}</div>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue shadow-sm">{program.level}</span>
    </div>
    <div className="flex flex-1 flex-col p-5">
      <p className="text-xs font-bold uppercase tracking-[.11em] text-blue">{program.field}</p>
      <h3 className="mt-2 font-display text-lg font-bold leading-snug text-navy"><Link className="rounded-sm hover:text-blue focus-visible:outline" href={programHref(program)}>{program.name}</Link></h3>
      <p className="mt-1 text-sm font-medium text-slate-600">{program.university.name}</p>
      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500"><MapPin aria-hidden="true" className="h-3.5 w-3.5" />{[program.university.city, program.university.country].filter(Boolean).join(", ")}</p>
      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
        <div><dt className="text-xs text-slate-500">Listed tuition</dt><dd className="mt-1 font-bold text-navy">{formatMoney(program.tuitionFee)}</dd></div>
        <div><dt className="text-xs text-slate-500">Typical length</dt><dd className="mt-1 font-bold text-navy">{formatDuration(program.courseDurationMonths)}</dd></div>
      </dl>
      <Link href={programHref(program)} className="mt-5 inline-flex min-h-10 items-center justify-between rounded-lg border border-slate-200 px-3 text-sm font-bold text-navy transition hover:border-blue hover:text-blue">View program details <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
    </div>
  </article>;
}
