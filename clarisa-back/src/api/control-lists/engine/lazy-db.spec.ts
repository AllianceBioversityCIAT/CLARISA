import { ServiceUnavailableException } from '@nestjs/common';
import {
  BUSY_MESSAGE,
  LOCK_WAIT_SECONDS,
  LazyDb,
  isLockWaitTimeout,
} from './lazy-db';

describe('control lists · connections', () => {
  const lockWait = {
    driverError: { errno: 1205, code: 'ER_LOCK_WAIT_TIMEOUT' },
    message: 'Lock wait timeout exceeded; try restarting transaction',
  };
  const withRunner = (error: unknown) => {
    const db = new LazyDb(() => ({}) as any, 'test');
    const qr: any = {
      query: jest.fn().mockRejectedValue(error),
      release: jest.fn().mockResolvedValue(undefined),
    };
    jest.spyOn(db, 'runner').mockResolvedValue(qr);
    return { db, qr };
  };

  it('waits seconds for a locked table, not the server default of a year', () => {
    expect(LOCK_WAIT_SECONDS).toBeGreaterThan(0);
    expect(LOCK_WAIT_SECONDS).toBeLessThanOrEqual(30);
  });

  it('a lock wait that ran out is "busy, try again" (503), and the connection goes back', async () => {
    const { db, qr } = withRunner(lockWait);
    const failure = await db.query('SELECT 1').catch((e) => e);
    expect(failure).toBeInstanceOf(ServiceUnavailableException);
    expect(failure.message).toBe(BUSY_MESSAGE);
    expect(qr.release).toHaveBeenCalledTimes(1);
  });

  it('any other error leaves exactly as it came', async () => {
    const dup = { driverError: { errno: 1062 }, message: 'Duplicate entry' };
    const { db, qr } = withRunner(dup);
    await expect(db.query('INSERT …')).rejects.toBe(dup);
    expect(qr.release).toHaveBeenCalledTimes(1);
  });

  it('recognises MySQL 1205 by number or by text', () => {
    expect(isLockWaitTimeout(lockWait)).toBe(true);
    expect(isLockWaitTimeout({ errno: 1205 })).toBe(true);
    expect(
      isLockWaitTimeout(new Error('Lock wait timeout exceeded; try again')),
    ).toBe(true);
    expect(isLockWaitTimeout({ errno: 1062 })).toBe(false);
    expect(isLockWaitTimeout(undefined)).toBe(false);
  });
});
