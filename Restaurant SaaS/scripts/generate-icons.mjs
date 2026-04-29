import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');
mkdirSync(publicDir, { recursive: true });

const svg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="72" fill="#0a0a0a"/>
  <rect width="512" height="512" rx="72" fill="url(#bg)"/>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#111111"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </linearGradient>
  </defs>
  <text
    x="256"
    y="355"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="310"
    font-style="italic"
    font-weight="bold"
    text-anchor="middle"
    fill="#c19d68"
  >U</text>
  <rect x="96" y="390" width="320" height="1.5" fill="#c19d68" opacity="0.3"/>
</svg>
`);

await sharp(svg).resize(512, 512).png().toFile(`${publicDir}/icon-512.png`);
await sharp(svg).resize(192, 192).png().toFile(`${publicDir}/icon-192.png`);
await sharp(svg).resize(180, 180).png().toFile(`${publicDir}/apple-touch-icon.png`);
console.log('✓ Icons generated: icon-192.png, icon-512.png, apple-touch-icon.png');
