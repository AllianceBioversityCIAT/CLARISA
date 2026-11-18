/** Shapes of the control-lists admin API (`api/control-lists/admin/…`). */

export type ListStatus = 'draft' | 'published';

export type FieldTypeValue = 'text' | 'long_text' | 'integer' | 'decimal' | 'boolean' | 'date' | 'datetime' | 'url' | 'email' | 'relation';

export interface FieldTypeOption {
  value: FieldTypeValue | string;
  label: string;
}

export interface OwnerRole {
  id: number;
  acronym: string;
  description: string;
}

export interface ListRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  owner_role_id: number;
  table_name: string;
  status: ListStatus;
  is_active: boolean | number;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface FieldRow {
  id: number;
  list_id: number;
  code: string;
  label: string;
  type: FieldTypeValue | string;
  column_name: string;
  is_required: 0 | 1 | boolean;
  is_unique: 0 | 1 | boolean;
  is_indexed: 0 | 1 | boolean;
  relation_list_id: number | null;
  position: number;
  status: ListStatus;
  type_label: string;
  relation_name: string | null;
  relation_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListDetail extends ListRow {
  pending_changes: number;
  rows: number;
  fields: FieldRow[];
}

/** Counters of a lists-table row; `null` while loading or when its detail failed. */
export interface ListCounts {
  fields: number;
  records: number;
  relations: number;
}

export interface NewListBody {
  code: string;
  name: string;
  description?: string;
  owner_role_id?: number;
}

export interface NewFieldBody {
  code: string;
  label: string;
  type: string;
  is_required: boolean;
  is_unique: boolean;
  is_indexed: boolean;
  relation_list_id?: number;
  request_id: string;
}

export interface FieldImpact {
  rows: number;
  affected: number;
  message: string;
}

export interface ListDeleteImpact {
  rows: number;
  dependents: string[];
  message: string;
}

/** A record of a list: `id`, one key per field code, `is_active`. */
export type ListRecord = Record<string, unknown> & { id: number; is_active?: boolean | number };

export interface PublicResponse {
  status: number;
  body: unknown;
}
