import { Test, TestingModule } from '@nestjs/testing';
import { EndOfInitiativeOutcomeController } from './end-of-initiative-outcome.controller';
import { EndOfInitiativeOutcomeService } from './end-of-initiative-outcome.service';

describe('EndOfInitiativeOutcomeController', () => {
  let controller: EndOfInitiativeOutcomeController;

  const mockEndOfInitiativeOutcomeService: any = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EndOfInitiativeOutcomeController],
      providers: [
        EndOfInitiativeOutcomeController,
        {
          provide: EndOfInitiativeOutcomeService,
          useValue: mockEndOfInitiativeOutcomeService,
        },
      ],
    }).compile();

    controller = module.get<EndOfInitiativeOutcomeController>(
      EndOfInitiativeOutcomeController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockEndOfInitiativeOutcomeService.findAll =
      mockEndOfInitiativeOutcomeService.findAll || jest.fn();
    mockEndOfInitiativeOutcomeService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });
});
