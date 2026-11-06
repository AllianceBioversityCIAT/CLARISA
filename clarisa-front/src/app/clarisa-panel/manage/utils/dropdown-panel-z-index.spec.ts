import { PrimeNGConfig } from 'primeng/api';

// The spec tsconfig carries no Node typings; jest runs on Node, so both exist at runtime.
declare const require: (id: string) => any;
declare const __dirname: string;
const fs = require('fs');
const path = require('path');

/**
 * Every admin dropdown is drawn on <body> (`appendTo="body"` +
 * `panelStyleClass="admin-dropdown-panel"`), and `styles.scss` pins that panel's
 * z-index with `!important`, so PrimeNG can no longer lift it above the dialog it
 * was opened from. A modal p-dialog paints its mask at
 * `baseZIndex + PrimeNGConfig.zIndex.modal`: when that is higher than the pinned
 * value the list opens *behind* the mask and the dropdown looks dead
 * (Partner requests → Edit request, `[baseZIndex]="10000"`, 2026-11-06).
 *
 * jsdom does not paint, so this compares the numbers instead: the pinned panel
 * must clear the highest modal any template in the app can open, plus room for a
 * confirm dialog stacked on top of it.
 */
const SRC = path.join(__dirname, '..', '..', '..', '..');
const STACKED_MODALS = 10;

function htmlFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry: any) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

function pinnedPanelZIndex(): number {
  const styles: string = fs.readFileSync(path.join(SRC, 'styles.scss'), 'utf8');
  const rule = styles.match(/\.admin-dropdown-panel\.p-dropdown-panel[^{]*\{[^}]*?z-index:\s*(\d+)/);
  if (!rule) throw new Error('No z-index for .admin-dropdown-panel.p-dropdown-panel in styles.scss');
  return Number(rule[1]);
}

function modalBaseZIndexes(): { file: string; base: number }[] {
  return htmlFiles(path.join(SRC, 'app')).flatMap(file => {
    const html: string = fs.readFileSync(file, 'utf8');
    const tags: string[] = html.match(/<p-(?:dialog|confirmDialog)\b[^>]*>/g) ?? [];
    return tags
      .map(tag => tag.match(/\[?baseZIndex\]?="(\d+)"/)?.[1])
      .filter((base): base is string => base !== undefined)
      .map(base => ({ file: path.relative(SRC, file), base: Number(base) }));
  });
}

describe('admin dropdown panel z-index', () => {
  const modal = new PrimeNGConfig().zIndex.modal;

  it('finds the dialogs that raise their own baseZIndex (guards the scan itself)', () => {
    const editRequest = modalBaseZIndexes().filter(d => d.file.includes('request-institutions-form'));
    expect(editRequest.length).toBeGreaterThan(0);
  });

  it('opens above the mask of the highest modal dialog in the app', () => {
    const highest = modalBaseZIndexes().reduce((top, d) => (d.base > top.base ? d : top), { file: '(default)', base: 0 });
    // ZIndexUtils gives the first modal base + modal + 1; its mask sits one below.
    const dialog = highest.base + modal + 1;

    expect(pinnedPanelZIndex()).toBeGreaterThan(dialog + STACKED_MODALS);
  });
});
