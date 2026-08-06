import { apiErrorMessage } from './api-error-message';

describe('apiErrorMessage', () => {
  it('unwraps the doubly nested validation errors CLARISA returns', () => {
    const error = {
      error: {
        response: {
          response: { message: ['The term is required', 'The definition is required'] }
        },
        message: 'Bad Request Exception'
      }
    };

    expect(apiErrorMessage(error)).toBe('The term is required · The definition is required');
  });

  it('reads a single nested message', () => {
    const error = {
      error: {
        response: { response: { message: 'Unknown portfolio id(s): 999' } },
        message: 'Unknown portfolio id(s): 999'
      }
    };

    expect(apiErrorMessage(error)).toBe('Unknown portfolio id(s): 999');
  });

  it('skips the generic wrapper and keeps looking for a real message', () => {
    const error = { error: { message: 'Bad Request Exception' }, message: 'Http failure response' };

    expect(apiErrorMessage(error)).toBe('Http failure response');
  });

  it('falls back to the HttpErrorResponse message when there is no body', () => {
    expect(apiErrorMessage({ message: 'Http failure response for /api/glossary: 500' })).toBe('Http failure response for /api/glossary: 500');
  });

  it('returns the fallback when nothing usable is present', () => {
    expect(apiErrorMessage({})).toBe('Request failed');
    expect(apiErrorMessage(null)).toBe('Request failed');
    expect(apiErrorMessage({ error: { message: '   ' } })).toBe('Request failed');
  });

  it('accepts a custom fallback', () => {
    expect(apiErrorMessage(undefined, 'Could not load the glossary')).toBe('Could not load the glossary');
  });
});
