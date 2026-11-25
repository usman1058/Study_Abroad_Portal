"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedCount({ value }: { value: number | null }) {
  const [count, setCount] = useState(value ?? 0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (value === null || !ref.current) return;
    const target = value;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || target === 0) {
      setCount(target);
      return;
    }

    let frame = 0;
    let startedAt = 0;
    const duration = 950;
    const animate = (now: number) => {
      if (!startedAt) startedAt = now;
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    const start = () => {
      setCount(0);
      frame = requestAnimationFrame(animate);
    };

    if (!("IntersectionObserver" in window)) {
      start();
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        start();
      }
    }, { threshold: 0.55 });
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return <span ref={ref}>{value === null ? "—" : new Intl.NumberFormat("en").format(count)}</span>;
}
