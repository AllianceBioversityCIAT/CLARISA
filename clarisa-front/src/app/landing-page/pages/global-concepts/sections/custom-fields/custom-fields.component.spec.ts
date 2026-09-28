import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CustomFieldsComponent, fieldView } from './custom-fields.component';

describe('CustomFieldsComponent', () => {
  const lists = { region: [{ value: 'lac', label: 'Latin America' }] };
  const defs = [{ code: 'regions', label: 'Regions', type: 'multi_list' as const, list_code: 'region', help: null }];

  it('turns each type into what the page draws', () => {
    expect(fieldView({ code: 'note', label: 'Note', type: 'text', value: 'Plain' }, [], {}, [])).toEqual(expect.objectContaining({ kind: 'text', text: 'Plain' }));
    expect(fieldView({ code: 'regions', label: 'Regions', type: 'multi_list', value: ['lac', 'afr'] }, [], lists, defs)?.chips).toEqual([
      'Latin America',
      'afr'
    ]);
    expect(
      fieldView(
        { code: 'see', label: 'See also', type: 'term_link', value: [{ term_id: 7, preferred_label: 'Impact', uri: 'https://x/7' }, { term_id: 'x' }] },
        [],
        {},
        []
      )?.links
    ).toEqual([{ term_id: 7, label: 'Impact' }]);
    expect(fieldView({ code: 'doc', label: 'Doc', type: 'url', value: 'javascript:alert(1)' }, [], {}, [])).toEqual(
      expect.objectContaining({ kind: 'url', url: null, text: 'javascript:alert(1)' })
    );
    expect(fieldView({ code: 'd', label: 'Adopted', type: 'date', value: '2026-09-25' }, [], {}, [])?.text).toBe('25 September 2026');
    expect(fieldView({ code: 'empty', label: 'Empty', type: 'multi_text', value: [] }, [], {}, [])).toBeNull();
    expect(fieldView({ code: 'n', label: 'N', type: 'number', value: 0 }, ['n'], {}, [])).toEqual(expect.objectContaining({ text: '0', ai: true }));
  });

  it('renders chips, term links as links, safe urls and the AI-assisted tag', async () => {
    await TestBed.configureTestingModule({ declarations: [CustomFieldsComponent], schemas: [NO_ERRORS_SCHEMA] }).compileComponents();
    const fixture: ComponentFixture<CustomFieldsComponent> = TestBed.createComponent(CustomFieldsComponent);
    const component = fixture.componentInstance;
    component.scheme = 'meliaf';
    component.lists = lists;
    component.defs = defs;
    component.aiFields = ['summary'];
    component.fields = [
      { code: 'regions', label: 'Regions', type: 'multi_list', value: ['lac'] },
      { code: 'see', label: 'See also', type: 'term_link', value: [{ term_id: 7, preferred_label: 'Impact', uri: 'https://x/7' }] },
      { code: 'doc', label: 'Guidance', type: 'url', value: 'https://cgiar.org/guide' },
      { code: 'summary', label: 'Summary', type: 'long_text', value: 'Two\nlines' },
      { code: 'blank', label: 'Blank', type: 'text', value: '' }
    ];
    component.ngOnChanges();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.gc-fields__row').length).toBe(4);
    expect(el.querySelector('[data-field="regions"] .gc-chip')?.textContent).toContain('Latin America');
    expect(el.querySelector('[data-field="see"] a')?.textContent).toContain('Impact');
    expect(el.querySelector('[data-field="doc"] a')?.getAttribute('href')).toBe('https://cgiar.org/guide');
    expect(el.querySelector('[data-field="summary"] .gc-tag')?.textContent).toContain('AI-assisted');
    expect(el.querySelector('[data-field="doc"] .gc-tag')).toBeNull();
    expect(component.link(7)).toEqual(['/landing-page/global-concepts', 'meliaf', 7]);
  });
});
