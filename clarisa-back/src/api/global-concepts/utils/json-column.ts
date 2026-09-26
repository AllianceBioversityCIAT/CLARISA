import { ValueTransformer } from 'typeorm';

/**
 * Stores a JSON value in a nullable `text` column (the module follows the
 * glossary's convention of text + JSON, so it runs on any MySQL the project
 * targets). Empty arrays and `null` are stored as `NULL`; anything unreadable
 * degrades to the fallback instead of failing the whole read.
 */
export function jsonColumn<T>(fallback: T): ValueTransformer {
  return {
    to: (value: T | null | undefined): string | null => {
      if (value === null || value === undefined) return null;
      if (Array.isArray(value) && value.length === 0) return null;
      return JSON.stringify(value);
    },
    from: (value: string | null): T => {
      if (!value) return JSON.parse(JSON.stringify(fallback)) as T;
      try {
        return JSON.parse(value) as T;
      } catch {
        return JSON.parse(JSON.stringify(fallback)) as T;
      }
    },
  };
}
