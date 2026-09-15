import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { EntityFiltersService } from './entity-filters.service';

describe('EntityFiltersService', () => {
  let service: EntityFiltersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(EntityFiltersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
