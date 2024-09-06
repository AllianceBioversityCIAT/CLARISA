/* eslint-disable @typescript-eslint/array-type */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
// see https://github.com/microsoft/TypeScript/issues/13923#issuecomment-557509399 for reference
/**
 * A type representing primitive values that are considered immutable.
 * This includes `undefined`, `null`, `boolean`, `string`, `number`, and `Function`.
 */
type ImmutablePrimitive =
  | undefined
  | null
  | boolean
  | string
  | number
  | Function;

/**
 * A recursive type utility that transforms a given type `T` into its immutable counterpart.
 *
 * If `T` is a primitive type, it remains unchanged.
 * If `T` is an array, map, or set, it converts them to their immutable versions.
 * Otherwise, `T` is assumed to be an object, and all its properties are recursively made readonly.
 *
 * @template T - The type to be transformed into an immutable version.
 */
export type Immutable<T> = T extends ImmutablePrimitive
  ? T
  : T extends Array<infer U>
    ? ImmutableArray<U>
    : T extends Map<infer K, infer V>
      ? ImmutableMap<K, V>
      : T extends Set<infer M>
        ? ImmutableSet<M>
        : ImmutableObject<T>;

/**
 * An immutable version of an array, where each element is recursively made immutable.
 *
 * @template T - The type of elements in the array.
 */
export type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;

/**
 * An immutable version of a map, where both the keys and values are recursively made immutable.
 *
 * @template K - The type of keys in the map.
 * @template V - The type of values in the map.
 */
export type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;

/**
 * An immutable version of a set, where each element is recursively made immutable.
 *
 * @template T - The type of elements in the set.
 */
export type ImmutableSet<T> = ReadonlySet<Immutable<T>>;

/**
 * An immutable version of an object, where each property is recursively made readonly.
 *
 * @template T - The type of the object.
 */
export type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };
