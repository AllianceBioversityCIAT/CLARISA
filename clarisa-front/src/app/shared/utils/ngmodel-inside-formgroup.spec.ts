// The spec tsconfig carries no Node typings; jest runs on Node, so both exist at runtime.
declare const require: (id: string) => any;
declare const __dirname: string;
const fs = require('fs');
const path = require('path');

/**
 * Guard for NG01350 ("ngModel cannot be used to register form controls with a
 * parent formGroup directive").
 *
 * The 2026-09-16 panel redesign moved the "send a justification email" radio of
 * the reject form inside `<form [formGroup]>`. In production builds Angular does
 * not report the cause: it throws `Cannot read properties of null (reading
 * '_rawValidators')` once per pending request, and no unit test noticed, because
 * the component specs replace the template.
 *
 * This reads the real templates: any `ngModel` inside a `[formGroup]` form must
 * either sit on the same element as a `formControlName` or declare
 * `[ngModelOptions]="{ standalone: true }"`.
 */
const APP_DIR = path.join(__dirname, '..', '..');

function htmlFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry: { name: string; isDirectory(): boolean }) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

function offenders(template: string): string[] {
  const html = template.replace(/<!--[\s\S]*?-->/g, '');
  const forms = html.match(/<form\b[^>]*\[formGroup\][\s\S]*?<\/form>/g) ?? [];
  return forms.flatMap(form =>
    (form.match(/<[a-zA-Z][^<>]*\[\(?ngModel\)?\][^<>]*>/g) ?? []).filter(tag => !/formControlName/.test(tag) && !/standalone\s*:\s*true/.test(tag))
  );
}

describe('templates: ngModel inside a [formGroup] form', () => {
  it('flags an ngModel that is neither a formControlName nor standalone', () => {
    const bad = '<form [formGroup]="g"><p-radioButton [(ngModel)]="checked"></p-radioButton></form>';
    const paired = '<form [formGroup]="g"><p-dropdown formControlName="type" [(ngModel)]="t"></p-dropdown></form>';
    const standalone = '<form [formGroup]="g"><p-radioButton [(ngModel)]="c" [ngModelOptions]="{ standalone: true }"></p-radioButton></form>';
    const outside = '<p-radioButton [(ngModel)]="c"></p-radioButton><form [formGroup]="g"></form>';

    expect(offenders(bad)).toHaveLength(1);
    expect(offenders(paired)).toHaveLength(0);
    expect(offenders(standalone)).toHaveLength(0);
    expect(offenders(outside)).toHaveLength(0);
  });

  it('no template in the app registers a loose ngModel inside a [formGroup]', () => {
    const found = htmlFiles(APP_DIR).flatMap(file =>
      offenders(fs.readFileSync(file, 'utf8')).map(tag => `${path.relative(APP_DIR, file)}: ${tag.slice(0, 120)}`)
    );
    expect(found).toEqual([]);
  });
});
