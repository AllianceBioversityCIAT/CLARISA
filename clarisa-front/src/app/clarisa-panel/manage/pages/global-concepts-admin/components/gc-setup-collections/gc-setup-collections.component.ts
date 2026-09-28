import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConceptCollection, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { apiErrorMessage } from '../../../glossary-admin/utils/api-error-message';
import { slugify } from '../../utils/custom-fields';
import { ConceptOption } from '../gc-concept-picker/gc-concept-picker.component';

interface MemberDraft {
  code: string;
  members: ConceptOption[];
}

/** Curated subsets of the scheme that do not touch the hierarchy (a glossary for one platform, a training pack). */
@Component({
  selector: 'app-gc-setup-collections',
  templateUrl: './gc-setup-collections.component.html',
  styleUrls: ['./gc-setup-collections.component.scss']
})
export class GcSetupCollectionsComponent implements OnInit, OnChanges {
  @Input() scheme = 'meliaf';
  @Input() conceptOptions: ConceptOption[] = [];

  loading = false;
  loadError: string | null = null;
  collections: ConceptCollection[] = [];

  /** One write at a time: `create`, `rename:<code>`, `members:<code>`, `delete:<code>`. */
  busy: string | null = null;
  error: { code: string | null; message: string } | null = null;

  creating = false;
  newLabel = '';
  newCode = '';
  newOrdered = false;
  private codeTouched = false;

  renaming: string | null = null;
  renameLabel = '';

  editingMembers: MemberDraft | null = null;

  constructor(
    private readonly _api: GlobalConceptsApiService,
    private readonly _messageService: MessageService,
    private readonly _confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scheme'] && !changes['scheme'].firstChange) this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = null;
    this._api.collections(this.scheme).subscribe({
      next: collections => {
        this.loading = false;
        this.collections = (Array.isArray(collections) ? collections : []).sort((a, b) => a.label.localeCompare(b.label));
      },
      error: error => {
        this.loading = false;
        this.loadError = apiErrorMessage(error, 'The collections could not be loaded');
      }
    });
  }

  private ok(summary: string, detail: string): void {
    this.busy = null;
    this._messageService.add({ severity: 'success', summary, detail });
  }

  private fail(code: string | null, error: unknown, fallback: string): void {
    this.busy = null;
    this.error = { code, message: apiErrorMessage(error, fallback) };
  }

  private replace(saved: ConceptCollection | null | undefined): void {
    if (!saved) return this.load();
    const exists = this.collections.some(c => c.code === saved.code);
    this.collections = (exists ? this.collections.map(c => (c.code === saved.code ? saved : c)) : [...this.collections, saved]).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }

  // --------------------------------------------------------------- create

  onNewLabel(label: string): void {
    if (!this.codeTouched) this.newCode = slugify(label).replace(/_/g, '-');
  }

  onNewCode(): void {
    this.codeTouched = true;
  }

  get createError(): string | null {
    if (!this.newLabel.trim()) return 'Give the collection a name.';
    if (!/^[a-z0-9][a-z0-9_-]{0,99}$/.test(this.newCode.trim())) return 'The code is lower-case letters, digits, - and _.';
    if (this.collections.some(c => c.code === this.newCode.trim())) return 'Another collection already uses this code.';
    return null;
  }

  create(): void {
    if (this.busy || this.createError) return;
    this.busy = 'create';
    this.error = null;
    this._api.createCollection(this.scheme, { code: this.newCode.trim(), label: this.newLabel.trim(), ordered: this.newOrdered }).subscribe({
      next: saved => {
        this.ok('Collection created', `${saved?.label ?? this.newLabel}. Add its concepts now.`);
        this.replace(saved);
        this.creating = false;
        this.newLabel = '';
        this.newCode = '';
        this.newOrdered = false;
        this.codeTouched = false;
        if (saved) this.startMembers(saved);
      },
      error: error => this.fail(null, error, 'The collection could not be created')
    });
  }

  // --------------------------------------------------------------- rename

  startRename(collection: ConceptCollection): void {
    this.renaming = collection.code;
    this.renameLabel = collection.label;
  }

  rename(collection: ConceptCollection): void {
    const label = this.renameLabel.trim();
    if (this.busy || !label) return;
    if (label === collection.label) {
      this.renaming = null;
      return;
    }
    this.busy = `rename:${collection.code}`;
    this.error = null;
    this._api.updateCollection(this.scheme, collection.code, { label }).subscribe({
      next: saved => {
        this.ok('Collection renamed', label);
        this.renaming = null;
        this.replace(saved);
      },
      error: error => this.fail(collection.code, error, 'The collection could not be renamed')
    });
  }

  // -------------------------------------------------------------- members

  startMembers(collection: ConceptCollection): void {
    this.editingMembers = {
      code: collection.code,
      members: (collection.members ?? []).map(m => ({ term_id: m.term_id, preferred_label: m.preferred_label, status: m.status }))
    };
  }

  addMember(option: ConceptOption): void {
    if (!this.editingMembers || this.editingMembers.members.some(m => m.term_id === option.term_id)) return;
    this.editingMembers = { ...this.editingMembers, members: [...this.editingMembers.members, option] };
  }

  removeMember(termId: number): void {
    if (!this.editingMembers) return;
    this.editingMembers = { ...this.editingMembers, members: this.editingMembers.members.filter(m => m.term_id !== termId) };
  }

  memberIds(): number[] {
    return (this.editingMembers?.members ?? []).map(m => m.term_id);
  }

  membersDirty(collection: ConceptCollection): boolean {
    return this.memberIds().join(',') !== (collection.members ?? []).map(m => m.term_id).join(',');
  }

  saveMembers(collection: ConceptCollection): void {
    if (this.busy || !this.editingMembers) return;
    const ids = this.memberIds();
    this.busy = `members:${collection.code}`;
    this.error = null;
    this._api.setCollectionMembers(this.scheme, collection.code, ids).subscribe({
      next: saved => {
        this.ok('Members saved', `${collection.label}: ${ids.length} concept(s).`);
        this.editingMembers = null;
        this.replace(saved);
      },
      error: error => this.fail(collection.code, error, 'The members could not be saved')
    });
  }

  // --------------------------------------------------------------- delete

  remove(collection: ConceptCollection): void {
    if (this.busy) return;
    this._confirmationService.confirm({
      header: `Delete “${collection.label}”?`,
      message: `The collection and its ${collection.members?.length ?? 0} membership(s) go away. The concepts themselves are not touched.`,
      acceptLabel: 'Delete collection',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'btn-caution',
      rejectButtonStyleClass: 'btn-ghost',
      accept: () => {
        if (this.busy) return;
        this.busy = `delete:${collection.code}`;
        this.error = null;
        this._api.deleteCollection(this.scheme, collection.code).subscribe({
          next: () => {
            this.ok('Collection deleted', collection.label);
            this.collections = this.collections.filter(c => c.code !== collection.code);
            if (this.editingMembers?.code === collection.code) this.editingMembers = null;
          },
          error: error => this.fail(collection.code, error, 'The collection could not be deleted')
        });
      }
    });
  }

  isBusy(key: string): boolean {
    return this.busy === key;
  }
}
