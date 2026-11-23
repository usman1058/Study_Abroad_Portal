"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";

export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "Please check your details and try again.");
        return;
      }
      setSubmitted(true);
      form.reset();
    } catch {
      setError("We couldn't send your enquiry. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) return <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-700"><CheckCircle2 aria-hidden="true" className="h-6 w-6" /></span><h2 className="mt-4 font-display text-2xl font-bold text-navy">Your enquiry is with our team.</h2><p className="mt-2 leading-7 text-slate-700">Thank you for getting in touch. Your message has been added to our enquiry queue so the team can follow up using the contact details you provided.</p><button className="mt-5 text-sm font-bold text-blue underline" onClick={() => setSubmitted(false)}>Send another enquiry</button></div>;

  return <form className="space-y-5" onSubmit={submit}>
    <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true"><label htmlFor="contact-website">Leave this field empty</label><input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
    <div className="grid gap-5 sm:grid-cols-2">
      <div><label className="field-label" htmlFor="contact-name">Your name <span aria-hidden="true" className="text-red-600">*</span></label><input className="field-control" id="contact-name" name="name" autoComplete="name" maxLength={120} required /></div>
      <div><label className="field-label" htmlFor="contact-email">Email address <span aria-hidden="true" className="text-red-600">*</span></label><input className="field-control" id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} required /></div>
      <div><label className="field-label" htmlFor="contact-phone">Phone number <span aria-hidden="true" className="text-red-600">*</span></label><input className="field-control" id="contact-phone" name="phone" type="tel" autoComplete="tel" maxLength={30} required aria-describedby="contact-phone-help" /><p id="contact-phone-help" className="mt-1 text-xs text-slate-500">Include your country code if you’re outside your local area.</p></div>
      <div><label className="field-label" htmlFor="contact-country">Where would you like to study?</label><input className="field-control" id="contact-country" name="countryOfInterest" autoComplete="country-name" maxLength={120} placeholder="Country or destination" /></div>
      <div className="sm:col-span-2"><label className="field-label" htmlFor="contact-course">What are you interested in?</label><input className="field-control" id="contact-course" name="courseOfInterest" maxLength={120} placeholder="Subject, program, or study level" /></div>
      <div className="sm:col-span-2"><label className="field-label" htmlFor="contact-notes">Your message <span aria-hidden="true" className="text-red-600">*</span></label><textarea className="field-control min-h-32 resize-y" id="contact-notes" name="notes" maxLength={1000} required placeholder="Tell us a little about your plans or questions…" /></div>
    </div>
    <p className="text-xs leading-5 text-slate-500">By sending this form, you agree that we may use these details to respond to your enquiry. Read our <a className="font-semibold text-blue underline" href="/privacy">privacy notice</a>.</p>
    <button className="btn-primary min-w-44" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="h-4 w-4 animate-spin" />Sending…</> : <>Send enquiry <ArrowRight aria-hidden="true" className="h-4 w-4" /></>}</button>
  </form>;
}
