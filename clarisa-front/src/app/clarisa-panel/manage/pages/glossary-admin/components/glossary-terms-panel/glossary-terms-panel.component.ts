import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { GlossaryAdminTerm, GlossaryPortfolioRef, ManageApiService } from '../../../../services/manage-api.service';
import { matchDropdownPanelToTrigger } from '../../../../utils/dropdown-panel-width';
import { apiErrorMessage } from '../../utils/api-error-message';

interface PortfolioOption {
  label: string;
  value: number;
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
  filteredTerms: GlossaryAdminTerm[] = [];
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

  /** Terms with no portfolio linked, and how many of those are active. */
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
      },
      error: error => this.toastError(error)
    });
  }

  // --------------------------------------------------------------- filters

  applyFilters(): void {
    const needle = this.search.trim().toLowerCase();

    this.filteredTerms = this.terms.filter(term => {
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
    });
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
      show_in_dashboard: !!value.show_in_dashboard
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
