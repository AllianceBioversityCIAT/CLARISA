import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { DevelopersComponent, docBases, mcpSearchBody, publicEndpoints, snippets } from './developers.component';
import { GlobalConceptsApiService } from '../../../../../shared/services/global-concepts/global-concepts-api.service';

describe('DevelopersComponent', () => {
  let fixture: ComponentFixture<DevelopersComponent>;
  let component: DevelopersComponent;
  let api: any;
  let answer$: Subject<unknown>;

  const root = environment.apiUrl.endsWith('/') ? environment.apiUrl : `${environment.apiUrl}/`;

  beforeEach(async () => {
    answer$ = new Subject();
    api = {
      concepts: jest.fn().mockReturnValue(of([{ term_id: 42, preferred_label: 'Outcome' }])),
      mcpCall: jest.fn().mockReturnValue(answer$)
    };
    await TestBed.configureTestingModule({
      declarations: [DevelopersComponent],
      imports: [FormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: GlobalConceptsApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { fragment: of(null) } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(DevelopersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('builds every URL from this environment and a real TERM id', () => {
    const b = docBases(environment.apiUrl);
    expect(b.api).toBe(`${root}api/global-concepts`);
    expect(b.mcp).toBe(`${root}api/global-concepts/mcp`);
    expect(component.termId).toBe(42);
    expect(component.code['turtle']).toBe(`curl -H "Accept: text/turtle" "${root}concepts/meliaf/42"`);
    expect(component.code['jsonld']).toContain('Accept: application/ld+json');
    expect(component.code['claudeCode']).toBe(`claude mcp add --transport http clarisa-concepts ${root}api/global-concepts/mcp`);
    expect(JSON.parse(component.code['mcpJson']).mcpServers['clarisa-concepts']).toEqual({ type: 'http', url: `${root}api/global-concepts/mcp` });
    expect(JSON.parse(component.code['claudeDesktop']).mcpServers['clarisa-concepts'].args).toContain(`${root}api/global-concepts/mcp`);
    for (const text of Object.values(component.code)) expect(text).not.toContain('undefined');
  });

  it('gives every GET a live link under the base and renders the table', () => {
    const rows = publicEndpoints(docBases('https://api.example.org'), 'meliaf', 7);
    for (const row of rows.filter(r => r.method === 'GET')) expect(row.live?.startsWith('https://api.example.org/api/global-concepts/')).toBe(true);
    expect(rows.find(r => r.path === '/{scheme}/fields')?.live).toBe('https://api.example.org/api/global-concepts/meliaf/fields');
    const links = Array.from(fixture.nativeElement.querySelectorAll('#endpoints a')).map((a: any) => a.getAttribute('href'));
    expect(links).toContain(`${root}api/global-concepts/meliaf/concepts/42`);
  });

  it('documents the four scopes and the four MCP tools', () => {
    const text = fixture.nativeElement.textContent;
    for (const scope of ['read', 'request', 'write', 'review']) expect(text).toContain(`global-concepts:${scope}`);
    for (const tool of ['search_concepts', 'get_concept', 'suggest_concepts_for_text', 'list_releases']) expect(text).toContain(tool);
    expect(snippets(docBases('https://h/'), 'meliaf', 1)['platform']).toContain('x-api-key');
  });

  it('calls search_concepts over MCP with one POST, locked while it runs', () => {
    component.tryQuery = '  theory of change ';
    component.tryIt();
    component.tryIt();
    expect(api.mcpCall).toHaveBeenCalledTimes(1);
    expect(api.mcpCall).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'search_concepts', arguments: { query: 'theory of change', limit: 5 } }
    });
    expect(component.trying).toBe(true);
    answer$.next({ jsonrpc: '2.0', id: 1, result: { structuredContent: { total: 0 } } });
    expect(component.trying).toBe(false);
    expect(component.tryResult).toContain('"total": 0');
    expect(mcpSearchBody('x', 3).id).toBe(3);
  });

  it('explains a failed call and unlocks the button', () => {
    api.mcpCall.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 429 })));
    component.tryIt();
    expect(component.trying).toBe(false);
    expect(component.tryError).toContain('Too many attempts');
  });

  it('does not call with an empty query', () => {
    component.tryQuery = '   ';
    component.tryIt();
    expect(api.mcpCall).not.toHaveBeenCalled();
  });
});
