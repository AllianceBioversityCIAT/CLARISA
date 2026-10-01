import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { RequestFollowComponent } from './request-follow.component';
import { GlobalConceptsApiService } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { accessKey } from '../../global-concepts.utils';

describe('RequestFollowComponent', () => {
  let api: any;
  let router: any;

  const request = {
    id: 41,
    type: 'new',
    state: 'changes_requested',
    payload: { preferred_label: 'Learning agenda' },
    rationale: 'Missing in MELIAF',
    decision_note: 'Add a source, please',
    no_objection_until: null,
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-22T10:00:00Z'
  };

  const setup = async (query: Record<string, string>) => {
    await TestBed.configureTestingModule({
      declarations: [RequestFollowComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: GlobalConceptsApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '41' }), queryParamMap: convertToParamMap(query) } } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(RequestFollowComponent);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    sessionStorage.clear();
    api = { followRequest: jest.fn().mockReturnValue(of(request)) };
    router = { navigate: jest.fn() };
  });

  it('takes the token from the email link, keeps it and removes it from the address bar', async () => {
    const fixture = await setup({ token: 'follow-secret' });
    expect(api.followRequest).toHaveBeenCalledWith(41, 'follow-secret');
    expect(sessionStorage.getItem(accessKey(41))).toBe('follow-secret');
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { token: null }, replaceUrl: true }));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Changes requested');
    expect(text).toContain('Add a source, please');
    expect(text).toContain('Learning agenda');
  });

  it('falls back to the token stored by the confirmation page', async () => {
    sessionStorage.setItem(accessKey(41), 'stored');
    await setup({});
    expect(api.followRequest).toHaveBeenCalledWith(41, 'stored');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('asks for the email link when there is no token', async () => {
    const fixture = await setup({});
    expect(api.followRequest).not.toHaveBeenCalled();
    expect(fixture.componentInstance.error).toContain('follow link');
  });

  it('explains a wrong token', async () => {
    api.followRequest.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = await setup({ token: 'bad' });
    expect(fixture.componentInstance.loading).toBe(false);
    expect(fixture.componentInstance.error).toContain('most recent follow link');
  });

  it('sends the updated request back with the whole payload and the token in memory', async () => {
    api.resubmitRequest = jest.fn().mockReturnValue(of({ ...request, state: 'in_review' }));
    const fixture = await setup({ token: 'follow-secret' });
    const c = fixture.componentInstance;
    expect(c.canAnswer).toBe(true);
    expect(c.answer['preferred_label']).toBe('Learning agenda');
    sessionStorage.clear();
    c.answer['source_citation'] = '  OECD 2019 ';
    c.sendAnswer();
    expect(api.resubmitRequest).toHaveBeenCalledWith(41, 'follow-secret', {
      payload: { preferred_label: 'Learning agenda', source_citation: 'OECD 2019' },
      rationale: 'Missing in MELIAF'
    });
    expect(c.request?.state).toBe('in_review');
    expect(c.canAnswer).toBe(false);
  });

  it('refuses to send a new concept without its label', async () => {
    api.resubmitRequest = jest.fn();
    const fixture = await setup({ token: 't' });
    fixture.componentInstance.answer['preferred_label'] = ' ';
    fixture.componentInstance.sendAnswer();
    expect(api.resubmitRequest).not.toHaveBeenCalled();
    expect(fixture.componentInstance.answerError).toContain('preferred label');
  });
});
