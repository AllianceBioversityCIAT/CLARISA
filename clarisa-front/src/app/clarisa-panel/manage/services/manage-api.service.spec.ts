import { TestBed } from '@angular/core/testing';

import { ManageApiService } from './manage-api.service';

describe('ManageApiService', () => {
  let service: ManageApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ManageApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
