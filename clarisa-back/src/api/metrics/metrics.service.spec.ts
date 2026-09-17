import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DataSource } from 'typeorm';

import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  /** Un conteo distinto por tabla, para que un cruce de claves se note. */
  const counts = new Map<string, number>([
    ['Institution', 10630],
    ['Project', 1210],
    ['Workpackage', 344],
    ['Country', 248],
    ['Initiative', 43],
    ['HomepageClarisaEndpoint', 41],
  ]);

  const count = jest.fn();
  const mockDataSource: any = {
    getRepository: jest.fn((entity: any) => ({
      count: (options: any) => count(entity.name, options),
    })),
  };

  const store = new Map<string, unknown>();
  const mockCache: any = {
    get: jest.fn(async (key: string) => store.get(key)),
    set: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    store.clear();
    count.mockImplementation(async (name: string) => counts.get(name) ?? 0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('devuelve las seis cifras, cada una de su tabla', async () => {
    const metrics = await service.find();

    expect(metrics.institutions).toBe(10630);
    expect(metrics.projects).toBe(1210);
    expect(metrics.workPackages).toBe(344);
    expect(metrics.countries).toBe(248);
    expect(metrics.initiatives).toBe(43);
    expect(metrics.controlLists).toBe(41);
  });

  /**
   * 🛑 El contrato público: seis claves, siempre presentes y siempre `number`.
   * Hay consumidores sin null-safety; un `null` que se cuele aquí no revienta
   * en CLARISA, revienta en la pantalla de otro.
   */
  it('ninguna cifra es null ni falta, y todas son números', async () => {
    const metrics = await service.find();

    for (const key of [
      'institutions',
      'projects',
      'workPackages',
      'countries',
      'initiatives',
      'controlLists',
    ]) {
      expect(metrics).toHaveProperty(key);
      expect(typeof metrics[key]).toBe('number');
      expect(Number.isFinite(metrics[key])).toBe(true);
    }

    expect(typeof metrics.generatedAt).toBe('string');
    expect(new Date(metrics.generatedAt).toString()).not.toBe('Invalid Date');
  });

  it('cuenta solo lo activo, porque es lo que devuelven los endpoints públicos', async () => {
    await service.find();

    for (const call of count.mock.calls) {
      expect(call[1]).toEqual({ where: { auditableFields: { is_active: true } } });
    }
  });

  it('no vuelve a la base de datos mientras la caché sirva', async () => {
    await service.find();
    const llamadasPrimeraVez = count.mock.calls.length;

    await service.find();

    expect(count.mock.calls.length).toBe(llamadasPrimeraVez);
    expect(mockCache.set).toHaveBeenCalledTimes(1);
  });

  /**
   * 🛑 Si la base falla, NO se publica un cero. Un cero inventado en la portada
   * se lee igual que un catálogo vacío de verdad.
   */
  it('propaga el fallo en vez de inventarse ceros', async () => {
    count.mockRejectedValueOnce(new Error('la base se cayó'));

    await expect(service.find()).rejects.toThrow('la base se cayó');
    expect(mockCache.set).not.toHaveBeenCalled();
  });
});
