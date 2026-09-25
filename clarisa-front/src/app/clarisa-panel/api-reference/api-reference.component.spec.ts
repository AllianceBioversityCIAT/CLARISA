import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiReferenceComponent } from './api-reference.component';

/**
 * The public API documentation is an isolated page inside an iframe; this host
 * only builds the frame URL from the route and mirrors the frame's navigation
 * back into the address bar. These tests pin the two contracts that the
 * redesign of 2026-09-24 depends on:
 *
 *   · the doc no longer carries the old lime navbar above the frame — the
 *     frame owns the whole viewport and draws its own column, like the panel;
 *   · «Back to the site» inside the frame reaches the Angular router through a
 *     postMessage, and only for the pages of the site it is allowed to open.
 */
describe('ApiReferenceComponent', () => {
  let fixture: ComponentFixture<ApiReferenceComponent>;
  let router: Router;
  const paramMap$ = new BehaviorSubject(convertToParamMap({}));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ApiReferenceComponent],
      imports: [RouterTestingModule],
      providers: [{ provide: ActivatedRoute, useValue: { paramMap: paramMap$.asObservable() } }],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ApiReferenceComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('renders only the frame: no site navbar stacked above the documentation', () => {
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('app-horizontal-menu')).toBeNull();
    expect(host.querySelector('iframe.api-doc-frame')).not.toBeNull();
  });

  it('builds the frame URL from the documentation hierarchy in the route', () => {
    paramMap$.next(convertToParamMap({ group: 'One_CGIAR_Control_List', category: 'Institutions', endpoint: 'Institutions_List' }));
    fixture.detectChanges();

    const src = String(fixture.nativeElement.querySelector('iframe').getAttribute('src'));
    expect(src.startsWith('assets/api-reference/index.html?')).toBe(true);
    expect(src).toContain(`api=${encodeURIComponent(environment.apiUrl)}`);
    expect(src).toContain('group=One_CGIAR_Control_List');
    expect(src).toContain('category=Institutions');
    expect(src).toContain('endpoint=Institutions_List');
  });

  it('follows «Back to the site» from the frame through the router', () => {
    const navigate = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'clarisa-docs:leave', url: '/landing-page/home' }, origin: window.location.origin }));

    expect(navigate).toHaveBeenCalledWith('/landing-page/home');
  });

  it('ignores leave requests to pages that are not on the allow-list, or from another origin', () => {
    const navigate = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'clarisa-docs:leave', url: 'https://evil.example/' }, origin: window.location.origin }));
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'clarisa-docs:leave', url: '/landing-page/home' }, origin: 'https://evil.example' }));

    expect(navigate).not.toHaveBeenCalled();
  });
});
