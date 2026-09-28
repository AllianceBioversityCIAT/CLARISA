import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output } from '@angular/core';
import { FacetCode, FacetView, FilterChip, SORTS, SortCode } from '../../global-concepts.filters';

/**
 * The filter bar of the public list: one dropdown per facet (checkboxes with
 * their live count), sort, "Include deprecated" and the active chips. On a
 * phone the facets fold into one "Filters (n)" button that opens a bottom
 * sheet. Stateless: the list page owns the state (and the URL) and this
 * component only reports what the reader asked for.
 */
@Component({
  selector: 'app-gc-facet-bar',
  templateUrl: './facet-bar.component.html',
  styleUrls: ['./facet-bar.component.scss'],
  host: { class: 'gc-kit' }
})
export class FacetBarComponent implements OnDestroy {
  @Input() facets: FacetView[] = [];
  @Input() chips: FilterChip[] = [];
  @Input() sort: SortCode = 'az';
  @Input() deprecated = false;
  /** Ticked facet values, for the phone button. */
  @Input() selected = 0;
  /** Results with the current filters, for the sheet's confirm button. */
  @Input() resultCount = 0;

  @Output() toggleValue = new EventEmitter<{ code: FacetCode; value: string }>();
  @Output() clearFacet = new EventEmitter<FacetCode>();
  @Output() sortChange = new EventEmitter<SortCode>();
  @Output() deprecatedChange = new EventEmitter<boolean>();
  @Output() removeChip = new EventEmitter<FilterChip>();
  @Output() clearAll = new EventEmitter<void>();

  readonly sorts = SORTS;
  openFacet: FacetCode | null = null;
  sheetOpen = false;

  constructor(private _host: ElementRef<HTMLElement>) {}

  ngOnDestroy(): void {
    this.lockScroll(false);
  }

  toggleDropdown(code: FacetCode): void {
    this.openFacet = this.openFacet === code ? null : code;
  }

  openSheet(): void {
    this.openFacet = null;
    this.sheetOpen = true;
    this.lockScroll(true);
    setTimeout(() => this._host.nativeElement.querySelector<HTMLElement>('.gc-sheet__title')?.focus());
  }

  closeSheet(): void {
    if (!this.sheetOpen) return;
    this.sheetOpen = false;
    this.lockScroll(false);
    setTimeout(() => this._host.nativeElement.querySelector<HTMLElement>('.gc-fb__phone-btn')?.focus());
  }

  toggleSheet(): void {
    this.sheetOpen ? this.closeSheet() : this.openSheet();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.openFacet) return;
    // A click inside any dropdown (its panel, or another facet's button that
    // just switched `openFacet`) is handled there; only a click elsewhere closes.
    const target = event.target as Element | null;
    const inside = target && typeof target.closest === 'function' ? target.closest('.gc-dd') : null;
    if (!inside || !this._host.nativeElement.contains(inside)) this.openFacet = null;
  }

  /** The sheet only exists on a phone; widening the window with it open would leave the page locked. */
  @HostListener('window:resize')
  onResize(): void {
    if (this.sheetOpen && window.innerWidth > 767) this.closeSheet();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.sheetOpen) this.closeSheet();
    else this.openFacet = null;
  }

  facetLabel(code: FacetCode): string {
    return this.facets.find(f => f.code === code)?.label ?? code;
  }

  trackByCode(_: number, facet: FacetView): string {
    return facet.code;
  }

  trackByValue(_: number, option: { value: string }): string {
    return option.value;
  }

  /** The page behind the sheet must not scroll under the reader's thumb. */
  private lockScroll(on: boolean): void {
    try {
      document.body.style.overflow = on ? 'hidden' : '';
    } catch {
      // No document (server render): nothing to lock.
    }
  }
}
