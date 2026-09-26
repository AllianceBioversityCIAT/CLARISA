import { Component, Input } from '@angular/core';

export interface Crumb {
  label: string;
  link?: string;
}

/** The brand band of the section: same surface as the glossary banner. */
@Component({
  selector: 'app-gc-banner',
  templateUrl: './gc-banner.component.html',
  styleUrls: ['./gc-banner.component.scss']
})
export class GcBannerComponent {
  @Input() title = 'Global Concepts';
  @Input() eyebrow: string | null = null;
  @Input() crumbs: Crumb[] = [];
}
