import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * Carries the form/dialog skin of the Users and Roles screens. Draws nothing:
 * each page places it once, and its stylesheet loads with the lazy chunk
 * (never in the public bundle). Not encapsulated because the justification
 * dialog is appended to <body>, outside any host.
 */
@Component({
  selector: 'app-access-skin',
  template: '',
  styleUrls: ['./access-skin.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccessSkinComponent {}
