/**
 * Generates the CLARISA PrimeNG theme from the vendor `lara-light-blue` one.
 *
 * Why a generated file and not a `:root` override: the shipped theme declares
 * `--primary-color` but never reads it — `var(--primary-color)` appears 0 times
 * in both `theme.css` and `primeng.min.css`. The accent is written as a literal
 * hex 335 times, so redefining the variable recolours nothing. Remapping the
 * five literals of the blue ramp is what actually recolours the library.
 *
 * Run `npm run theme:build` after upgrading PrimeNG. `generate-primeng-theme.spec.ts`
 * fails when the committed file no longer matches what this script produces.
 */
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'node_modules/primeng/resources/themes/lara-light-blue/theme.css');
const TARGET = path.join(__dirname, '..', 'src/themes/clarisa-light-mint/theme.css');

/**
 * Blue ramp -> mint ramp, by the role each tone plays in the vendor theme.
 * Contrast ratios are WCAG 2.1, computed against the surface each tone lands on.
 */
const RAMP = [
  // primary surface + brand text. 5.70 on white, where the blue gave 3.68.
  ['#3B82F6', '#0b7554'],
  // hover surface. 7.16 on white.
  ['#2563EB', '#0a6449'],
  // highlight text over the soft surface below. 7.80, where the blue gave 6.16.
  ['#1D4ED8', '#08543e'],
  // focus ring.
  ['#BFDBFE', '#bde3d4'],
  // highlight surface.
  ['#EFF6FF', '#e3f3ed']
];

const BANNER =
  '/* GENERATED FILE - do not edit by hand.\n' +
  ' * Source: primeng/resources/themes/lara-light-blue/theme.css\n' +
  ' * Regenerate with `npm run theme:build`. See scripts/generate-primeng-theme.js.\n' +
  ' */\n';

function generate(css) {
  return BANNER + RAMP.reduce((acc, [from, to]) => acc.replace(new RegExp(from, 'gi'), to), css);
}

module.exports = { generate, RAMP, SOURCE, TARGET };

if (require.main === module) {
  const out = generate(fs.readFileSync(SOURCE, 'utf8'));
  fs.writeFileSync(TARGET, out);
  console.log(`wrote ${TARGET} (${out.length} bytes)`);
}
