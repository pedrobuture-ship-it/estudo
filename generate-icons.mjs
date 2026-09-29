import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#0b0f19" />
    </linearGradient>

    <!-- Border Glow -->
    <linearGradient id="borderGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#10b981" stop-opacity="0.8" />
    </linearGradient>

    <!-- Card In Progress Gradient -->
    <linearGradient id="cardProgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#4f46e5" />
    </linearGradient>

    <!-- Card Cyan Gradient -->
    <linearGradient id="cardCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <!-- Card Done Gradient -->
    <linearGradient id="cardDoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>

    <!-- Card Default Gradient -->
    <linearGradient id="cardDefaultGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>

    <!-- Glow Filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#4f46e5" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Base Squircle -->
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bgGrad)" stroke="url(#borderGlow)" stroke-width="8" />

  <!-- Column 1: A Fazer (To Do) -->
  <rect x="76" y="88" width="104" height="336" rx="20" fill="#1e293b" fill-opacity="0.55" stroke="#334155" stroke-width="2" />
  <!-- Cards in Col 1 -->
  <g>
    <!-- Card 1.1 -->
    <rect x="90" y="106" width="76" height="68" rx="12" fill="url(#cardDefaultGrad)" stroke="#475569" stroke-width="1.5" />
    <rect x="102" y="122" width="34" height="6" rx="3" fill="#94a3b8" />
    <rect x="102" y="136" width="52" height="5" rx="2.5" fill="#64748b" />
    <rect x="102" y="147" width="28" height="5" rx="2.5" fill="#64748b" />
    <circle cx="152" cy="125" r="4" fill="#f59e0b" />

    <!-- Card 1.2 -->
    <rect x="90" y="186" width="76" height="92" rx="12" fill="url(#cardDefaultGrad)" stroke="#475569" stroke-width="1.5" />
    <rect x="102" y="202" width="40" height="6" rx="3" fill="#94a3b8" />
    <rect x="102" y="216" width="52" height="5" rx="2.5" fill="#64748b" />
    <rect x="102" y="227" width="44" height="5" rx="2.5" fill="#64748b" />
    <rect x="102" y="254" width="30" height="12" rx="6" fill="#f43f5e" fill-opacity="0.25" stroke="#f43f5e" stroke-width="1" />
    <rect x="108" y="258" width="18" height="4" rx="2" fill="#fda4af" />

    <!-- Card 1.3 -->
    <rect x="90" y="290" width="76" height="60" rx="12" fill="url(#cardDefaultGrad)" stroke="#475569" stroke-width="1.5" />
    <rect x="102" y="306" width="36" height="6" rx="3" fill="#94a3b8" />
    <rect x="102" y="320" width="48" height="5" rx="2.5" fill="#64748b" />
  </g>

  <!-- Column 2: Em Andamento (In Progress - Highlighted) -->
  <rect x="204" y="88" width="104" height="336" rx="20" fill="#1e293b" fill-opacity="0.7" stroke="#6366f1" stroke-width="2.5" />
  <!-- Cards in Col 2 -->
  <g>
    <!-- Card 2.1 (Hero Feature Card) -->
    <g filter="url(#glow)">
      <rect x="218" y="106" width="76" height="116" rx="14" fill="url(#cardProgGrad)" />
      <!-- Inner detail -->
      <rect x="230" y="122" width="40" height="7" rx="3.5" fill="#ffffff" />
      <rect x="230" y="137" width="52" height="5" rx="2.5" fill="#c7d2fe" />
      <rect x="230" y="148" width="46" height="5" rx="2.5" fill="#c7d2fe" />
      <!-- Progress Pill -->
      <rect x="230" y="168" width="52" height="6" rx="3" fill="#312e81" />
      <rect x="230" y="168" width="36" height="6" rx="3" fill="#38bdf8" />
      <!-- Avatars / Tag -->
      <circle cx="236" cy="198" r="8" fill="#a5b4fc" />
      <circle cx="248" cy="198" r="8" fill="#e0e7ff" />
    </g>

    <!-- Card 2.2 -->
    <rect x="218" y="234" width="76" height="80" rx="12" fill="url(#cardCyanGrad)" />
    <rect x="230" y="250" width="38" height="6" rx="3" fill="#ffffff" />
    <rect x="230" y="264" width="52" height="5" rx="2.5" fill="#e0f2fe" />
    <rect x="230" y="275" width="42" height="5" rx="2.5" fill="#e0f2fe" />
    <circle cx="280" cy="253" r="4" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />
  </g>

  <!-- Column 3: Concluído (Done) -->
  <rect x="332" y="88" width="104" height="336" rx="20" fill="#1e293b" fill-opacity="0.55" stroke="#10b981" stroke-width="2" stroke-opacity="0.6" />
  <!-- Cards in Col 3 -->
  <g>
    <!-- Card 3.1 -->
    <rect x="346" y="106" width="76" height="82" rx="12" fill="url(#cardDoneGrad)" />
    <rect x="358" y="122" width="36" height="6" rx="3" fill="#ffffff" />
    <rect x="358" y="136" width="52" height="5" rx="2.5" fill="#d1fae5" />
    <path d="M 398 160 L 404 166 L 414 154" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Card 3.2 -->
    <rect x="346" y="200" width="76" height="74" rx="12" fill="url(#cardDoneGrad)" />
    <rect x="358" y="216" width="38" height="6" rx="3" fill="#ffffff" />
    <rect x="358" y="230" width="48" height="5" rx="2.5" fill="#d1fae5" />
    <path d="M 398 252 L 404 258 L 414 246" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>`;

async function run() {
  const publicDir = path.resolve('public');
  const iconsDir = path.join(publicDir, 'icons');

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // 1. Write SVG favicon
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf-8');
  console.log('Created public/favicon.svg');

  const svgBuffer = Buffer.from(svgContent);

  // 2. Generate PWA Icons
  const pwaSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  for (const size of pwaSizes) {
    const outPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`Created ${outPath}`);
  }

  // 3. Apple Touch Icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created public/apple-touch-icon.png');

  // 4. Favicon 32x32 and 16x16 PNGs
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), png32);
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), png16);

  // 5. Generate Multi-size ICO file containing 16x16 and 32x32 PNGs
  // ICO header: 2 bytes reserved (0), 2 bytes type (1 = icon), 2 bytes count (2)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(2, 4);

  const dir16 = Buffer.alloc(16);
  const dir32 = Buffer.alloc(16);

  const offset1 = 6 + 16 * 2; // 38
  const offset2 = offset1 + png16.length;

  // Entry 1: 16x16
  dir16.writeUInt8(16, 0); // width
  dir16.writeUInt8(16, 1); // height
  dir16.writeUInt8(0, 2);  // color palette
  dir16.writeUInt8(0, 3);  // reserved
  dir16.writeUInt16LE(1, 4); // color planes
  dir16.writeUInt16LE(32, 6); // bits per pixel
  dir16.writeUInt32LE(png16.length, 8); // image size
  dir16.writeUInt32LE(offset1, 12); // image offset

  // Entry 2: 32x32
  dir32.writeUInt8(32, 0);
  dir32.writeUInt8(32, 1);
  dir32.writeUInt8(0, 2);
  dir32.writeUInt8(0, 3);
  dir32.writeUInt16LE(1, 4);
  dir32.writeUInt16LE(32, 6);
  dir32.writeUInt32LE(png32.length, 8);
  dir32.writeUInt32LE(offset2, 12);

  const icoBuffer = Buffer.concat([header, dir16, dir32, png16, png32]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('Created public/favicon.ico with 16x16 & 32x32 icons');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
