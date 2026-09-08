import { BadRequestException } from '@nestjs/common';
import { resolvePartnerRequestActor } from './resolve-partner-request-actor';

describe('resolvePartnerRequestActor', () => {
  const jwtUser = {
    userId: 10,
    email: 'panel@cgiar.org',
    permissions: 'admin',
  };

  const apiKeyAuth = {
    api_key_id: 1,
    key_prefix: 'cl_prod_abcdefgh',
    mis: { id: 3, name: 'PRMS', acronym: 'PRMS' },
  };

  it('prefers JWT user when present', () => {
    expect(
      resolvePartnerRequestActor(jwtUser, apiKeyAuth, { userId: 99 }),
    ).toEqual(jwtUser);
  });

  it('builds actor from body for API-key callers', () => {
    expect(
      resolvePartnerRequestActor(undefined, apiKeyAuth, {
        userId: 42,
        email: 'bot@example.com',
      }),
    ).toEqual({
      userId: 42,
      email: 'bot@example.com',
      permissions: '',
    });
  });

  it('requires body userId for API-key callers', () => {
    expect(() => resolvePartnerRequestActor(undefined, apiKeyAuth, {})).toThrow(
      BadRequestException,
    );
  });

  it('fails when neither JWT nor API-key context exists', () => {
    expect(() => resolvePartnerRequestActor(undefined, undefined)).toThrow(
      BadRequestException,
    );
  });
});
