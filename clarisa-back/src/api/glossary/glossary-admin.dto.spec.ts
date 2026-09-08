import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import {
  CreateGlossaryTermDto,
  UpdateGlossaryTermDto,
} from './dto/glossary-admin.dto';

/**
 * The payload contract of the admin endpoints. The pipe is declared on the
 * controller itself (there is no global one), so it is exercised here with the
 * same options and the same metadata Nest passes for `@Body()`.
 *
 * The service specs call `create()`/`update()` directly, which never touches
 * the pipe: a DTO that rejects the panel's own payload would pass all of them
 * and still answer 400 in production.
 */
describe('Glossary admin DTO validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  const run = (metatype: unknown, body: unknown) => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: metatype as ArgumentMetadata['metatype'],
      data: '',
    };
    return pipe.transform(body, metadata);
  };

  /** Exactly what `glossary-terms-panel.component.ts` sends on submit. */
  const panelBody = (overrides: Record<string, unknown> = {}) => ({
    term: 'Innovation',
    definition: 'A new or improved product, process or practice.',
    source: '',
    source_url: '',
    reference_date: '',
    portfolio_ids: [],
    show_in_dashboard: false,
    ...overrides,
  });

  describe('CreateGlossaryTermDto', () => {
    it('accepts the panel payload with the provenance fields left blank', async () => {
      // The three fields ship empty on purpose: the structure is delivered and
      // somebody else loads the content later. This is the common create.
      await expect(
        run(CreateGlossaryTermDto, panelBody()),
      ).resolves.toMatchObject({ term: 'Innovation', reference_date: '' });
    });

    it('accepts a calendar day', async () => {
      await expect(
        run(CreateGlossaryTermDto, panelBody({ reference_date: '2026-09-07' })),
      ).resolves.toMatchObject({ reference_date: '2026-09-07' });
    });

    it.each([['2026-09-07T00:00:00.000Z'], ['07/09/2026'], ['not-a-date']])(
      'still rejects %s',
      async (value) => {
        await expect(
          run(CreateGlossaryTermDto, panelBody({ reference_date: value })),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );
  });

  describe('the fields both payloads share', () => {
    // They live on a common base class, so these cases prove the inherited
    // decorators still run: class-validator reads the whole prototype chain,
    // and a broken chain would silently accept everything below.
    it('still enforces the length of an inherited field', async () => {
      await expect(
        run(CreateGlossaryTermDto, panelBody({ source: 'x'.repeat(501) })),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        run(UpdateGlossaryTermDto, panelBody({ source: 'x'.repeat(501) })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('still transforms the portfolio ids a form sends as strings', async () => {
      await expect(
        run(CreateGlossaryTermDto, panelBody({ portfolio_ids: ['3'] })),
      ).resolves.toMatchObject({ portfolio_ids: [3] });
    });

    it('still refuses an unknown key, so no other column can be reached', async () => {
      await expect(
        run(CreateGlossaryTermDto, panelBody({ is_active: false })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('keeps the required fields required on create', async () => {
      await expect(
        run(CreateGlossaryTermDto, { definition: 'No term' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lets update send only the field being edited', async () => {
      await expect(
        run(UpdateGlossaryTermDto, { definition: 'Just the definition' }),
      ).resolves.toEqual({
        definition: 'Just the definition',
      });
    });
  });

  describe('UpdateGlossaryTermDto', () => {
    it('accepts a blank reference date, which is how a stored one is cleared', async () => {
      await expect(
        run(UpdateGlossaryTermDto, panelBody()),
      ).resolves.toMatchObject({ reference_date: '' });
    });

    it.each([['2026-09-07T00:00:00.000Z'], ['07/09/2026']])(
      'still rejects %s',
      async (value) => {
        await expect(
          run(UpdateGlossaryTermDto, panelBody({ reference_date: value })),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );
  });
});
