import { Component, Input, OnChanges } from '@angular/core';
import { PublicIcon } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { safeHttpUrl } from '../../global-concepts.utils';

/** Public names of `icon_status` (contract-v2 § 1). */
const STATUS_LABELS: Record<string, string> = {
  final: 'Final',
  draft: 'Draft',
  placeholder: 'Placeholder',
  not_yet_designed: 'Not yet designed'
};

interface IconView {
  icon: PublicIcon;
  url: string | null;
  alt: string;
  status: string;
}

/**
 * The icons of a concept (concepts checklist rows 1 and 13). An icon with a
 * safe link shows the image with its alt text; one without a link, or whose
 * image fails to load, shows the brand placeholder illustration instead of a
 * broken image.
 */
@Component({
  selector: 'app-gc-concept-icons',
  templateUrl: './concept-icons.component.html',
  styleUrls: ['./concept-icons.component.scss'],
  host: { class: 'gc-kit' }
})
export class ConceptIconsComponent implements OnChanges {
  @Input() icons: PublicIcon[] | null | undefined = [];
  @Input() conceptLabel = '';

  views: IconView[] = [];
  /** Indexes whose image failed to load. */
  broken = new Set<number>();

  ngOnChanges(): void {
    this.broken = new Set();
    this.views = (this.icons ?? []).map(icon => ({
      icon,
      // The back already nulls non-http links; checked again because the value reaches an <img src>.
      url: safeHttpUrl(icon.url),
      alt: (icon.alt_text ?? '').trim() || `Icon for ${this.conceptLabel || 'this concept'}`,
      status: icon.status ? (STATUS_LABELS[icon.status] ?? icon.status.replace(/_/g, ' ')) : ''
    }));
  }

  markBroken(index: number): void {
    this.broken = new Set(this.broken).add(index);
  }

  showImage(view: IconView, index: number): boolean {
    return !!view.url && !this.broken.has(index);
  }
}
