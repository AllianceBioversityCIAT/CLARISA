import { Component } from '@angular/core';

/**
 * Shell of the control-lists screens: the stylesheet every screen and dialog of
 * the module shares (`_control-lists.scss`), the toasts, and the outlet.
 */
@Component({
  selector: 'app-control-lists-admin',
  templateUrl: './control-lists-admin.component.html',
  styleUrls: ['./control-lists-admin.component.scss']
})
export class ControlListsAdminComponent {
  /** Under 480 px the toast is as wide as the screen, 12 px from each edge. */
  readonly toastBreakpoints = { '480px': { width: 'calc(100% - 24px)', left: '12px', right: '12px' } };
}
