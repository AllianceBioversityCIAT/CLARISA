import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import {
  CONCEPT_EXPORT_FORMATS,
  ConceptExportFormat,
  GlobalConceptsApiService,
  releaseOptions
} from '../../../../../../shared/services/global-concepts/global-concepts-api.service';

/**
 * Export a scheme from the admin: one of the four formats, of the current
 * state or of any published release (same file the public Download gives).
 * It is a plain GET link, so a second click only downloads the file again.
 */
@Component({
  selector: 'app-gc-export-dialog',
  templateUrl: './gc-export-dialog.component.html',
  styleUrls: ['./gc-export-dialog.component.scss']
})
export class GcExportDialogComponent implements OnChanges {
  @Input() scheme = 'meliaf-taxonomy';
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  readonly formats = CONCEPT_EXPORT_FORMATS.map(f => ({ label: f.label, value: f.format, hint: f.hint }));
  format: ConceptExportFormat = 'csv';

  /** Built once per load, never in a getter: PrimeNG loses the click otherwise. */
  versions = releaseOptions([]);
  version: string | null = null;
  loadingReleases = false;
  releasesError = false;

  constructor(private readonly _api: GlobalConceptsApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['visible'] && this.visible) || (changes['scheme'] && this.visible)) this.loadReleases();
  }

  get hint(): string {
    return CONCEPT_EXPORT_FORMATS.find(f => f.format === this.format)?.hint ?? '';
  }

  get href(): string {
    return this._api.exportUrl(this.scheme, this.format, this.version);
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  private loadReleases(): void {
    this.loadingReleases = true;
    this.releasesError = false;
    this._api.releases(this.scheme).subscribe({
      next: releases => {
        this.versions = releaseOptions(releases);
        // A release that disappeared from the list can no longer be picked.
        if (!this.versions.some(v => v.value === this.version)) this.version = null;
        this.loadingReleases = false;
      },
      error: () => {
        // The current version still downloads; only the releases are missing.
        this.versions = releaseOptions([]);
        this.version = null;
        this.loadingReleases = false;
        this.releasesError = true;
      }
    });
  }
}
