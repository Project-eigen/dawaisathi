// Rasterizes the app icon to the PNG sizes the PWA manifest needs.
// Run with: npm run icons
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const OUT = "public/icons";
await mkdir(OUT, { recursive: true });

const glyph = (size, maskable) => {
  const pad = maskable ? Math.round(size * 0.12) : 0; // safe area for maskable
  const r = maskable ? size / 2 : size * 0.22;
  const fontSize = Math.round(size * 0.5);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f766e"/>
      <stop offset="1" stop-color="#0ea5a4"/>
    </linearGradient>
  </defs>
  <rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" rx="${r}" fill="url(#g)"/>
  <text x="50%" y="50%" dy="0.36em" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="${fontSize}" fill="#ffffff">⚕</text>
</svg>`;
};

const jobs = [
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "icon-maskable-512.png", size: 512, maskable: true },
];

for (const job of jobs) {
  await sharp(Buffer.from(glyph(job.size, job.maskable))).png().toFile(`${OUT}/${job.name}`);
  console.log("wrote", `${OUT}/${job.name}`);
}
