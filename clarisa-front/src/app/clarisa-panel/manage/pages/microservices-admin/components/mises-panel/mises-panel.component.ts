import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ManageApiService, MisActivityItem } from '../../../../services/manage-api.service';
import { matchDropdownPanelToTrigger } from '../../../../utils/dropdown-panel-width';
import { absoluteTime, relativeTime } from '../../utils/relative-time';

interface MisApiResponse {
  id: number;
  name: string;
  acronym: string;
  environment?: string;
  environment_object?: { acronym?: string; name?: string };
  auditableFields?: { is_active?: boolean };
  is_active?: boolean;
}

export interface MisRow {
  id: number;
  name: string;
  acronym: string;
  environment?: string;
  environmentName?: string;
  is_active?: boolean;
  /** From `usage/mis-activity`; `undefined` until it arrives or if it cannot. */
  activeKeys?: number;
  totalKeys?: number;
  lastUsedAt?: string | null;
  /** Sortable: `lastUsedAt` as epoch, `0` when never used. */
  lastUsedTs?: number;
  /** One line for the global filter. */
  searchText?: string;
}

interface UserOption {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  displayName: string;
}

interface EnvironmentOption {
  acronym: string;
  name: string;
  label: string;
}

@Component({
  selector: 'app-mises-panel',
  templateUrl: './mises-panel.component.html',
  styleUrls: ['./mises-panel.component.scss']
})
export class MisesPanelComponent implements OnInit {
  mises: MisRow[] = [];
  users: UserOption[] = [];
  environments: EnvironmentOption[] = [];
  loading = false;
  submitting = false;
  createVisible = false;
  showFilter: 'active' | 'all' | 'inactive' = 'active';
  usersLoading = false;
  environmentsLoading = false;
  readonly rowsPerPage = [10, 25, 50];

