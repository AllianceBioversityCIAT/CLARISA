import { Test, TestingModule } from '@nestjs/testing';
import { EndOfInitiativeOutcomeService } from './end-of-initiative-outcome.service';
import { OSTApi } from '../../integration/ost/ost.api';

describe('EndOfInitiativeOutcomeService', () => {
  let service: EndOfInitiativeOutcomeService;

  const mockOSTApi: any = {
    getEndOfIniciative: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EndOfInitiativeOutcomeService,
        { provide: OSTApi, useValue: mockOSTApi },
      ],
    }).compile();

    service = module.get<EndOfInitiativeOutcomeService>(
      EndOfInitiativeOutcomeService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have methods', () => {
    expect(service).toBeTruthy();
  });
});
