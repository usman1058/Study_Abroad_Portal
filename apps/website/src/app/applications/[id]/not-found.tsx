import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function ProgramNotFound() {
  return <section className="site-container flex min-h-[55vh] flex-col items-center justify-center py-16 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-soft text-blue"><SearchX className="h-6 w-6" /></span><h1 className="mt-5 font-display text-3xl font-extrabold text-navy">We couldn’t find that program</h1><p className="mt-3 max-w-md leading-7 text-slate-600">The listing may have changed or is no longer available. Browse the catalog to see current programs.</p><Link href="/applications" className="btn-primary mt-6"><ArrowLeft className="h-4 w-4" />Browse programs</Link></section>;
}
