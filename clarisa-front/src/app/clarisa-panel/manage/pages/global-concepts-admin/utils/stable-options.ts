/**
 * Keeps the same options array between change-detection runs while its
 * inputs do not change. A getter that builds a new array on every run makes
 * PrimeNG re-render the open dropdown and lose the click, so nothing could be
 * picked (Setup → Custom fields → "Values come from", 2026-09-30).
 */
export class StableOptions<T> {
  private key: unknown[] | null = null;
  private value: T[] = [];

  /** `deps` are compared one by one with `===`; `build` runs only when one changed. */
  get(deps: unknown[], build: () => T[]): T[] {
    const same = this.key !== null && this.key.length === deps.length && this.key.every((dep, i) => dep === deps[i]);
    if (!same) {
      this.key = [...deps];
      this.value = build();
    }
    return this.value;
  }
}
