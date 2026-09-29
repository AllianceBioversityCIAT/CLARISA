import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { RequestVerifyComponent } from './request-verify.component';
import { GlobalConceptsApiService } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { accessKey } from '../../global-concepts.utils';

describe('RequestVerifyComponent', () => {
  let api: any;

  const setup = async (query: Record<string, string>) => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [RequestVerifyComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: GlobalConceptsApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(RequestVerifyComponent);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    sessionStorage.clear();
    api = { verifyRequest: jest.fn().mockReturnValue(of({ id: 41, state: 'submitted', access_token: 'follow-secret' })) };
  });

  it('confirms once and keeps the follow-up token for this tab', async () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    const fixture = await setup({ token: 'one-time' });
    const component = fixture.componentInstance;

    expect(api.verifyRequest).toHaveBeenCalledTimes(1);
    expect(api.verifyRequest).toHaveBeenCalledWith('one-time');
    expect(sessionStorage.getItem(accessKey(41))).toBe('follow-secret');
    expect(setItem.mock.calls.filter(([key]) => key === accessKey(41)).length).toBe(1);
    expect(component.requestId).toBe(41);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Request #41 is registered');

    // A second call on the same page never spends the link again.
    component.verify();
    expect(api.verifyRequest).toHaveBeenCalledTimes(1);
    setItem.mockRestore();
  });

  it('a reload of the same link shows the confirmation instead of calling again', async () => {
    await setup({ token: 'one-time' });
    const again = await setup({ token: 'one-time' });
    expect(api.verifyRequest).toHaveBeenCalledTimes(1);
    expect(again.componentInstance.requestId).toBe(41);
  });

  it('explains a missing token without calling the API', async () => {
    const fixture = await setup({});
    expect(api.verifyRequest).not.toHaveBeenCalled();
    expect(fixture.componentInstance.error).toContain('confirmation link');
  });

  it('shows the back message for an expired link', async () => {
    api.verifyRequest.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'Bad Request Exception', response: { message: 'This link is invalid or has expired' } }
          })
      )
    );
    const fixture = await setup({ token: 'used' });
    expect(fixture.componentInstance.loading).toBe(false);
    expect(fixture.componentInstance.error).toBe('This link is invalid or has expired');
    expect(sessionStorage.length).toBe(0);
  });
});
