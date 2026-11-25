#!/usr/bin/env node
"use strict";
/*
 * Build the website versions of the academy artwork:   npm run build:brand
 *
 * Reads the original files exactly as delivered in brand-originals/<Academy>/ (never served
 * by the website) and writes web-ready images to images/brand/<sport>/ (served).
 * Transparency, colours (sRGB, no colour-profile changes) and proportions are preserved —
 * images are only scaled down. The four shirt designs on each vendor "Separations" sheet are
 * cut out of the .svg so each design can be shown on its own.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const ORIGINALS = path.join(ROOT, "brand-originals");
const OUT = path.join(ROOT, "images", "brand");

const ACADEMIES = [
  { sport: "badminton", folder: "SD Badminton Academy", code: "SDBA" },
  { sport: "pickleball", folder: "SD Pickleball Academy", code: "SDPA" },
];

// [web file, original inside the academy folder, width in px]
const rasters = (code) => {
  const clear = "CLEAR Background (PNG Files)";
  return [
    ["crest-light-160.png", `${clear}/${code}-White-BKGD-by-NACU.png`, 160],
    ["crest-light-400.png", `${clear}/${code}-White-BKGD-by-NACU.png`, 400],
    ["crest-light-800.png", `${clear}/${code}-White-BKGD-by-NACU.png`, 800],
    ["crest-dark-480.png", `${clear}/${code}-Black-BKGD-by-NACU.png`, 480],
    ["crest-dark-800.png", `${clear}/${code}-Black-BKGD-by-NACU.png`, 800],
    ["crest-dark-v2-800.png", `${clear}/${code}-Black-BKGD-v2-by-NACU.png`, 800],
    ["circle-black-600.png", `${code}-Black-Circle-Profile.png`, 600],
    ["circle-white-600.png", `${code}-White-Circle-Profile.png`, 600],
  ];
};

// The four designs on each separations sheet, left to right (labels from the vendor sheet).
const APPAREL = ["one-color-dark", "one-color-light", "full-color-light", "full-color-dark"];

const png = (img) => img.png({ compressionLevel: 9, adaptiveFiltering: true });
const ensureDir = (d) => fs.mkdirSync(d, { recursive: true });

/** Find the separate designs below the label rule on a rendered separations sheet. */
function findDesigns({ data, info }) {
  const { width: W, height: H } = info;
  const filled = (x, y) => data[(y * W + x) * 4 + 3] > 24;
  const rowFill = (y) => { let n = 0; for (let x = 0; x < W; x++) if (filled(x, y)) n++; return n; };
  // The thin rule under the printed labels spans almost the whole sheet.
  let y = 0;
  while (y < H && rowFill(y) < W * 0.7) y++;
  if (y >= H) throw new Error("couldn't find the label rule on the separations sheet");
  while (y < H && rowFill(y) >= W * 0.5) y++; // skip the rule's thickness
  const top = y;
  const cols = new Array(W).fill(0);
  for (let yy = top; yy < H; yy++) for (let x = 0; x < W; x++) if (filled(x, yy)) cols[x]++;
  // Runs of occupied columns; small gaps (inside a design) are bridged.
  const runs = [];
  const gap = Math.round(W * 0.012);
  for (let x = 0; x < W; x++) {
    if (!cols[x]) continue;
    const last = runs[runs.length - 1];
    if (last && x - last[1] <= gap) last[1] = x; else runs.push([x, x]);
  }
  return runs.map(([x0, x1]) => {
    let y0 = H, y1 = top;
    for (let yy = top; yy < H; yy++) for (let x = x0; x <= x1; x++) if (filled(x, yy)) { if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; break; }
    return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  });
}

(async () => {
  const report = [];
  for (const a of ACADEMIES) {
    const src = path.join(ORIGINALS, a.folder);
    const out = path.join(OUT, a.sport);
    ensureDir(out);

    for (const [name, rel, width] of rasters(a.code)) {
      const info = await png(sharp(path.join(src, rel)).resize({ width })).toFile(path.join(out, name));
      report.push([a.sport, name, info.width, info.height, rel]);
    }

    // Browser-tab icon: the white circle badge, centred on a transparent square.
    const fav = await png(sharp(path.join(src, `${a.code}-White-Circle-Profile.png`))
      .resize(64, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })).toFile(path.join(out, "favicon-64.png"));
    report.push([a.sport, "favicon-64.png", fav.width, fav.height, `${a.code}-White-Circle-Profile.png`]);

    // Shirt vendor artwork: preview of the whole separations sheet + each design on its own.
    const svgRel = `Shirt Vendor Files/${a.code}-Seperations by-NACU.svg`;
    const svg = fs.readFileSync(path.join(src, svgRel));
    const sheet = await png(sharp(svg, { density: 72 }).resize({ width: 1600 })).toFile(path.join(out, "apparel-sheet-1600.png"));
    report.push([a.sport, "apparel-sheet-1600.png", sheet.width, sheet.height, svgRel]);

    const big = sharp(svg, { density: 54 }).ensureAlpha(); // ~5000px wide, enough for crisp crops
    const raw = await big.clone().raw().toBuffer({ resolveWithObject: true });
    const boxes = findDesigns(raw);
    if (boxes.length !== APPAREL.length) throw new Error(`${a.folder}: expected ${APPAREL.length} designs on the sheet, found ${boxes.length}`);
    const rendered = await big.png().toBuffer();
    for (const [i, box] of boxes.entries()) {
      const pad = Math.round(raw.info.width * 0.004);
      const region = {
        left: Math.max(0, box.left - pad), top: Math.max(0, box.top - pad),
        width: Math.min(raw.info.width - Math.max(0, box.left - pad), box.width + pad * 2),
        height: Math.min(raw.info.height - Math.max(0, box.top - pad), box.height + pad * 2),
      };
      const name = `apparel-${i + 1}-${APPAREL[i]}.png`;
      const info = await png(sharp(rendered).extract(region).resize({ width: 700 })).toFile(path.join(out, name));
      report.push([a.sport, name, info.width, info.height, svgRel]);
    }
  }
  console.log("Built web artwork:");
  for (const [sport, name, w, h, from] of report) console.log(`  images/brand/${sport}/${name.padEnd(28)} ${String(w).padStart(4)}×${String(h).padEnd(4)}  ← ${from}`);
})().catch((err) => { console.error(err.message); process.exit(1); });
