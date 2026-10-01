import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { GUIDE_SECTIONS, GuideComponent } from './guide.component';

describe('GuideComponent', () => {
  let fixture: ComponentFixture<GuideComponent>;
  let fragment: BehaviorSubject<string | null>;

  beforeEach(async () => {
    fragment = new BehaviorSubject<string | null>(null);
    await TestBed.configureTestingModule({
      declarations: [GuideComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [{ provide: ActivatedRoute, useValue: { fragment } }]
    }).compileComponents();
    fixture = TestBed.createComponent(GuideComponent);
    fixture.detectChanges();
  });

  afterEach(() => jest.restoreAllMocks());

  it('has one table-of-contents entry per section, each pointing at an existing anchor', () => {
    const el: HTMLElement = fixture.nativeElement;
    const entries = Array.from(el.querySelectorAll('.gc-toc a')).map(a => a.textContent?.trim());
    expect(entries).toEqual(GUIDE_SECTIONS.map(s => s.label));
    for (const s of GUIDE_SECTIONS) {
      const target = el.querySelector(`#${s.id}`);
      expect(target).not.toBeNull();
      expect(target?.querySelector('h2')?.textContent?.trim()).toBeTruthy();
    }
    expect(new Set(GUIDE_SECTIONS.map(s => s.id)).size).toBe(GUIDE_SECTIONS.length);
  });

  it('marks and scrolls to the section named in the URL fragment', fakeAsync(() => {
    const target = fixture.nativeElement.querySelector('#statuses') as HTMLElement;
    jest.spyOn(document, 'getElementById').mockReturnValue(target);
    target.scrollIntoView = jest.fn();
    fragment.next('statuses');
    tick();
    fixture.detectChanges();
    expect(fixture.componentInstance.active).toBe('statuses');
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.gc-toc a.is-active')?.textContent?.trim()).toBe('What each status means');
  }));

  it('lists every request status with its meaning', () => {
    const text = fixture.nativeElement.querySelector('#statuses').textContent;
    for (const label of ['Submitted', 'In review', 'Changes requested', 'In validation', 'Approved', 'Not approved', 'Deprecated']) {
      expect(text).toContain(label);
    }
  });
});
