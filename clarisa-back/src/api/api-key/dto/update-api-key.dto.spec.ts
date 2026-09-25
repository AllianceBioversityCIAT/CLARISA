import { ValidationPipe } from '@nestjs/common';
import { UpdateApiKeyDto } from './update-api-key.dto';
import { CreateApiKeyDto } from './create-api-key.dto';

/**
 * The DTOs are only exercised by the controller's ValidationPipe: a service
 * spec calls the service directly and never sees a 400. These run the exact
 * bodies the panel sends through a pipe configured like the controller's.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const run = (metatype: any, body: unknown) =>
  pipe.transform(body, { type: 'body', metatype });

describe('UpdateApiKeyDto (controller pipe)', () => {
  it('accepts an empty body: nothing to change', async () => {
    await expect(run(UpdateApiKeyDto, {})).resolves.toEqual({});
  });

  it('accepts the full edit form of the panel, with cleared optionals', async () => {
    const body = {
      name: 'Reporting Tool',
      description: '',
      mis_id: null,
      scopes: [],
      allowed_ips: [],
      expires_at: '',
    };
    await expect(run(UpdateApiKeyDto, body)).resolves.toMatchObject(body);
  });

  it('accepts null for scopes and allowed_ips (clear)', async () => {
    await expect(
      run(UpdateApiKeyDto, { scopes: null, allowed_ips: null }),
    ).resolves.toEqual({ scopes: null, allowed_ips: null });
  });

  it('rejects an unknown scope', async () => {
    await expect(
      run(UpdateApiKeyDto, { scopes: ['not:a-scope'] }),
    ).rejects.toThrow();
  });

  it('rejects a description over 1000 characters', async () => {
    await expect(
      run(UpdateApiKeyDto, { description: 'x'.repeat(1001) }),
    ).rejects.toThrow();
  });

  it('rejects an unknown key (environment is not editable)', async () => {
    await expect(
      run(UpdateApiKeyDto, { environment: 'PROD' }),
    ).rejects.toThrow();
  });

  it('rejects a non-ISO expiry', async () => {
    await expect(
      run(UpdateApiKeyDto, { expires_at: 'next week' }),
    ).rejects.toThrow();
  });
});

describe('CreateApiKeyDto (controller pipe) — description', () => {
  it('accepts a description and an empty one', async () => {
    const base = { name: 'Reports', environment: 'PROD' };
    await expect(
      run(CreateApiKeyDto, { ...base, description: 'Held by PRMS team' }),
    ).resolves.toMatchObject({ description: 'Held by PRMS team' });
    await expect(
      run(CreateApiKeyDto, { ...base, description: '' }),
    ).resolves.toMatchObject({ description: '' });
  });
});
