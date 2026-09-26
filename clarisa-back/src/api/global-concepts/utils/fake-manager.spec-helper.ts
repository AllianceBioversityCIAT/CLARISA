/**
 * In-memory stand-in for TypeORM's EntityManager, good enough to run the
 * Global Concepts services against real rules instead of hand-written mocks:
 * find / findOne / count / save / create / delete / update with plain
 * equality, `In(...)` and OR-arrays, plus the few query builders the services
 * use. Test-only; not a general TypeORM emulator.
 */
import { FindOperator } from 'typeorm';
import { GcConcept, GcConceptStatus } from '../entities/gc-concept.entity';
import { GcLabel, GcLabelKind } from '../entities/gc-label.entity';
import { GcScheme } from '../entities/gc-scheme.entity';

type Row = Record<string, any>;

const matches = (row: Row, where: Row | undefined): boolean => {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => {
    if (v instanceof FindOperator) {
      const op = v as FindOperator<any>;
      if (op.type === 'in')
        return (op.value as any[]).map(String).includes(String(row[k]));
      if (op.type === 'not') return String(row[k]) !== String(op.value);
      if (op.type === 'moreThan') return row[k] > op.value;
      if (op.type === 'lessThanOrEqual') return row[k] <= op.value;
      if (op.type === 'lessThan') return row[k] < op.value;
      if (op.type === 'isNull') return row[k] === null || row[k] === undefined;
      throw new Error(`Unsupported operator ${op.type}`);
    }
    if (v === null) return row[k] === null || row[k] === undefined;
    return String(row[k]) === String(v);
  });
};

export class FakeManager {
  tables = new Map<any, Row[]>();
  ids = new Map<any, number>();

  rows<T>(entity: new () => T): T[] {
    if (!this.tables.has(entity)) this.tables.set(entity, []);
    return this.tables.get(entity) as unknown as T[];
  }

  seed<T>(entity: new () => T, data: Partial<T>): T {
    const row = Object.assign(new entity(), data) as any;
    if (row.id === undefined) row.id = this.nextId(entity);
    this.rows(entity).push(row);
    return row;
  }

  private nextId(entity: any) {
    const n = (this.ids.get(entity) ?? 0) + 1;
    this.ids.set(entity, n);
    return n;
  }

  create = (entity: any, data: Row) => Object.assign(new entity(), data);

  find = async (entity: any, opts: Row = {}) => {
    const wh = opts.where;
    let out = this.rows(entity).filter((r: Row) =>
      Array.isArray(wh) ? wh.some((w) => matches(r, w)) : matches(r, wh),
    );
    if (opts.order) {
      const [[field, dir]] = Object.entries(opts.order) as [string, string][];
      out = [...out].sort(
        (a: Row, b: Row) =>
          (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) *
          (dir === 'DESC' ? -1 : 1),
      );
    }
    return out;
  };

  findOne = async (entity: any, opts: Row = {}) =>
    (await this.find(entity, opts))[0] ?? null;

  count = async (entity: any, opts: Row = {}) =>
    (await this.find(entity, opts)).length;

  save = async (entity: any, value: any) => {
    const list = Array.isArray(value) ? value : [value];
    for (const v of list) {
      if (v.id === undefined || v.id === null) {
        v.id = this.nextId(entity);
        this.rows(entity).push(v);
      } else if (!this.rows(entity).includes(v)) {
        const i = this.rows(entity).findIndex(
          (r: Row) => String(r.id) === String(v.id),
        );
        if (i >= 0) this.rows(entity)[i] = v;
        else this.rows(entity).push(v);
      }
    }
    return value;
  };

  delete = async (entity: any, where: Row) => {
    const before = this.rows(entity).length;
    const keep = this.rows(entity).filter((r: Row) => !matches(r, where));
    this.tables.set(entity, keep);
    return { affected: before - keep.length };
  };

  update = async (entity: any, where: Row, patch: Row) => {
    let affected = 0;
    for (const r of this.rows(entity)) {
      if (matches(r, where)) {
        Object.assign(r, patch);
        affected++;
      }
    }
    return { affected };
  };

  /** Query builders used by the services: scheme lock and preferred-label clash checks. */
  createQueryBuilder = (entity: any) => {
    const params: Row = {};
    const qb: any = {
      setLock: () => qb,
      where: (_: string, p: Row = {}) => (Object.assign(params, p), qb),
      andWhere: (_: string, p: Row = {}) => (Object.assign(params, p), qb),
      innerJoin: () => qb,
      limit: () => qb,
      getMany: async () => [],
      getOne: async () => {
        if (entity === GcScheme) {
          return (
            this.rows(GcScheme).find((s) => s.code === params.code) ?? null
          );
        }
        if (entity === GcConcept) {
          return (
            this.rows(GcConcept).find(
              (c) =>
                String(c.scheme_id) === String(params.s) &&
                c.preferred_label.toLowerCase() === params.l &&
                c.language === params.lang &&
                c.status !== GcConceptStatus.DEPRECATED &&
                (params.id === undefined || String(c.id) !== String(params.id)),
            ) ?? null
          );
        }
        if (entity === GcLabel) {
          return (
            this.rows(GcLabel).find((l) => {
              const c = this.rows(GcConcept).find(
                (x) => String(x.id) === String(l.concept_id),
              );
              return (
                c &&
                String(c.scheme_id) === String(params.s) &&
                l.kind === GcLabelKind.PREF &&
                l.label.toLowerCase() === params.l &&
                l.language === params.lang &&
                c.status !== GcConceptStatus.DEPRECATED &&
                (params.id === undefined || String(c.id) !== String(params.id))
              );
            }) ?? null
          );
        }
        throw new Error('Unsupported query builder in fake manager');
      },
    };
    return qb;
  };
}

/** A DataSource whose transaction simply runs on the same fake manager. */
export const fakeDataSource = (manager: FakeManager) =>
  ({
    manager,
    transaction: async (cb: (m: FakeManager) => any) => cb(manager),
  }) as any;
