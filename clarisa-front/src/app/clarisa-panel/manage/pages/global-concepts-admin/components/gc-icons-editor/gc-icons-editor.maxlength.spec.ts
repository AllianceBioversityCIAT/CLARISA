export {};

// The spec tsconfig carries no Node typings; jest runs on Node, so both exist at runtime.
declare const require: (id: string) => any;
declare const __dirname: string;
const fs = require('fs');
const path = require('path');

/**
 * The icon form must not let a person type more than the back accepts: a longer
 * value only fails at save time with a 400. Limits copied from
 * `clarisa-back/src/api/global-concepts/dto/icon.dto.ts` (`@MaxLength` / `@Max`);
 * when that file is in the checkout, the spec also re-reads it so a change there
 * turns this red.
 */
const EXPECTED_MAXLENGTH: Record<string, number> = {
  icon_code: 50,
  file_name: 255,
  designer: 255,
  designer_country: 100,
  rights_and_licence: 255,
  alt_text: 500,
  file_link_primary: 1000,
  file_link_backup: 1000
};

const template: string = fs.readFileSync(path.join(__dirname, 'gc-icons-editor.component.html'), 'utf8');

function inputTag(name: string): string {
  const tag = template.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`, 's'))?.[0];
  if (!tag) throw new Error(`No <input name="${name}"> in the icons editor template`);
  return tag;
}

function attr(tag: string, name: string): number | null {
  const value = tag.match(new RegExp(`\\s${name}="(\\d+)"`))?.[1];
  return value === undefined ? null : Number(value);
}

describe('GcIconsEditorComponent limits', () => {
  it.each(Object.entries(EXPECTED_MAXLENGTH))('%s allows at most %i characters, as the back DTO', (field, max) => {
    expect(attr(inputTag(field), 'maxlength')).toBe(max);
  });

  it('year_created spans the years the back accepts (1900–2200)', () => {
    const tag = inputTag('year_created');
    expect(attr(tag, 'min')).toBe(1900);
    expect(attr(tag, 'max')).toBe(2200);
  });

  it('matches the DTO when the back is in the checkout', () => {
    const dtoPath = path.join(__dirname.split(`${path.sep}clarisa-front${path.sep}`)[0], 'clarisa-back', 'src', 'api', 'global-concepts', 'dto', 'icon.dto.ts');
    if (!fs.existsSync(dtoPath)) return;
    const dto: string = fs.readFileSync(dtoPath, 'utf8');
    const fields = dto.split('export class IconDto')[0];
    const found: Record<string, number> = {};
    for (const block of fields.split(/;\s*\n/)) {
      const max = block.match(/@MaxLength\((\d+)\)/)?.[1];
      const name = block.match(/(\w+)\?:\s*string\s*$/)?.[1];
      if (max && name) found[name] = Number(max);
    }
    for (const [field, max] of Object.entries(EXPECTED_MAXLENGTH)) expect({ field, max: found[field] }).toEqual({ field, max });
  });
});
