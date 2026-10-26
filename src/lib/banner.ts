/**
 * Deterministic SVG banner generator. Used when a doc/playlist has no `banner`.
 * Returns a data: URI usable in <img src> or CSS background-image.
 */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function accentHue(seed: string, override?: number) {
  return override ?? hash(seed) % 360;
}

export interface BannerOptions {
  hue?: number;
  width?: number;
  height?: number;
  /** Short label drawn large in the corner (e.g. first letters). */
  label?: string;
}

export function bannerSvg(seed: string, opts: BannerOptions = {}) {
  const w = opts.width ?? 1200;
  const h = opts.height ?? 675;
  const hue = accentHue(seed, opts.hue);
  const r = hash(seed + "x");
  const h2 = (hue + 40 + (r % 60)) % 360;
  const h3 = (hue + 300) % 360;
  const label = (
    opts.label ??
    seed
      .replace(/[^a-z0-9 ]/gi, "")
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
  ).toUpperCase();

  // A few soft blobs + a grid + big label. Everything is derived from the seed.
  const blobs = Array.from({ length: 4 }, (_, i) => {
    const s = hash(seed + i);
    const cx = ((s % 100) / 100) * w;
    const cy = (((s >> 8) % 100) / 100) * h;
    const rad = 180 + ((s >> 16) % 220);
    const hh = [hue, h2, h3, hue][i];
    return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rad}" fill="hsl(${hh} 80% 60% / 0.55)" filter="url(#b)"/>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="hsl(${hue} 60% 14%)"/>
    <stop offset="1" stop-color="hsl(${h2} 55% 22%)"/>
  </linearGradient>
  <filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter>
  <pattern id="p" width="48" height="48" patternUnits="userSpaceOnUse">
    <path d="M48 0H0V48" fill="none" stroke="hsl(${hue} 60% 80% / 0.08)" stroke-width="1"/>
  </pattern>
</defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
${blobs}
<rect width="${w}" height="${h}" fill="url(#p)"/>
<text x="${w - 48}" y="${h - 40}" text-anchor="end" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="800" font-size="${Math.round(h * 0.42)}" fill="hsl(${hue} 80% 85% / 0.18)" letter-spacing="-0.04em">${label}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
