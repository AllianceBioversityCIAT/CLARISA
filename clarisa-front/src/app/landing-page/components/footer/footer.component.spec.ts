import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RouterTestingModule } from '@angular/router/testing';

import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [ FooterComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // MELIAF_TAXONOMY_HIDDEN: the module has no link anywhere on the site.
  it('has no MELIAF taxonomy link, and keeps the Glossary', () => {
    const text = fixture.nativeElement.textContent as string;
    const hrefs = Array.from(fixture.nativeElement.querySelectorAll('a')).map(a => (a as HTMLAnchorElement).getAttribute('href') ?? '');
    expect(text).not.toMatch(/MELIAF/i);
    expect(hrefs.some(href => href.includes('/concepts'))).toBe(false);
    expect(hrefs).toContain('/landing-page/glossary');
  });
});
