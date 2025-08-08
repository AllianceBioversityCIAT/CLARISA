import { TestBed } from '@angular/core/testing';

import { EntityFiltersService } from './entity-filters.service';

describe('EntityFiltersService', () => {
  let service: EntityFiltersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EntityFiltersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
