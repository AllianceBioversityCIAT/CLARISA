// The spec tsconfig carries no Node typings; jest runs on Node, so both exist at runtime.
declare const require: (id: string) => any;
declare const __dirname: string;
const fs = require('fs');
const path = require('path');
import { AI_DRAFT_FIELDS } from '../components/gc-concept-dialog/gc-concept-dialog.component';
import { FIELD_INFO, importColumnInfo } from './field-info';

const COMPONENTS_DIR = path.join(__dirname, '..', 'components');

/** Every component folder whose template shows at least one (i). */
function templatesWithInfo(): { name: string; html: string; ts: string }[] {
  return fs
    .readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((entry: { isDirectory(): boolean }) => entry.isDirectory())
    .map((entry: { name: string }) => {
      const base = path.join(COMPONENTS_DIR, entry.name, `${entry.name}.component`);
      const html = fs.existsSync(`${base}.html`) ? fs.readFileSync(`${base}.html`, 'utf8') : '';
      const ts = fs.existsSync(`${base}.ts`) ? fs.readFileSync(`${base}.ts`, 'utf8') : '';
      return { name: entry.name, html, ts };
    })
    .filter((file: { html: string }) => file.html.includes('<app-gc-info'));
}

describe('FIELD_INFO', () => {
  it('has a real sentence for every field', () => {
    for (const [group, texts] of Object.entries(FIELD_INFO)) {
      for (const [key, text] of Object.entries(texts as Record<string, string>)) {
        expect(`${group}.${key}: ${text.length > 20}`).toBe(`${group}.${key}: true`);
        expect(`${group}.${key}: ${/[.”)]$/.test(text)}`).toBe(`${group}.${key}: true`);
      }
    }
  });

  it('covers the three AI-draftable fields of the concept dialog', () => {
    for (const { field } of AI_DRAFT_FIELDS) {
      expect(FIELD_INFO.concept[field]).toBeTruthy();
    }
  });

  it('names the column in the import mapping text', () => {
    expect(importColumnInfo('TERM')).toContain('“TERM”');
  });

  it('every info.<key> a template reads exists in the group its component exposes', () => {
    const files = templatesWithInfo();
    expect(files.length).toBeGreaterThan(8);

    for (const file of files) {
      const group = file.ts.match(/readonly info = FIELD_INFO\.(\w+)/)?.[1];
      const keys: string[] = [...file.html.matchAll(/\binfo\.(\w+)/g)].map((match: RegExpMatchArray) => match[1]);
      if (!keys.length) continue;
      expect(`${file.name}: ${group ?? 'no FIELD_INFO group'}`).toBe(`${file.name}: ${group}`);
      const texts = (FIELD_INFO as Record<string, Record<string, string>>)[group as string];
      for (const key of keys) {
        expect(`${file.name} → info.${key}: ${!!texts[key]}`).toBe(`${file.name} → info.${key}: true`);
      }
    }
  });

  it('keeps every (i) outside its <label>, so the input is not announced with the whole tooltip', () => {
    for (const file of templatesWithInfo()) {
      const labels: string[] = file.html.match(/<label\b[\s\S]*?<\/label\s*>/g) ?? [];
      for (const label of labels) {
        expect(`${file.name}: ${label.includes('<app-gc-info')}`).toBe(`${file.name}: false`);
      }
    }
  });
});