  /** `null` until it loads; stays empty (not null) if the back has no aggregate. */
  activity: Map<number | null, MisActivityItem> | null = null;
  activityUnavailable = false;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: ManageApiService,
    private messages: MessageService,
    private confirm: ConfirmationService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      acronym: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
      contact_point_id: [null, Validators.required],
      environment: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadActivity();
    this.loadMises();
    this.loadUsers();
    this.loadEnvironments();
  }

  loadMises(): void {
    this.loading = true;
    const show = this.showFilter === 'active' ? undefined : this.showFilter;
    this.api.getAllMis(show).subscribe({
      next: (resp: any) => {
        const list: MisApiResponse[] = Array.isArray(resp) ? resp : [];
        this.mises = list.map(mis => this.decorate(this.normalizeMis(mis)));
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.toastError(err);
      }
    });
  }

  /** Keys held and last use per MIS. Merged into the rows when both arrive. */
  loadActivity(): void {
    this.api.getMisActivity().subscribe({
      next: resp => {
        const list = Array.isArray(resp) ? resp : [];
        this.activity = new Map(list.map(item => [item.mis_id, item]));
        this.activityUnavailable = false;
        this.mises = this.mises.map(mis => this.decorate(mis));
      },
      error: () => {
        // An older back without the aggregate: the registry still works, the
        // two columns just say so instead of showing a lying zero.
        this.activity = new Map();
        this.activityUnavailable = true;
      }
    });
  }

  loadUsers(): void {
    this.usersLoading = true;
    this.api.getAllUser().subscribe({
      next: (resp: any) => {
        const list = Array.isArray(resp) ? resp : [];
        this.users = list.map((u: any) => this.normalizeUser(u)).filter((u: UserOption) => u.id > 0);
        this.usersLoading = false;
      },
      error: () => {
        this.usersLoading = false;
        this.messages.add({
          severity: 'warn',
          summary: 'Users',
          detail: 'Could not load users for contact point selection.'
        });
      }
    });
  }

  loadEnvironments(): void {
    this.environmentsLoading = true;
    this.api.getAllEnvironments().subscribe({
      next: (resp: any) => {
        const list = Array.isArray(resp) ? resp : [];
        this.environments = list.map((e: any) => this.normalizeEnvironment(e)).filter((e: EnvironmentOption) => !!e.acronym);
        this.environmentsLoading = false;
      },
      error: () => {
        this.environmentsLoading = false;
        this.messages.add({
          severity: 'warn',
          summary: 'Environments',
          detail: 'Could not load environments.'
        });
      }
    });
  }

  onDropdownShow(event: { originalEvent?: Event }): void {
    matchDropdownPanelToTrigger(event);
  }

  openCreate(): void {
    const defaultContactId = this.getLoggedInUserId();
    this.form.reset({
      name: '',
      acronym: '',
      contact_point_id: defaultContactId,
      environment: null
    });
    this.createVisible = true;
  }

  submitCreate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;
    this.submitting = true;
    this.api
      .createMis({
        name: raw.name?.trim(),
        acronym: raw.acronym?.trim().toUpperCase(),
        contact_point_id: Number(raw.contact_point_id),
        environment: raw.environment
      })
      .subscribe({
        next: (resp: any) => {
          this.submitting = false;
          this.createVisible = false;
          const created = resp?.response ?? resp;
          const label = created?.acronym ? `${created.acronym} (${created.environment ?? raw.environment})` : raw.acronym;
          this.messages.add({
            severity: 'success',
            summary: 'MIS created',
            detail: resp?.message ?? `Microservice "${label}" registered successfully.`
          });
          this.loadMises();
        },
        error: err => {
          this.submitting = false;
          this.toastError(err);
        }
      });
  }

  // ------------------------------------------------------------ status

  /**
   * Logical delete (Yeck, 2026-09-24): the row stays, only `is_active` flips.
   * The confirmation says how many active keys still point at the MIS, so the
   * operator decides with that in front, not after.
   */
  confirmDeactivate(mis: MisRow): void {
    const keys = mis.activeKeys ?? 0;
    const keysLine = keys
      ? ` ${keys} active ${keys === 1 ? 'key is' : 'keys are'} linked to it; they keep working but can no longer be linked to a new MIS.`
      : '';
    this.confirm.confirm({
      message: `Deactivate "${mis.acronym}" (${mis.environment || 'no environment'})? It leaves the active list and cannot be linked to new keys.${keysLine}`,
      header: 'Deactivate MIS',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Deactivate',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.deactivateMis(mis.id).subscribe({
          next: () => {
            this.messages.add({
              severity: 'success',
              summary: 'Deactivated',
              detail: `${mis.acronym} is now inactive. Switch the filter to «Inactive» to bring it back.`
            });
            this.loadMises();
          },
          error: err => this.toastError(err)
        });
      }
    });
  }

  confirmActivate(mis: MisRow): void {
    this.confirm.confirm({
      message: `Reactivate "${mis.acronym}" (${mis.environment || 'no environment'})?`,
      header: 'Reactivate MIS',
      acceptLabel: 'Reactivate',
      accept: () => {
        this.api.activateMis(mis.id).subscribe({
          next: () => {
            this.messages.add({
              severity: 'success',
              summary: 'Reactivated',
              detail: `${mis.acronym} is active again.`
            });
            this.loadMises();
          },
          error: err => this.toastError(err)
        });
      }
    });
  }

  // ------------------------------------------------------------ presentation

  lastUsed(mis: MisRow): string {
    if (this.activity === null) {
      return '…';
    }
    if (this.activityUnavailable) {
      return '—';
    }
    return relativeTime(mis.lastUsedAt);
  }

  lastUsedTitle(mis: MisRow): string {
    return this.activityUnavailable ? 'Not available' : absoluteTime(mis.lastUsedAt);
  }

  keysLabel(mis: MisRow): string {
    if (this.activity === null) {
      return '…';
    }
    if (this.activityUnavailable) {
      return '—';
    }
    const active = mis.activeKeys ?? 0;
    const total = mis.totalKeys ?? 0;
    if (!total) {
      return 'None';
    }
    return active === total ? `${active}` : `${active} of ${total}`;
  }

  private decorate(mis: MisRow): MisRow {
    const activity = this.activity?.get(mis.id);
    const lastUsedAt = activity?.last_used_at ?? null;
    return {
      ...mis,
      activeKeys: activity?.active_keys,
      totalKeys: activity?.total_keys,
      lastUsedAt,
      lastUsedTs: lastUsedAt ? new Date(lastUsedAt).getTime() : 0,
      searchText: [mis.acronym, mis.name, mis.environment, mis.environmentName].filter(Boolean).join(' ').toLowerCase()
    };
  }

  private normalizeMis(raw: MisApiResponse): MisRow {
    const env = raw.environment_object;
    return {
      id: raw.id,
      name: raw.name,
      acronym: raw.acronym,
      environment: raw.environment ?? env?.acronym,
      environmentName: env?.name,
      is_active: raw.is_active ?? raw.auditableFields?.is_active ?? true
    };
  }

  private normalizeUser(raw: any): UserOption {
    const id = Number(raw.id ?? raw.code ?? 0);
    const email = raw.email ?? raw.username ?? '';
    const name = [raw.first_name, raw.last_name].filter(Boolean).join(' ').trim();
    return {
      id,
      email,
      first_name: raw.first_name,
      last_name: raw.last_name,
      displayName: name || email || `User #${id}`
    };
  }

  private normalizeEnvironment(raw: any): EnvironmentOption {
    const acronym = raw.acronym ?? raw.code ?? '';
    const name = raw.name ?? '';
    return {
      acronym: String(acronym),
      name: String(name),
      label: name ? `${acronym} — ${name}` : String(acronym)
    };
  }

  private getLoggedInUserId(): number | null {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) {
        return null;
      }
      const user = JSON.parse(stored);
      const id = Number(user?.id ?? user?.code);
      return id > 0 ? id : null;
    } catch {
      return null;
    }
  }

  private toastError(err: any): void {
    const detail =
      err?.error?.message ?? err?.error?.response?.message ?? (typeof err?.error === 'string' ? err.error : null) ?? err?.message ?? 'Request failed';
    this.messages.add({
      severity: 'error',
      summary: 'Error',
      detail
    });
  }
}
