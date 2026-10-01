import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { ConceptOption } from '../gc-concept-picker/gc-concept-picker.component';

export type SetupSection = 'fields' | 'lists' | 'collections';

/** How the scheme is configured: its own fields, its controlled lists and its collections. */
@Component({
  selector: 'app-gc-setup-panel',
  templateUrl: './gc-setup-panel.component.html',
  styleUrls: ['./gc-setup-panel.component.scss']
})
export class GcSetupPanelComponent implements OnInit, OnChanges {
  @Input() scheme = 'meliaf';

  section: SetupSection = 'fields';
  readonly sections: { id: SetupSection; label: string; icon: string }[] = [
    { id: 'fields', label: 'Custom fields', icon: 'pi-sliders-h' },
    { id: 'lists', label: 'Controlled lists', icon: 'pi-list' },
    { id: 'collections', label: 'Collections', icon: 'pi-folder' }
  ];

  listCodes: string[] = [];
  conceptOptions: ConceptOption[] = [];

  constructor(private readonly _api: GlobalConceptsApiService) {}

  ngOnInit(): void {
    this.loadSupport();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scheme'] && !changes['scheme'].firstChange) this.loadSupport();
  }

  /** The field form needs the list codes and the collections need the concepts, whichever section opens first. */
  private loadSupport(): void {
    this._api.lists(this.scheme).subscribe({
      next: values => (this.listCodes = [...new Set((values ?? []).map(value => value.list_code))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))),
      // Without them the list picker is empty and the Controlled lists section reports its own error.
      error: () => (this.listCodes = [])
    });
    this._api.adminConcepts(this.scheme).subscribe({
      next: concepts =>
        (this.conceptOptions = (Array.isArray(concepts) ? concepts : []).map(c => ({ term_id: c.term_id, preferred_label: c.preferred_label, status: c.status }))),
      error: () => (this.conceptOptions = [])
    });
  }

  onListCodes(codes: string[]): void {
    this.listCodes = codes;
  }
}
