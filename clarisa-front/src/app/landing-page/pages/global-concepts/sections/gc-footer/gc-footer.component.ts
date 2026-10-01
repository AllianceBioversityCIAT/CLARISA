import { Component } from '@angular/core';
import { GC_NAV } from '../gc-banner/gc-banner.component';

/** Closing band of every Global Concepts page: where to go next. */
@Component({
  selector: 'app-gc-footer',
  templateUrl: './gc-footer.component.html',
  styleUrls: ['./gc-footer.component.scss'],
  host: { class: 'gc-kit' }
})
export class GcFooterComponent {
  readonly links = GC_NAV;
}
