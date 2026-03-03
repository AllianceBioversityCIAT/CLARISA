import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ManageApiService } from './manage-api.service';

describe('ManageApiService', () => {
  let service: ManageApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ManageApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
