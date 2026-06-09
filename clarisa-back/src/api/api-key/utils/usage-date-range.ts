export interface ResolvedUsageDateRange {
  from: Date;
  to: Date;
}

const DEFAULT_RANGE_DAYS = 30;

/** Start of calendar day (local) — avoids excluding same-day logs when DB clock > app clock */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** End of calendar day (local) — includes logs stamped later on the same day in DB */
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function resolveUsageDateRange(
  from?: string,
  to?: string,
): ResolvedUsageDateRange {
  const endRaw = to ? new Date(to) : new Date();
  if (Number.isNaN(endRaw.getTime())) {
    throw new Error('Invalid "to" date');
  }

  const startRaw = from
    ? new Date(from)
    : new Date(
        endRaw.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000,
      );

  if (Number.isNaN(startRaw.getTime())) {
    throw new Error('Invalid "from" date');
  }

  const fromDay = startOfDay(startRaw);
  const toDay = endOfDay(endRaw);

  if (fromDay > toDay) {
    throw new Error('"from" must be before "to"');
  }

  return { from: fromDay, to: toDay };
}

export function toIsoPeriod(range: ResolvedUsageDateRange): {
  from: string;
  to: string;
} {
  return {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  };
}
