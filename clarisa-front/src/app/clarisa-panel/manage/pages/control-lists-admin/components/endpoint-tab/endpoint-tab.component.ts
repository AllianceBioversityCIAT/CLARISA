import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { ControlListsApiService } from '../../services/control-lists-api.service';
import { ListDetail } from '../../models/control-lists.models';
import { filterableFields } from '../../utils/list-format';
import { isOn } from '../../utils/record-values';

export interface Variant {
  key: string;
  title: string;
  note: string;
  url: string;
}

export interface EndpointRow {
  code: string;
  type: string;
  required: string;
  filterable: string;
  note: string;
}

const EXAMPLE_RECORDS = 3;

@Component({
  selector: 'app-cl-endpoint-tab',
  templateUrl: './endpoint-tab.component.html'
})
export class EndpointTabComponent implements OnChanges, OnDestroy {
  @Input() detail!: ListDetail;

  copiedKey: string | null = null;

  exampleLoading = false;
  exampleStatus: number | null = null;
  exampleJson: string | null = null;
  exampleNote: string | null = null;
  exampleError: string | null = null;

  private exampleSub?: Subscription;
  private copiedTimer?: ReturnType<typeof setTimeout>;

  constructor(private api: ControlListsApiService) {}

  get published(): boolean {
    return this.detail.status === 'published';
  }

  get address(): string {
    return this.api.publicUrl(this.detail.code);
  }

  /** Built when the list changes, not per change detection: the template loops over them. */
  variants: Variant[] = [];
  rows: EndpointRow[] = [];

  private build(): void {
    const published = this.detail.fields.filter(f => f.status === 'published').sort((a, b) => a.position - b.position);
    const filterable = filterableFields(published);
    const base = this.address;
    const variants: Variant[] = [
      { key: 'one', title: 'One record', note: 'Active or not, by its id.', url: `${base}/get/{id}` },
      { key: 'all', title: 'Including inactive records', note: 'Also accepts ?show=inactive for only the inactive ones.', url: `${base}?show=all` }
    ];
    for (const f of filterable) {
      variants.push({
        key: `f-${f.code}`,
        title: `Filter by ${f.label}`,
        note: 'Only filterable fields can filter.',
        url: `${base}?${f.code}=<value>`
      });
    }
    for (const f of published.filter(x => x.type === 'relation')) {
      variants.push({
        key: `e-${f.code}`,
        title: `Nest ${f.relation_name || f.code}`,
        note: `Replaces the id in ${f.code} with the related record.`,
        url: `${base}?expand=${f.code}`
      });
    }
    this.variants = variants;
    this.hasFilterable = filterable.length > 0;
    this.rows = [
      { code: 'id', type: 'Number', required: '—', filterable: '—', note: 'Always present.' },
      ...published.map(f => ({
        code: f.code,
        type: f.type_label || String(f.type),
        required: isOn(f.is_required) ? 'Yes' : 'No',
        filterable: filterable.includes(f) ? 'Yes' : 'No',
        note: f.type === 'relation' ? `id of a record of ${f.relation_code || 'the related list'}; use ?expand=${f.code}` : ''
      })),
      { code: 'is_active', type: 'Yes / No', required: '—', filterable: '—', note: 'Inactive records only show with ?show=all or ?show=inactive.' }
    ];
  }

  hasFilterable = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['detail']) return;
    const prev = changes['detail'].previousValue as ListDetail | undefined;
    this.build();
    if (prev && prev.code === this.detail.code && prev.status === this.detail.status) return;
    this.refresh();
  }

  ngOnDestroy(): void {
    this.exampleSub?.unsubscribe();
    if (this.copiedTimer) clearTimeout(this.copiedTimer);
  }

  refresh(): void {
    this.exampleSub?.unsubscribe();
    this.exampleStatus = null;
    this.exampleJson = null;
    this.exampleNote = null;
    this.exampleError = null;
    if (!this.published) {
      this.exampleLoading = false;
      return;
    }
    this.exampleLoading = true;
    this.exampleSub = this.api.publicRead(this.detail.code).subscribe({
      next: res => {
        this.exampleLoading = false;
        this.exampleStatus = res.status;
        const body = res.body;
        if (Array.isArray(body)) {
          this.exampleJson = JSON.stringify(body.slice(0, EXAMPLE_RECORDS), null, 2);
          this.exampleNote =
            body.length === 0
              ? 'The list has no active records yet.'
              : body.length > EXAMPLE_RECORDS
                ? `Showing the first ${EXAMPLE_RECORDS} of ${body.length} records.`
                : `${body.length} ${body.length === 1 ? 'record' : 'records'}.`;
        } else {
          this.exampleJson = JSON.stringify(body, null, 2);
        }
      },
      error: err => {
        this.exampleLoading = false;
        this.exampleStatus = typeof err?.status === 'number' && err.status > 0 ? err.status : null;
        this.exampleError =
          this.exampleStatus === null ? 'The public address could not be reached.' : `The public address answered ${this.exampleStatus}.`;
      }
    });
  }

  copy(text: string, key: string): void {
    const done = () => {
      this.copiedKey = key;
      if (this.copiedTimer) clearTimeout(this.copiedTimer);
      this.copiedTimer = setTimeout(() => (this.copiedKey = null), 1800);
    };
    const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (clip?.writeText) {
      clip.writeText(text).then(done, () => this.fallbackCopy(text, done));
    } else {
      this.fallbackCopy(text, done);
    }
  }

  /** Older browsers and non-secure pages: select a hidden textarea and copy. */
  private fallbackCopy(text: string, done: () => void): void {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      if (document.execCommand('copy')) done();
    } finally {
      document.body.removeChild(area);
    }
  }
}
