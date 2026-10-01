import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ApiKeyUsageStats, CreateApiKeyBody, ManageApiService, UpdateApiKeyBody } from '../../../../services/manage-api.service';
import { matchDropdownPanelToTrigger } from '../../../../utils/dropdown-panel-width';
import { absoluteTime, relativeTime } from '../../utils/relative-time';

export interface ApiKeyRow {
  id: number;
  name: string;
  description?: string | null;
  key_prefix: string;
  mis_id?: number | null;
  mis_acronym?: string;
  mis_name?: string;
  environment?: string;
  scopes?: string[];
  allowed_ips?: string[];
  usage_count: number;
  is_active: boolean;
  expires_at?: string;
  last_used_at?: string;
  created_at?: string;
  /** What the Status column shows, kept on the row so it can be sorted by it. */
  status_label?: string;
  /** Sortable: `last_used_at` as epoch, `0` when never used. */
  last_used_ts?: number;
  /** One line for the global filter: name, prefix, MIS, env, description. */
  search_text?: string;
}

/** The 30-day window every expanded row summarises. */
const DETAIL_DAYS = 30;

@Component({
  selector: 'app-api-keys-panel',
  templateUrl: './api-keys-panel.component.html',
  styleUrls: ['./api-keys-panel.component.scss']
})
export class ApiKeysPanelComponent implements OnInit {
  keys: ApiKeyRow[] = [];
  mises: { id: number; acronym: string; name: string; environment?: string }[] = [];
  loading = false;
  showFilter: 'active' | 'all' | 'inactive' = 'active';
  readonly rowsPerPage = [10, 25, 50];
  readonly detailDays = DETAIL_DAYS;

  /** Expanded rows and the 30-day usage loaded for each one. */
  expandedRows: Record<number, boolean> = {};
  detailById: Record<number, ApiKeyUsageStats | null> = {};
  detailLoading: Record<number, boolean> = {};

  dialogVisible = false;
  /** The key being edited, or `null` while creating. */
  editing: ApiKeyRow | null = null;
  submitting = false;
  secretVisible = false;
  createdSecret = '';

  form: FormGroup;

  environments: { acronym: string; name: string; label: string }[] = [];
  environmentsLoading = false;

  scopeGroups: {
    label: string;
    items: { label: string; value: string; title?: string }[];
  }[] = [];
  scopesLoading = false;

