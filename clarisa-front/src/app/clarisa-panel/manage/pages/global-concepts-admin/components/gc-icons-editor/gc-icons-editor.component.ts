import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AdminIcon, GlobalConceptsApiService, IconInput } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { apiErrorMessage } from '../../../glossary-admin/utils/api-error-message';
import { emptyIconForm, ICON_STATUS_FALLBACK, iconBody, iconFormError, iconFormFrom, IconForm, isHttpUrl } from '../../utils/concept-editor';
import { ListOption, listLabel } from '../../utils/list-values';
import { FIELD_INFO } from '../../utils/field-info';

/** The icons attached to one concept (contract v2 § 1). The term stays the record; an icon hangs from it. */
@Component({
  selector: 'app-gc-icons-editor',
  templateUrl: './gc-icons-editor.component.html',
  styleUrls: ['./gc-icons-editor.component.scss']
})
export class GcIconsEditorComponent implements OnInit {
  @Input() scheme = 'concepts';
  @Input() termId: number | null = null;
  @Input() conceptLabel = '';
  @Input() lists: Record<string, ListOption[]> = {};
  /** Tells the dialog something was written, so the table (Has icon filter) reloads on close. */
  @Output() changed = new EventEmitter<void>();
  readonly info = FIELD_INFO.icon;

  loading = false;
  loadError: string | null = null;
  icons: AdminIcon[] = [];

  /** `null` = no form open; `0` = a new icon; otherwise the id being edited. */
  editingId: number | null = null;
  form: IconForm = emptyIconForm();
  private original: IconForm | null = null;
  saving = false;
  saveError: string | null = null;
  deletingId: number | null = null;
  /** Previews that failed to load show the placeholder instead of a broken image. */
  broken = new Set<number>();

  constructor(
    private readonly _api: GlobalConceptsApiService,
    private readonly _messageService: MessageService,
    private readonly _confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.termId) return;
    this.loading = true;
    this.loadError = null;
    this._api.icons(this.scheme, this.termId).subscribe({
      next: icons => {
        this.loading = false;
        this.icons = Array.isArray(icons) ? icons : [];
      },
      error: error => {
        this.loading = false;
        this.loadError = apiErrorMessage(error, 'The icons could not be loaded');
      }
    });
  }

  get statusOptions(): ListOption[] {
    return this.lists['icon_status']?.length ? this.lists['icon_status'] : ICON_STATUS_FALLBACK;
  }

  get formatOptions(): ListOption[] {
    return this.lists['icon_format'] ?? [];
  }

  statusLabel(value: string | null | undefined): string {
    return value ? this.statusOptions.find(option => option.value === value)?.label ?? value : '—';
  }

  formatLabel(value: string | null | undefined): string {
    return listLabel(this.lists, 'icon_format', value);
  }

  previewUrl(icon: AdminIcon): string | null {
    return isHttpUrl(icon.file_link_primary) && !this.broken.has(icon.id) ? (icon.file_link_primary as string).trim() : null;
  }

  get formPreview(): string | null {
    return isHttpUrl(this.form.file_link_primary) ? this.form.file_link_primary.trim() : null;
  }

  get formError(): string | null {
    return iconFormError(this.form);
  }

  get altRequired(): boolean {
    return this.form.icon_status === 'final';
  }

  openNew(): void {
    this.editingId = 0;
    this.form = { ...emptyIconForm(), date_added: new Date().toISOString().slice(0, 10) };
    this.original = null;
    this.saveError = null;
  }

  openEdit(icon: AdminIcon): void {
    this.editingId = icon.id;
    this.form = iconFormFrom(icon);
    this.original = iconFormFrom(icon);
    this.saveError = null;
  }

  cancel(): void {
    if (this.saving) return;
    this.editingId = null;
  }

  get dirty(): boolean {
    return Object.keys(iconBody(this.form, this.original)).length > 0;
  }

  save(): void {
    if (!this.termId || this.saving || this.formError || this.editingId === null) return;
    const body = iconBody(this.form, this.original);
    if (this.editingId && !Object.keys(body).length) {
      this.editingId = null;
      return;
    }
    this.saving = true;
    this.saveError = null;
    const request = this.editingId
      ? this._api.updateIcon(this.scheme, this.termId, this.editingId, body)
      : this._api.createIcon(this.scheme, this.termId, body as IconInput);
    request.subscribe({
      next: icon => {
        this.saving = false;
        const creating = !this.editingId;
        this.editingId = null;
        this.icons = creating ? [...this.icons, icon] : this.icons.map(existing => (existing.id === icon.id ? icon : existing));
        this.broken.delete(icon.id);
        this._messageService.add({ severity: 'success', summary: creating ? 'Icon added' : 'Icon updated', detail: icon.icon_code || this.conceptLabel });
        this.changed.emit();
      },
      error: error => {
        this.saving = false;
        this.saveError = apiErrorMessage(error, 'The icon could not be saved');
      }
    });
  }

  remove(icon: AdminIcon): void {
    const termId = this.termId;
    if (this.deletingId || !termId) return;
    this._confirmationService.confirm({
      header: 'Delete this icon?',
      message: `${icon.icon_code || 'The icon'} is detached from “${this.conceptLabel}”. The file itself stays where it is hosted.`,
      acceptLabel: 'Delete icon',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'btn-caution',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => {
        this.deletingId = icon.id;
        this._api.deleteIcon(this.scheme, termId, icon.id).subscribe({
          next: () => {
            this.deletingId = null;
            this.icons = this.icons.filter(existing => existing.id !== icon.id);
            if (this.editingId === icon.id) this.editingId = null;
            this._messageService.add({ severity: 'success', summary: 'Icon deleted', detail: icon.icon_code || this.conceptLabel });
            this.changed.emit();
          },
          error: error => {
            this.deletingId = null;
            this._messageService.add({ severity: 'error', summary: 'Error', detail: apiErrorMessage(error, 'The icon could not be deleted') });
          }
        });
      }
    });
  }

  onPreviewError(icon: AdminIcon): void {
    this.broken.add(icon.id);
  }
}
