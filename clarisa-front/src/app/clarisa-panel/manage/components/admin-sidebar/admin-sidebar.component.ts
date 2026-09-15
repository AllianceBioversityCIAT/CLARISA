import { Component } from '@angular/core';

interface AdminLink {
  label: string;
  route: string;
}

interface AdminGroup {
  title: string;
  links: AdminLink[];
}

/**
 * Left-hand navigation for the administration panel.
 *
 * The admin modules used to live inside the public «Services» dropdown, next to
 * the API documentation, so signing in left you on one module with no way to
 * reach the others, and a visitor who had no account found them anyway and hit
 * the login screen. They belong here, where everything behind the session lives
 * together.
 *
 * Grouped rather than flat («S3» in DESIGN.md): six entries in a single column
 * read as a pile, and the three groups answer different questions — what I
 * curate, who can get in, what the platform talks to.
 */
@Component({
  selector: 'app-admin-sidebar',
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.scss']
})
export class AdminSidebarComponent {
  readonly groups: AdminGroup[] = [
    {
      title: 'Manage',
      links: [
        { label: 'Institution requests', route: '/clarisa-panel/manage/partner-request' },
        { label: 'Institution lifecycle', route: '/clarisa-panel/manage/institution-lifecycle' },
        { label: 'Glossary', route: '/clarisa-panel/manage/glossary-admin' }
      ]
    },
    {
      title: 'Access',
      links: [
        { label: 'Users', route: '/clarisa-panel/manage/manage-user' },
        { label: 'Roles', route: '/clarisa-panel/manage/manage-role' }
      ]
    },
    {
      title: 'System',
      links: [{ label: 'Microservices & API keys', route: '/clarisa-panel/manage/microservices-admin' }]
    }
  ];
}
