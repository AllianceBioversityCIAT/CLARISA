import { Component } from '@angular/core';

import { ADMIN_GROUPS, AdminGroup } from '../../admin-nav';

/**
 * Left-hand navigation for the administration panel.
 *
 * The admin modules used to live inside the public «Services» dropdown, next to
 * the API documentation, so signing in left you on one module with no way to
 * reach the others, and a visitor who had no account found them anyway and hit
 * the login screen. They belong here, where everything behind the session lives
 * together.
 *
 * La lista vive en `admin-nav.ts` porque la barra de arriba la lee para titular
 * la sección actual.
 */
@Component({
  selector: 'app-admin-sidebar',
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.scss']
})
export class AdminSidebarComponent {
  readonly groups: AdminGroup[] = ADMIN_GROUPS;
}
