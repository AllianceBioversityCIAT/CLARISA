import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { ProposeFormComponent } from './propose-form.component';
import { GlobalConceptsApiService } from '../../../../../shared/services/global-concepts/global-concepts-api.service';

describe('ProposeFormComponent', () => {
  let fixture: ComponentFixture<ProposeFormComponent>;
  let component: ProposeFormComponent;
  let api: any;

  beforeEach(async () => {
    api = { startRequest: jest.fn().mockReturnValue(of({ status: 'verification_sent', expires_in_hours: 24 })) };
    await TestBed.configureTestingModule({
      declarations: [ProposeFormComponent],
      imports: [ReactiveFormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [{ provide: GlobalConceptsApiService, useValue: api }]
    }).compileComponents();
    fixture = TestBed.createComponent(ProposeFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const fill = (values: object) => component.form.patchValue(values);

  it('requires the email', () => {
    fill({ preferred_label: 'Learning agenda', rationale: 'Needed' });
    component.submit();
    expect(component.form.get('email')?.hasError('required')).toBe(true);
    expect(api.startRequest).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Enter your email');
  });

  it('rejects a malformed email', () => {
    fill({ email: 'not-an-email', preferred_label: 'X', rationale: 'Needed' });
    component.submit();
    expect(component.form.get('email')?.hasError('email')).toBe(true);
    expect(api.startRequest).not.toHaveBeenCalled();
  });

  it('requires the preferred label for a new concept', () => {
    fill({ email: 'a@cgiar.org', rationale: 'Needed' });
    component.submit();
    expect(component.form.errors?.['labelRequired']).toBe(true);
    expect(api.startRequest).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Enter the preferred label of the new concept.');
  });

  it('does not require the label for a change, but does require the concept and one change', () => {
    fill({ type: 'edit', email: 'a@cgiar.org', rationale: 'Typo' });
    component.form.updateValueAndValidity();
    expect(component.form.errors?.['labelRequired']).toBeUndefined();
    expect(component.form.errors?.['termRequired']).toBe(true);
    expect(component.form.errors?.['changeRequired']).toBe(true);

    fill({ term_id: '2374', definition: 'Better wording' });
    expect(component.form.valid).toBe(true);
  });

  it('sends only the filled fields and shows the inbox message', () => {
    component.scheme = 'meliaf';
    fill({ email: ' a@cgiar.org ', preferred_label: 'Learning agenda', definition: '', source_citation: 'CGIAR 2030', rationale: 'Missing' });
    component.submit();
    expect(api.startRequest).toHaveBeenCalledWith('meliaf', {
      type: 'new',
      email: 'a@cgiar.org',
      rationale: 'Missing',
      payload: { preferred_label: 'Learning agenda', source_citation: 'CGIAR 2030' }
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Check your inbox, the link is valid for 24 hours');
  });

  it('proposes a change to the concept it was opened from', () => {
    component.concept = { term_id: 12, preferred_label: 'Outcome' } as any;
    component.ngOnChanges();
    fill({ email: 'a@cgiar.org', definition: 'New wording', rationale: 'Clearer' });
    component.submit();
    expect(api.startRequest).toHaveBeenCalledWith(
      'meliaf',
      expect.objectContaining({ type: 'edit', term_id: 12, payload: { definition: 'New wording' } })
    );
  });

  it('explains a rate limit and lets the reader send again', () => {
    api.startRequest.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
    fill({ email: 'a@cgiar.org', preferred_label: 'X', rationale: 'Y' });
    component.submit();
    expect(component.sending).toBe(false);
    expect(component.error).toContain('Too many attempts');
    expect(component.sentHours).toBeNull();
  });
});
