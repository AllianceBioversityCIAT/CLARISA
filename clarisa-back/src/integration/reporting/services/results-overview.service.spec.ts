import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { ResultsOverviewService } from './results-overview.service';
import { ResultsOverviewQueryDto } from '../dto/results-overview-query.dto';

const MOCK_ROW = {
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
};

describe('ResultsOverviewService', () => {
  let service: ResultsOverviewService;
  let mockQuery: jest.Mock;

  beforeEach(async () => {
    mockQuery = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsOverviewService,
        {
          provide: getDataSourceToken('reporting'),
          useValue: { query: mockQuery },
        },
      ],
    }).compile();

    service = module.get<ResultsOverviewService>(ResultsOverviewService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getResultsOverview', () => {
    const setupMocks = (rows = [MOCK_ROW], total = 1) => {
      mockQuery
        .mockResolvedValueOnce(rows)
        .mockResolvedValueOnce([{ total: String(total) }]);
    };

    it('should return paginated results with default params', async () => {
      setupMocks();
      const query: ResultsOverviewQueryDto = {};

      const result = await service.getResultsOverview(query);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].result_code).toBe(100);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 25,
        total: 1,
        total_pages: 1,
      });
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should build query without WHERE clause when no filters provided', async () => {
      setupMocks([], 0);
      await service.getResultsOverview({});

      const [dataCall] = mockQuery.mock.calls;
      expect(dataCall[0]).not.toContain('WHERE');
      expect(dataCall[1]).toEqual([25, 0]);
    });

    it('should apply version_id filter', async () => {
      setupMocks();
      await service.getResultsOverview({ version_id: 3 });

      const [dataCall] = mockQuery.mock.calls;
      expect(dataCall[0]).toContain('vro.version_id = ?');
      expect(dataCall[1]).toContain(3);
    });

    it('should apply status_id filter with a single value', async () => {
      setupMocks();
      await service.getResultsOverview({ status_id: [2] });

      const [dataCall] = mockQuery.mock.calls;
      expect(dataCall[0]).toContain('vro.status_id IN (?)');
      expect(dataCall[1]).toContain(2);
    });

    it('should apply status_id filter with multiple values', async () => {
      setupMocks();
      await service.getResultsOverview({ status_id: [1, 2, 3] });

      const [dataCall] = mockQuery.mock.calls;
      expect(dataCall[0]).toContain('vro.status_id IN (?, ?, ?)');
      expect(dataCall[1]).toContain(1);
      expect(dataCall[1]).toContain(2);
      expect(dataCall[1]).toContain(3);
    });

    it('should apply initiative_id filter on lead and contributing columns', async () => {
      setupMocks();
      await service.getResultsOverview({ initiative_id: 12 });

      const [dataCall] = mockQuery.mock.calls;
      expect(dataCall[0]).toContain('vro.lead_initiative_program_id = ?');
      expect(dataCall[0]).toContain(
        "FIND_IN_SET(?, REPLACE(vro.contributing_initiative_program_ids, ';', ','))",
      );
      expect(dataCall[1]).toContain(12);
      expect(dataCall[1]).toContain('12');
    });

    it('should apply center_code filter on lead and contributing columns', async () => {
      setupMocks();
      await service.getResultsOverview({ center_code: 'CIP' });

      const [dataCall] = mockQuery.mock.calls;
      expect(dataCall[0]).toContain('vro.lead_center_code = ?');
      expect(dataCall[0]).toContain(
        "FIND_IN_SET(?, REPLACE(vro.contributing_center_codes, ';', ','))",
      );
      expect(dataCall[1]).toContain('CIP');
    });

    it('should apply search filter on title and description', async () => {
      setupMocks();
      await service.getResultsOverview({ search: 'food' });

      const [dataCall] = mockQuery.mock.calls;
      expect(dataCall[0]).toContain(
        '(vro.result_title LIKE ? OR vro.result_description LIKE ?)',
      );
      expect(dataCall[1]).toContain('%food%');
    });

    it('should ignore blank search strings', async () => {
      setupMocks([], 0);
      await service.getResultsOverview({ search: '   ' });

      const [dataCall] = mockQuery.mock.calls;
      expect(dataCall[0]).not.toContain('LIKE');
    });

    it('should combine multiple filters with AND', async () => {
      setupMocks();
      await service.getResultsOverview({
        version_id: 3,
        status_id: [1, 2],
        initiative_id: 12,
        center_code: 'CIP',
        search: 'maize',
      });

      const [dataCall] = mockQuery.mock.calls;
      const sql: string = dataCall[0];
      expect(sql).toContain('vro.version_id = ?');
      expect(sql).toContain('vro.status_id IN (?, ?)');
      expect(sql).toContain('vro.lead_initiative_program_id = ?');
      expect(sql).toContain('vro.lead_center_code = ?');
      expect(sql).toContain('vro.result_title LIKE ?');
      expect((sql.match(/AND/g) ?? []).length).toBeGreaterThanOrEqual(4);
    });

    it('should pass the same params to both data and count queries', async () => {
      setupMocks();
      await service.getResultsOverview({ version_id: 5, status_id: [2] });

      const [dataCall, countCall] = mockQuery.mock.calls;
      // count params must be a subset of data params (data appends limit+offset)
      expect(dataCall[1]).toEqual(expect.arrayContaining(countCall[1]));
      expect(dataCall[1].length).toBe(countCall[1].length + 2);
    });

    it('should calculate pagination metadata correctly', async () => {
      setupMocks([MOCK_ROW], 47);
      const result = await service.getResultsOverview({ page: 2, limit: 10 });

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 47,
        total_pages: 5,
      });
    });

    it('should apply correct LIMIT and OFFSET based on page and limit', async () => {
      setupMocks([], 0);
      await service.getResultsOverview({ page: 3, limit: 20 });

      const [dataCall] = mockQuery.mock.calls;
      const dataParams: number[] = dataCall[1];
      expect(dataParams.at(-2)).toBe(20); // LIMIT
      expect(dataParams.at(-1)).toBe(40); // OFFSET = (3-1)*20
    });

    it('should return empty data array and total 0 when no rows found', async () => {
      setupMocks([], 0);
      const result = await service.getResultsOverview({});

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.total_pages).toBe(0);
    });

    it('should propagate errors thrown by the data source', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

      await expect(service.getResultsOverview({})).rejects.toThrow(
        'DB connection lost',
      );
    });
  });
});
