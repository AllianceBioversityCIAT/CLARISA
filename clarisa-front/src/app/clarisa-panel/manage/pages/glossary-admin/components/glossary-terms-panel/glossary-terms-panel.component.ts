import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { GlossaryAdminTerm, GlossaryPortfolioRef, ManageApiService } from '../../../../services/manage-api.service';
import { Observable } from 'rxjs';
import { matchDropdownPanelToTrigger } from '../../../../utils/dropdown-panel-width';
import { apiErrorMessage } from '../../utils/api-error-message';

interface PortfolioOption {
  label: string;
  value: number;
}

/**
 * A concept as the table shows it: one line, however many versions it has.
 *
 * Two rows with the same name and one portfolio each read as duplicates; what
 * they are is one term defined differently per portfolio. The line carries the
 * most recent version and opens into the rest.
 */
interface GlossaryConcept {
  key: number;
  /** The version of the newest portfolio — the one the line shows. */
  current: GlossaryAdminTerm;
  versions: GlossaryAdminTerm[];
  /** Every portfolio the concept covers, newest first. */
  portfolios: GlossaryPortfolioRef[];
}

@Component({
  selector: 'app-glossary-terms-panel',
  templateUrl: './glossary-terms-panel.component.html',
  styleUrls: ['./glossary-terms-panel.component.scss']
})
export class GlossaryTermsPanelComponent implements OnInit, OnChanges {
  /** Changing this value forces a reload (used after a bulk import). */
  @Input() reloadToken = 0;

  terms: GlossaryAdminTerm[] = [];
  /** One entry per concept; the table renders these, not the raw records. */
  concepts: GlossaryConcept[] = [];
  filteredTerms: GlossaryConcept[] = [];
  /** Real portfolios. Used by the edit dialog, so it never carries a sentinel. */
  portfolioOptions: PortfolioOption[] = [];
  /** The same list plus the "no portfolio" entry, used only by the filter. */
  portfolioFilterOptions: PortfolioOption[] = [];

  /**
   * Sentinel for the filter that lists the terms with no portfolio linked.
   *
   * Negative on purpose: portfolio ids are positive, so it can never collide
   * with a real one, and it lives only in `portfolioFilterOptions` — the
   * dialog's multiselect keeps using `portfolioOptions`, so this value can
   * never be saved as a portfolio.
   */
  readonly NO_PORTFOLIO = -1;

  /**
   * Terms with no portfolio linked, and how many of those are active.
   *
   * Only the active ones are worth a warning: the 2023 glossary replacement
   * left ~240 deactivated rows with no portfolio in every environment, and
   * counting those would turn the notice into permanent noise. They stay
   * reachable through the filter.
   */
  unassignedCount = 0;
  unassignedActiveCount = 0;

  loading = false;
  saving = false;

  search = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  portfolioFilter: number | null = null;

