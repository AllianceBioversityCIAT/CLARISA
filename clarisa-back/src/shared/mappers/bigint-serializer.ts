/**
 * Serializes BigInt values to strings during JSON serialization.
 *
 * @param key - The key of the property being serialized.
 * @param value - The value of the property being serialized.
 * @returns The serialized value, converting BigInt to string if necessary.
 */
export function bigintSerializer(key, value) {
  return typeof value === 'bigint' ? value.toString() : value;
}