  constructor(
    private fb: FormBuilder,
    private api: ManageApiService,
    private messages: MessageService,
    private confirm: ConfirmationService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', Validators.maxLength(1000)],
      mis_id: [null],
      environment: [null, Validators.required],
      scopes: [[]],
      allowedIpsText: [''],
      expires_at: [null]
    });
  }

  ngOnInit(): void {
    this.loadKeys();
    this.loadEnvironments();
    this.loadScopeCatalog();
    this.api.getAllMis().subscribe({
      next: (resp: any) => {
        const list = Array.isArray(resp) ? resp : [];
        this.mises = list.map((mis: any) => ({
          id: mis.id,
          acronym: mis.acronym,
          name: mis.name,
          environment: mis.environment ?? mis.environment_object?.acronym ?? undefined
        }));
      }
    });
  }

  get dialogTitle(): string {
    return this.editing ? `Edit API key` : 'New API key';
  }

  loadKeys(): void {
    this.loading = true;
    this.api.getAllApiKeys(this.showFilter).subscribe({
      next: (resp: any) => {
        const rows: ApiKeyRow[] = Array.isArray(resp) ? resp : [];
        this.keys = rows.map(key => this.decorate(key));
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.toastError(err);
      }
    });
  }

  onDropdownShow(event: { originalEvent?: Event }): void {
    matchDropdownPanelToTrigger(event);
  }

  loadScopeCatalog(): void {
    this.scopesLoading = true;
    this.api.getApiKeyScopes().subscribe({
      next: (resp: any) => {
        const list = Array.isArray(resp) ? resp : [];
        const byGroup = new Map<string, { label: string; value: string; title?: string }[]>();
        for (const item of list) {
          const group = String(item.group ?? 'Other');
          if (!byGroup.has(group)) {
            byGroup.set(group, []);
          }
          byGroup.get(group)!.push({
            value: item.value,
            label: item.label ?? item.value,
            title: item.description
          });
        }
        this.scopeGroups = [...byGroup.entries()].map(([label, items]) => ({
          label,
          items
        }));
        this.scopesLoading = false;
      },
      error: () => {
        this.scopesLoading = false;
      }
    });
  }

  loadEnvironments(): void {
    this.environmentsLoading = true;
    this.api.getAllEnvironments().subscribe({
      next: (resp: any) => {
        const list = Array.isArray(resp) ? resp : [];
        this.environments = list
          .map((e: any) => {
            const acronym = String(e.acronym ?? '').trim();
            const name = String(e.name ?? '').trim();
            return {
              acronym,
              name,
              label: name ? `${acronym} — ${name}` : acronym
            };
          })
          .filter(e => !!e.acronym);
        this.environmentsLoading = false;
      },
      error: () => {
        this.environmentsLoading = false;
      }
    });
  }

  keyPrefixPreview(envAcronym: string | null): string {
    if (!envAcronym) {
      return 'cl_{env}_';
    }
    const segment = envAcronym
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    return `cl_${segment}_`;
  }

  onMisSelected(misId: number | null): void {
    if (!misId || this.editing) {
      return;
    }
    const mis = this.mises.find(m => m.id === misId);
    if (mis?.environment) {
      this.form.patchValue({ environment: mis.environment });
    }
  }

  // ------------------------------------------------------------ row detail

  /** PrimeNG hands the row on expand; the 30-day summary loads once per key. */
  onRowExpand(event: { data: ApiKeyRow }): void {
    const key = event.data;
    if (this.detailById[key.id] !== undefined || this.detailLoading[key.id]) {
      return;
    }
    this.detailLoading[key.id] = true;
    const to = new Date();
    const from = new Date(to.getTime() - DETAIL_DAYS * 24 * 60 * 60 * 1000);
    this.api.getApiKeyUsage(key.id, { from: from.toISOString(), to: to.toISOString() }).subscribe({
      next: resp => {
        this.detailById[key.id] = resp;
        this.detailLoading[key.id] = false;
      },
      error: () => {
        // A key with no log yet, or an older back: the row still opens with
        // its details; only the usage block says it could not load.
        this.detailById[key.id] = null;
        this.detailLoading[key.id] = false;
      }
    });
  }

  /** Overview with this key preselected: the full timeline, endpoints and log. */
  openInOverview(key: ApiKeyRow): void {
    this.router.navigate([], {
      queryParams: { section: 'overview', api_key: key.id },
      queryParamsHandling: 'merge'
    });
  }

  // ------------------------------------------------------------ create / edit

  openCreate(): void {
    this.editing = null;
    this.form.reset({
      name: '',
      description: '',
      mis_id: null,
      environment: null,
      scopes: [],
      allowedIpsText: '',
      expires_at: null
    });
    this.form.get('environment')?.enable();
    this.dialogVisible = true;
  }

  openEdit(key: ApiKeyRow): void {
    this.editing = key;
    this.form.reset({
      name: key.name,
      description: key.description ?? '',
      mis_id: key.mis_id ?? null,
      environment: key.environment ?? null,
      scopes: [...(key.scopes ?? [])],
      allowedIpsText: (key.allowed_ips ?? []).join(', '),
      expires_at: key.expires_at ? new Date(key.expires_at) : null
    });
    // The environment lives in the prefix: changing it means rotating.
    this.form.get('environment')?.disable();
    this.dialogVisible = true;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.editing) {
      this.submitEdit(this.editing);
    } else {
      this.submitCreate();
    }
  }

  private submitCreate(): void {
    const raw = this.form.getRawValue();
    const body: CreateApiKeyBody = {
      name: raw.name?.trim(),
      environment: raw.environment
    };

    const description = raw.description?.trim();
    if (description) {
      body.description = description;
    }

    if (raw.mis_id) {
      body.mis_id = raw.mis_id;
    }

    const scopes = this.cleanScopes(raw.scopes);
    if (scopes.length) {
      body.scopes = scopes;
    }

    const allowedIps = this.parseList(raw.allowedIpsText);
    if (allowedIps.length) {
      body.allowed_ips = allowedIps;
    }

    if (raw.expires_at) {
      body.expires_at = new Date(raw.expires_at).toISOString();
    }

    this.submitting = true;
    this.api.createApiKey(body).subscribe({
      next: (resp: any) => {
        this.submitting = false;
        const payload = resp?.response ?? resp;
        this.createdSecret = payload?.key ?? '';
        this.dialogVisible = false;
        if (this.createdSecret) {
          this.secretVisible = true;
        }
        this.messages.add({
          severity: 'success',
          summary: 'API key created',
          detail: resp?.message ?? 'Key created successfully.'
        });
        this.loadKeys();
      },
      error: err => {
        this.submitting = false;
        this.toastError(err);
      }
    });
  }

  private submitEdit(key: ApiKeyRow): void {
    const raw = this.form.getRawValue();
    // Every editable field travels, cleared ones as `null`: the back keeps a
    // field it does not receive, and an emptied form means "remove it".
    const body: UpdateApiKeyBody = {
      name: raw.name?.trim(),
      description: raw.description?.trim() ?? '',
      mis_id: raw.mis_id ? Number(raw.mis_id) : null,
      scopes: this.cleanScopes(raw.scopes),
      allowed_ips: this.parseList(raw.allowedIpsText),
      expires_at: raw.expires_at ? new Date(raw.expires_at).toISOString() : null
    };

    this.submitting = true;
    this.api.updateApiKey(key.id, body).subscribe({
      next: (resp: any) => {
        this.submitting = false;
        this.dialogVisible = false;
        this.editing = null;
        this.messages.add({
          severity: 'success',
          summary: 'API key updated',
          detail: resp?.message ?? `"${body.name}" was saved.`
        });
        this.loadKeys();
      },
      error: err => {
        this.submitting = false;
        this.toastError(err);
      }
    });
  }

  closeDialog(): void {
    if (this.submitting) {
      return;
    }
    this.dialogVisible = false;
    this.editing = null;
  }

  // ------------------------------------------------------------ actions

  confirmRevoke(key: ApiKeyRow): void {
    this.confirm.confirm({
      message: `Revoke "${key.name}" (${key.key_prefix}…)? Every call made with it will be refused immediately.`,
      header: 'Revoke API key',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Revoke',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.revokeApiKey(key.id).subscribe({
          next: () => {
            this.messages.add({
              severity: 'success',
              summary: 'Revoked',
              detail: `Key ${key.key_prefix}… was revoked.`
            });
            this.loadKeys();
          },
          error: err => this.toastError(err)
        });
      }
    });
  }

  confirmRotate(key: ApiKeyRow): void {
    this.confirm.confirm({
      message: `Rotate "${key.name}"? The current key is revoked and a new one is issued with the same settings.`,
      header: 'Rotate API key',
      acceptLabel: 'Rotate',
      accept: () => {
        this.api.rotateApiKey(key.id).subscribe({
          next: (resp: any) => {
            const payload = resp?.response ?? resp;
            this.createdSecret = payload?.key ?? '';
            if (this.createdSecret) {
              this.secretVisible = true;
            }
            this.messages.add({
              severity: 'success',
              summary: 'Rotated',
              detail: 'Save the new key now — it will not be shown again.'
            });
            this.loadKeys();
          },
          error: err => this.toastError(err)
        });
      }
    });
  }

  confirmDelete(key: ApiKeyRow): void {
    this.confirm.confirm({
      message: `Permanently delete "${key.name}"? Its usage history goes with it. This cannot be undone.`,
      header: 'Delete API key',
      acceptLabel: 'Delete',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.deleteApiKey(key.id).subscribe({
          next: () => {
            this.messages.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'API key removed.'
            });
            this.loadKeys();
          },
          error: err => this.toastError(err)
        });
      }
    });
  }

  copySecret(): void {
    if (!this.createdSecret) {
      return;
    }
    navigator.clipboard?.writeText(this.createdSecret);
    this.messages.add({
      severity: 'info',
      summary: 'Copied',
      detail: 'API key copied to clipboard.',
      life: 2000
    });
  }

  closeSecretDialog(): void {
    this.secretVisible = false;
    this.createdSecret = '';
  }

  // ------------------------------------------------------------ presentation

  statusSeverity(key: ApiKeyRow): string {
    if (!key.is_active) {
      return 'danger';
    }
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return 'warning';
    }
    return 'success';
  }

  statusLabel(key: ApiKeyRow): string {
    if (!key.is_active) {
      return 'Revoked';
    }
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return 'Expired';
    }
    return 'Active';
  }

  lastUsed(key: ApiKeyRow): string {
    return relativeTime(key.last_used_at);
  }

  lastUsedTitle(key: ApiKeyRow): string {
    return absoluteTime(key.last_used_at);
  }

  formatDate(value: string | null | undefined): string {
    return absoluteTime(value);
  }

  formatNumber(value: number | null | undefined): string {
    return value == null ? '—' : value.toLocaleString();
  }

  /** Share of the key's own 30-day traffic, for the bar next to each endpoint. */
  shareWidth(percentage: number | null | undefined): string {
    return `${Math.max(0, Math.min(100, percentage ?? 0))}%`;
  }

  private decorate(key: ApiKeyRow): ApiKeyRow {
    return {
      ...key,
      // Status is not a stored field: it comes from is_active plus the expiry
      // date, so ordering by either one alone would not match the tag shown.
      status_label: this.statusLabel(key),
      last_used_ts: key.last_used_at ? new Date(key.last_used_at).getTime() : 0,
      search_text: [key.name, key.key_prefix, key.mis_acronym, key.mis_name, key.environment, key.description, ...(key.scopes ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
    };
  }

  private cleanScopes(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((s: string) => !!s?.trim()) : [];
  }

  private parseList(text: string): string[] {
    if (!text?.trim()) {
      return [];
    }
    return text
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  private toastError(err: any): void {
    const detail = err?.error?.message ?? err?.error?.response?.message ?? err?.message ?? 'Request failed';
    this.messages.add({
      severity: 'error',
      summary: 'Error',
      detail
    });
  }
}
