/** Browser-side checks shared by the end-to-end visual audit specs. */
export const METRICS_JS = `(() => {
  const doc = document.documentElement;
  const unlabeled = Array.from(document.querySelectorAll("input,select,textarea")).filter((el) => {
    if (el.type === "hidden") return false;
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title")) return false;
    if (el.closest("label")) return false;
    const id = el.getAttribute("id");
    if (id && document.querySelector('label[for="' + id + '"]')) return false;
    return true;
  }).length;
  const h1 = document.querySelectorAll("h1").length;
  const targets = Array.from(document.querySelectorAll("a,button,select,input[type=checkbox]")).filter((el) => {
    if (el.closest("[aria-hidden=true]")) return false;
    if (el.closest("p") && el.tagName === "A" && !el.className.includes("inline-flex")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && Math.min(r.width, r.height) < 24 && el.textContent.trim().length > 0;
  }).map((el) => (el.textContent || "").trim().slice(0, 30));
  return JSON.stringify({ overflow: doc.scrollWidth - doc.clientWidth, unlabeled, h1, targets });
})()`;

/** WCAG 1.4.3 text contrast check, including colors emitted as oklch. */
export const CONTRAST_JS = `(() => {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const parse = (value) => {
    if (!value || !ctx) return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#010203";
    const sentinel = ctx.fillStyle;
    ctx.fillStyle = value;
    if (ctx.fillStyle === sentinel && value.trim().toLowerCase() !== sentinel) return null;
    ctx.fillRect(0, 0, 1, 1);
    const px = ctx.getImageData(0, 0, 1, 1).data;
    return { r: px[0], g: px[1], b: px[2], a: px[3] / 255 };
  };
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const backdrop = (el) => {
    let node = el;
    while (node && node.nodeType === 1) {
      const style = getComputedStyle(node);
      if (style.backgroundImage && style.backgroundImage !== "none") return null;
      const c = parse(style.backgroundColor);
      if (c && c.a > 0.5) return c;
      node = node.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const bad = [];
  for (const el of document.querySelectorAll("p,span,a,h1,h2,h3,h4,button,label,td,th,li,div")) {
    const text = (el.textContent || "").trim();
    if (!text || el.childElementCount > 0) continue;
    if (el.closest("[aria-disabled=true]") || el.closest("[aria-hidden=true]")) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) < 1) continue;
    const fg = parse(style.color);
    const bg = backdrop(el);
    if (!fg || !bg) continue;
    const l1 = lum(fg);
    const l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = parseFloat(style.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
    if (ratio < (large ? 3 : 4.5) && bad.length < 8) bad.push({ text: text.slice(0, 28), ratio: Math.round(ratio * 100) / 100, size });
  }
  return JSON.stringify(bad);
})()`;
