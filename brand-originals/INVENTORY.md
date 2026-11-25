# MK3 Sportz artwork inventory

Source: Google Drive folder **MK3 Sportz Art Files**, received as a zip (16 files) on 2026-11-24.
The files below are kept exactly as delivered, organized by academy as in Drive. This folder is
**never served by the website**. Web versions are built into `images/brand/<sport>/` with
`npm run build:brand`; they keep transparency, colours (sRGB, no colour-profile changes) and
proportions, and are only scaled down.

Both academies contain both subfolders (`CLEAR Background (PNG Files)` and `Shirt Vendor Files`).
The original file names are kept, including the spelling "Seperations".

## SD Badminton Academy → `/badminton/`

| Original (in `SD Badminton Academy/`) | Format | Size | Web version(s) in `images/brand/badminton/` | Used on the site |
|---|---|---|---|---|
| `SDBA-Black-Circle-Profile.png` | PNG 2222×2304, transparent corners | 215,920 B | `circle-black-600.png` | Logos & Apparel → Profile badge · black |
| `SDBA-White-Circle-Profile.png` | PNG 2222×2304, transparent corners | 220,190 B | `circle-white-600.png`, `favicon-64.png` | Logos & Apparel → Profile badge · white; browser-tab icon on every Badminton page and its sign-in page |
| `CLEAR Background (PNG Files)/SDBA-White-BKGD-by-NACU.png` | PNG 3936×4783, transparent | 329,698 B | `crest-light-160.png`, `crest-light-400.png`, `crest-light-800.png` | Header crest on every Badminton page; Admin Sign In page; Logos & Apparel → Crest · full color (light backgrounds) |
| `CLEAR Background (PNG Files)/SDBA-Black-BKGD-by-NACU.png` | PNG 3936×4783, transparent | 351,418 B | `crest-dark-480.png`, `crest-dark-800.png` | Home page banner; Logos & Apparel → Crest · full color (dark backgrounds) |
| `CLEAR Background (PNG Files)/SDBA-Black-BKGD-v2-by-NACU.png` | PNG 3936×4783, transparent | 352,377 B | `crest-dark-v2-800.png` | Logos & Apparel → Crest · alternate (v2) |
| `Shirt Vendor Files/SDBA-Seperations by-NACU.svg` | SVG 6789×2182 (Illustrator 29.8 export; no scripts or external links) | 753,605 B | `apparel-sheet-1600.png`, `apparel-1-one-color-dark.png`, `apparel-2-one-color-light.png`, `apparel-3-full-color-light.png`, `apparel-4-full-color-dark.png` | Logos & Apparel → Apparel artwork (each design + the separations sheet) |
| `Shirt Vendor Files/SDBA-Seperations by-NACU.ai` | Adobe Illustrator (PDF 1.6-compatible) | 1,879,342 B | — (same artwork as the .svg; shown through the .svg previews) | Kept for the print vendor |
| `Shirt Vendor Files/SDBA-Seperations by-NACU.eps` | EPS with embedded preview | 8,084,290 B | — (same artwork as the .svg; shown through the .svg previews) | Kept for the print vendor |

## SD Pickleball Academy → `/pickleball/`

| Original (in `SD Pickleball Academy/`) | Format | Size | Web version(s) in `images/brand/pickleball/` | Used on the site |
|---|---|---|---|---|
| `SDPA-Black-Circle-Profile.png` | PNG 2222×2304, transparent corners | 162,672 B | `circle-black-600.png` | Logos & Apparel → Profile badge · black |
| `SDPA-White-Circle-Profile.png` | PNG 2222×2304, transparent corners | 179,738 B | `circle-white-600.png`, `favicon-64.png` | Logos & Apparel → Profile badge · white; browser-tab icon on every Pickleball page and its sign-in page |
| `CLEAR Background (PNG Files)/SDPA-White-BKGD-by-NACU.png` | PNG 3936×4783, transparent | 258,934 B | `crest-light-160.png`, `crest-light-400.png`, `crest-light-800.png` | Header crest on every Pickleball page; Admin Sign In page; Logos & Apparel → Crest · full color (light backgrounds) |
| `CLEAR Background (PNG Files)/SDPA-Black-BKGD-by-NACU.png` | PNG 3936×4783, transparent | 279,779 B | `crest-dark-480.png`, `crest-dark-800.png` | Home page banner; Logos & Apparel → Crest · full color (dark backgrounds) |
| `CLEAR Background (PNG Files)/SDPA-Black-BKGD-v2-by-NACU.png` | PNG 3936×4783, transparent | 276,433 B | `crest-dark-v2-800.png` | Logos & Apparel → Crest · alternate (v2) |
| `Shirt Vendor Files/SDPA-Seperations by-NACU.svg` | SVG 6676×2036 (Illustrator 29.8 export; no scripts or external links) | 547,073 B | `apparel-sheet-1600.png`, `apparel-1-one-color-dark.png`, `apparel-2-one-color-light.png`, `apparel-3-full-color-light.png`, `apparel-4-full-color-dark.png` | Logos & Apparel → Apparel artwork (each design + the separations sheet) |
| `Shirt Vendor Files/SDPA-Seperations by-NACU.ai` | Adobe Illustrator (PDF 1.6-compatible) | 2,285,629 B | — (same artwork as the .svg; shown through the .svg previews) | Kept for the print vendor |
| `Shirt Vendor Files/SDPA-Seperations by-NACU.eps` | EPS with embedded preview | 8,402,426 B | — (same artwork as the .svg; shown through the .svg previews) | Kept for the print vendor |

## Duplicates and equivalent designs

- **No byte-identical duplicates** among the 16 files (compared by SHA-256).
- **Same artwork, different formats:** in each academy, the `.ai`, `.eps` and `.svg` "Seperations"
  files are the same sheet of four shirt designs. All three were rendered (the `.ai` and `.eps` with
  Ghostscript) and compared side by side. Only the printer's label font and the `.eps` page crop differ.
- **Same design as a PNG:** on each separations sheet, "Light Color BKGD" matches the
  `White-BKGD` crest PNG, and "Dark Color BKGD" matches the `Black-BKGD` crest PNG.
- **Only in the vendor files:** the two one-color shirt designs, "ONE Color (Dark BKGD)" (white ink)
  and "ONE Color (Light BKGD)" (black ink). They are cut out as `apparel-1-…` and `apparel-2-…`.
- **Distinct designs:** `Black-BKGD-v2` (grey shield) and the black and white circle profile badges.
- The Badminton and Pickleball files share one crest template (same layout and colours) with
  different sport text and icons. They are separate designs, not duplicates.

Brand colours sampled from the crests: magenta `#882B75`, black `#000000`, light grey `#C5C8C9`, white.
Artwork by NACU.
