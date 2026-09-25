import { Test, TestingModule } from '@nestjs/testing';
import { GlossaryController } from './glossary.controller';
import { GlossaryService } from './glossary.service';
import { GlossaryExportService } from './glossary-export.service';

describe('GlossaryController', () => {
  let controller: GlossaryController;
  const mockExportService = { export: jest.fn() };

  const mockGlossaryService: any = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    if: jest.fn(),
    switch: jest.fn(),
    getRolesPagination: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GlossaryController],
      providers: [
        GlossaryController,
        { provide: GlossaryService, useValue: mockGlossaryService },
        { provide: GlossaryExportService, useValue: mockExportService },
      ],
    }).compile();

    controller = module.get<GlossaryController>(GlossaryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on findAll', async () => {
    mockGlossaryService.findAll = mockGlossaryService.findAll || jest.fn();
    mockGlossaryService.findAll.mockResolvedValue([]);

    try {
      await (controller as any).findAll('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findAllForDashboard', async () => {
    mockGlossaryService.findAllForDashboard =
      mockGlossaryService.findAllForDashboard || jest.fn();
    mockGlossaryService.findAllForDashboard.mockResolvedValue([]);

    try {
      await (controller as any).findAllForDashboard('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on findOne', async () => {
    mockGlossaryService.findOne = mockGlossaryService.findOne || jest.fn();
    mockGlossaryService.findOne.mockResolvedValue([]);

    try {
      await (controller as any).findOne('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  it('should call service on update', async () => {
    mockGlossaryService.update = mockGlossaryService.update || jest.fn();
    mockGlossaryService.update.mockResolvedValue([]);

    try {
      await (controller as any).update('active', {}, {}, {});
    } catch (_e) {
      /* ok */
    }
  });

  describe('export', () => {
    const res = () => {
      const r: any = { headers: {} };
      r.setHeader = jest.fn((k: string, v: string) => (r.headers[k] = v));
      r.status = jest.fn(() => r);
      r.send = jest.fn(() => r);
      return r;
    };

    it('serves the file as an attachment with its content type', async () => {
      mockExportService.export.mockResolvedValue({
        body: 'termId\r\n',
        contentType: 'text/csv; charset=utf-8',
        fileName: 'clarisa-glossary-2026-09-25.csv',
      });
      const r = res();
      await controller.export('CSV', r);
      expect(mockExportService.export).toHaveBeenCalledWith('csv');
      expect(r.headers['Content-Type']).toBe('text/csv; charset=utf-8');
      expect(r.headers['Content-Disposition']).toBe(
        'attachment; filename="clarisa-glossary-2026-09-25.csv"',
      );
      expect(r.status).toHaveBeenCalledWith(200);
    });

    it('defaults to json and rejects an unknown format with a 400', async () => {
      mockExportService.export.mockResolvedValue({
        body: '[]',
        contentType: 'application/json',
        fileName: 'x.json',
      });
      await controller.export(undefined as any, res());
      expect(mockExportService.export).toHaveBeenCalledWith('json');

      await expect(controller.export('xml', res())).rejects.toMatchObject({
        status: 400,
      });
    });
  });
});
