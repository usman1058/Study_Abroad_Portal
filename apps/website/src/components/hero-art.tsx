import { ArrowUpRight, Globe2, GraduationCap, Sparkles } from "lucide-react";

export function HeroArt() {
  return <div aria-hidden="true" className="relative mx-auto aspect-[1.02] w-full max-w-[34rem]">
    <div className="absolute inset-[8%] rounded-[2.5rem] bg-gradient-to-br from-[#dce8ff] via-[#edf1fb] to-[#fbe9c8] rotate-3" />
    <div className="absolute inset-[14%_10%_9%_14%] overflow-hidden rounded-[2.2rem] border border-white/80 bg-gradient-to-br from-[#4f3d9e] via-[#302b66] to-[#111126] shadow-[0_35px_80px_#17162b30]">
      <div className="absolute -right-[14%] -top-[10%] h-[90%] w-[90%] rounded-full border border-white/15" />
      <div className="absolute -right-[3%] top-[4%] h-[70%] w-[70%] rounded-full border border-white/15" />
      <div className="absolute right-[10%] top-[17%] h-[47%] w-[47%] rounded-full border border-white/20 bg-blue-300/5" />
      <div className="absolute right-[19%] top-[25%] h-[30%] w-[30%] rounded-full border border-amber/40 bg-amber/10" />
      <div className="absolute left-[12%] top-[16%] flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-amber ring-1 ring-white/20"><Globe2 className="h-6 w-6" /></div>
      <div className="absolute bottom-[12%] left-[8%] right-[8%] rounded-2xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur-md sm:p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-blue-200"><Sparkles className="h-3.5 w-3.5 text-amber" /> Your next chapter</div>
        <p className="mt-3 max-w-[18rem] font-display text-2xl font-bold leading-tight sm:text-3xl">A world of possibility starts with one step.</p>
        <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-4 text-sm"><span className="text-blue-100">Find a path that fits you</span><span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber text-navy"><ArrowUpRight className="h-4 w-4" /></span></div>
      </div>
      <GraduationCap className="absolute right-[9%] top-[13%] h-8 w-8 rotate-[-12deg] text-amber" />
    </div>
    <div className="site-float absolute right-[2%] top-[37%] flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-xs font-bold text-navy shadow-xl sm:right-0 sm:px-4 sm:py-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-soft text-blue"><GraduationCap className="h-4 w-4" /></span>Explore real programs</div>
    <div className="absolute bottom-[5%] left-0 h-5 w-5 rounded-full bg-amber shadow-[0_0_0_8px_#f3b54a24]" />
  </div>;
}