  readonly statusOptions = [
    { label: 'All statuses', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' }
  ];

  dialogVisible = false;
  editingTerm: GlossaryAdminTerm | null = null;
  form: FormGroup;

  /** Versions dialog: the concept being looked at and its rows. */
  versionsVisible = false;
  versionsAnchor: GlossaryAdminTerm | null = null;
  /**
   * Everything the dialogs read is a field, not a getter.
   *
   * Angular re-evaluates a getter on every change detection pass, and these
   * returned a **new array** each time: the table asked for the version count
   * of all ~300 terms on every pass (300 scans of 300 rows), the dialog ran a
   * nested `*ngFor` over two freshly built arrays, and the relate dropdown
   * rebuilt and re-sorted 300 labels on every keystroke of its own filter —
   * which is where it froze. They are computed once, on the events that
   * actually change them.
   */
  versionsInDialog: GlossaryAdminTerm[] = [];
  relateOptions: { label: string; value: number }[] = [];
  splitPortfolioOptions: PortfolioOption[] = [];
  /** Rows per concept, so the badge of a table row is a lookup and not a scan. */
  private versionsByGroup = new Map<number, number>();
  /** Start year per portfolio, to tell which version is the current one. */
  private portfolioStartYear = new Map<number, number>();

  /** Split dialog: the row whose portfolios are being separated. */
  splitVisible = false;
  splitSource: GlossaryAdminTerm | null = null;
  splitForm: FormGroup;

  /** Relate dialog: the term that is about to join this concept. */
  relateVisible = false;
  relateTargetId: number | null = null;

  constructor(
    private readonly _manageApiService: ManageApiService,
    private readonly _formBuilder: FormBuilder,
    private readonly _messageService: MessageService,
    private readonly _confirmationService: ConfirmationService
  ) {
    this.form = this._formBuilder.group({
      term: ['', [Validators.required, Validators.maxLength(500)]],
      definition: ['', [Validators.required]],
      source: ['', [Validators.maxLength(500)]],
      source_url: ['', [Validators.maxLength(500)]],
      // The API only accepts `YYYY-MM-DD`; the pattern rejects a mistyped day
      // here instead of letting the request come back a 400.
      reference_date: ['', [Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
      portfolio_ids: [[] as number[]],
      show_in_dashboard: [false]
    });

    this.splitForm = this._formBuilder.group({
      portfolio_ids: [[] as number[], [Validators.required]],
      definition: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadPortfolios();
    this.loadTerms();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reloadToken'] && !changes['reloadToken'].firstChange) {
      this.loadTerms();
    }
  }

  // ------------------------------------------------------------------ data

  loadTerms(): void {
    this.loading = true;
    this._manageApiService.getGlossaryTerms('all').subscribe({
      next: response => {
        this.terms = Array.isArray(response) ? response : [];
        this.countVersions();
        this.buildConcepts();
        this.countUnassigned();
        this.applyFilters();
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.toastError(error);
      }
    });
  }

  private loadPortfolios(): void {
    this._manageApiService.getAllPortfolios().subscribe({
      next: (response: any) => {
        const list = Array.isArray(response) ? response : [];
        // The portfolios endpoint returns a BasicDto, so the id travels as `code`.
        this.portfolioOptions = list.map(portfolio => {
          const closed = portfolio.is_active === false || portfolio.is_active === 0;
          const name = portfolio.acronym ? `${portfolio.acronym} — ${portfolio.name}` : portfolio.name;
          return {
            label: closed ? `${name} (closed)` : name,
            value: Number(portfolio.code ?? portfolio.id)
          };
        });
        this.portfolioFilterOptions = [{ label: 'No portfolio linked', value: this.NO_PORTFOLIO }, ...this.portfolioOptions];
        this.portfolioStartYear = new Map(
          list
            .filter(portfolio => typeof portfolio.start_date === 'number')
            .map(portfolio => [Number(portfolio.code ?? portfolio.id), portfolio.start_date])
        );
        this.buildConcepts();
        this.applyFilters();
      },
      error: error => this.toastError(error)
    });
  }

  // --------------------------------------------------------------- filters

  /**
   * Turns the records into concepts: one line per group, showing the version of
   * the newest portfolio. A record that was never related is a concept with a
   * single version, so it renders exactly as it did before.
   */
  private buildConcepts(): void {
    const byGroup = new Map<number, GlossaryAdminTerm[]>();
    for (const term of this.terms) {
      byGroup.set(term.group_id, [...(byGroup.get(term.group_id) ?? []), term]);
    }

    this.concepts = [...byGroup.entries()]
      .map(([key, versions]) => ({
        key,
        versions: [...versions].sort((a, b) => this.recencyOf(b) - this.recencyOf(a) || a.id - b.id),
        current: versions.reduce((newest, version) => (this.recencyOf(version) > this.recencyOf(newest) ? version : newest), versions[0]),
        portfolios: this.portfoliosOf(versions)
      }))
      .sort((a, b) => a.current.term.localeCompare(b.current.term, 'en'));
  }

  /** The newest portfolio a record covers; 0 when none of them has a year. */
  private recencyOf(term: GlossaryAdminTerm): number {
    return (term.portfolios ?? []).reduce((newest, portfolio) => Math.max(newest, this.portfolioStartYear.get(portfolio.id) ?? 0), 0);
  }

  /** Every portfolio of the concept, newest first, without repeating one. */
  private portfoliosOf(versions: GlossaryAdminTerm[]): GlossaryPortfolioRef[] {
    const byId = new Map<number, GlossaryPortfolioRef>();
    for (const version of versions) {
      for (const portfolio of version.portfolios ?? []) {
        byId.set(portfolio.id, portfolio);
      }
    }
    return [...byId.values()].sort((a, b) => (this.portfolioStartYear.get(b.id) ?? 0) - (this.portfolioStartYear.get(a.id) ?? 0));
  }

  /** A concept stays when **any** of its versions matches the filters. */
  applyFilters(): void {
    const needle = this.search.trim().toLowerCase();

    const matches = (term: GlossaryAdminTerm): boolean => {
      if (this.statusFilter === 'active' && !term.is_active) {
        return false;
      }
      if (this.statusFilter === 'inactive' && term.is_active) {
        return false;
      }
      if (this.portfolioFilter === this.NO_PORTFOLIO) {
        if (term.portfolios?.length) {
          return false;
        }
      } else if (this.portfolioFilter !== null && !term.portfolios.some(portfolio => portfolio.id === this.portfolioFilter)) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return `${term.term} ${term.definition}`.toLowerCase().includes(needle);
    };

    this.filteredTerms = this.concepts.filter(concept => concept.versions.some(matches));
  }

  /**
   * A term with no row in `glossary_portfolios` is invisible on the public page:
   * it opens filtered by the current portfolio, so an unlinked term only shows
   * under "All portfolios". Rows written straight into the database arrive like
   * this, so the panel counts them and offers to list them.
   */
  private countUnassigned(): void {
    const unassigned = this.terms.filter(term => !term.portfolios?.length);
    this.unassignedCount = unassigned.length;
    this.unassignedActiveCount = unassigned.filter(term => term.is_active).length;
  }

  /** Lists every term with no portfolio, active and inactive alike. */
  showUnassigned(): void {
    this.search = '';
    this.statusFilter = 'all';
    this.portfolioFilter = this.NO_PORTFOLIO;
    this.applyFilters();
  }

  clearFilters(): void {
    this.search = '';
    this.statusFilter = 'all';
    this.portfolioFilter = null;
    this.applyFilters();
  }

  onDropdownShow(event: any): void {
    matchDropdownPanelToTrigger(event);
  }

  // ---------------------------------------------------------------- dialog

  openCreate(): void {
    this.editingTerm = null;
    this.groupOfForNewTerm = null;
    this.form.reset({
      term: '',
      definition: '',
      source: '',
      source_url: '',
      reference_date: '',
      portfolio_ids: [],
      show_in_dashboard: false
    });
    this.dialogVisible = true;
  }

  openEdit(term: GlossaryAdminTerm): void {
    this.editingTerm = term;
    this.form.reset({
      term: term.term,
      definition: term.definition,
      source: term.source ?? '',
      source_url: term.source_url ?? '',
      reference_date: term.reference_date ?? '',
      portfolio_ids: term.portfolios.map(portfolio => portfolio.id),
      show_in_dashboard: term.show_in_dashboard
    });
    this.dialogVisible = true;
  }

  closeDialog(): void {
    this.dialogVisible = false;
    this.editingTerm = null;
    this.groupOfForNewTerm = null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    // The three provenance fields are always sent, empty string included: that
    // is how the API is told to clear a source entered by mistake. Omitting
    // them would leave the stored value untouched forever.
    const body = {
      term: (value.term ?? '').trim(),
      definition: (value.definition ?? '').trim(),
      source: (value.source ?? '').trim(),
      source_url: (value.source_url ?? '').trim(),
      reference_date: (value.reference_date ?? '').trim(),
      portfolio_ids: value.portfolio_ids ?? [],
      show_in_dashboard: !!value.show_in_dashboard,
      ...(this.editingTerm || this.groupOfForNewTerm === null ? {} : { group_of: this.groupOfForNewTerm })
    };

    this.saving = true;

    const request$ = this.editingTerm
      ? this._manageApiService.updateGlossaryTerm(this.editingTerm.id, body)
      : this._manageApiService.createGlossaryTerm(body);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this._messageService.add({
          severity: 'success',
          summary: this.editingTerm ? 'Term updated' : 'Term created',
          detail: `"${body.term}" was saved successfully`
        });
        this.closeDialog();
        this.loadTerms();
      },
      error: error => {
        this.saving = false;
        this.toastError(error);
      }
    });
  }

  toggleStatus(term: GlossaryAdminTerm): void {
    const nextState = !term.is_active;

    this._confirmationService.confirm({
      header: nextState ? 'Activate term' : 'Deactivate term',
      message: nextState
        ? `Activate "${term.term}"? It will show up again in the public glossary.`
        : `Deactivate "${term.term}"? It will stop showing in the public glossary, but nothing is deleted.`,
      acceptLabel: nextState ? 'Activate' : 'Deactivate',
      acceptButtonStyleClass: nextState ? 'p-button-success' : 'p-button-danger',
      accept: () => {
        this._manageApiService.setGlossaryTermStatus(term.id, nextState).subscribe({
          next: () => {
            this._messageService.add({
              severity: 'success',
              summary: nextState ? 'Term activated' : 'Term deactivated',
              detail: `"${term.term}" was updated`
            });
            this.loadTerms();
          },
          error: error => this.toastError(error)
        });
      }
    });
  }

  // --------------------------------------------------------------- versions

  /**
   * The rows that are versions of the same concept.
   *
   * Grouped by `group_id` and not by title: the two pairs that need it in
   * production differ by a non-breaking space in the term, so matching the
   * strings would leave them apart exactly where it matters.
   */
  versionsOf(term: GlossaryAdminTerm): GlossaryAdminTerm[] {
    return this.terms.filter(candidate => candidate.group_id === term.group_id).sort((a, b) => a.id - b.id);
  }

  /** One pass over the terms, so each row's badge costs a map lookup. */
  private countVersions(): void {
    this.versionsByGroup = new Map<number, number>();
    for (const term of this.terms) {
      this.versionsByGroup.set(term.group_id, (this.versionsByGroup.get(term.group_id) ?? 0) + 1);
    }
  }

  versionCount(term: GlossaryAdminTerm): number {
    return this.versionsByGroup.get(term.group_id) ?? 1;
  }

  openVersions(term: GlossaryAdminTerm): void {
    this.versionsAnchor = term;
    this.versionsInDialog = this.versionsOf(term);
    this.relateVisible = false;
    this.relateOptions = [];
    this.versionsVisible = true;
  }

  closeVersions(): void {
    this.versionsVisible = false;
    this.versionsAnchor = null;
    this.versionsInDialog = [];
    this.relateOptions = [];
  }

  /** Adds the version of this concept for a portfolio no version covers yet. */
  addVersion(): void {
    if (!this.versionsAnchor) {
      return;
    }
    const anchor = this.versionsAnchor;
    this.editingTerm = null;
    this.form.reset({
      term: anchor.term,
      definition: '',
      source: anchor.source ?? '',
      source_url: anchor.source_url ?? '',
      reference_date: anchor.reference_date ?? '',
      portfolio_ids: [],
      show_in_dashboard: anchor.show_in_dashboard
    });
    this.groupOfForNewTerm = anchor.id;
    this.versionsVisible = false;
    this.dialogVisible = true;
  }

  /** Set while the create dialog is adding a version to an existing concept. */
  private groupOfForNewTerm: number | null = null;

  /** Only the portfolios the record holds can move to the new version. */
  openSplit(term: GlossaryAdminTerm): void {
    this.splitSource = term;
    this.splitPortfolioOptions = term.portfolios.map(portfolio => ({
      label: this.portfolioLabel(portfolio),
      value: portfolio.id
    }));
    this.splitForm.reset({ portfolio_ids: [], definition: term.definition });
    this.versionsVisible = false;
    this.splitVisible = true;
  }

  closeSplit(): void {
    this.splitVisible = false;
    this.splitSource = null;
  }

  submitSplit(): void {
    if (this.splitForm.invalid || !this.splitSource) {
      this.splitForm.markAllAsTouched();
      return;
    }

    const value = this.splitForm.value;
    this.runAndReload(
      this._manageApiService.splitGlossaryTerm(this.splitSource.id, {
        portfolio_ids: value.portfolio_ids ?? [],
        definition: (value.definition ?? '').trim()
      }),
      'Version created',
      `"${this.splitSource.term}" now has its own definition for the portfolios you moved`,
      () => this.closeSplit()
    );
  }

  /**
   * Builds the terms that can join this concept — everything outside it — once,
   * when the picker opens. The dropdown then filters that array in place;
   * rebuilding it underneath its own filter is what hung the dialog.
   */
  openRelate(): void {
    this.relateTargetId = null;
    const groupId = this.versionsAnchor?.group_id;
    this.relateOptions = this.terms
      .filter(term => term.group_id !== groupId)
      .map(term => ({
        label: `${term.term} — ${term.portfolios.map(p => this.portfolioLabel(p)).join(', ') || 'no portfolio'}${
          term.is_active ? '' : ' (inactive)'
        }`,
        value: term.id
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'en'));
    this.relateVisible = true;
  }

  submitRelate(): void {
    if (!this.relateTargetId || !this.versionsAnchor) {
      return;
    }
    this.runAndReload(
      this._manageApiService.groupGlossaryTerm(this.relateTargetId, this.versionsAnchor.id),
      'Terms related',
      'Both rows are now versions of the same concept',
      () => (this.relateVisible = false)
    );
  }

  unrelate(term: GlossaryAdminTerm): void {
    this._confirmationService.confirm({
      header: 'Separate this version',
      message: `"${term.term}" will stop being a version of this concept. Nothing is deleted.`,
      acceptLabel: 'Separate',
      accept: () =>
        this.runAndReload(this._manageApiService.ungroupGlossaryTerm(term.id), 'Version separated', `"${term.term}" now stands on its own`)
    });
  }

  merge(term: GlossaryAdminTerm, into: GlossaryAdminTerm): void {
    this._confirmationService.confirm({
      header: 'Merge versions',
      message:
        `The portfolios of record ${term.id} move to record ${into.id}, which keeps its own definition. ` +
        `Record ${term.id} is deactivated — not deleted — so this can be undone.`,
      acceptLabel: 'Merge',
      accept: () =>
        this.runAndReload(
          this._manageApiService.mergeGlossaryTerm(term.id, into.id),
          'Versions merged',
          `Record ${term.id} was deactivated and its portfolios moved`
        )
    });
  }

  /** Every version action ends the same way: toast, reload, close. */
  private runAndReload(request$: Observable<unknown>, summary: string, detail: string, onDone?: () => void): void {
    this.saving = true;
    request$.subscribe({
      next: () => {
        this.saving = false;
        this._messageService.add({ severity: 'success', summary, detail });
        onDone?.();
        this.closeVersions();
        this.loadTerms();
      },
      error: error => {
        this.saving = false;
        this.toastError(error);
      }
    });
  }

  // ---------------------------------------------------------------- helpers

  portfolioLabel(portfolio: GlossaryPortfolioRef): string {
    return portfolio.acronym || portfolio.name;
  }

  get dialogTitle(): string {
    return this.editingTerm ? 'Edit term' : 'New term';
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  private toastError(error: any): void {
    this._messageService.add({ severity: 'error', summary: 'Error', detail: apiErrorMessage(error) });
  }
}
