import { OpenAPIObject } from '@nestjs/swagger';
import {
  PUBLIC_OPENAPI_PATHS,
  PUBLIC_RECORD_LOOKUPS,
  recordLookupPath,
} from './public-endpoints';

type Paths = OpenAPIObject['paths'];
type Operation = NonNullable<Paths[string]['get']>;

/**
 * Deja en el spec SOLO lo publico: el GET de cada lista de
 * PUBLIC_OPENAPI_PATHS y, si existe, el `get/{id}` de las listas de
 * PUBLIC_RECORD_LOOKUPS. Todo lo demas (escritura, auth, admin, y cualquier
 * `get/{id}` no listado) se cae.
 *
 * Cada `get/{id}` publicado es el "resource URI" de un registro de esa
 * "collection". Se le describe el path parameter `id` y se le pone
 * `x-clarisa-list-field`, que es lo que la doc usa para saber de donde sacar
 * un id real del primer registro.
 */
export function filterPublicPaths(paths: Paths): Paths {
  const lists = new Set(PUBLIC_OPENAPI_PATHS);
  const records = new Map(
    Object.entries(PUBLIC_RECORD_LOOKUPS).map(([list, field]) => [
      recordLookupPath(list),
      { list, field },
    ]),
  );

  const out: Paths = {};
  for (const [path, ops] of Object.entries(paths)) {
    if (!ops.get) continue;
    if (lists.has(path)) {
      out[path] = { get: ops.get };
      continue;
    }
    const record = records.get(path);
    if (record) {
      out[path] = {
        get: describeRecordLookup(ops.get, record.list, record.field),
      };
    }
  }
  return out;
}

function describeRecordLookup(
  op: Operation,
  listPath: string,
  field: string,
): Operation {
  const parameters = (op.parameters ?? []).map((param) => {
    if (!('in' in param) || param.in !== 'path' || param.name !== 'id') {
      return param;
    }
    return {
      ...param,
      description:
        param.description ??
        `The \`${field}\` of the record, exactly as the collection \`GET ${listPath}\` returns it.`,
      'x-clarisa-list-field': field,
    };
  });
  return {
    ...op,
    summary: op.summary ?? 'Retrieve one record by its resource URI',
    parameters,
  };
}
