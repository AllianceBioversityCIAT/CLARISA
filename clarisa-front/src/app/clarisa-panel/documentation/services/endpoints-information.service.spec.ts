import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { EndpointsInformationService } from './endpoints-information.service';

describe('EndpointsInformationService', () => {
  let service: EndpointsInformationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(EndpointsInformationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
