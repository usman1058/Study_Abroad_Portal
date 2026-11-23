import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return <section className="site-container flex min-h-[55vh] flex-col items-center justify-center py-16 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-soft text-blue"><Compass className="h-6 w-6" /></span><h1 className="mt-5 font-display text-3xl font-extrabold text-navy">This page is off the map.</h1><p className="mt-3 max-w-md leading-7 text-slate-600">That link doesn’t lead to a page we can find. Head back to the home page or explore the program catalog.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/" className="btn-primary"><ArrowLeft className="h-4 w-4" />Home page</Link><Link href="/applications" className="btn-secondary">Browse programs</Link></div></section>;
}
