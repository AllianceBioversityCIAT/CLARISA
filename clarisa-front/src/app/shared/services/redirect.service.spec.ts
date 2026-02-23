import { TestBed } from '@angular/core/testing';

import { RedirectService } from './redirect.service';

describe('RedirectService', () => {
  let service: RedirectService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RedirectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return mapped clarisa URL for a known legacy URL', () => {
    const origin = 'https://clarisa.cgiar.org';
    const legacyUrl = origin + '/swagger/generalListReference.html';

    const result = service.findRedirectTo(legacyUrl, origin);

    expect(result).toBe(origin + '/clarisa-panel/documentation/One_CGIAR_Control_List');
  });

  it('should return mapped URL for a legacy URL with fragment', () => {
    const origin = 'https://clarisa.cgiar.org';
    const legacyUrl = origin + '/swagger/generalListReference.html#section1-item1';

    const result = service.findRedirectTo(legacyUrl, origin);

    expect(result).toBe(
      origin + '/clarisa-panel/documentation/One_CGIAR_Control_List/General_Control_List/CGIAR_entities'
    );
  });

  it('should return empty string for an unknown URL', () => {
    const origin = 'https://clarisa.cgiar.org';
    const unknownUrl = origin + '/unknown/path';

    const result = service.findRedirectTo(unknownUrl, origin);

    expect(result).toBe('');
  });

  it('should return empty string when urlActive does not match any legacy route', () => {
    const result = service.findRedirectTo('https://other.com/page', 'https://other.com');

    expect(result).toBe('');
  });
});
