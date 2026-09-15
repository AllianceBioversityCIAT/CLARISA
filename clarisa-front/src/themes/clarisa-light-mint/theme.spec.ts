/**
 * The committed theme is generated from the PrimeNG one. Upgrading PrimeNG replaces
 * the source and would silently hand the application its blue back, because nothing
 * else in the build reads the accent. These tests are what makes that upgrade loud.
 *
 * `require` is declared locally rather than adding "node" to tsconfig.spec.json:
 * pulling the Node types into every spec changes how globals like setTimeout are
 * typed across the suite, which is a far wider change than this file needs.
 */
declare const require: (id: string) => any;

const fs = require('fs');
const { generate, RAMP, SOURCE, TARGET } = require('../../../scripts/generate-primeng-theme.js');

describe('clarisa-light-mint theme', () => {
  const committed: string = fs.readFileSync(TARGET, 'utf8');

  it('matches what the generator produces from the current PrimeNG theme', () => {
    expect(committed).toEqual(generate(fs.readFileSync(SOURCE, 'utf8')));
  });

  it('carries no tone of the vendor blue ramp', () => {
    for (const [blue] of RAMP as string[][]) {
      expect(committed).not.toMatch(new RegExp(blue, 'i'));
    }
  });

  it('exports the brand accent through --primary-color', () => {
    expect(committed).toContain('--primary-color:#0b7554');
  });
});
