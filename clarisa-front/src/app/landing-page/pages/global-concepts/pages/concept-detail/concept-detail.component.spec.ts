import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { ConceptDetailComponent } from './concept-detail.component';
import { GlobalConceptsApiService } from '../../../../../shared/services/global-concepts/global-concepts-api.service';

const concept = (overrides: object = {}) => ({
  scheme: 'meliaf',
  term_id: 12,
  term_uri: 'https://clarisa.cgiar.org/concepts/meliaf/12',
  preferred_label: 'Old outcome',
  language: 'en',
  preferred_labels: [],
  alternative_labels: [{ label: 'OO', language: 'en', kind: 'acronym', discouraged: false }],
  definition: 'A <b>superseded</b> term',
  short_definition: null,
  scope_note: null,
  example_of_use: null,
  term_type: null,
  meliaf_function: [],
  meliaf_phase_primary: null,
  meliaf_phase_also: [],
  broader_terms: [],
  narrower_terms: [],
  related_terms: [{ term_id: 30, uri: 'https://x/30', preferred_label: 'Impact' }],
  source_citation: 'OECD DAC',
  source_url: 'javascript:alert(1)',
  derivation: null,
  origin: null,
  ai_generated_fields: [],
  status: 'deprecated',
  version: '1.1',
  date_created: '2026-01-10',
  date_modified: '2026-09-01',
  validated_by: [],
  date_validated: null,
  steward: null,
  replaced_by: { term_id: 2374, uri: 'https://x/2374', preferred_label: 'Outcome' },
  rights_note: null,
  mappings: [
    {
      target_scheme: 'agrovoc',
      target_uri: 'https://agrovoc/1',
      target_label: 'Outcomes',
      match_type: 'closeMatch',
      justification: '',
      confidence: null
    }
  ],
  ...overrides
});

describe('ConceptDetailComponent', () => {
  let fixture: ComponentFixture<ConceptDetailComponent>;
  let component: ConceptDetailComponent;
  let api: any;
  let params: BehaviorSubject<any>;

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ scheme: 'meliaf', termId: '12' }));
    api = {
      concept: jest.fn().mockReturnValue(of(concept())),
      history: jest.fn().mockReturnValue(
        of([
          { action: 'create', changes: null, changed_at: '2026-01-10T10:00:00Z' },
          {
            action: 'status',
            changes: { status: { from: 'approved', to: 'deprecated' }, replaced_by_id: { from: null, to: 3 } },
            changed_at: '2026-09-01T10:00:00Z'
          }
        ])
      ),
      lists: jest.fn().mockReturnValue(of({}))
    };
    await TestBed.configureTestingModule({
      declarations: [ConceptDetailComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: GlobalConceptsApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { paramMap: params } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ConceptDetailComponent);
    component = fixture.componentInstance;
  });

  it('renders the deprecated banner with a link to the replacement', () => {
    fixture.detectChanges();
    const banner: HTMLElement = fixture.nativeElement.querySelector('.gc-deprecated');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('This concept is deprecated.');
    expect(banner.textContent).toContain('Outcome');
    expect(banner.textContent).toContain('TERM 2374');
  });

  it('does not show the deprecated banner for an approved concept', () => {
    api.concept.mockReturnValue(of(concept({ status: 'approved', replaced_by: null })));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.gc-deprecated')).toBeNull();
  });

  it('prints API text as text, never as markup', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('.gc-text');
    expect(text.textContent).toContain('A <b>superseded</b> term');
    expect(text.querySelector('b')).toBeNull();
  });

  it('never binds a non-http source link', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.gc-facts__source')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('OECD DAC');
  });

  it('opens mappings in a new tab with rel=noopener', () => {
    fixture.detectChanges();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.gc-mappings a');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('shows the history newest first with the changed field names', () => {
    fixture.detectChanges();
    expect(component.history[0].action).toBe('status');
    expect(component.changedFields(component.history[0])).toEqual(['status', 'replaced by id']);
    expect(fixture.nativeElement.textContent).toContain('Status changed');
    expect(fixture.nativeElement.textContent).toContain('1 September 2026');
  });

  it('reloads when a related concept link changes the params', () => {
    fixture.detectChanges();
    params.next(convertToParamMap({ scheme: 'meliaf', termId: '30' }));
    expect(api.concept).toHaveBeenLastCalledWith('meliaf', 30);
  });

  it('explains a 404 without an eternal spinner', () => {
    api.concept.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    fixture.detectChanges();
    expect(component.loading).toBe(false);
    expect(component.error).toContain('TERM 12 is not a published concept');
  });

  it('keeps the concept when only the history fails', () => {
    api.history.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    fixture.detectChanges();
    expect(component.concept).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('The change history could not be loaded');
  });
});
