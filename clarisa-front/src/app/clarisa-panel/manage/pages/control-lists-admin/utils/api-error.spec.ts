import { GENERIC_ERROR, readApiError, UNAVAILABLE_ERROR } from './api-error';

describe('readApiError', () => {
  it('shows the back message on a 4xx', () => {
    const info = readApiError({ status: 400, error: { message: '"First release" expects a date as YYYY-MM-DD.', status: 400, path: '/x' } });
    expect(info).toEqual({ status: 400, message: '"First release" expects a date as YYYY-MM-DD.', affected: null, unsettled: false });
  });

  it('joins a list of messages', () => {
    expect(readApiError({ status: 400, error: { message: ['a', 'b'] } }).message).toBe('a · b');
  });

  it('reads the nested retype 409 with its affected count', () => {
    const info = readApiError({ status: 409, error: { message: { message: '3 records would change.', affected: 3 }, status: 409 } });
    expect(info).toEqual({ status: 409, message: '3 records would change.', affected: 3, unsettled: true });
  });

  it('keeps an affected count of 0', () => {
    expect(readApiError({ status: 409, error: { message: { message: 'none', affected: 0 } } }).affected).toBe(0);
  });

  it('reads a body wrapped one level down', () => {
    expect(readApiError({ status: 409, error: { response: { message: 'wrapped', affected: '4' } } })).toEqual({
      status: 409,
      message: 'wrapped',
      affected: 4,
      unsettled: true
    });
  });

  it('falls back to a generic line on a 4xx without a message', () => {
    expect(readApiError({ status: 404, error: null }).message).toBe(GENERIC_ERROR);
    expect(readApiError({ status: 403, error: { message: '   ' } }).message).toBe(GENERIC_ERROR);
  });

  it('is generic for 5xx and network failures', () => {
    expect(readApiError({ status: 500, error: { message: 'stack trace' } }).message).toBe(GENERIC_ERROR);
    expect(readApiError({ status: 0, error: new ProgressEvent('error') }).message).toBe(GENERIC_ERROR);
  });

  it('keeps what the back wrote on a 503, and has its own line when it wrote nothing', () => {
    const said = 'The connection dropped. CLARISA confirms the result on its own within a few minutes; reload the list then.';
    expect(readApiError({ status: 503, error: { message: said, status: 503 } }).message).toBe(said);
    expect(readApiError({ status: 503, error: '<html>Service Unavailable</html>' }).message).toBe(UNAVAILABLE_ERROR);
    expect(readApiError({ status: 503, error: null }).message).toBe(UNAVAILABLE_ERROR);
  });

  it('marks as unsettled what may have been applied: network, 5xx and 409, never a 400', () => {
    expect(readApiError({ status: 0, error: null }).unsettled).toBe(true);
    expect(readApiError({ status: 500, error: null }).unsettled).toBe(true);
    expect(readApiError({ status: 503, error: null }).unsettled).toBe(true);
    expect(readApiError({ status: 409, error: { message: 'Still being confirmed.' } }).unsettled).toBe(true);
    expect(readApiError({ status: 400, error: { message: '"Name" is required.' } }).unsettled).toBe(false);
  });

  it('reads the retype 409 exactly as the back sends it', () => {
    // Body copied from the engine (PATCH schema/fields/:id/type with a wrong confirm_affected).
    const body = {
      response: { message: 'Changing "Name" to Whole number changes or does not fit 3 record(s).', affected: 3 },
      message: 'Changing "Name" to Whole number changes or does not fit 3 record(s).',
      status: 409,
      path: '/api/control-lists/admin/schema/fields/7/type'
    };
    expect(readApiError({ status: 409, error: body })).toMatchObject({ affected: 3, message: body.message });
  });

  it('survives garbage', () => {
    expect(readApiError(null).message).toBe(GENERIC_ERROR);
    expect(readApiError(undefined).status).toBe(0);
  });
});
