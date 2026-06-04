import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ManageApiService } from '../../../../services/manage-api.service';
import { matchDropdownPanelToTrigger } from '../../../../utils/dropdown-panel-width';

interface MisApiResponse {
  id: number;
  name: string;
  acronym: string;
  environment?: string;
  environment_object?: { acronym?: string; name?: string };
  auditableFields?: { is_active?: boolean };
  is_active?: boolean;
}

interface MisRow {
  id: number;
  name: string;
  acronym: string;
  environment?: string;
  environmentName?: string;
  is_active?: boolean;
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
  styleUrls: ['./mises-panel.component.scss'],
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

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: ManageApiService,
    private messages: MessageService,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      acronym: [
        '',
        [
          Validators.required,
          Validators.maxLength(50),
          Validators.pattern(/^[A-Za-z0-9_-]+$/),
        ],
      ],
      contact_point_id: [null, Validators.required],
      environment: [null, Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadMises();
    this.loadUsers();
    this.loadEnvironments();
  }

  loadMises(): void {
    this.loading = true;
    const show =
      this.showFilter === 'active' ? undefined : this.showFilter;
    this.api.getAllMis(show).subscribe({
      next: (resp: any) => {
        const list: MisApiResponse[] = Array.isArray(resp) ? resp : [];
        this.mises = list.map((mis) => this.normalizeMis(mis));
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toastError(err);
      },
    });
  }

  loadUsers(): void {
    this.usersLoading = true;
    this.api.getAllUser().subscribe({
      next: (resp: any) => {
        const list = Array.isArray(resp) ? resp : [];
        this.users = list
          .map((u: any) => this.normalizeUser(u))
          .filter((u: UserOption) => u.id > 0);
        this.usersLoading = false;
      },
      error: () => {
        this.usersLoading = false;
        this.messages.add({
          severity: 'warn',
          summary: 'Users',
          detail: 'Could not load users for contact point selection.',
        });
      },
    });
  }

  loadEnvironments(): void {
    this.environmentsLoading = true;
    this.api.getAllEnvironments().subscribe({
      next: (resp: any) => {
        const list = Array.isArray(resp) ? resp : [];
        this.environments = list
          .map((e: any) => this.normalizeEnvironment(e))
          .filter((e: EnvironmentOption) => !!e.acronym);
        this.environmentsLoading = false;
      },
      error: () => {
        this.environmentsLoading = false;
        this.messages.add({
          severity: 'warn',
          summary: 'Environments',
          detail: 'Could not load environments.',
        });
      },
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
      environment: null,
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
        environment: raw.environment,
      })
      .subscribe({
        next: (resp: any) => {
          this.submitting = false;
          this.createVisible = false;
          const created = resp?.response ?? resp;
          const label = created?.acronym
            ? `${created.acronym} (${created.environment ?? raw.environment})`
            : raw.acronym;
          this.messages.add({
            severity: 'success',
            summary: 'MIS created',
            detail:
              resp?.message ?? `Microservice "${label}" registered successfully.`,
          });
          this.loadMises();
        },
        error: (err) => {
          this.submitting = false;
          this.toastError(err);
        },
      });
  }

  private normalizeMis(raw: MisApiResponse): MisRow {
    const env = raw.environment_object;
    return {
      id: raw.id,
      name: raw.name,
      acronym: raw.acronym,
      environment: raw.environment ?? env?.acronym,
      environmentName: env?.name,
      is_active: raw.is_active ?? raw.auditableFields?.is_active ?? true,
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
      displayName: name || email || `User #${id}`,
    };
  }

  private normalizeEnvironment(raw: any): EnvironmentOption {
    const acronym = raw.acronym ?? raw.code ?? '';
    const name = raw.name ?? '';
    return {
      acronym: String(acronym),
      name: String(name),
      label: name ? `${acronym} — ${name}` : String(acronym),
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
      err?.error?.message ??
      err?.error?.response?.message ??
      (typeof err?.error === 'string' ? err.error : null) ??
      err?.message ??
      'Request failed';
    this.messages.add({
      severity: 'error',
      summary: 'Error',
      detail,
    });
  }
}
