import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ResultsOverviewController } from './results-overview.controller';
import { ResultsOverviewService } from './services/results-overview.service';
import { ResultsOverviewQueryDto } from './dto/results-overview-query.dto';
import { ResultsOverviewPaginatedDto } from './dto/results-overview-response.dto';

const MOCK_PAGINATED: ResultsOverviewPaginatedDto = {
  data: [
    {
      result_id: 1,
      result_code: 100,
      result_title: 'Test Result',
      result_description: 'A description',
      version_id: 3,
      phase_name: 'Phase 2024',
      phase_year: 2024,
      status_id: 2,
      status_name: 'Quality Assessed',
      lead_initiative_program_id: 12,
      lead_initiative_program_official_code: 'INIT-12',
      lead_initiative_program_short_name: 'Agri Innovations',
      contributing_initiative_program_ids: '5;8',
      contributing_initiative_program_official_codes: 'INIT-5;INIT-8',
      contributing_initiative_program_short_names: 'Food Systems;Nutrition',
      lead_center_code: 'CIP',
      lead_center_acronym: 'CIP',
      contributing_center_codes: 'CIMMYT;ICRAF',
      contributing_center_acronyms: 'CIMMYT;ICRAF',
    },
  ],
  pagination: { page: 1, limit: 25, total: 1, total_pages: 1 },
};

describe('ResultsOverviewController', () => {
  let controller: ResultsOverviewController;
  let mockService: jest.Mocked<ResultsOverviewService>;

  beforeEach(async () => {
    mockService = {
      getResultsOverview: jest.fn(),
    } as unknown as jest.Mocked<ResultsOverviewService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsOverviewController],
      providers: [{ provide: ResultsOverviewService, useValue: mockService }],
    }).compile();

    controller = module.get<ResultsOverviewController>(
      ResultsOverviewController,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getResultsOverview', () => {
    it('should return the paginated response from the service', async () => {
      mockService.getResultsOverview.mockResolvedValue(MOCK_PAGINATED);
      const query: ResultsOverviewQueryDto = {
        version_id: 3,
        page: 1,
        limit: 25,
      };

      const result = await controller.getResultsOverview(query);

      expect(mockService.getResultsOverview).toHaveBeenCalledWith(query);
      expect(result).toEqual(MOCK_PAGINATED);
    });

    it('should forward all query params to the service', async () => {
      mockService.getResultsOverview.mockResolvedValue(MOCK_PAGINATED);
      const query: ResultsOverviewQueryDto = {
        version_id: 3,
        status_id: [1, 2],
        initiative_id: 12,
        center_code: 'CIP',
        search: 'maize',
        page: 2,
        limit: 10,
      };

      await controller.getResultsOverview(query);

      expect(mockService.getResultsOverview).toHaveBeenCalledWith(query);
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service fails', async () => {
      mockService.getResultsOverview.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(controller.getResultsOverview({})).rejects.toThrow(
        new HttpException(
          'Failed to retrieve results overview',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});
