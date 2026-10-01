import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConceptIconsComponent } from './concept-icons.component';

describe('ConceptIconsComponent', () => {
  let fixture: ComponentFixture<ConceptIconsComponent>;
  let component: ConceptIconsComponent;
  const el = () => fixture.nativeElement as HTMLElement;

  const icon = (overrides: object = {}) => ({
    icon_code: 'MEL-01',
    status: 'final',
    format: 'svg',
    alt_text: 'Magnifying glass over a chart',
    url: 'https://cdn.cgiar.org/icons/mel-01.svg',
    rights_and_licence: 'CC BY 4.0',
    designer: 'CGIAR Design',
    ...overrides
  });

  const render = (icons: any[]) => {
    component.icons = icons;
    component.conceptLabel = 'Outcome';
    component.ngOnChanges();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [ConceptIconsComponent] }).compileComponents();
    fixture = TestBed.createComponent(ConceptIconsComponent);
    component = fixture.componentInstance;
  });

  it('shows the image with its alt text, format, rights and designer', () => {
    render([icon()]);
    const img = el().querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://cdn.cgiar.org/icons/mel-01.svg');
    expect(img.getAttribute('alt')).toBe('Magnifying glass over a chart');
    const text = el().textContent ?? '';
    expect(text).toContain('SVG');
    expect(text).toContain('Final');
    expect(text).toContain('CC BY 4.0');
    expect(text).toContain('CGIAR Design');
  });

  it('draws the placeholder when there is no icon, no safe link, or the image fails', () => {
    render([]);
    expect(el().querySelector('img')).toBeNull();
    expect(el().querySelector('svg[aria-label="No icon yet"]')).not.toBeNull();

    render([icon({ url: 'javascript:alert(1)', alt_text: null, status: 'not_yet_designed' })]);
    expect(el().querySelector('img')).toBeNull();
    expect(el().querySelector('svg')?.getAttribute('aria-label')).toBe('Icon for Outcome');
    expect(el().textContent).toContain('Not yet designed');

    render([icon()]);
    component.markBroken(0);
    fixture.detectChanges();
    expect(el().querySelector('img')).toBeNull();
    expect(el().querySelector('svg')).not.toBeNull();
  });
});
