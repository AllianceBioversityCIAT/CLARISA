import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  CreateApiKeyBody,
  ManageApiService,
} from '../../../../services/manage-api.service';
import { matchDropdownPanelToTrigger } from '../../../../utils/dropdown-panel-width';

interface ApiKeyRow {
  id: number;
  name: string;
  key_prefix: string;
  mis_acronym?: string;
  mis_name?: string;
  environment?: string;
  scopes?: string[];
  usage_count: number;
  is_active: boolean;
  expires_at?: string;
  last_used_at?: string;
}

@Component({
  selector: 'app-api-keys-panel',
  templateUrl: './api-keys-panel.component.html',
  styleUrls: ['./api-keys-panel.component.scss'],
})
export class ApiKeysPanelComponent implements OnInit {
  keys: ApiKeyRow[] = [];
  mises: { id: number; acronym: string; name: string; environment?: string }[] =
    [];
  loading = false;
  showFilter: 'active' | 'all' | 'inactive' = 'active';

  createVisible = false;
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
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      mis_id: [null],
      environment: [null, Validators.required],
      scopes: [[]],
      allowedIpsText: [''],
      expires_at: [null],
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
          environment:
            mis.environment ?? mis.environment_object?.acronym ?? undefined,
        }));
      },
    });
  }

  loadKeys(): void {
    this.loading = true;
    this.api.getAllApiKeys(this.showFilter).subscribe({
      next: (resp: any) => {
        this.keys = Array.isArray(resp) ? resp : [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toastError(err);
      },
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
            title: item.description,
          });
        }
        this.scopeGroups = [...byGroup.entries()].map(([label, items]) => ({
          label,
          items,
        }));
        this.scopesLoading = false;
      },
      error: () => {
        this.scopesLoading = false;
      },
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
              label: name ? `${acronym} — ${name}` : acronym,
            };
          })
          .filter((e) => !!e.acronym);
        this.environmentsLoading = false;
      },
      error: () => {
        this.environmentsLoading = false;
      },
    });
  }

  keyPrefixPreview(envAcronym: string | null): string {
    if (!envAcronym) {
      return 'cl_{env}_';
    }
    const segment = envAcronym.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return `cl_${segment}_`;
  }

  onMisSelected(misId: number | null): void {
    if (!misId) {
      return;
    }
    const mis = this.mises.find((m) => m.id === misId);
    if (mis?.environment) {
      this.form.patchValue({ environment: mis.environment });
    }
  }

  openCreate(): void {
    this.form.reset({
      name: '',
      mis_id: null,
      environment: null,
      scopes: [],
      allowedIpsText: '',
      expires_at: null,
    });
    this.createVisible = true;
  }

  submitCreate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;
    const body: CreateApiKeyBody = {
      name: raw.name?.trim(),
      environment: raw.environment,
    };

    if (raw.mis_id) {
      body.mis_id = raw.mis_id;
    }

    const scopes = Array.isArray(raw.scopes)
      ? raw.scopes.filter((s: string) => !!s?.trim())
      : [];
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

    this.api.createApiKey(body).subscribe({
      next: (resp: any) => {
        const payload = resp?.response ?? resp;
        this.createdSecret = payload?.key ?? '';
        this.createVisible = false;
        if (this.createdSecret) {
          this.secretVisible = true;
        }
        this.messages.add({
          severity: 'success',
          summary: 'API key created',
          detail: resp?.message ?? 'Key created successfully.',
        });
        this.loadKeys();
      },
      error: (err) => this.toastError(err),
    });
  }

  confirmRevoke(key: ApiKeyRow): void {
    this.confirm.confirm({
      message: `Revoke "${key.name}" (${key.key_prefix})? This takes effect immediately.`,
      header: 'Revoke API key',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.api.revokeApiKey(key.id).subscribe({
          next: () => {
            this.messages.add({
              severity: 'success',
              summary: 'Revoked',
              detail: `Key ${key.key_prefix} was revoked.`,
            });
            this.loadKeys();
          },
          error: (err) => this.toastError(err),
        });
      },
    });
  }

  confirmRotate(key: ApiKeyRow): void {
    this.confirm.confirm({
      message: `Rotate "${key.name}"? The current key will be revoked and a new one issued.`,
      header: 'Rotate API key',
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
              detail: 'Save the new key now — it will not be shown again.',
            });
            this.loadKeys();
          },
          error: (err) => this.toastError(err),
        });
      },
    });
  }

  confirmDelete(key: ApiKeyRow): void {
    this.confirm.confirm({
      message: `Permanently delete "${key.name}"? This cannot be undone.`,
      header: 'Delete API key',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.deleteApiKey(key.id).subscribe({
          next: () => {
            this.messages.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'API key removed.',
            });
            this.loadKeys();
          },
          error: (err) => this.toastError(err),
        });
      },
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
      life: 2000,
    });
  }

  closeSecretDialog(): void {
    this.secretVisible = false;
    this.createdSecret = '';
  }

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

  private parseList(text: string): string[] {
    if (!text?.trim()) {
      return [];
    }
    return text
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private toastError(err: any): void {
    const detail =
      err?.error?.message ??
      err?.error?.response?.message ??
      err?.message ??
      'Request failed';
    this.messages.add({
      severity: 'error',
      summary: 'Error',
      detail,
    });
  }
}
